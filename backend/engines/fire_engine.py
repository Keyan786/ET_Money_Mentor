import math
from typing import Optional
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
    """Detect edge cases and return a case label or None."""
    income = profile.get('monthly_income', 0)
    expenses = profile.get('monthly_expenses', 0)
    debt = profile.get('total_debt', 0)
    investments = profile.get('current_investments', 0)
    savings = profile.get('current_savings', 0)

    savings_rate = (income - expenses) / income * 100 if income > 0 else 0
    dti = debt / income * 100 if income > 0 else 0

    if investments == 0 and savings == 0:
        return 'no_investments'
    if dti > 40:
        return 'high_debt'
    if savings_rate < 10:
        return 'low_income'
    return None


def generate_fire_plan(profile: dict) -> dict:
    age = profile.get('age', 30)
    target_age = profile.get('target_age', 50)
    monthly_income = profile.get('monthly_income', 0)
    monthly_expenses = profile.get('monthly_expenses', 0)
    current_savings = profile.get('current_savings', 0)
    current_investments = profile.get('current_investments', 0)
    risk_tolerance = profile.get('risk_tolerance', 'moderate').lower()
    total_debt = profile.get('total_debt', 0)

    if risk_tolerance not in ALLOCATION_RULES:
        risk_tolerance = 'moderate'

    allocation = ALLOCATION_RULES[risk_tolerance]
    nominal_returns = _get_nominal_returns()
    inflation = get_inflation_rate()

    blended_nominal = _blended_return(allocation, nominal_returns)
    blended_real = round(blended_nominal - inflation, 2)
    monthly_real_rate = blended_real / 100.0 / 12.0

    annual_expenses = monthly_expenses * 12
    fire_number = annual_expenses * 25

    current_portfolio = current_savings + current_investments
    monthly_surplus = monthly_income - monthly_expenses - total_debt
    if monthly_surplus < 0:
        monthly_surplus = 0

    emergency_target = monthly_expenses * 6

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
        debt_ratio = total_debt / monthly_income * 100 if monthly_income > 0 else 0
        edge_case_advice = {
            'type': 'high_debt',
            'title': 'Debt Reduction Priority',
            'message': (
                f'Your debt-to-income ratio is {debt_ratio:.0f}%, which is above 40%. '
                'Prioritize paying off high-interest debt before heavy investing. '
                'Allocate 60% of surplus to debt repayment, 40% to basic SIP.'
            ),
            'priority_action': 'Pay off high-interest loans first',
        }
        monthly_surplus = int(monthly_surplus * 0.4)
    elif edge_case == 'low_income':
        edge_case_advice = {
            'type': 'low_income',
            'title': 'Foundation First Plan',
            'message': (
                'Your savings rate is below 10%. Before pursuing FIRE, '
                f'build an emergency fund of ₹{emergency_target:,.0f} '
                '(6 months expenses). Cut discretionary spending or increase income.'
            ),
            'priority_action': f'Build emergency fund to ₹{emergency_target:,.0f}',
        }

    # Month-by-month projection
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

    # SIP recommendations
    sip_equity = int(monthly_surplus * allocation['equity'] / 100)
    sip_debt = int(monthly_surplus * allocation['debt'] / 100)
    sip_gold = int(monthly_surplus * allocation['gold'] / 100)

    # Fetch fund data in parallel
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

    # AI insights — run in parallel to cut wait time in half
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
        'edge_case': edge_case_advice,
        'ai_insights': {
            'summary': ai_summary,
            'investment_explanation': ai_investment,
            'risk_warning': ai_risk,
        },
    }
