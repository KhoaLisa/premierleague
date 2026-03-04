# backend/tuyen/mua_giai.py
from datetime import datetime, timezone
from flask import Blueprint, jsonify, request

from cau_hinh import FOOTBALL_DATA_TOKEN, LEAGUE_MAP, MAX_START_YEAR
from dich_vu.bong_da_data import fd_get

bp_mua_giai = Blueprint("bp_mua_giai", __name__)


def _to_int_year(date_str: str):
    try:
        return int((date_str or "")[:4])
    except Exception:
        return None


def _season_label(y: int):
    return f"{y}/{str(y + 1)[-2:]}"


@bp_mua_giai.get("/api/available-seasons")
def api_available_seasons():
    league = (request.args.get("league", "PL") or "PL").upper()
    code = LEAGUE_MAP.get(league, "PL")

    options = []
    source = "football-data"
    err = None

    if FOOTBALL_DATA_TOKEN:
        try:
            comp = fd_get(f"/competitions/{code}")
            seasons = comp.get("seasons") or []
            for s in seasons:
                y = _to_int_year(s.get("startDate") or "")
                if not y:
                    continue
                if y > MAX_START_YEAR:
                    continue
                options.append({"value": y, "label": _season_label(y)})

            options.sort(key=lambda x: x["value"], reverse=True)
        except Exception as e:
            err = str(e)

    # fallback nếu token lỗi/quota
    if not options:
        source = "fallback"
        now_y = datetime.now(timezone.utc).year
        top = min(MAX_START_YEAR, now_y)
        options = [{"value": y, "label": _season_label(y)} for y in range(top, top - 6, -1)]

    return jsonify(
        {
            "ok": True,
            "league": league,
            "competition": code,
            "max_start_year": MAX_START_YEAR,
            "source": source,
            "error": err,
            "data": options,
        }
    )