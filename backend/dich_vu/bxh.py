# backend/dich_vu/bxh.py
import json
from datetime import datetime, timezone

from cau_hinh import LEAGUE_MAP, STANDINGS_CACHE_TTL_SEC
from csdl import meta_get, meta_set, fetch_all, T
from dich_vu.bong_da_data import fd_get


def _cache_key(league: str, season_year: int) -> str:
    return f"standings_cache::{league.upper()}::{int(season_year)}"


def _cache_ts_key(league: str, season_year: int) -> str:
    return f"standings_cache_ts::{league.upper()}::{int(season_year)}"


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


def cache_set(league: str, season_year: int, standings):
    meta_set(_cache_key(league, season_year), json.dumps(standings, ensure_ascii=False))
    meta_set(
        _cache_ts_key(league, season_year),
        datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
    )


def dung_ttl(age_sec):
    return age_sec is not None and age_sec < STANDINGS_CACHE_TTL_SEC


def _parse_form(s: str | None):
    s = (s or "").strip()
    if not s:
        return []
    return [x.strip().upper() for x in s.split(",") if x.strip()]


def _next_map_from_db(competition: str, season_year: int):
    # ✅ lấy cả TIMED + SCHEDULED
    rows = fetch_all(
        f"""
        SELECT id, utc_date, matchday,
               home_team_id, away_team_id,
               home_name, away_name,
               home_crest, away_crest,
               competition, season
        FROM {T('matches')}
        WHERE (status='SCHEDULED' OR status='TIMED')
          AND competition=?
          AND (season=? OR season IS NULL)
        ORDER BY utc_date ASC
        """,
        (competition, int(season_year)),
    )

    mp = {}
    for m in rows:
        hid = m.get("home_team_id")
        aid = m.get("away_team_id")

        if hid and hid not in mp:
            mp[hid] = {
                "match_id": m.get("id"),
                "utc_date": m.get("utc_date"),
                "matchday": m.get("matchday"),
                "opponent_id": aid,
                "opponent_name": m.get("away_name"),
                "opponent_crest": m.get("away_crest"),
                "is_home": True,
            }

        if aid and aid not in mp:
            mp[aid] = {
                "match_id": m.get("id"),
                "utc_date": m.get("utc_date"),
                "matchday": m.get("matchday"),
                "opponent_id": hid,
                "opponent_name": m.get("home_name"),
                "opponent_crest": m.get("home_crest"),
                "is_home": False,
            }

        if len(mp) >= 40:
            break

    return mp


def standings_from_fd(league_code: str, season_year: int):
    comp = LEAGUE_MAP.get(league_code.upper(), league_code.upper())
    data = fd_get(f"/competitions/{comp}/standings", params={"season": int(season_year)})

    blocks = data.get("standings") or []
    by_type = {}
    for b in blocks:
        t = (b.get("type") or "").upper()
        by_type[t] = b.get("table") or []

    def map_row(r):
        team = r.get("team") or {}
        return {
            "pos": r.get("position"),
            "team_id": team.get("id"),
            "team": team.get("shortName") or team.get("name") or "Unknown",
            "short": (team.get("tla") or "").strip() or None,
            "crest": team.get("crest") or "",
            "pld": r.get("playedGames") or 0,
            "w": r.get("won") or 0,
            "d": r.get("draw") or 0,
            "l": r.get("lost") or 0,
            "gf": r.get("goalsFor") or 0,
            "ga": r.get("goalsAgainst") or 0,
            "gd": r.get("goalDifference") or 0,
            "pts": r.get("points") or 0,
            "form": _parse_form(r.get("form")),
        }

    total = [map_row(x) for x in by_type.get("TOTAL", [])]
    home = [map_row(x) for x in by_type.get("HOME", [])]
    away = [map_row(x) for x in by_type.get("AWAY", [])]

    def key_of(row):
        return str(row.get("team_id") or "") + "|" + (row.get("short") or "") + "|" + (row.get("team") or "")

    home_map = {key_of(x): x for x in home}
    away_map = {key_of(x): x for x in away}

    # ✅ map crest/name từ standings để fallback cho opponent (tránh crest rỗng -> UI hiện —)
    crest_by_id = {r.get("team_id"): r.get("crest") for r in total if r.get("team_id")}
    name_by_id = {r.get("team_id"): r.get("team") for r in total if r.get("team_id")}

    next_map = _next_map_from_db("PL", season_year) if league_code.upper() == "PL" else {}

    out = []
    for r in total:
        k = key_of(r)
        nxt = next_map.get(r.get("team_id"))

        # ✅ Fallback: nếu opponent crest/name thiếu thì lấy từ standings
        if nxt:
            oid = nxt.get("opponent_id")
            if oid and not (nxt.get("opponent_crest") or "").strip():
                nxt["opponent_crest"] = crest_by_id.get(oid) or ""
            if oid and not (nxt.get("opponent_name") or "").strip():
                nxt["opponent_name"] = name_by_id.get(oid) or nxt.get("opponent_name")

        out.append(
            {
                **r,
                "home": home_map.get(k),
                "away": away_map.get(k),
                "next": nxt,
            }
        )
    return out