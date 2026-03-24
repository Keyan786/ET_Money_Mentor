from typing import Optional

import requests
from backend.config import EULERPOOL_API_KEY, EULERPOOL_BASE_URL
from backend.services.cache import cache, Cache

FALLBACK_INFLATION = 6.0
FALLBACK_GDP_GROWTH = 6.5
FALLBACK_INTEREST_RATE = 6.5


def _get(endpoint: str, params: Optional[dict] = None) -> dict:
    params = params or {}
    key = Cache.make_key('euler', endpoint, params)
    cached = cache.get(key)
    if cached is not None:
        return cached
    headers = {'Authorization': f'Bearer {EULERPOOL_API_KEY}'}
    try:
        resp = requests.get(
            f"{EULERPOOL_BASE_URL}/{endpoint}",
            params=params,
            headers=headers,
            timeout=15,
        )
        resp.raise_for_status()
        data = resp.json()
        cache.set(key, data, ttl=Cache.DEFAULT_TTLS['economic'])
        return data
    except Exception:
        return {}


def get_inflation_rate(country: str = 'IN') -> float:
    data = _get('inflation', {'country': country})
    try:
        return float(data.get('rate', FALLBACK_INFLATION))
    except (TypeError, ValueError):
        return FALLBACK_INFLATION


def get_gdp_growth(country: str = 'IN') -> float:
    data = _get('gdp-growth', {'country': country})
    try:
        return float(data.get('rate', FALLBACK_GDP_GROWTH))
    except (TypeError, ValueError):
        return FALLBACK_GDP_GROWTH


def get_interest_rate(country: str = 'IN') -> float:
    data = _get('interest-rate', {'country': country})
    try:
        return float(data.get('rate', FALLBACK_INTEREST_RATE))
    except (TypeError, ValueError):
        return FALLBACK_INTEREST_RATE


def get_economic_summary(country: str = 'IN') -> dict:
    return {
        'inflation_rate': get_inflation_rate(country),
        'gdp_growth': get_gdp_growth(country),
        'interest_rate': get_interest_rate(country),
        'country': country,
    }
