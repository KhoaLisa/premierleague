# backend/tuyen/tran_dau.py
from flask import Blueprint, jsonify, request

# Giữ tên get_upcoming_matches cho đúng code cũ
from csdl import get_upcoming_matches

bp_tran_dau = Blueprint("tran_dau", __name__)


@bp_tran_dau.get("/api/matches/upcoming")
def api_upcoming_matches():
    try:
        limit = int(request.args.get("limit", 10))
    except Exception:
        limit = 10

    rows = get_upcoming_matches(limit=limit)

    return jsonify(
        {
            "ok": True,
            "limit": limit,
            "count": len(rows),
            "matches": rows,
        }
    )