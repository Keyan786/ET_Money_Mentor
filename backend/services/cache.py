import time
import hashlib
import json
from typing import Optional


class Cache:
    """TTL-based in-memory cache with parameterized keys."""

    DEFAULT_TTLS = {
        'market': 900,       # 15 minutes
        'mf': 3600,          # 1 hour
        'economic': 86400,   # 24 hours
    }

    def __init__(self):
        self._store = {}

    @staticmethod
    def make_key(service: str, endpoint: str, params: Optional[dict] = None) -> str:
        base = f"{service}_{endpoint}"
        if params:
            param_str = json.dumps(params, sort_keys=True)
            param_hash = hashlib.md5(param_str.encode()).hexdigest()[:8]
            return f"{base}_{param_hash}"
        return base

    def get(self, key: str):
        entry = self._store.get(key)
        if entry is None:
            return None
        if time.time() > entry['expires_at']:
            del self._store[key]
            return None
        return entry['value']

    def set(self, key: str, value, ttl: int = 900):
        self._store[key] = {
            'value': value,
            'expires_at': time.time() + ttl,
        }

    def invalidate(self, key: str):
        self._store.pop(key, None)

    def clear(self):
        self._store.clear()


cache = Cache()
