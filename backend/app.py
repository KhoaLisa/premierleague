# backend/app.py
from __future__ import annotations

import os
import time
import json
import re
import unicodedata
import zipfile
import requests
from pathlib import Path
from datetime import datetime, timezone
from collections import OrderedDict

from flask import Flask, jsonify, request
from flask_cors import CORS

from cau_hinh import (
    CORS_ORIGINS,
    GOOGLE_CLIENT_ID,
    FOOTBALL_DATA_TOKEN,
    FD_BASE,
)

from csdl import init_db, execute, fetch_all, T, meta_get, meta_set
from stats_db import init_stats_db
from ai import chat_reply

# ==== Blueprints (routes gốc của project) ====
from tuyen.trang_tinh import bp_trang
from tuyen.xac_thuc import bp_auth
from tuyen.thong_ke import bp_thong_ke
from tuyen.tran_dau import bp_tran_dau
from tuyen.feed import bp_feed
from tuyen.quan_tri import bp_admin
from tuyen.bxh import bp_bxh
from tuyen.doi_bong import bp_doi
from tuyen.mua_giai import bp_mua_giai


# -----------------------------
# App + CORS
# -----------------------------
app = Flask(__name__, static_folder="../frontend", static_url_path="/frontend")
CORS(app, resources={r"/api/*": {"origins": CORS_ORIGINS}})
os.environ.setdefault("GOOGLE_CLIENT_ID", GOOGLE_CLIENT_ID)

init_db()
init_stats_db()

# -----------------------------
# Register blueprints
# -----------------------------
app.register_blueprint(bp_trang)
app.register_blueprint(bp_auth)
app.register_blueprint(bp_thong_ke)
app.register_blueprint(bp_tran_dau)
app.register_blueprint(bp_feed)
app.register_blueprint(bp_admin)
app.register_blueprint(bp_bxh)
app.register_blueprint(bp_doi)
app.register_blueprint(bp_mua_giai)


# -----------------------------
# Chat API
# -----------------------------
@app.post("/api/chat")
def api_chat():
    body = request.get_json(silent=True) or {}
    msg = body.get("message") or ""
    return jsonify(chat_reply(msg))


# ============================================================
# Helpers
# ============================================================
def _utc_iso_z():
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _fd_headers():
    token = (os.getenv("FOOTBALL_DATA_TOKEN") or FOOTBALL_DATA_TOKEN or "").strip()
    if not token:
        raise RuntimeError("Thiếu FOOTBALL_DATA_TOKEN (set env var trước khi gọi football-data endpoints).")
    return {"X-Auth-Token": token}


def _fd_get(path: str, params: dict | None = None, timeout: int = 25, retries: int = 6):
    """
    GET JSON từ football-data, có retry/backoff khi 429 rate-limit.
    """
    url = f"{FD_BASE}{path}"
    last_err = None

    for i in range(retries):
        r = requests.get(url, headers=_fd_headers(), params=params or {}, timeout=timeout)

        if r.status_code == 429:
            retry_after = r.headers.get("Retry-After")
            try:
                wait_sec = int(retry_after) if retry_after else (2 + i * 2)
            except Exception:
                wait_sec = 2 + i * 2
            time.sleep(wait_sec)
            last_err = RuntimeError(f"429 rate-limit, waited={wait_sec}s")
            continue

        if r.status_code != 200:
            raise RuntimeError(f"football-data lỗi {r.status_code}: {(r.text or '')[:300]}")

        return r.json() or {}

    raise last_err or RuntimeError("football-data failed after retries")


# ============================================================
# ✅ SoccerWiki seed (ảnh cầu thủ + logo CLB) — hỗ trợ .json và .zip
# ============================================================
SW_PLAYER_FULL: dict[str, str] = {}        # "bruno fernandes" -> url
SW_PLAYER_SURNAME: dict[str, str] = {}     # "casemiro" -> url (surname-only fallback)
SW_CLUB_LOGO: dict[str, str] = {}          # "man united" -> url
SW_LOADED: list[str] = []                  # list file paths loaded

# Nếu muốn override crest CLB bằng SoccerWiki (mặc định tắt)
SW_USE_CLUB_LOGO = False


def _strip_accents(s: str) -> str:
    s = unicodedata.normalize("NFKD", s)
    return "".join(ch for ch in s if not unicodedata.combining(ch))


def _norm_key(s: str) -> str:
    s = _strip_accents((s or "").strip().lower())
    s = re.sub(r"\s+", " ", s)
    s = re.sub(r"[^a-z0-9 \-']", "", s)
    return s


def _json_load_bytes(bs: bytes) -> dict:
    # thử utf-8-sig cho các file có BOM
    for enc in ("utf-8-sig", "utf-8", "latin-1"):
        try:
            return json.loads(bs.decode(enc))
        except Exception:
            pass
    return json.loads(bs.decode("utf-8", errors="ignore"))


def _ingest_soccerwiki_doc(d: dict):
    """
    Nạp 1 document SoccerWiki vào maps:
    - PlayerData: Forename/Surname/ImageURL
    - ClubData: Name/ShortName/ImageURL
    """
    global SW_PLAYER_FULL, SW_PLAYER_SURNAME, SW_CLUB_LOGO

    # players
    for p in d.get("PlayerData", []) or []:
        url = (p.get("ImageURL") or "").strip()
        if not url:
            continue

        fore = (p.get("Forename") or "").strip()
        sur = (p.get("Surname") or "").strip()
        full = f"{fore} {sur}".strip()

        k_full = _norm_key(full)
        k_sur = _norm_key(sur)

        # full-name key
        if k_full and k_full not in SW_PLAYER_FULL:
            SW_PLAYER_FULL[k_full] = url

        # surname-only key (để match Casemiro vs Carlos Casemiro)
        # NOTE: có thể trùng, nhưng giúp giảm null mạnh.
        if k_sur and k_sur not in SW_PLAYER_SURNAME:
            SW_PLAYER_SURNAME[k_sur] = url

    # clubs
    for c in d.get("ClubData", []) or []:
        url = (c.get("ImageURL") or "").strip()
        if not url:
            continue
        name = (c.get("Name") or "").strip()
        short = (c.get("ShortName") or "").strip()

        if name:
            SW_CLUB_LOGO[_norm_key(name)] = url
        if short:
            SW_CLUB_LOGO[_norm_key(short)] = url


def _find_soccerwiki_paths() -> list[str]:
    """
    Tự tìm SoccerWiki_*.json hoặc SoccerWiki_*.zip trong:
    - backend/
    - backend/data/
    - env SOCCERWIKI_JSON_PATH (nhiều path cách nhau ; )
    """
    paths: list[str] = []

    envp = (os.getenv("SOCCERWIKI_JSON_PATH") or "").strip()
    if envp:
        for part in envp.split(";"):
            p = part.strip()
            if p and Path(p).exists():
                rp = str(Path(p).resolve())
                if rp not in paths:
                    paths.append(rp)

    here = Path(__file__).resolve().parent
    for folder in [here, here / "data"]:
        if not folder.exists():
            continue
        for p in sorted(folder.glob("SoccerWiki_*.json")):
            rp = str(p.resolve())
            if rp not in paths:
                paths.append(rp)
        for p in sorted(folder.glob("SoccerWiki_*.zip")):
            rp = str(p.resolve())
            if rp not in paths:
                paths.append(rp)

    return paths


def _load_soccerwiki_all():
    global SW_PLAYER_FULL, SW_PLAYER_SURNAME, SW_CLUB_LOGO, SW_LOADED

    SW_PLAYER_FULL = {}
    SW_PLAYER_SURNAME = {}
    SW_CLUB_LOGO = {}
    SW_LOADED = []

    paths = _find_soccerwiki_paths()
    if not paths:
        print("[soccerwiki] NOT FOUND. Put SoccerWiki_*.json/.zip in backend/data or set SOCCERWIKI_JSON_PATH.")
        return

    for path in paths:
        try:
            p = Path(path)
            if p.suffix.lower() == ".json":
                bs = p.read_bytes()
                d = _json_load_bytes(bs)
                _ingest_soccerwiki_doc(d)
                SW_LOADED.append(str(p))
                continue

            if p.suffix.lower() == ".zip":
                with zipfile.ZipFile(p, "r") as zf:
                    # load all json inside zip
                    for name in zf.namelist():
                        if not name.lower().endswith(".json"):
                            continue
                        bs = zf.read(name)
                        d = _json_load_bytes(bs)
                        _ingest_soccerwiki_doc(d)
                SW_LOADED.append(str(p))
                continue

        except Exception as e:
            print("[soccerwiki] load failed:", path, "=>", str(e)[:200])

    print(
        f"[soccerwiki] loaded files={len(SW_LOADED)} "
        f"players(full)={len(SW_PLAYER_FULL)} players(surname)={len(SW_PLAYER_SURNAME)} "
        f"clubs={len(SW_CLUB_LOGO)}"
    )


def _sw_player_photo(name: str) -> str | None:
    """
    Try: full name -> surname-only.
    """
    if not name:
        return None
    k = _norm_key(name)
    if not k:
        return None
    u = SW_PLAYER_FULL.get(k)
    if u:
        return u
    # surname-only fallback
    last = _norm_key(name.split()[-1]) if name.split() else ""
    if last:
        return SW_PLAYER_SURNAME.get(last)
    return None


def _sw_club_logo(club_name: str) -> str | None:
    if not club_name:
        return None
    k = _norm_key(club_name)
    if not k:
        return None
    u = SW_CLUB_LOGO.get(k)
    if u:
        return u

    # alias nhẹ EPL
    alias = {
        "man city": "manchester city",
        "man united": "manchester united",
        "newcastle": "newcastle united",
        "nottingham": "nottingham forest",
        "wolverhampton": "wolverhampton wanderers",
        "tottenham": "tottenham hotspur",
        "west ham": "west ham united",
        "brighton hove": "brighton and hove albion",
        "wolves": "wolverhampton wanderers",
    }
    if k in alias:
        return SW_CLUB_LOGO.get(_norm_key(alias[k]))
    return None


def _sw_enrich_items_inplace(items: list[dict]) -> dict:
    """
    Enrich ảnh SoccerWiki lên items hiện có (không gọi football-data).
    """
    added_photo = 0
    added_crest = 0
    if not items:
        return {"added_photo": 0, "added_crest": 0}

    for it in items:
        if not it.get("photo_url"):
            nm = (it.get("name") or "").strip()
            u = _sw_player_photo(nm)
            if u:
                it["photo_url"] = u
                added_photo += 1

        if SW_USE_CLUB_LOGO:
            c = it.get("club") or {}
            cname = (c.get("name") or "").strip()
            u = _sw_club_logo(cname)
            if u and u != c.get("crest"):
                c["crest"] = u
                it["club"] = c
                added_crest += 1

    return {"added_photo": added_photo, "added_crest": added_crest}


# load SoccerWiki when app starts
_load_soccerwiki_all()


@app.get("/api/seed/status")
def api_seed_status():
    return jsonify({
        "ok": True,
        "soccerwiki_loaded": bool(SW_LOADED),
        "soccerwiki_files": SW_LOADED,
        "player_photos_full": len(SW_PLAYER_FULL),
        "player_photos_surname": len(SW_PLAYER_SURNAME),
        "club_logos": len(SW_CLUB_LOGO),
        "use_club_logo": SW_USE_CLUB_LOGO,
        "updatedAt": _utc_iso_z(),
    })


# ============================================================
# ✅ Override ảnh thủ công (C) — SQL table + API
# ============================================================
def _init_photo_override_table():
    execute(
        f"""
        IF OBJECT_ID('{T('player_photo_override')}', 'U') IS NULL
        BEGIN
            CREATE TABLE {T('player_photo_override')}(
                id INT IDENTITY(1,1) PRIMARY KEY,
                league NVARCHAR(20) NOT NULL,
                season INT NOT NULL,
                player_id NVARCHAR(80) NOT NULL,
                player_name NVARCHAR(255) NULL,
                photo_url NVARCHAR(1000) NOT NULL,
                updated_at NVARCHAR(50) NULL,
                CONSTRAINT UQ_photo_override UNIQUE(league, season, player_id)
            );
        END
        """
    )

_init_photo_override_table()


def _photo_override_map(league: str, season: int) -> dict[str, str]:
    rows = fetch_all(
        f"""
        SELECT player_id, photo_url
        FROM {T('player_photo_override')}
        WHERE league=? AND season=?
        """,
        (league, season),
    )
    mp: dict[str, str] = {}
    for r in rows or []:
        pid = str(r.get("player_id") or "").strip()
        url = str(r.get("photo_url") or "").strip()
        if pid and url:
            mp[pid] = url
    return mp


@app.get("/api/players/photo_overrides")
def api_photo_overrides_list():
    try:
        league = (request.args.get("league") or "PL").strip().upper()
        season = int(request.args.get("season") or 2025)

        rows = fetch_all(
            f"""
            SELECT league, season, player_id, player_name, photo_url, updated_at
            FROM {T('player_photo_override')}
            WHERE league=? AND season=?
            ORDER BY updated_at DESC
            """,
            (league, season),
        )
        return jsonify({"ok": True, "rows": rows, "total": len(rows or []), "updatedAt": _utc_iso_z()})
    except Exception as e:
        return jsonify({"ok": False, "message": str(e)}), 500


@app.post("/api/players/photo_override")
def api_photo_override_set():
    """
    body:
    {
      "league":"PL",
      "season":2025,
      "player_id":"3257",
      "player_name":"Bruno Fernandes",
      "photo_url":"https://....png"
    }
    """
    try:
        body = request.get_json(force=True) or {}
        league = (body.get("league") or "PL").strip().upper()
        season = int(body.get("season") or 2025)
        player_id = str(body.get("player_id") or "").strip()
        player_name = (body.get("player_name") or "").strip()
        photo_url = (body.get("photo_url") or "").strip()

        if not player_id or not photo_url:
            return jsonify({"ok": False, "message": "Thiếu player_id hoặc photo_url"}), 400

        now = datetime.now(timezone.utc).replace(microsecond=0).isoformat()

        existed = fetch_all(
            f"""
            SELECT TOP 1 id
            FROM {T('player_photo_override')}
            WHERE league=? AND season=? AND player_id=?
            """,
            (league, season, player_id),
        )

        if existed:
            execute(
                f"""
                UPDATE {T('player_photo_override')}
                SET photo_url=?, player_name=?, updated_at=?
                WHERE league=? AND season=? AND player_id=?
                """,
                (photo_url, player_name, now, league, season, player_id),
            )
        else:
            execute(
                f"""
                INSERT INTO {T('player_photo_override')}
                    (league, season, player_id, player_name, photo_url, updated_at)
                VALUES (?,?,?,?,?,?)
                """,
                (league, season, player_id, player_name, photo_url, now),
            )

        return jsonify({"ok": True, "updatedAt": _utc_iso_z()})
    except Exception as e:
        return jsonify({"ok": False, "message": str(e)}), 500


@app.delete("/api/players/photo_override")
def api_photo_override_delete():
    try:
        league = (request.args.get("league") or "PL").strip().upper()
        season = int(request.args.get("season") or 2025)
        player_id = str(request.args.get("player_id") or "").strip()
        if not player_id:
            return jsonify({"ok": False, "message": "Thiếu player_id"}), 400

        execute(
            f"""
            DELETE FROM {T('player_photo_override')}
            WHERE league=? AND season=? AND player_id=?
            """,
            (league, season, player_id),
        )
        return jsonify({"ok": True, "updatedAt": _utc_iso_z()})
    except Exception as e:
        return jsonify({"ok": False, "message": str(e)}), 500


# ============================================================
# /api/fixtures
# ============================================================
try:
    from zoneinfo import ZoneInfo
    VN_TZ = ZoneInfo("Asia/Ho_Chi_Minh")
except Exception:
    VN_TZ = None


def _vn_time_str(utc_iso: str):
    if not utc_iso:
        return ("Unknown", "")
    dt_utc = datetime.fromisoformat(utc_iso.replace("Z", "+00:00"))
    dt_local = dt_utc.astimezone(VN_TZ) if VN_TZ else dt_utc
    return (dt_local.strftime("%a %d %b"), dt_local.strftime("%H:%M"))


def _parse_hhmm_to_sort_key(hhmm: str):
    try:
        h, m = hhmm.split(":")
        return (int(h), int(m))
    except Exception:
        return (99, 99)


def _range_text(day_labels):
    if not day_labels:
        return ""
    if len(day_labels) == 1:
        return day_labels[0]
    return f"{day_labels[0]} – {day_labels[-1]}"


@app.get("/api/fixtures")
def api_fixtures():
    try:
        matchweek = int(request.args.get("matchweek", 0))
        competition = (request.args.get("competition") or "PL").strip()
        season = request.args.get("season", None)

        if matchweek <= 0:
            return jsonify({"ok": False, "message": "Thiếu hoặc sai matchweek"}), 400

        params = {"matchday": matchweek}
        if season:
            params["season"] = int(season)

        url = f"{FD_BASE}/competitions/{competition}/matches"
        r = requests.get(url, headers=_fd_headers(), params=params, timeout=25)

        if r.status_code != 200:
            return jsonify({
                "ok": False,
                "message": f"football-data lỗi {r.status_code}",
                "detail": (r.text or "")[:500]
            }), 502

        data = r.json() or {}
        matches = data.get("matches") or []

        groups: OrderedDict[str, list[dict]] = OrderedDict()

        for m in matches:
            utc_date = m.get("utcDate") or ""
            day_label, time_str = _vn_time_str(utc_date)

            ht = m.get("homeTeam") or {}
            at = m.get("awayTeam") or {}

            home_logo = ht.get("crest") or ht.get("logo") or ""
            away_logo = at.get("crest") or at.get("logo") or ""

            sc = m.get("score") or {}
            ft = sc.get("fullTime") or {}
            score_home = ft.get("home")
            score_away = ft.get("away")

            item = {
                "home": ht.get("name") or "",
                "away": at.get("name") or "",
                "time": time_str,
                "homeLogo": home_logo,
                "awayLogo": away_logo,
                "status": m.get("status") or "",
                "scoreHome": score_home,
                "scoreAway": score_away,
            }

            groups.setdefault(day_label, []).append(item)

        for k in list(groups.keys()):
            groups[k] = sorted(groups[k], key=lambda x: _parse_hhmm_to_sort_key(x.get("time", "")))

        day_labels = list(groups.keys())
        return jsonify({
            "ok": True,
            "matchweek": matchweek,
            "rangeText": _range_text(day_labels),
            "days": [{"label": k, "matches": v} for k, v in groups.items()],
        })

    except Exception as e:
        return jsonify({"ok": False, "message": str(e)}), 500


# ============================================================
# /api/players (SQL cache + football-data)
# ============================================================
_PLAYERS_CACHE: dict[str, dict] = {}
_PLAYERS_TTL_SEC = 12 * 60 * 60
_PLAYERS_SQL_TTL_SEC = 30 * 24 * 60 * 60


def _players_cache_key(league: str, season: int) -> str:
    return f"{league.upper()}::{int(season)}"


def _players_sql_key(league: str, season: int) -> str:
    return f"players_sql::{league.upper()}::{int(season)}"


def _players_sql_ts_key(league: str, season: int) -> str:
    return f"players_sql_ts::{league.upper()}::{int(season)}"


def _players_sw_enriched_key(league: str, season: int) -> str:
    return f"players_sw_enriched::{league.upper()}::{int(season)}"


def _norm_position(p: str) -> str:
    s = (p or "").strip().lower()
    if s in ("gk", "goalkeeper"):
        return "Goalkeeper"
    if s in ("defence", "defender", "defence/defender", "defense"):
        return "Defender"
    if s in ("midfield", "midfielder"):
        return "Midfielder"
    if s in ("offence", "offense", "attacker", "forward"):
        return "Forward"
    return (p or "").strip()


def _players_sql_get(league: str, season: int):
    raw = meta_get(_players_sql_key(league, season))
    ts = meta_get(_players_sql_ts_key(league, season))
    if not raw or not ts:
        return None, None

    try:
        dt = datetime.fromisoformat(ts)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        age = (datetime.now(timezone.utc) - dt).total_seconds()
        if age > _PLAYERS_SQL_TTL_SEC:
            return None, None
        return json.loads(raw), ts
    except Exception:
        return None, None


def _players_sql_set(league: str, season: int, items: list):
    meta_set(_players_sql_key(league, season), json.dumps(items, ensure_ascii=False))
    meta_set(_players_sql_ts_key(league, season), datetime.now(timezone.utc).replace(microsecond=0).isoformat())


def _players_get_all_from_fd(league: str, season: int):
    teams_data = _fd_get(f"/competitions/{league}/teams", params={"season": int(season)}, timeout=25)
    teams = teams_data.get("teams") or []

    items = []
    ok = 0
    fail = 0
    failed_names = []

    for t in teams:
        team_id = t.get("id")
        if not team_id:
            continue

        club_name = t.get("shortName") or t.get("name") or ""
        club_crest = t.get("crest") or ""

        try:
            td = _fd_get(f"/teams/{team_id}", timeout=25, retries=6)
            squad = td.get("squad") or []
            club_name = (td.get("shortName") or td.get("name") or club_name) or club_name
            club_crest = (td.get("crest") or club_crest) or club_crest
            ok += 1
        except Exception as e:
            squad = []
            fail += 1
            failed_names.append(club_name or str(team_id))
            print("[players] team failed:", club_name, "=>", str(e)[:140])

        if SW_USE_CLUB_LOGO:
            u = _sw_club_logo(club_name)
            if u:
                club_crest = u

        for p in squad:
            name = (p.get("name") or "").strip()
            if not name:
                continue

            pid = p.get("id") or f"{team_id}-{name}"

            photo_url = p.get("photo") or p.get("photoUrl") or None
            if not photo_url:
                photo_url = _sw_player_photo(name)

            items.append({
                "id": pid,
                "name": name,
                "position": _norm_position(p.get("position") or ""),
                "nationality": (p.get("nationality") or "").strip(),
                "photo_url": photo_url,
                "club": {"id": team_id, "name": club_name, "crest": club_crest},
            })

        time.sleep(0.35)

    meta = {
        "teams_total": len(teams),
        "teams_ok": ok,
        "teams_failed": fail,
        "failed_teams": failed_names[:10],
        "soccerwiki_loaded": bool(SW_LOADED),
        "soccerwiki_files": len(SW_LOADED),
    }
    return items, meta


def _fetch_players_for_team(team_id: int):
    td = _fd_get(f"/teams/{team_id}", timeout=25, retries=6)
    club_name = (td.get("shortName") or td.get("name") or "").strip()
    club_crest = (td.get("crest") or "").strip()

    if SW_USE_CLUB_LOGO:
        u = _sw_club_logo(club_name)
        if u:
            club_crest = u

    squad = td.get("squad") or []
    out = []
    for p in squad:
        name = (p.get("name") or "").strip()
        if not name:
            continue
        pid = p.get("id") or f"{team_id}-{name}"

        photo_url = p.get("photo") or p.get("photoUrl") or None
        if not photo_url:
            photo_url = _sw_player_photo(name)

        out.append({
            "id": pid,
            "name": name,
            "position": _norm_position(p.get("position") or ""),
            "nationality": (p.get("nationality") or "").strip(),
            "photo_url": photo_url,
            "club": {"id": team_id, "name": club_name, "crest": club_crest},
        })
    return out


def _players_get_all(league: str, season: int, refresh: bool):
    """
    Ưu tiên:
      - RAM cache
      - SQL cache
      - football-data

    Đồng thời: enrich SoccerWiki lên cả RAM/SQL cache cũ (để ảnh xuất hiện ngay).
    """
    key = _players_cache_key(league, season)
    now = time.time()

    # 1) RAM cache
    if not refresh and key in _PLAYERS_CACHE:
        box = _PLAYERS_CACHE[key]
        if now - box["ts"] < _PLAYERS_TTL_SEC:
            sw_info = {"added_photo": 0, "added_crest": 0}
            if SW_LOADED:
                sw_info = _sw_enrich_items_inplace(box["items"])

            meta = dict(box.get("meta", {}) or {})
            meta["ram_age_sec"] = round(now - box["ts"], 1)
            meta["ram_cached_at"] = datetime.fromtimestamp(box["ts"], timezone.utc).replace(microsecond=0).isoformat()
            meta["sw_enriched_added_photo"] = sw_info["added_photo"]
            meta["sw_enriched_added_crest"] = sw_info["added_crest"]
            box["meta"] = meta
            return box["items"], meta, f"ram-cache({league}/{season})"

    # 2) SQL cache
    cached, cached_ts = _players_sql_get(league, season)
    if not refresh and cached is not None:
        sw_info = {"added_photo": 0, "added_crest": 0}
        if SW_LOADED:
            sw_info = _sw_enrich_items_inplace(cached)

            # save SQL 1 lần để lần sau khỏi enrich lại
            flag_key = _players_sw_enriched_key(league, season)
            if sw_info["added_photo"] > 0 and not meta_get(flag_key):
                try:
                    _players_sql_set(league, season, cached)
                    meta_set(flag_key, datetime.now(timezone.utc).replace(microsecond=0).isoformat())
                except Exception as e:
                    print("[soccerwiki] save enriched SQL failed:", str(e)[:160])

        meta = {
            "from": "dbo.meta",
            "sql_cached_items": len(cached),
            "sql_cached_at": cached_ts,
            "sw_enriched_added_photo": sw_info["added_photo"],
            "sw_enriched_added_crest": sw_info["added_crest"],
        }
        _PLAYERS_CACHE[key] = {"ts": now, "items": cached, "meta": meta}
        return cached, meta, f"sql-cache({league}/{season})"

    # 3) football-data
    items, meta = _players_get_all_from_fd(league, season)
    meta = dict(meta or {})
    meta["data_fetched_at"] = _utc_iso_z()

    old_items = cached if cached is not None else None
    old_len = len(old_items) if old_items else 0
    new_len = len(items)
    teams_failed = int(meta.get("teams_failed") or 0)

    meta["sql_cached_prev_len"] = old_len
    meta["sql_cached_new_len"] = new_len

    # fallback nếu fetch hụt
    if old_items is not None and teams_failed > 0 and new_len < old_len:
        meta["fallback_to_sql"] = True
        meta["fallback_reason"] = f"teams_failed={teams_failed}, new_len={new_len} < old_len={old_len}"
        _PLAYERS_CACHE[key] = {"ts": now, "items": old_items, "meta": meta}
        return old_items, meta, f"sql-cache({league}/{season})"

    should_save = False
    if refresh:
        should_save = (teams_failed == 0) or (new_len >= old_len)
    else:
        should_save = (old_items is None) or ((teams_failed == 0) and (new_len >= old_len))

    if should_save:
        try:
            _players_sql_set(league, season, items)
            meta["saved_to_sql"] = True
        except Exception as e:
            meta["saved_to_sql"] = False
            meta["sql_save_error"] = str(e)[:160]
    else:
        meta["saved_to_sql"] = False
        meta["sql_save_skipped_reason"] = f"teams_failed={teams_failed} or new_len({new_len}) < old_len({old_len})"

    _PLAYERS_CACHE[key] = {"ts": now, "items": items, "meta": meta}
    return items, meta, f"football-data({league}/{season})"


@app.get("/api/players/enrich_photos")
def api_players_enrich_photos():
    """
    Enrich SoccerWiki lên SQL cache (nhanh, không gọi football-data).
    GET /api/players/enrich_photos?league=PL&season=2025
    """
    try:
        league = (request.args.get("league") or "PL").strip().upper()
        season = int(request.args.get("season") or 2025)

        cached, ts = _players_sql_get(league, season)
        if cached is None:
            return jsonify({"ok": False, "message": "Chưa có SQL cache players. Hãy gọi /api/players?refresh=1 trước."}), 400
        if not SW_LOADED:
            return jsonify({"ok": False, "message": "Chưa load SoccerWiki. Đặt SoccerWiki_*.json/.zip vào backend/data."}), 400

        info = _sw_enrich_items_inplace(cached)
        _players_sql_set(league, season, cached)
        meta_set(_players_sw_enriched_key(league, season), datetime.now(timezone.utc).replace(microsecond=0).isoformat())

        _PLAYERS_CACHE[_players_cache_key(league, season)] = {"ts": time.time(), "items": cached, "meta": {"enriched": True, **info}}
        return jsonify({"ok": True, "league": league, "season": season, "sql_cached_at": ts, "enriched": info, "updatedAt": _utc_iso_z()})
    except Exception as e:
        return jsonify({"ok": False, "message": str(e)}), 500


@app.get("/api/players/missing_photos")
def api_players_missing_photos():
    """
    List cầu thủ vẫn thiếu ảnh SAU khi đã xét SoccerWiki + override.
    GET /api/players/missing_photos?league=PL&season=2025&limit=100
    """
    try:
        league = (request.args.get("league") or "PL").strip().upper()
        season = int(request.args.get("season") or 2025)
        limit = int(request.args.get("limit") or 100)

        items_all, meta, source = _players_get_all(league, season, refresh=False)

        # ensure soccerwiki enrich
        if SW_LOADED:
            _sw_enrich_items_inplace(items_all)

        ov = _photo_override_map(league, season)

        out = []
        for it in items_all:
            pid = str(it.get("id") or "").strip()
            if not pid:
                continue

            if pid in ov:
                continue
            if it.get("photo_url"):
                continue

            out.append({
                "id": it.get("id"),
                "name": it.get("name"),
                "club": (it.get("club") or {}).get("name"),
                "nationality": it.get("nationality"),
                "position": it.get("position"),
            })
            if len(out) >= limit:
                break

        return jsonify({
            "ok": True,
            "league": league,
            "season": season,
            "missing": out,
            "total_missing_returned": len(out),
            "source": source,
            "updatedAt": _utc_iso_z(),
        })
    except Exception as e:
        return jsonify({"ok": False, "message": str(e)}), 500


@app.get("/api/players")
def api_players():
    """
    GET /api/players?league=PL&season=2025&limit=50&offset=0&q=&club_id=&position=&refresh=1
    """
    try:
        league = (request.args.get("league") or "PL").strip().upper()

        season_raw = (request.args.get("season") or "").strip()
        if not season_raw:
            return jsonify({"items": [], "total": 0, "error": "Thiếu season", "updatedAt": _utc_iso_z()}), 400
        season = int(season_raw)

        q = (request.args.get("q") or "").strip().lower()
        club_id = (request.args.get("club_id") or "").strip()
        position = (request.args.get("position") or "").strip()
        position_norm = _norm_position(position) if position else ""

        limit = int(request.args.get("limit") or 50)
        offset = int(request.args.get("offset") or 0)
        refresh = (request.args.get("refresh") or "").strip().lower() in ("1", "true", "yes")

        items_all, meta, source = _players_get_all(league, season, refresh)

        # on-demand fetch nếu lọc theo id mà cache thiếu đội
        if club_id and club_id.isdigit():
            cid = club_id
            has_team = any(str((it.get("club") or {}).get("id") or "") == cid for it in items_all)
            if not has_team:
                extra = _fetch_players_for_team(int(cid))
                if extra:
                    existed = {str(it.get("id")) for it in items_all}
                    items_all.extend([x for x in extra if str(x.get("id")) not in existed])

        # enrich SoccerWiki lên list hiện tại (đảm bảo cache cũ cũng có ảnh)
        sw_info = {"added_photo": 0, "added_crest": 0}
        if SW_LOADED:
            sw_info = _sw_enrich_items_inplace(items_all)

        # filters
        items = items_all

        if q:
            items = [it for it in items if q in (it.get("name") or "").lower()]

        if club_id:
            cid = club_id.strip()
            if cid.isdigit():
                items = [it for it in items if str((it.get("club") or {}).get("id") or "") == cid]
            else:
                needle = cid.lower()
                items = [it for it in items if needle in (((it.get("club") or {}).get("name") or "").lower())]

        if position_norm:
            items = [it for it in items if _norm_position(it.get("position") or "") == position_norm]

        total = len(items)
        items = items[offset: offset + limit]

        # ✅ apply overrides (ưu tiên cao nhất) trên slice trả về
        ov = _photo_override_map(league, season)
        applied = 0
        for it in items:
            pid = str(it.get("id") or "").strip()
            if pid in ov and ov[pid]:
                it["photo_url"] = ov[pid]
                applied += 1

        meta = dict(meta or {})
        meta["raw_total_items"] = len(items_all)
        meta["club_count_in_items"] = len({str((it.get("club") or {}).get("id") or "") for it in items_all})
        meta["soccerwiki_loaded"] = bool(SW_LOADED)
        meta["soccerwiki_files"] = len(SW_LOADED)
        meta["sw_enriched_added_photo"] = sw_info["added_photo"]
        meta["sw_enriched_added_crest"] = sw_info["added_crest"]
        meta["photo_override_total"] = len(ov)
        meta["photo_override_applied"] = applied

        return jsonify({
            "items": items,
            "total": total,
            "source": source,
            "meta": meta,
            "updatedAt": _utc_iso_z(),
        })
    except Exception as e:
        return jsonify({"items": [], "total": 0, "error": str(e), "updatedAt": _utc_iso_z()}), 500


# ============================================================
# /api/clubs
# ============================================================
@app.get("/api/clubs")
def api_clubs():
    """
    GET /api/clubs?league=PL&season=2025&refresh=1
    """
    try:
        league = (request.args.get("league") or "PL").strip().upper()
        season = int((request.args.get("season") or "2025").strip())
        refresh = (request.args.get("refresh") or "").strip().lower() in ("1", "true", "yes")

        key = f"clubs_sql::{league}::{season}"
        key_ts = f"clubs_sql_ts::{league}::{season}"

        if not refresh:
            raw = meta_get(key)
            ts = meta_get(key_ts)
            if raw and ts:
                try:
                    clubs = json.loads(raw)
                    return jsonify({
                        "clubs": clubs,
                        "total": len(clubs),
                        "source": f"sql-cache-clubs({league}/{season})",
                        "updatedAt": _utc_iso_z(),
                    })
                except Exception:
                    pass

        data = _fd_get(f"/competitions/{league}/teams", params={"season": int(season)}, timeout=25)
        teams = data.get("teams") or []

        clubs = []
        for t in teams:
            cid = t.get("id")
            if not cid:
                continue
            name = (t.get("shortName") or t.get("name") or "").strip()
            crest = (t.get("crest") or "").strip()

            if SW_USE_CLUB_LOGO:
                u = _sw_club_logo(name)
                if u:
                    crest = u

            if name:
                clubs.append({"id": cid, "name": name, "crest": crest})

        clubs.sort(key=lambda x: (x.get("name") or "").lower())

        try:
            meta_set(key, json.dumps(clubs, ensure_ascii=False))
            meta_set(key_ts, datetime.now(timezone.utc).replace(microsecond=0).isoformat())
            src = f"football-data-teams({league}/{season}) + saved-sql"
        except Exception as e:
            src = f"football-data-teams({league}/{season}) (sql_save_fail: {str(e)[:80]})"

        return jsonify({
            "clubs": clubs,
            "total": len(clubs),
            "source": src,
            "updatedAt": _utc_iso_z(),
        })
    except Exception as e:
        return jsonify({"clubs": [], "total": 0, "error": str(e), "updatedAt": _utc_iso_z()}), 500


# ============================================================
# ✅ Leaderboard tables + APIs
# ============================================================
def _init_leaderboard_tables():
    execute(
        f"""
        IF OBJECT_ID('{T('player_leaderboard')}', 'U') IS NULL
        BEGIN
            CREATE TABLE {T('player_leaderboard')}(
                id INT IDENTITY(1,1) PRIMARY KEY,
                mua_giai_id INT NOT NULL,
                metric NVARCHAR(50) NOT NULL,
                rank_no INT NOT NULL,
                player NVARCHAR(255) NULL,
                team NVARCHAR(255) NULL,
                avatar NVARCHAR(1000) NULL,
                value FLOAT NULL,
                updated_at NVARCHAR(50) NULL,
                CONSTRAINT UQ_player_lb UNIQUE(mua_giai_id, metric, rank_no)
            );
        END
        """
    )

    execute(
        f"""
        IF OBJECT_ID('{T('club_leaderboard')}', 'U') IS NULL
        BEGIN
            CREATE TABLE {T('club_leaderboard')}(
                id INT IDENTITY(1,1) PRIMARY KEY,
                mua_giai_id INT NOT NULL,
                metric NVARCHAR(50) NOT NULL,
                rank_no INT NOT NULL,
                club NVARCHAR(255) NULL,
                crest NVARCHAR(1000) NULL,
                value FLOAT NULL,
                updated_at NVARCHAR(50) NULL,
                CONSTRAINT UQ_club_lb UNIQUE(mua_giai_id, metric, rank_no)
            );
        END
        """
    )

_init_leaderboard_tables()


@app.get("/api/admin/leaderboard")
def api_admin_get_leaderboard():
    try:
        season_id = int(request.args.get("season_id", 0))
        board_type = (request.args.get("type") or "").lower()
        metric = (request.args.get("metric") or "").lower()

        if season_id <= 0 or board_type not in ["player", "club"] or not metric:
            return jsonify({"ok": False, "message": "Thiếu season_id/type/metric"}), 400

        if board_type == "player":
            rows = fetch_all(
                f"""
                SELECT rank_no, player, team, avatar, COALESCE(value,0) AS value
                FROM {T('player_leaderboard')}
                WHERE mua_giai_id=? AND metric=?
                ORDER BY rank_no ASC
                """,
                (season_id, metric),
            )
        else:
            rows = fetch_all(
                f"""
                SELECT rank_no, club, crest, COALESCE(value,0) AS value
                FROM {T('club_leaderboard')}
                WHERE mua_giai_id=? AND metric=?
                ORDER BY rank_no ASC
                """,
                (season_id, metric),
            )

        return jsonify({"ok": True, "rows": rows})
    except Exception as e:
        return jsonify({"ok": False, "message": str(e)}), 500


@app.post("/api/admin/leaderboard")
def api_admin_save_leaderboard():
    try:
        body = request.get_json(force=True) or {}
        season_id = int(body.get("season_id") or 0)
        board_type = (body.get("type") or "").lower()
        metric = (body.get("metric") or "").lower()
        rows = body.get("rows") or []

        if season_id <= 0 or board_type not in ["player", "club"] or not metric:
            return jsonify({"ok": False, "message": "Thiếu season_id/type/metric"}), 400
        if not isinstance(rows, list) or len(rows) == 0:
            return jsonify({"ok": False, "message": "rows phải là list và không rỗng"}), 400

        now = datetime.now(timezone.utc).replace(microsecond=0).isoformat()

        if board_type == "player":
            execute(
                f"DELETE FROM {T('player_leaderboard')} WHERE mua_giai_id=? AND metric=?",
                (season_id, metric),
            )
            for i, r in enumerate(rows[:10], start=1):
                rr = dict(r or {})
                execute(
                    f"""
                    INSERT INTO {T('player_leaderboard')}
                    (mua_giai_id, metric, rank_no, player, team, avatar, value, updated_at)
                    VALUES (?,?,?,?,?,?,?,?)
                    """,
                    (
                        season_id,
                        metric,
                        i,
                        rr.get("player"),
                        rr.get("team"),
                        rr.get("avatar"),
                        float(rr.get("value") or 0),
                        now,
                    ),
                )
        else:
            execute(
                f"DELETE FROM {T('club_leaderboard')} WHERE mua_giai_id=? AND metric=?",
                (season_id, metric),
            )
            for i, r in enumerate(rows[:10], start=1):
                rr = dict(r or {})
                execute(
                    f"""
                    INSERT INTO {T('club_leaderboard')}
                    (mua_giai_id, metric, rank_no, club, crest, value, updated_at)
                    VALUES (?,?,?,?,?,?,?)
                    """,
                    (
                        season_id,
                        metric,
                        i,
                        rr.get("club"),
                        rr.get("crest"),
                        float(rr.get("value") or 0),
                        now,
                    ),
                )

        return jsonify({"ok": True})
    except Exception as e:
        return jsonify({"ok": False, "message": str(e)}), 500


# ============================================================
# Main
# ============================================================
if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)