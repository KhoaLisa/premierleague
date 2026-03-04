# backend/tuyen/thong_ke.py
from flask import Blueprint, jsonify, request
from stats_db import get_seasons, get_stats

bp_thong_ke = Blueprint("bp_thong_ke", __name__)


@bp_thong_ke.get("/api/seasons")
def api_seasons():
    return jsonify({"ok": True, "data": get_seasons()})


@bp_thong_ke.get("/api/stats")
def api_stats():
    season_id = request.args.get("season_id", type=int) or request.args.get("seasonId", type=int) or request.args.get("id", type=int)

    if not season_id:
        seasons = get_seasons()
        if not seasons:
            return jsonify({"ok": False, "message": "Chưa có mùa giải."}), 400
        season_id = seasons[0].get("mua_giai_id") or seasons[0].get("id")

    return jsonify(get_stats(int(season_id)))