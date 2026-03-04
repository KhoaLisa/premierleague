# backend/stats_db.py
from csdl import execute, fetch_all, fetch_one, T, now_iso

def init_stats_db():
    # nếu bạn đã tạo bảng bằng SSMS rồi, hàm này có thể để trống hoặc giữ check như trên
    pass

def get_seasons():
    return fetch_all(
        f"""
        SELECT id AS mua_giai_id,
               ten AS ten_mua_giai,
               nam_bat_dau
        FROM {T('mua_giai')}
        ORDER BY nam_bat_dau DESC
        """
    )

def _top_players(mua_giai_id: int, metric: str):
    return fetch_all(
        f"""
        SELECT TOP 10 player, team, avatar, COALESCE(value,0) AS value
        FROM {T('player_leaderboard')}
        WHERE mua_giai_id=? AND metric=?
        ORDER BY rank_no ASC
        """,
        (int(mua_giai_id), metric),
    )

def _top_clubs(mua_giai_id: int, metric: str):
    return fetch_all(
        f"""
        SELECT TOP 10 club, crest, COALESCE(value,0) AS value
        FROM {T('club_leaderboard')}
        WHERE mua_giai_id=? AND metric=?
        ORDER BY rank_no ASC
        """,
        (int(mua_giai_id), metric),
    )

def get_stats(season_id: int):
    s = fetch_one(
        f"SELECT id, ten, nam_bat_dau FROM {T('mua_giai')} WHERE id=?",
        (int(season_id),),
    )
    if not s:
        return {"ok": False, "message": "Không tìm thấy mùa giải"}

    return {
        "ok": True,
        "season": s,

        # Player Stats
        "goals": _top_players(season_id, "goals"),
        "assists": _top_players(season_id, "assists"),
        "passes": _top_players(season_id, "passes"),
        "clean_sheets": _top_players(season_id, "clean_sheets"),

        # Club Stats
        "club_goals": _top_clubs(season_id, "goals"),
        "club_tackles": _top_clubs(season_id, "tackles"),
        "club_blocks": _top_clubs(season_id, "blocks"),
        "club_passes": _top_clubs(season_id, "passes"),
    }

def save_player_leaderboard(mua_giai_id: int, metric: str, rows: list[dict]):
    execute(f"DELETE FROM {T('player_leaderboard')} WHERE mua_giai_id=? AND metric=?", (mua_giai_id, metric))
    t = now_iso()
    for i, r in enumerate(rows[:10], start=1):
        execute(
            f"""
            INSERT INTO {T('player_leaderboard')}
            (mua_giai_id, metric, rank_no, player, team, avatar, value, updated_at)
            VALUES (?,?,?,?,?,?,?,?)
            """,
            (
                int(mua_giai_id),
                metric,
                int(i),
                (r.get("player") or "").strip(),
                (r.get("team") or "").strip(),
                (r.get("avatar") or "").strip(),
                int(r.get("value") or 0),
                t,
            ),
        )

def save_club_leaderboard(mua_giai_id: int, metric: str, rows: list[dict]):
    execute(f"DELETE FROM {T('club_leaderboard')} WHERE mua_giai_id=? AND metric=?", (mua_giai_id, metric))
    t = now_iso()
    for i, r in enumerate(rows[:10], start=1):
        execute(
            f"""
            INSERT INTO {T('club_leaderboard')}
            (mua_giai_id, metric, rank_no, club, crest, value, updated_at)
            VALUES (?,?,?,?,?,?,?)
            """,
            (
                int(mua_giai_id),
                metric,
                int(i),
                (r.get("club") or "").strip(),
                (r.get("crest") or "").strip(),
                int(r.get("value") or 0),
                t,
            ),
        )