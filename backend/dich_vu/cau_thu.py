# backend/dich_vu/cau_thu.py
import json
from datetime import datetime, timezone

from cau_hinh import LEAGUE_MAP
from csdl import meta_get, meta_set
from dich_vu.bong_da_data import fd_get

# cache lâu hơn vì players rất nặng (gọi ~20 đội)
PLAYERS_CACHE_TTL_SEC = 24 * 60 * 60  # 24h


def _cache_key(league: str, season_year: int) -> str:
    return f"players_cache::{league.upper()}::{int(season_year)}"


def _cache_ts_key(league: str, season_year: int) -> str:
    return f"players_cache_ts::{league.upper()}::{int(season_year)}"


def cache_get(league: str, season_year: int):
    raw = meta_get(_cache_key(league, season_year))
    ts = meta_get(_cache_ts_key(league, season_year))
    if not raw or not ts:
        return None, None
    try:
        ts_dt = datetime.fromisoformat(ts)
        if ts_dt.tzinfo is None:
            ts_dt = ts_dt.replace(tzinfo=timezone.utc)
        age = (datetime.now(timezone.utc) - ts_dt).total_seconds()
        return json.loads(raw), age
    except Exception:
        return None, None


def cache_set(league: str, season_year: int, items):
    meta_set(_cache_key(league, season_year), json.dumps(items, ensure_ascii=False))
    meta_set(
        _cache_ts_key(league, season_year),
        datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
    )


def dung_ttl(age_sec):
    return age_sec is not None and age_sec < PLAYERS_CACHE_TTL_SEC


def players_from_fd(league_code: str, season_year: int):
    comp = LEAGUE_MAP.get(league_code.upper(), league_code.upper())

    # 1) lấy danh sách đội trong giải/mùa
    data = fd_get(f"/competitions/{comp}/teams", params={"season": int(season_year)}, timeout=25)
    teams = data.get("teams") or []

    out = []
    for t in teams:
        team_id = t.get("id")
        if not team_id:
            continue

        # fallback club info từ list teams
        club_name = t.get("shortName") or t.get("name") or ""
        club_crest = t.get("crest") or ""

        # 2) lấy squad của từng đội
        try:
            td = fd_get(f"/teams/{team_id}", timeout=25)
            squad = td.get("squad") or []
            # ưu tiên lấy crest/name từ team detail nếu có
            club_name = (td.get("shortName") or td.get("name") or club_name) or club_name
            club_crest = (td.get("crest") or club_crest) or club_crest
        except Exception:
            squad = []

        for p in squad:
            name = (p.get("name") or "").strip()
            if not name:
                continue

            pid = p.get("id")
            position = (p.get("position") or "").strip()
            nationality = (p.get("nationality") or "").strip()

            # football-data thường không có ảnh cầu thủ
            photo_url = p.get("photo") or p.get("photoUrl") or None

            out.append(
                {
                    "id": pid or f"{team_id}-{name}",
                    "name": name,
                    "position": position,
                    "nationality": nationality,
                    "photo_url": photo_url,
                    "club": {"id": team_id, "name": club_name, "crest": club_crest},
                }
            )

    return out