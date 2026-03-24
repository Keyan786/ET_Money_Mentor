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
STANDARD_DEDUCTION = 75000

TAX_INSTRUMENTS = [
    {
        'section': '80C',
        'name': 'ELSS Mutual Funds',
        'limit': SECTION_80C_LIMIT,
        'description': 'Equity-linked savings scheme with 3-year lock-in. Best for tax saving + wealth creation.',
        'priority': 1,
    },
    {
        'section': '80C',
        'name': 'PPF (Public Provident Fund)',
        'limit': SECTION_80C_LIMIT,
        'description': 'Risk-free savings with 15-year lock-in. Good for conservative investors.',
        'priority': 2,
    },
    {
        'section': '80C',
        'name': 'EPF / VPF',
        'limit': SECTION_80C_LIMIT,
        'description': 'Employee Provident Fund contributions. Usually auto-deducted from salary.',
        'priority': 3,
    },
    {
        'section': '80CCD(1B)',
        'name': 'NPS (National Pension System)',
        'limit': NPS_80CCD_LIMIT,
        'description': 'Additional ₹50,000 deduction over 80C. Locked until 60.',
        'priority': 4,
    },
    {
        'section': '80D',
        'name': 'Health Insurance (Self & Family)',
        'limit': SECTION_80D_LIMIT_SELF,
        'description': 'Premiums for health insurance. Essential coverage + tax benefit.',
        'priority': 5,
    },
    {
        'section': '80D',
        'name': 'Health Insurance (Parents)',
        'limit': SECTION_80D_LIMIT_PARENTS,
        'description': 'Premiums for parents\' health insurance. Higher limit for senior citizens.',
        'priority': 6,
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
    total_80c = min(
        deductions.get('80C', 0),
        SECTION_80C_LIMIT,
    )
    total_80d = min(
        deductions.get('80D', 0),
        SECTION_80D_LIMIT_SELF + SECTION_80D_LIMIT_PARENTS,
    )
    nps = min(deductions.get('80CCD', 0), NPS_80CCD_LIMIT)
    hra = deductions.get('HRA', 0)

    total_deductions = total_80c + total_80d + nps + hra + STANDARD_DEDUCTION
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


def _suggest_instruments(income: float, deductions: dict) -> List[dict]:
    suggestions = []
    current_80c = deductions.get('80C', 0)
    current_80d = deductions.get('80D', 0)
    current_nps = deductions.get('80CCD', 0)

    # Edge case: income below taxable threshold
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

    # Edge case: already maxed 80C
    if current_80c < SECTION_80C_LIMIT:
        gap = SECTION_80C_LIMIT - current_80c
        tax_saved = round(gap * 0.30)
        suggestions.append({
            'section': '80C',
            'name': 'ELSS / PPF',
            'potential_investment': gap,
            'potential_tax_saved': tax_saved,
            'description': f'Invest ₹{gap:,} more in 80C instruments to fully utilise the limit.',
        })

    if current_nps < NPS_80CCD_LIMIT:
        gap = NPS_80CCD_LIMIT - current_nps
        tax_saved = round(gap * 0.30)
        suggestions.append({
            'section': '80CCD(1B)',
            'name': 'NPS',
            'potential_investment': gap,
            'potential_tax_saved': tax_saved,
            'description': f'Invest ₹{gap:,} in NPS for additional deduction beyond 80C.',
        })

    if current_80d < SECTION_80D_LIMIT_SELF:
        gap = SECTION_80D_LIMIT_SELF - current_80d
        tax_saved = round(gap * 0.30)
        suggestions.append({
            'section': '80D',
            'name': 'Health Insurance',
            'potential_investment': gap,
            'potential_tax_saved': tax_saved,
            'description': f'Get health insurance worth ₹{gap:,}/year premium for coverage + tax saving.',
        })

    # Edge case: no HRA — skip HRA suggestion
    has_hra = deductions.get('HRA', 0) > 0 or deductions.get('has_hra_component', False)
    if not has_hra:
        pass  # Intentionally skip HRA suggestions for non-HRA users

    return suggestions


def optimize_tax(profile: dict) -> dict:
    income = profile.get('annual_income', 0)
    deductions = profile.get('deductions', {})
    regime_pref = profile.get('regime_preference', 'auto')

    old_result = _compute_old_regime(income, deductions)
    new_result = _compute_new_regime(income)

    if regime_pref == 'auto':
        recommended = 'old' if old_result['tax'] <= new_result['tax'] else 'new'
    else:
        recommended = regime_pref

    savings = abs(old_result['tax'] - new_result['tax'])
    suggestions = _suggest_instruments(income, deductions)

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
