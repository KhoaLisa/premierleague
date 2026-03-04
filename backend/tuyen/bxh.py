# backend/tuyen/bxh.py
from flask import Blueprint, jsonify, request

from cau_hinh import MAX_START_YEAR, FOOTBALL_DATA_TOKEN
from dich_vu.bong_da_data import utcnow_iso_z
from dich_vu.bxh import cache_get, cache_set, dung_ttl, standings_from_fd

# ✅ add
from dich_vu.tran_dau import sync_pl_upcoming_if_needed

bp_bxh = Blueprint("bp_bxh", __name__)


@bp_bxh.get("/api/standings")
def api_standings():
    league = (request.args.get("league", "PL") or "PL").upper()
    season_raw = (request.args.get("season", "") or "").strip()

    try:
        season_year = int(season_raw)
    except Exception:
        season_year = None

    if season_year is None:
        return jsonify({"ok": False, "error": "season is missing/invalid", "updatedAt": utcnow_iso_z(), "standings": []}), 400

    if season_year > MAX_START_YEAR:
        return jsonify({"ok": False, "error": f"Only seasons <= {MAX_START_YEAR} allowed", "updatedAt": utcnow_iso_z(), "standings": []}), 400

    # ✅ sync upcoming matches để có data "next" (PL)
    if league == "PL" and FOOTBALL_DATA_TOKEN:
        try:
            sync_pl_upcoming_if_needed()
        except Exception:
            pass

    cached, age = cache_get(league, season_year)
    if cached is not None and dung_ttl(age):
        return jsonify({"ok": True, "source": f"cache ({league}/{season_year})", "updatedAt": utcnow_iso_z(), "standings": cached})

    if not FOOTBALL_DATA_TOKEN:
        if cached is not None:
            return jsonify({"ok": True, "source": f"cache-stale (no token) ({league}/{season_year})", "updatedAt": utcnow_iso_z(), "standings": cached})
        return jsonify({"ok": False, "error": "Missing FOOTBALL_DATA_TOKEN", "updatedAt": utcnow_iso_z(), "standings": []}), 500

    try:
        standings = standings_from_fd(league, season_year)
        cache_set(league, season_year, standings)
        return jsonify({"ok": True, "source": f"football-data ({league}/{season_year})", "updatedAt": utcnow_iso_z(), "standings": standings})
    except Exception as e:
        if cached is not None:
            return jsonify({"ok": True, "source": f"cache-stale (fd failed) ({league}/{season_year})", "error": str(e), "updatedAt": utcnow_iso_z(), "standings": cached})
        return jsonify({"ok": False, "source": f"football-data failed ({league}/{season_year})", "error": str(e), "updatedAt": utcnow_iso_z(), "standings": []}), 502