# backend/dich_vu/bong_da_data.py
import requests
from datetime import datetime, timezone

from cau_hinh import FOOTBALL_DATA_TOKEN, FD_BASE


def fd_headers():
    if not FOOTBALL_DATA_TOKEN:
        return None
    return {"X-Auth-Token": FOOTBALL_DATA_TOKEN}


def fd_get(path: str, params=None, timeout=25):
    headers = fd_headers()
    if not headers:
        raise RuntimeError("Thiếu FOOTBALL_DATA_TOKEN")

    url = f"{FD_BASE}{path}"
    r = requests.get(url, headers=headers, params=params or {}, timeout=timeout)

    if r.status_code >= 400:
        raise RuntimeError(f"football-data HTTP {r.status_code}: {r.text[:220]}")
    return r.json()


def utcnow_iso_z():
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def norm_utc(iso_utc: str) -> str:
    s = (iso_utc or "").strip()
    if s.endswith("Z"):
        s = s[:-1] + "+00:00"
    return s