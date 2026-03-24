from typing import Optional, List

import requests
from backend.config import MFAPI_BASE_URL
from backend.services.cache import cache, Cache

RECOMMENDED_FUNDS = {
    'equity': [
        {'code': '119551', 'name': 'SBI Bluechip Fund - Direct Growth'},
        {'code': '120503', 'name': 'Mirae Asset Large Cap Fund - Direct Growth'},
        {'code': '118989', 'name': 'Parag Parikh Flexi Cap Fund - Direct Growth'},
    ],
    'debt': [
        {'code': '119237', 'name': 'HDFC Short Term Debt Fund - Direct Growth'},
        {'code': '120837', 'name': 'ICICI Prudential Corporate Bond Fund - Direct Growth'},
    ],
    'gold': [
        {'code': '135608', 'name': 'SBI Gold Fund - Direct Growth'},
    ],
}


def get_fund_data(scheme_code: str) -> dict:
    key = Cache.make_key('mf', 'nav', {'code': scheme_code})
    cached = cache.get(key)
    if cached is not None:
        return cached
    try:
        resp = requests.get(f"{MFAPI_BASE_URL}/{scheme_code}", timeout=15)
        resp.raise_for_status()
        data = resp.json()
        cache.set(key, data, ttl=Cache.DEFAULT_TTLS['mf'])
        return data
    except Exception as e:
        return {'error': str(e)}


def get_fund_nav(scheme_code: str) -> Optional[float]:
    data = get_fund_data(scheme_code)
    nav_list = data.get('data', [])
    if nav_list:
        try:
            return float(nav_list[0]['nav'])
        except (KeyError, ValueError, IndexError):
            return None
    return None


def compute_fund_cagr(scheme_code: str, years: int = 5) -> Optional[float]:
    """Compute CAGR from historical NAV data."""
    data = get_fund_data(scheme_code)
    nav_list = data.get('data', [])
    if not nav_list or len(nav_list) < 2:
        return None
    try:
        latest_nav = float(nav_list[0]['nav'])
        target_idx = min(len(nav_list) - 1, years * 252)
        old_nav = float(nav_list[target_idx]['nav'])
        if old_nav == 0:
            return None
        cagr = (latest_nav / old_nav) ** (1.0 / years) - 1.0
        return round(cagr * 100, 2)
    except (ValueError, IndexError, KeyError):
        return None


def get_recommended_funds_with_nav(asset_class: str) -> List[dict]:
    funds = RECOMMENDED_FUNDS.get(asset_class, [])
    result = []
    for fund in funds:
        nav = get_fund_nav(fund['code'])
        cagr = compute_fund_cagr(fund['code'])
        result.append({
            'code': fund['code'],
            'name': fund['name'],
            'nav': nav,
            'cagr_5y': cagr,
        })
    return result
