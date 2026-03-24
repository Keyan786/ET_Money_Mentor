from typing import Optional

import requests
from backend.config import ALPHA_VANTAGE_API_KEY, ALPHA_VANTAGE_BASE_URL
from backend.services.cache import cache, Cache


def _get(params: dict) -> dict:
    params['apikey'] = ALPHA_VANTAGE_API_KEY
    key = Cache.make_key('av', params.get('function', 'query'), params)
    cached = cache.get(key)
    if cached is not None:
        return cached
    resp = requests.get(ALPHA_VANTAGE_BASE_URL, params=params, timeout=15)
    resp.raise_for_status()
    data = resp.json()
    cache.set(key, data, ttl=Cache.DEFAULT_TTLS['market'])
    return data


def get_daily_series(symbol: str, outputsize: str = 'compact') -> dict:
    return _get({
        'function': 'TIME_SERIES_DAILY',
        'symbol': symbol,
        'outputsize': outputsize,
    })


def get_sector_performance() -> dict:
    return _get({'function': 'SECTOR'})


def get_company_overview(symbol: str) -> dict:
    return _get({'function': 'OVERVIEW', 'symbol': symbol})


def get_market_overview() -> dict:
    """Return a summary dict with sector performance and key indices."""
    try:
        sector_data = get_sector_performance()
        realtime = sector_data.get('Rank A: Real-Time Performance', {})
        return {
            'sectors': realtime,
            'source': 'Alpha Vantage',
        }
    except Exception as e:
        return {'error': str(e), 'sectors': {}}


def compute_historical_return(symbol: str, years: int = 5) -> Optional[float]:
    """Compute annualised return from daily close prices over the given years."""
    try:
        data = get_daily_series(symbol, 'full')
        ts = data.get('Time Series (Daily)', {})
        if not ts:
            return None
        dates = sorted(ts.keys())
        if len(dates) < 2:
            return None
        latest_close = float(ts[dates[-1]]['4. close'])
        target_idx = max(0, len(dates) - years * 252)
        old_close = float(ts[dates[target_idx]]['4. close'])
        if old_close == 0:
            return None
        total_return = latest_close / old_close
        annualised = total_return ** (1.0 / years) - 1.0
        return round(annualised * 100, 2)
    except Exception:
        return None
