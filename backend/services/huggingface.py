import re
import requests
from backend.config import HUGGINGFACE_API_KEY, HUGGINGFACE_CHAT_URL, HUGGINGFACE_MODEL

HEADERS = {
    'Authorization': f'Bearer {HUGGINGFACE_API_KEY}',
    'Content-Type': 'application/json',
}

SYSTEM_PROMPT = (
    "You are a certified financial planner and investment advisor. "
    "Provide clear, specific, and actionable financial advice. "
    "Use plain English. Avoid jargon unless you explain it. "
    "Structure your response with numbered points. "
    "Do NOT use any markdown formatting such as **, ##, ###, or bullet symbols. "
    "Use plain numbered lists (1. 2. 3.) and plain text only."
)


def _clean_markdown(text: str) -> str:
    text = re.sub(r'\*\*\*(.+?)\*\*\*', r'\1', text)
    text = re.sub(r'\*\*(.+?)\*\*', r'\1', text)
    text = re.sub(r'\*(.+?)\*', r'\1', text)
    text = re.sub(r'^#{1,4}\s*', '', text, flags=re.MULTILINE)
    text = re.sub(r'^[-*]\s+', '- ', text, flags=re.MULTILINE)
    return text.strip()


def _query(user_prompt: str, max_tokens: int = 1024) -> str:
    payload = {
        'model': HUGGINGFACE_MODEL,
        'messages': [
            {'role': 'system', 'content': SYSTEM_PROMPT},
            {'role': 'user', 'content': user_prompt},
        ],
        'max_tokens': max_tokens,
        'temperature': 0.7,
        'top_p': 0.9,
        'stream': False,
    }
    try:
        resp = requests.post(
            HUGGINGFACE_CHAT_URL, headers=HEADERS,
            json=payload, timeout=90,
        )
        resp.raise_for_status()
        result = resp.json()
        choices = result.get('choices', [])
        if choices:
            raw = choices[0].get('message', {}).get('content', '').strip()
            return _clean_markdown(raw)
        return str(result)
    except Exception as e:
        return f"AI analysis unavailable: {str(e)}"


def generate_fire_summary(profile: dict, projections: dict) -> str:
    prompt = (
        f"Analyze this FIRE (Financial Independence, Retire Early) plan:\n"
        f"- Age: {profile.get('age')}, Target retirement: {profile.get('target_age')}\n"
        f"- Monthly income: ₹{profile.get('monthly_income'):,}\n"
        f"- Monthly expenses: ₹{profile.get('monthly_expenses'):,}\n"
        f"- Current savings: ₹{profile.get('current_savings'):,}\n"
        f"- Risk tolerance: {profile.get('risk_tolerance')}\n"
        f"- FIRE number: ₹{projections.get('fire_number'):,}\n"
        f"- Projected FIRE date: {projections.get('fire_date')}\n"
        f"- Monthly SIP needed: ₹{projections.get('monthly_sip'):,}\n\n"
        f"Provide: 1) Feasibility assessment, 2) Key risks to watch, "
        f"3) Three actionable next steps. Keep it concise (under 200 words)."
    )
    return _query(prompt, max_tokens=800)


def generate_risk_warning(profile: dict) -> str:
    prompt = (
        f"Evaluate financial risks for this profile:\n"
        f"- Monthly income: ₹{profile.get('monthly_income'):,}\n"
        f"- Monthly expenses: ₹{profile.get('monthly_expenses'):,}\n"
        f"- Total debt/EMIs: ₹{profile.get('total_debt', 0):,}\n"
        f"- Emergency fund: ₹{profile.get('emergency_fund', 0):,}\n"
        f"- Investments: ₹{profile.get('current_investments', 0):,}\n\n"
        f"Flag specific risks (high debt-to-income, no emergency fund, "
        f"over-concentration) with severity levels (Critical/High/Medium/Low). "
        f"Keep it concise (under 150 words)."
    )
    return _query(prompt, max_tokens=600)


def generate_investment_explanation(allocation: dict, funds: list) -> str:
    fund_list = '\n'.join(
        f"  - {f['name']} (CAGR: {f.get('cagr_5y', 'N/A')}%)"
        for f in funds
    )
    prompt = (
        f"Explain this investment allocation in plain English:\n"
        f"- Equity: {allocation.get('equity', 0)}%\n"
        f"- Debt: {allocation.get('debt', 0)}%\n"
        f"- Gold: {allocation.get('gold', 0)}%\n\n"
        f"Recommended funds:\n{fund_list}\n\n"
        f"Explain why each asset class was chosen and what each fund does. "
        f"Keep it simple and concise (under 200 words)."
    )
    return _query(prompt, max_tokens=800)


def generate_tax_strategy(income: float, deductions: dict, regime: str) -> str:
    ded_lines = '\n'.join(
        f"  - {k}: ₹{v:,}" for k, v in deductions.items() if v > 0
    )
    prompt = (
        f"Create a step-by-step tax-saving action plan:\n"
        f"- Annual income: ₹{income:,}\n"
        f"- Preferred regime: {regime}\n"
        f"- Current deductions:\n{ded_lines or '  None'}\n\n"
        f"Suggest specific instruments (ELSS, PPF, NPS, health insurance, HRA) "
        f"with estimated savings per instrument. Keep it concise (under 200 words)."
    )
    return _query(prompt, max_tokens=800)


def generate_health_summary(scores: dict, profile: dict) -> str:
    score_lines = '\n'.join(f"  - {k}: {v}/100" for k, v in scores.items())
    prompt = (
        f"Summarize this financial health assessment:\n"
        f"Dimension scores:\n{score_lines}\n\n"
        f"Profile: income ₹{profile.get('monthly_income', 0):,}/month, "
        f"expenses ₹{profile.get('monthly_expenses', 0):,}/month, "
        f"debt ₹{profile.get('total_debt', 0):,}/month\n\n"
        f"Highlight the weakest areas and provide 3 prioritized improvement steps. "
        f"Keep it concise (under 200 words)."
    )
    return _query(prompt, max_tokens=800)
