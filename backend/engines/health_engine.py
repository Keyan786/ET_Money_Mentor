from backend.services.huggingface import generate_health_summary
from backend.engines.tax_engine import compute_tax_efficiency

WEIGHTS = {
    'savings_rate': 0.15,
    'debt_health': 0.15,
    'emergency_preparedness': 0.15,
    'investment_diversification': 0.15,
    'insurance_adequacy': 0.10,
    'retirement_readiness': 0.15,
    'tax_efficiency': 0.15,
}


def _score_savings_rate(income: float, expenses: float) -> tuple[int, str]:
    if income <= 0:
        return 0, "No income reported."
    rate = (income - expenses) / income * 100
    if rate >= 30:
        score = 100
    elif rate >= 20:
        score = 80
    elif rate >= 10:
        score = 55
    elif rate > 0:
        score = 30
    else:
        score = 0
    advice = (
        f"Your savings rate is {rate:.0f}%. "
        + ("Excellent! You're saving aggressively." if rate >= 30
           else "Aim for at least 20% savings rate by reducing discretionary spending."
           if rate < 20 else "Good savings rate. Push toward 30% for faster wealth building.")
    )
    return score, advice


def _score_debt_health(income: float, emi: float) -> tuple[int, str]:
    if income <= 0:
        return 0, "No income reported."
    dti = emi / income * 100
    if dti == 0:
        score, advice = 100, "No EMI obligations. Excellent financial position."
    elif dti <= 20:
        score, advice = 80, f"EMI-to-income is {dti:.0f}%. Manageable, but aim to reduce."
    elif dti <= 35:
        score, advice = 50, f"EMI-to-income is {dti:.0f}%. Consider accelerating debt repayment."
    elif dti <= 50:
        score, advice = 25, f"EMI-to-income is {dti:.0f}%. This is risky. Prioritize paying off high-interest debt."
    else:
        score, advice = 0, f"EMI-to-income is {dti:.0f}%. Critical level. Stop new borrowing and aggressively repay."
    return score, advice


def _score_emergency(monthly_expenses: float, emergency_fund: float, risk_tolerance: str = 'moderate') -> tuple[int, str]:
    if monthly_expenses <= 0:
        return 50, "Unable to assess without expense data."
    target_months = 9 if risk_tolerance == 'conservative' else 6
    months_covered = emergency_fund / monthly_expenses
    if months_covered >= target_months:
        score, advice = 100, f"Emergency fund covers {months_covered:.1f} months. Well prepared."
    elif months_covered >= 3:
        score, advice = 65, f"Emergency fund covers {months_covered:.1f} months. Build toward {target_months} months."
    elif months_covered > 0:
        score, advice = 30, f"Emergency fund covers only {months_covered:.1f} months. Prioritize building to {target_months} months."
    else:
        score, advice = 0, f"No emergency fund. This is your #1 priority. Target {target_months} months of expenses."
    return score, advice


def _score_diversification(investments: dict) -> tuple[int, str]:
    total = sum(investments.values())
    if total == 0:
        return 10, "No investments. Start with a simple SIP in an index fund to begin building wealth."

    categories_with_value = sum(1 for v in investments.values() if v > 0)
    max_concentration = max(investments.values()) / total * 100 if total > 0 else 100

    if categories_with_value >= 4 and max_concentration < 50:
        score = 90
    elif categories_with_value >= 3 and max_concentration < 60:
        score = 70
    elif categories_with_value >= 2:
        score = 50
    else:
        score = 20

    if max_concentration > 70:
        advice = f"Over {max_concentration:.0f}% in one category. Diversify across equity, debt, and gold."
    elif categories_with_value < 3:
        advice = f"Only {categories_with_value} asset classes. Add more variety for better risk management."
    else:
        advice = "Good diversification. Keep rebalancing periodically."
    return score, advice


def _score_insurance(monthly_income: float, insurance_coverage: float) -> tuple[int, str]:
    if insurance_coverage == 0:
        return 0, "No insurance coverage. Get term life (10x annual income) and health insurance immediately."
    annual_income = monthly_income * 12
    coverage_ratio = insurance_coverage / annual_income if annual_income > 0 else 0
    if coverage_ratio >= 10:
        score, advice = 100, "Insurance coverage is adequate (10x+ annual income)."
    elif coverage_ratio >= 5:
        score, advice = 60, f"Coverage is {coverage_ratio:.1f}x annual income. Aim for 10x with a term plan."
    else:
        score, advice = 30, f"Coverage is only {coverage_ratio:.1f}x annual income. Significantly under-insured."
    return score, advice


def _score_retirement(age: int, current_investments: float, monthly_income: float) -> tuple[int, str]:
    if current_investments == 0:
        return 10, "No retirement corpus. Start a retirement SIP immediately, even a small one."
    years_worked = max(age - 22, 1)
    annual_income = monthly_income * 12
    expected_corpus = annual_income * years_worked * 0.15
    ratio = current_investments / expected_corpus if expected_corpus > 0 else 0
    if ratio >= 1.0:
        score, advice = 90, "On track for retirement. Keep it up."
    elif ratio >= 0.5:
        score, advice = 60, "Partially on track. Increase SIP contributions to catch up."
    elif ratio >= 0.2:
        score, advice = 35, "Behind on retirement savings. Consider increasing investments by 20-30%."
    else:
        score, advice = 15, "Significantly behind. Urgently start or increase retirement contributions."
    return score, advice


def calculate_health_score(profile: dict) -> dict:
    monthly_income = profile.get('monthly_income', 0)
    monthly_expenses = profile.get('monthly_expenses', 0)
    monthly_emi = profile.get('monthly_emi', 0)
    emergency_fund = profile.get('emergency_fund', 0)
    insurance_coverage = profile.get('insurance_coverage', 0)
    age = profile.get('age', 30)
    risk_tolerance = profile.get('risk_tolerance', 'moderate')
    investments = profile.get('investments', {})
    current_investments = sum(investments.values()) if investments else 0

    annual_income = profile.get('annual_income', 0)
    deductions = profile.get('deductions', {})

    s_savings, a_savings = _score_savings_rate(monthly_income, monthly_expenses)
    s_debt, a_debt = _score_debt_health(monthly_income, monthly_emi)
    s_emergency, a_emergency = _score_emergency(monthly_expenses, emergency_fund, risk_tolerance)
    s_divers, a_divers = _score_diversification(investments)
    s_insurance, a_insurance = _score_insurance(monthly_income, insurance_coverage)
    s_retire, a_retire = _score_retirement(age, current_investments, monthly_income)

    tax_eff = compute_tax_efficiency(annual_income, deductions)
    s_tax, a_tax = tax_eff['score'], tax_eff['advice']

    if current_investments == 0:
        s_divers = min(s_divers, 10)
        s_retire = min(s_retire, 10)

    dti = monthly_emi / monthly_income * 100 if monthly_income > 0 else 0

    if dti > 50:
        s_debt = 0
        a_debt = (
            f"EMI-to-income is {dti:.0f}% — critical. "
            "Focus entirely on debt reduction before investing."
        )

    dimensions = {
        'savings_rate': {'score': s_savings, 'advice': a_savings},
        'debt_health': {'score': s_debt, 'advice': a_debt},
        'emergency_preparedness': {'score': s_emergency, 'advice': a_emergency},
        'investment_diversification': {'score': s_divers, 'advice': a_divers},
        'insurance_adequacy': {'score': s_insurance, 'advice': a_insurance},
        'retirement_readiness': {'score': s_retire, 'advice': a_retire},
        'tax_efficiency': {'score': s_tax, 'advice': a_tax},
    }

    overall = sum(
        dimensions[dim]['score'] * WEIGHTS[dim]
        for dim in dimensions
    )
    overall = round(overall)

    if dti > 50:
        overall = round(overall * 0.7)

    if overall >= 71:
        zone = 'green'
        zone_label = 'Healthy'
    elif overall >= 41:
        zone = 'yellow'
        zone_label = 'Needs Attention'
    else:
        zone = 'red'
        zone_label = 'Critical'

    scores_for_ai = {k: v['score'] for k, v in dimensions.items()}
    ai_summary = generate_health_summary(scores_for_ai, profile)

    return {
        'overall_score': overall,
        'zone': zone,
        'zone_label': zone_label,
        'dimensions': dimensions,
        'ai_summary': ai_summary,
    }
