from flask import Blueprint, jsonify, request

from cau_hinh import FOOTBALL_DATA_TOKEN, LEAGUE_MAP
from dich_vu.bong_da_data import fd_get

bp_doi = Blueprint("bp_doi", __name__)


@bp_doi.get("/api/teams")
def api_teams():
    """Danh sách CLB theo league/season."""
    league = (request.args.get("league", "PL") or "PL").upper()
    season_raw = (request.args.get("season", "") or "").strip()

    season_year = None
    if season_raw:
        try:
            season_year = int(season_raw)
        except Exception:
            season_year = None

    # ✅ Không có token: trả rỗng để frontend không crash
    if not FOOTBALL_DATA_TOKEN:
        return jsonify({"ok": True, "source": "no-token", "teams": [], "count": 0})

    comp = LEAGUE_MAP.get(league, league)
    params = {}
    if season_year:
        params["season"] = season_year

    try:
        data = fd_get(f"/competitions/{comp}/teams", params=params or None, timeout=25)
        teams = data.get("teams") or []

        out = []
        for t in teams:
            area = t.get("area") or {}
            out.append(
                {
                    "id": t.get("id"),
                    "name": t.get("shortName") or t.get("name") or "Unknown",
                    "tla": (t.get("tla") or "").strip() or None,
                    "crest": t.get("crest") or "",
                    "venue": t.get("venue") or "",
                    "website": t.get("website") or "",
                    "founded": t.get("founded"),
                    "clubColors": t.get("clubColors") or "",
                    "area": area.get("name") or "",
                    "address": t.get("address") or "",
                }
            )

        return jsonify({"ok": True, "source": "football-data", "teams": out, "count": len(out)})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e), "teams": [], "count": 0}), 502


@bp_doi.get("/api/team-extras")
def api_team_extras():
    league = (request.args.get("league", "PL") or "PL").upper()
    season_raw = (request.args.get("season", "") or "").strip()
    team_id = request.args.get("team_id", type=int)

    try:
        season_year = int(season_raw)
    except Exception:
        season_year = None

    if not team_id or not season_year:
        return jsonify({"ok": False, "error": "missing team_id/season"}), 400

    if not FOOTBALL_DATA_TOKEN:
        return jsonify({"ok": True, "form": [], "next": None})

    comp = LEAGUE_MAP.get(league, league)

    form = []
    try:
        data = fd_get(
            f"/teams/{team_id}/matches",
            params={"status": "FINISHED", "competitions": comp, "season": season_year, "limit": 5},
            timeout=25,
        )
        ms = data.get("matches") or []
        for m in ms:
            home = m.get("homeTeam") or {}
            away = m.get("awayTeam") or {}
            score = (m.get("score") or {}).get("fullTime") or {}
            hs = score.get("home")
            as_ = score.get("away")
            if hs is None or as_ is None:
                continue

            is_home = (home.get("id") == team_id)
            my = hs if is_home else as_
            opp = as_ if is_home else hs

            if my > opp:
                form.append("W")
            elif my == opp:
                form.append("D")
            else:
                form.append("L")
    except Exception:
        form = []

    next_obj = None
    try:
        data2 = fd_get(
            f"/teams/{team_id}/matches",
            params={"status": "SCHEDULED", "competitions": comp, "season": season_year, "limit": 5},
            timeout=25,
        )
        ms2 = data2.get("matches") or []
        if ms2:
            m = ms2[0]
            home = m.get("homeTeam") or {}
            away = m.get("awayTeam") or {}
            opp = away if home.get("id") == team_id else home

            next_obj = {
                "id": opp.get("id"),
                "name": opp.get("shortName") or opp.get("name") or "Next",
                "short": (opp.get("tla") or "").strip() or None,
                "crest": opp.get("crest") or "",
                "utcDate": m.get("utcDate"),
            }
    except Exception:
        next_obj = None

    return jsonify({"ok": True, "form": form, "next": next_obj})