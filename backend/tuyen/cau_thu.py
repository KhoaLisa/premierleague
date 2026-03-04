# backend/tuyen/cau_thu.py
from flask import Blueprint, jsonify, request

from cau_hinh import MAX_START_YEAR, FOOTBALL_DATA_TOKEN
from dich_vu.bong_da_data import utcnow_iso_z
from dich_vu.cau_thu import cache_get, cache_set, dung_ttl, players_from_fd

bp_cau_thu = Blueprint("bp_cau_thu", __name__)


@bp_cau_thu.get("/api/players")
def api_players():
    league = (request.args.get("league", "PL") or "PL").upper()
    season_raw = (request.args.get("season", "") or "").strip()

    try:
        season_year = int(season_raw)
    except Exception:
        season_year = None

    if season_year is None:
        return jsonify({"items": [], "total": 0, "error": "season missing/invalid", "updatedAt": utcnow_iso_z()}), 400

    if season_year > MAX_START_YEAR:
        return jsonify({"items": [], "total": 0, "error": f"Only seasons <= {MAX_START_YEAR} allowed", "updatedAt": utcnow_iso_z()}), 400

    q = (request.args.get("q", "") or "").strip().lower()
    club_id = (request.args.get("club_id", "") or "").strip()
    position = (request.args.get("position", "") or "").strip().lower()

    limit = request.args.get("limit", type=int) or 50
    offset = request.args.get("offset", type=int) or 0
    refresh = (request.args.get("refresh", "") or "").strip() in ("1", "true", "yes")

    # cache
    cached, age = cache_get(league, season_year)
    if cached is not None and dung_ttl(age) and not refresh:
        items_all = cached
        source = f"cache ({league}/{season_year})"
    else:
        if not FOOTBALL_DATA_TOKEN:
            if cached is not None:
                items_all = cached
                source = f"cache-stale (no token) ({league}/{season_year})"
            else:
                return jsonify({"items": [], "total": 0, "error": "Missing FOOTBALL_DATA_TOKEN", "updatedAt": utcnow_iso_z()}), 500
        else:
            try:
                items_all = players_from_fd(league, season_year)
                cache_set(league, season_year, items_all)
                source = f"football-data ({league}/{season_year})"
            except Exception as e:
                if cached is not None:
                    items_all = cached
                    source = f"cache-stale (fd failed) ({league}/{season_year})"
                else:
                    return jsonify({"items": [], "total": 0, "error": str(e), "updatedAt": utcnow_iso_z()}), 502

    # filter
    items = items_all
    if q:
        items = [it for it in items if q in (it.get("name") or "").lower()]
    if club_id:
        items = [it for it in items if str((it.get("club") or {}).get("id") or "") == club_id]
    if position:
        items = [it for it in items if (it.get("position") or "").lower() == position]

    total = len(items)
    items = items[offset : offset + limit]

    return jsonify(
        {
            "items": items,
            "total": total,
            "source": source,
            "updatedAt": utcnow_iso_z(),
        }
    )