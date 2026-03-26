from typing import List, Tuple

from backend.services.huggingface import generate_tax_strategy

OLD_REGIME_SLABS = [
    (250000, 0.00),
    (500000, 0.05),
    (1000000, 0.20),
    (float('inf'), 0.30),
]

NEW_REGIME_SLABS = [
    (300000, 0.00),
    (700000, 0.05),
    (1000000, 0.10),
    (1200000, 0.15),
    (1500000, 0.20),
    (float('inf'), 0.30),
]

SECTION_80C_LIMIT = 150000
SECTION_80D_LIMIT_SELF = 25000
SECTION_80D_LIMIT_PARENTS = 50000
NPS_80CCD_LIMIT = 50000
SECTION_80E_NO_LIMIT = True
SECTION_80G_NO_LIMIT = True
SECTION_80TTA_LIMIT = 10000
STANDARD_DEDUCTION = 75000

TAX_INSTRUMENTS = [
    {
        'section': '80C', 'name': 'ELSS Mutual Funds', 'limit': SECTION_80C_LIMIT,
        'description': 'Equity-linked savings scheme with 3-year lock-in. Best for tax saving + wealth creation.',
        'priority': 1,
        'risk': 'high', 'liquidity': 'low', 'lock_in': '3 years',
    },
    {
        'section': '80C', 'name': 'PPF (Public Provident Fund)', 'limit': SECTION_80C_LIMIT,
        'description': 'Risk-free savings with 15-year lock-in. Good for conservative investors.',
        'priority': 2,
        'risk': 'low', 'liquidity': 'very low', 'lock_in': '15 years',
    },
    {
        'section': '80C', 'name': 'EPF / VPF', 'limit': SECTION_80C_LIMIT,
        'description': 'Employee Provident Fund contributions. Usually auto-deducted from salary.',
        'priority': 3,
        'risk': 'low', 'liquidity': 'low', 'lock_in': 'until retirement',
    },
    {
        'section': '80C', 'name': 'Tax Saver FD', 'limit': SECTION_80C_LIMIT,
        'description': 'Bank fixed deposit with 5-year lock-in. Guaranteed returns with low risk.',
        'priority': 7,
        'risk': 'low', 'liquidity': 'very low', 'lock_in': '5 years',
    },
    {
        'section': '80CCD(1B)', 'name': 'NPS (National Pension System)', 'limit': NPS_80CCD_LIMIT,
        'description': 'Additional ₹50,000 deduction over 80C. Locked until 60.',
        'priority': 4,
        'risk': 'moderate', 'liquidity': 'very low', 'lock_in': 'until age 60',
    },
    {
        'section': '80D', 'name': 'Health Insurance (Self & Family)', 'limit': SECTION_80D_LIMIT_SELF,
        'description': 'Premiums for health insurance. Essential coverage + tax benefit.',
        'priority': 5,
        'risk': 'none', 'liquidity': 'n/a', 'lock_in': 'annual premium',
    },
    {
        'section': '80D', 'name': 'Health Insurance (Parents)', 'limit': SECTION_80D_LIMIT_PARENTS,
        'description': "Premiums for parents' health insurance. Higher limit for senior citizens.",
        'priority': 6,
        'risk': 'none', 'liquidity': 'n/a', 'lock_in': 'annual premium',
    },
    {
        'section': '80E', 'name': 'Education Loan Interest', 'limit': 0,
        'description': 'Full interest on education loans is deductible for 8 years from first repayment year.',
        'priority': 8,
        'risk': 'none', 'liquidity': 'n/a', 'lock_in': 'loan tenure',
    },
    {
        'section': '80G', 'name': 'Donations to Charities', 'limit': 0,
        'description': '50-100% deduction on donations to eligible charitable institutions.',
        'priority': 9,
        'risk': 'none', 'liquidity': 'n/a', 'lock_in': 'none',
    },
    {
        'section': '80TTA', 'name': 'Savings Account Interest', 'limit': SECTION_80TTA_LIMIT,
        'description': 'Up to ₹10,000 interest from savings accounts is deductible.',
        'priority': 10,
        'risk': 'none', 'liquidity': 'high', 'lock_in': 'none',
    },
]


def _compute_tax(income: float, slabs: List[Tuple]) -> float:
    tax = 0
    prev_limit = 0
    for limit, rate in slabs:
        taxable = min(income, limit) - prev_limit
        if taxable <= 0:
            break
        tax += taxable * rate
        prev_limit = limit
    cess = tax * 0.04
    return round(tax + cess)


def _compute_old_regime(income: float, deductions: dict) -> dict:
    total_80c = min(deductions.get('80C', 0), SECTION_80C_LIMIT)
    total_80d = min(
        deductions.get('80D', 0),
        SECTION_80D_LIMIT_SELF + SECTION_80D_LIMIT_PARENTS,
    )
    nps = min(deductions.get('80CCD', 0), NPS_80CCD_LIMIT)
    hra = deductions.get('HRA', 0)
    sec_80e = deductions.get('80E', 0)
    sec_80g = deductions.get('80G', 0)
    sec_80tta = min(deductions.get('80TTA', 0), SECTION_80TTA_LIMIT)

    total_deductions = (
        total_80c + total_80d + nps + hra
        + sec_80e + sec_80g + sec_80tta + STANDARD_DEDUCTION
    )
    taxable_income = max(income - total_deductions, 0)
    tax = _compute_tax(taxable_income, OLD_REGIME_SLABS)

    return {
        'regime': 'old',
        'gross_income': income,
        'standard_deduction': STANDARD_DEDUCTION,
        'total_deductions': round(total_deductions),
        'taxable_income': round(taxable_income),
        'tax': tax,
        'effective_rate': round(tax / income * 100, 2) if income > 0 else 0,
        'deduction_breakdown': {
            '80C': total_80c,
            '80D': total_80d,
            '80CCD(1B)': nps,
            'HRA': hra,
            '80E': sec_80e,
            '80G': sec_80g,
            '80TTA': sec_80tta,
            'Standard Deduction': STANDARD_DEDUCTION,
        },
    }


def _compute_new_regime(income: float) -> dict:
    taxable_income = max(income - STANDARD_DEDUCTION, 0)
    tax = _compute_tax(taxable_income, NEW_REGIME_SLABS)
    return {
        'regime': 'new',
        'gross_income': income,
        'standard_deduction': STANDARD_DEDUCTION,
        'total_deductions': STANDARD_DEDUCTION,
        'taxable_income': round(taxable_income),
        'tax': tax,
        'effective_rate': round(tax / income * 100, 2) if income > 0 else 0,
    }


def _suggest_instruments(income: float, deductions: dict, risk_tolerance: str = 'moderate') -> List[dict]:
    suggestions = []
    current_80c = deductions.get('80C', 0)
    current_80d = deductions.get('80D', 0)
    current_nps = deductions.get('80CCD', 0)
    current_80tta = deductions.get('80TTA', 0)

    if income <= 500000:
        return [{
            'section': 'N/A',
            'name': 'No Tax Instruments Needed',
            'potential_investment': 0,
            'potential_tax_saved': 0,
            'description': (
                'Your income is below or near the effective tax-free threshold. '
                'Instead of tax-saving instruments, invest the surplus for growth.'
            ),
        }]

    def _pick_instrument(section):
        for inst in TAX_INSTRUMENTS:
            if inst['section'] == section:
                return inst
        return {}

    if current_80c < SECTION_80C_LIMIT:
        gap = SECTION_80C_LIMIT - current_80c
        tax_saved = round(gap * 0.30)
        if risk_tolerance == 'aggressive':
            rec_name, rec_risk, rec_lock = 'ELSS Mutual Funds', 'high', '3 years'
        elif risk_tolerance == 'conservative':
            rec_name, rec_risk, rec_lock = 'PPF / Tax Saver FD', 'low', '5-15 years'
        else:
            rec_name, rec_risk, rec_lock = 'ELSS / PPF mix', 'moderate', '3-15 years'
        suggestions.append({
            'section': '80C', 'name': rec_name,
            'potential_investment': gap, 'potential_tax_saved': tax_saved,
            'description': f'Invest ₹{gap:,} more in 80C instruments to fully utilise the limit.',
            'risk': rec_risk, 'liquidity': 'low', 'lock_in': rec_lock,
        })

    if current_nps < NPS_80CCD_LIMIT:
        gap = NPS_80CCD_LIMIT - current_nps
        tax_saved = round(gap * 0.30)
        inst = _pick_instrument('80CCD(1B)')
        suggestions.append({
            'section': '80CCD(1B)', 'name': 'NPS',
            'potential_investment': gap, 'potential_tax_saved': tax_saved,
            'description': f'Invest ₹{gap:,} in NPS for additional deduction beyond 80C.',
            'risk': inst.get('risk', 'moderate'),
            'liquidity': inst.get('liquidity', 'very low'),
            'lock_in': inst.get('lock_in', 'until age 60'),
        })

    if current_80d < SECTION_80D_LIMIT_SELF:
        gap = SECTION_80D_LIMIT_SELF - current_80d
        tax_saved = round(gap * 0.30)
        suggestions.append({
            'section': '80D', 'name': 'Health Insurance',
            'potential_investment': gap, 'potential_tax_saved': tax_saved,
            'description': f'Get health insurance worth ₹{gap:,}/year premium for coverage + tax saving.',
            'risk': 'none', 'liquidity': 'n/a', 'lock_in': 'annual premium',
        })

    if current_80tta < SECTION_80TTA_LIMIT:
        gap = SECTION_80TTA_LIMIT - current_80tta
        tax_saved = round(gap * 0.30)
        suggestions.append({
            'section': '80TTA', 'name': 'Savings Account Interest',
            'potential_investment': gap, 'potential_tax_saved': tax_saved,
            'description': f'Claim ₹{gap:,} savings interest deduction under 80TTA.',
            'risk': 'none', 'liquidity': 'high', 'lock_in': 'none',
        })

    return suggestions


def compute_tax_efficiency(annual_income: float, deductions: dict) -> dict:
    """Pure computation (no AI call) that returns a 0-100 score and advice
    representing how well the user is utilising available deductions."""
    if annual_income <= 0:
        return {'score': 50, 'advice': 'No income reported; cannot assess tax efficiency.'}

    baseline_taxable = max(annual_income - STANDARD_DEDUCTION, 0)
    baseline_tax = _compute_tax(baseline_taxable, OLD_REGIME_SLABS)

    if baseline_tax <= 0:
        return {'score': 100, 'advice': 'Income is below taxable threshold. No optimisation needed.'}

    max_deductions = (
        SECTION_80C_LIMIT + SECTION_80D_LIMIT_SELF
        + NPS_80CCD_LIMIT + STANDARD_DEDUCTION
    )
    best_taxable = max(annual_income - max_deductions, 0)
    best_tax = _compute_tax(best_taxable, OLD_REGIME_SLABS)

    current_80c = min(deductions.get('80C', 0) + deductions.get('section_80c', 0), SECTION_80C_LIMIT)
    current_80d = min(deductions.get('80D', 0) + deductions.get('section_80d', 0),
                      SECTION_80D_LIMIT_SELF + SECTION_80D_LIMIT_PARENTS)
    current_nps = min(deductions.get('80CCD', 0) + deductions.get('nps', 0), NPS_80CCD_LIMIT)
    current_hra = deductions.get('HRA', 0) + deductions.get('hra', 0)
    user_total = current_80c + current_80d + current_nps + current_hra + STANDARD_DEDUCTION
    user_taxable = max(annual_income - user_total, 0)
    user_tax = _compute_tax(user_taxable, OLD_REGIME_SLABS)

    max_saving = baseline_tax - best_tax
    user_saving = baseline_tax - user_tax
    if max_saving <= 0:
        score = 100
    else:
        score = min(round(user_saving / max_saving * 100), 100)

    missing = []
    if current_80c < SECTION_80C_LIMIT:
        missing.append(f'80C (₹{SECTION_80C_LIMIT - current_80c:,.0f} remaining)')
    if current_nps < NPS_80CCD_LIMIT:
        missing.append(f'NPS 80CCD (₹{NPS_80CCD_LIMIT - current_nps:,.0f} remaining)')
    if current_80d < SECTION_80D_LIMIT_SELF:
        missing.append(f'80D Health (₹{SECTION_80D_LIMIT_SELF - current_80d:,.0f} remaining)')

    if score >= 80:
        advice = f'Tax efficiency is strong ({score}%). You are utilising most available deductions.'
    elif score >= 50:
        advice = (f'Tax efficiency is moderate ({score}%). '
                  f'Consider maximising: {", ".join(missing[:2])}.')
    else:
        advice = (f'Tax efficiency is low ({score}%). '
                  f'Significant savings possible via: {", ".join(missing[:3])}.')

    return {'score': score, 'advice': advice}


def optimize_tax(profile: dict) -> dict:
    income = profile.get('annual_income', 0)
    deductions = profile.get('deductions', {})
    regime_pref = profile.get('regime_preference', 'auto')
    risk_tolerance = profile.get('risk_tolerance', 'moderate')

    old_result = _compute_old_regime(income, deductions)
    new_result = _compute_new_regime(income)

    if regime_pref == 'auto':
        recommended = 'old' if old_result['tax'] <= new_result['tax'] else 'new'
    else:
        recommended = regime_pref

    savings = abs(old_result['tax'] - new_result['tax'])
    suggestions = _suggest_instruments(income, deductions, risk_tolerance)

    total_potential_saved = sum(s.get('potential_tax_saved', 0) for s in suggestions)

    ai_explanation = generate_tax_strategy(income, deductions, recommended)

    return {
        'old_regime': old_result,
        'new_regime': new_result,
        'recommended_regime': recommended,
        'regime_savings': savings,
        'suggestions': suggestions,
        'total_potential_tax_saved': total_potential_saved,
        'ai_explanation': ai_explanation,
    }
