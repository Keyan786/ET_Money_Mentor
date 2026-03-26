import math
from typing import Optional, List
from datetime import datetime, timedelta
from concurrent.futures import ThreadPoolExecutor

from backend.services.eulerpool import get_inflation_rate, get_interest_rate
from backend.services.mfapi import get_recommended_funds_with_nav
from backend.services.huggingface import (
    generate_fire_summary,
    generate_risk_warning,
    generate_investment_explanation,
)

ALLOCATION_RULES = {
    'conservative': {'equity': 30, 'debt': 60, 'gold': 10},
    'moderate':     {'equity': 60, 'debt': 30, 'gold': 10},
    'aggressive':   {'equity': 80, 'debt': 15, 'gold': 5},
}

NOMINAL_RETURNS = {
    'equity': 12.0,
    'debt': 7.0,
    'gold': 8.0,
}

CATEGORY_WEIGHTS = {'high': 3, 'medium': 2, 'low': 1}


def _get_nominal_returns() -> dict:
    """Get per-asset-class nominal return assumptions.
    Debt return is linked to interest rate from Eulerpool."""
    try:
        interest = get_interest_rate()
        debt_return = interest + 1.0
    except Exception:
        debt_return = NOMINAL_RETURNS['debt']
    return {
        'equity': NOMINAL_RETURNS['equity'],
        'debt': round(debt_return, 2),
        'gold': NOMINAL_RETURNS['gold'],
    }


def _blended_return(allocation: dict, nominal_returns: dict) -> float:
    total = sum(
        allocation[cls] / 100.0 * nominal_returns[cls]
        for cls in allocation
    )
    return round(total, 2)


def _detect_edge_case(profile: dict) -> Optional[str]:
    income = profile.get('monthly_income', 0)
    expenses = profile.get('monthly_expenses', 0)
    emi = profile.get('monthly_emi', 0)
    investments = profile.get('current_investments', 0)
    savings = profile.get('current_savings', 0)

    savings_rate = (income - expenses) / income * 100 if income > 0 else 0
    dti = emi / income * 100 if income > 0 else 0

    if investments == 0 and savings == 0:
        return 'no_investments'
    if dti > 40:
        return 'high_debt'
    if savings_rate < 10:
        return 'low_income'
    return None


def _required_monthly_sip(target_amount: float, current_corpus: float,
                          monthly_rate: float, months: int) -> float:
    """Compute the monthly SIP needed to grow *current_corpus* to
    *target_amount* (future value) in *months* at *monthly_rate*."""
    if months <= 0:
        return 0.0
    fv_existing = current_corpus * ((1 + monthly_rate) ** months)
    gap = target_amount - fv_existing
    if gap <= 0:
        return 0.0
    if monthly_rate <= 0:
        return gap / months
    return gap * monthly_rate / ((1 + monthly_rate) ** months - 1)


def _compute_goal_sips(goals: List[dict], age: int,
                       monthly_surplus: float,
                       monthly_real_rate: float) -> List[dict]:
    """Split *monthly_surplus* across goals.
    Rules (confirmed by user):
      1. Compute required SIP for each target-based goal.
      2. If surplus >= total required: allocate required, then distribute
         remainder by category weights among all incomplete goals.
      3. If surplus < total required: split proportionally by category
         weights among target goals.
      4. Category-only goals (no target_amount) get a share of
         remainder via category weights; funded until goal_age.
    """
    result = []
    if not goals:
        return result

    active_goals = [g for g in goals if g.get('goal_age', 0) > age]
    if not active_goals:
        return result

    for g in active_goals:
        months = max((g['goal_age'] - age) * 12, 1)
        required = 0.0
        if g.get('type') == 'target' and g.get('target_amount', 0) > 0:
            required = _required_monthly_sip(g['target_amount'], 0,
                                             monthly_real_rate, months)
        g['_months'] = months
        g['_required'] = max(round(required), 0)
        g['_weight'] = CATEGORY_WEIGHTS.get(
            (g.get('category') or 'medium').lower(), 2)

    target_goals = [g for g in active_goals if g.get('type') == 'target'
                    and g['_required'] > 0]
    total_required = sum(g['_required'] for g in target_goals)

    if total_required <= monthly_surplus:
        remainder = monthly_surplus - total_required
        for g in target_goals:
            g['_alloc'] = g['_required']

        share_goals = active_goals
        total_w = sum(g['_weight'] for g in share_goals)
        for g in share_goals:
            base = g.get('_alloc', 0)
            extra = round(remainder * g['_weight'] / total_w) if total_w > 0 else 0
            g['_alloc'] = base + extra
    else:
        total_w = sum(g['_weight'] for g in target_goals) or 1
        for g in active_goals:
            g['_alloc'] = 0
        for g in target_goals:
            g['_alloc'] = round(monthly_surplus * g['_weight'] / total_w)

        cat_only = [g for g in active_goals
                    if g.get('type') != 'target' or g['_required'] == 0]
        for g in cat_only:
            g['_alloc'] = 0

    for g in active_goals:
        result.append({
            'name': g.get('name', 'Unnamed Goal'),
            'type': g.get('type', 'category'),
            'category': g.get('category', 'medium'),
            'goal_age': g.get('goal_age', 0),
            'target_amount': g.get('target_amount', 0),
            'monthly_sip': g.get('_alloc', 0),
            'required_sip': g.get('_required', 0),
            'months_remaining': g.get('_months', 0),
        })

    return result


def generate_fire_plan(profile: dict) -> dict:
    age = profile.get('age', 30)
    target_age = profile.get('target_age', 50)
    monthly_income = profile.get('monthly_income', 0)
    monthly_expenses = profile.get('monthly_expenses', 0)
    current_savings = profile.get('current_savings', 0)
    current_investments = profile.get('current_investments', 0)
    risk_tolerance = profile.get('risk_tolerance', 'moderate').lower()

    if risk_tolerance not in ALLOCATION_RULES:
        risk_tolerance = 'moderate'

    allocation = ALLOCATION_RULES[risk_tolerance]
    nominal_returns = _get_nominal_returns()
    inflation = get_inflation_rate()

    monthly_emi = profile.get('monthly_emi', 0)

    blended_nominal = _blended_return(allocation, nominal_returns)
    nominal_dec = blended_nominal / 100.0
    inflation_dec = inflation / 100.0
    blended_real = round(((1 + nominal_dec) / (1 + inflation_dec) - 1) * 100, 2)
    monthly_real_rate = blended_real / 100.0 / 12.0

    annual_expenses = monthly_expenses * 12
    fire_number = annual_expenses * 25

    current_portfolio = current_savings + current_investments
    lifestyle_buffer = round(monthly_expenses * 0.05)
    monthly_surplus = monthly_income - monthly_expenses - monthly_emi - lifestyle_buffer
    if monthly_surplus < 0:
        monthly_surplus = 0

    emergency_months = 9 if risk_tolerance == 'conservative' else 6
    emergency_target = monthly_expenses * emergency_months

    edge_case = _detect_edge_case(profile)
    edge_case_advice = None

    if edge_case == 'no_investments':
        edge_case_advice = {
            'type': 'no_investments',
            'title': 'Start Your Investment Journey',
            'message': (
                'You currently have no savings or investments. '
                'Start with a small SIP of even ₹500/month to build the habit. '
                'Focus on building an emergency fund first.'
            ),
            'priority_action': 'Start a SIP of ₹500-1000/month in a liquid fund',
        }
    elif edge_case == 'high_debt':
        dti = monthly_emi / monthly_income if monthly_income > 0 else 0
        dti_pct = round(dti * 100)
        if dti > 0.4:
            invest_ratio = 0.6
        elif dti > 0.3:
            invest_ratio = 0.7
        else:
            invest_ratio = 0.8
        edge_case_advice = {
            'type': 'high_debt',
            'title': 'Debt Reduction Priority',
            'message': (
                f'Your EMI-to-income ratio is {dti_pct}%. '
                f'Allocating {int((1 - invest_ratio) * 100)}% of surplus to debt repayment '
                f'and {int(invest_ratio * 100)}% to SIP.'
            ),
            'priority_action': 'Pay off high-interest loans first',
        }
        monthly_surplus = int(monthly_surplus * invest_ratio)
    elif edge_case == 'low_income':
        edge_case_advice = {
            'type': 'low_income',
            'title': 'Foundation First Plan',
            'message': (
                'Your savings rate is below 10%. Before pursuing FIRE, '
                f'build an emergency fund of ₹{emergency_target:,.0f} '
                f'({emergency_months} months expenses). Cut discretionary spending or increase income.'
            ),
            'priority_action': f'Build emergency fund to ₹{emergency_target:,.0f}',
        }

    # --- Multi-goal SIP splitting ---
    goals = profile.get('goals', [])
    if not goals:
        goals = [{
            'name': 'Retirement (FIRE)',
            'type': 'target',
            'category': 'high',
            'goal_age': target_age,
            'target_amount': round(fire_number),
        }]

    goal_sips = _compute_goal_sips(goals, age, monthly_surplus, monthly_real_rate)

    # Month-by-month projection (aggregate across all goals)
    months_available = (target_age - age) * 12
    if months_available <= 0:
        months_available = 12 * 10

    roadmap = []
    portfolio = float(current_portfolio)
    milestones_hit = set()
    milestone_thresholds = {
        'Emergency Fund Complete': emergency_target,
        '25% FIRE': fire_number * 0.25,
        '50% FIRE': fire_number * 0.50,
        '75% FIRE': fire_number * 0.75,
        'FIRE Achieved': fire_number,
    }

    fire_date = None
    now = datetime.now()

    for month in range(1, months_available + 1):
        portfolio = portfolio * (1 + monthly_real_rate) + monthly_surplus
        date = now + timedelta(days=30 * month)
        month_label = date.strftime('%b %Y')

        new_milestones = []
        for name, threshold in milestone_thresholds.items():
            if name not in milestones_hit and portfolio >= threshold:
                milestones_hit.add(name)
                new_milestones.append(name)
                if name == 'FIRE Achieved' and fire_date is None:
                    fire_date = month_label

        entry = {
            'month': month,
            'date': month_label,
            'portfolio_value': round(portfolio, 0),
            'milestones': new_milestones,
        }

        if month <= 60 or month % 12 == 0 or new_milestones:
            roadmap.append(entry)

    if fire_date is None:
        if portfolio > 0 and monthly_real_rate > 0:
            n = math.log(
                (fire_number * monthly_real_rate + monthly_surplus)
                / (current_portfolio * monthly_real_rate + monthly_surplus)
            ) / math.log(1 + monthly_real_rate) if monthly_real_rate > 0 else float('inf')
            years_extra = n / 12
            fire_date = f"~{int(years_extra) + age} years old (beyond target)"
        else:
            fire_date = "Not achievable with current parameters"

    # SIP recommendations (fund-level, split by asset class from total surplus)
    sip_equity = int(monthly_surplus * allocation['equity'] / 100)
    sip_debt = int(monthly_surplus * allocation['debt'] / 100)
    sip_gold = int(monthly_surplus * allocation['gold'] / 100)

    with ThreadPoolExecutor(max_workers=3) as pool:
        f_eq = pool.submit(get_recommended_funds_with_nav, 'equity')
        f_dt = pool.submit(get_recommended_funds_with_nav, 'debt')
        f_gd = pool.submit(get_recommended_funds_with_nav, 'gold')
        equity_funds = f_eq.result()
        debt_funds = f_dt.result()
        gold_funds = f_gd.result()

    sip_recommendations = []
    for fund in equity_funds:
        sip_recommendations.append({
            **fund,
            'asset_class': 'equity',
            'monthly_sip': round(sip_equity / max(len(equity_funds), 1)),
        })
    for fund in debt_funds:
        sip_recommendations.append({
            **fund,
            'asset_class': 'debt',
            'monthly_sip': round(sip_debt / max(len(debt_funds), 1)),
        })
    for fund in gold_funds:
        sip_recommendations.append({
            **fund,
            'asset_class': 'gold',
            'monthly_sip': sip_gold,
        })

    all_funds = equity_funds + debt_funds + gold_funds

    projections = {
        'fire_number': round(fire_number),
        'fire_date': fire_date,
        'monthly_sip': monthly_surplus,
        'current_portfolio': round(current_portfolio),
        'years_to_fire': round((target_age - age), 1),
        'blended_nominal_return': blended_nominal,
        'blended_real_return': blended_real,
        'inflation_rate': inflation,
    }

    with ThreadPoolExecutor(max_workers=3) as pool:
        f_summary = pool.submit(generate_fire_summary, profile, projections)
        f_invest = pool.submit(generate_investment_explanation, allocation, all_funds)
        f_risk = pool.submit(generate_risk_warning, profile) if edge_case else None

        ai_summary = f_summary.result()
        ai_investment = f_invest.result()
        ai_risk = f_risk.result() if f_risk else None

    return {
        'projections': projections,
        'allocation': allocation,
        'nominal_returns': nominal_returns,
        'emergency_target': round(emergency_target),
        'roadmap': roadmap,
        'sip_recommendations': sip_recommendations,
        'goal_sips': goal_sips,
        'edge_case': edge_case_advice,
        'ai_insights': {
            'summary': ai_summary,
            'investment_explanation': ai_investment,
            'risk_warning': ai_risk,
        },
    }
