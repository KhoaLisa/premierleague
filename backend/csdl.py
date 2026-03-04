# backend/csdl.py (SQL Server ONLY)
import os
from datetime import datetime, timezone

try:
    import pyodbc  # type: ignore
except Exception:
    pyodbc = None

# SQL Server only: để tương thích code cũ có import USE_MSSQL
USE_MSSQL = True

# BẮT BUỘC phải có MSSQL_CONN_STR (không fallback SQLite nữa)
MSSQL_CONN_STR = (os.getenv("MSSQL_CONN_STR") or "").strip()

_mssql_conn = None


def now_iso():
    # ISO with +00:00
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def now_iso_z():
    # ISO with trailing Z (dễ so sánh dạng string + đồng bộ với norm_utc)
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _get_mssql():
    global _mssql_conn
    if not MSSQL_CONN_STR:
        raise RuntimeError(
            "Thiếu MSSQL_CONN_STR. Hãy set biến môi trường MSSQL_CONN_STR để kết nối SQL Server."
        )
    if not pyodbc:
        raise RuntimeError("Chưa cài pyodbc. Hãy pip install pyodbc")

    if _mssql_conn is None:
        _mssql_conn = pyodbc.connect(MSSQL_CONN_STR)
    return _mssql_conn


def conn():
    return _get_mssql()


def T(ten_bang: str) -> str:
    ten_bang = (ten_bang or "").strip()
    if not ten_bang:
        raise ValueError("Thiếu tên bảng")
    if "." in ten_bang:
        return ten_bang
    return f"dbo.{ten_bang}"


def execute(sql: str, params=()):
    c = conn()
    cur = c.cursor()
    cur.execute(sql, params or ())
    c.commit()
    return cur.rowcount


def fetch_all(sql: str, params=()):
    c = conn()
    cur = c.cursor()
    cur.execute(sql, params or ())
    rows = cur.fetchall()
    cols = [d[0] for d in cur.description] if cur.description else []
    return [dict(zip(cols, r)) for r in rows]


def fetch_one(sql: str, params=()):
    rows = fetch_all(sql, params)
    return rows[0] if rows else None


def init_db():
    execute(
        f"""
        IF OBJECT_ID('{T('users')}', 'U') IS NULL
        BEGIN
            CREATE TABLE {T('users')}(
                id INT IDENTITY(1,1) PRIMARY KEY,
                email NVARCHAR(255) NULL UNIQUE,
                provider NVARCHAR(50) NULL,
                google_sub NVARCHAR(255) NULL UNIQUE,
                name NVARCHAR(255) NULL,
                picture NVARCHAR(1000) NULL,
                created_at NVARCHAR(50) NULL
            );
        END
        """
    )

    execute(
        f"""
        IF OBJECT_ID('{T('meta')}', 'U') IS NULL
        BEGIN
            CREATE TABLE {T('meta')}(
                k NVARCHAR(255) NOT NULL PRIMARY KEY,
                v NVARCHAR(MAX) NULL
            );
        END
        """
    )

    execute(
        f"""
        IF OBJECT_ID('{T('matches')}', 'U') IS NULL
        BEGIN
            CREATE TABLE {T('matches')}(
                id INT NOT NULL PRIMARY KEY,
                utc_date NVARCHAR(50) NULL,
                status NVARCHAR(50) NULL,
                matchday INT NULL,
                home_team_id INT NULL,
                away_team_id INT NULL,
                home_name NVARCHAR(255) NULL,
                away_name NVARCHAR(255) NULL,
                home_crest NVARCHAR(1000) NULL,
                away_crest NVARCHAR(1000) NULL,
                competition NVARCHAR(50) NULL,
                season INT NULL
            );
        END
        """
    )

    execute(
        f"""
        IF OBJECT_ID('{T('admin_sessions')}', 'U') IS NULL
        BEGIN
            CREATE TABLE {T('admin_sessions')}(
                token NVARCHAR(200) NOT NULL PRIMARY KEY,
                created_at NVARCHAR(50) NULL,
                expires_at NVARCHAR(50) NULL
            );
        END
        """
    )

    execute(
        f"""
        IF OBJECT_ID('{T('articles')}', 'U') IS NULL
        BEGIN
            CREATE TABLE {T('articles')}(
                id INT IDENTITY(1,1) PRIMARY KEY,
                title NVARCHAR(500) NULL,
                summary NVARCHAR(MAX) NULL,
                url NVARCHAR(1000) NULL,
                tags_json NVARCHAR(MAX) NULL,
                is_published BIT NOT NULL DEFAULT(1),
                created_at NVARCHAR(50) NULL
            );
        END
        """
    )

    execute(
        f"""
        IF OBJECT_ID('{T('events')}', 'U') IS NULL
        BEGIN
            CREATE TABLE {T('events')}(
                id INT IDENTITY(1,1) PRIMARY KEY,
                user_id INT NULL,
                article_id INT NULL,
                event_type NVARCHAR(50) NULL,
                created_at NVARCHAR(50) NULL
            );
        END
        """
    )

    execute(
        f"""
        IF OBJECT_ID('{T('entities')}', 'U') IS NULL
        BEGIN
            CREATE TABLE {T('entities')}(
                id INT IDENTITY(1,1) PRIMARY KEY,
                type NVARCHAR(50) NULL,
                code NVARCHAR(50) NULL,
                name NVARCHAR(255) NULL
            );
        END
        """
    )

    execute(
        f"""
        IF OBJECT_ID('{T('user_preferences')}', 'U') IS NULL
        BEGIN
            CREATE TABLE {T('user_preferences')}(
                user_id INT NOT NULL,
                entity_id INT NOT NULL,
                weight INT NULL,
                created_at NVARCHAR(50) NULL,
                CONSTRAINT PK_user_preferences PRIMARY KEY(user_id, entity_id)
            );
        END
        """
    )

    # ✅ tránh lỗi nếu code có log_login_session()
    execute(
        f"""
        IF OBJECT_ID('{T('login_sessions')}', 'U') IS NULL
        BEGIN
            CREATE TABLE {T('login_sessions')}(
                id INT IDENTITY(1,1) PRIMARY KEY,
                user_id INT NOT NULL,
                provider NVARCHAR(50) NULL,
                ip NVARCHAR(100) NULL,
                user_agent NVARCHAR(1000) NULL,
                created_at NVARCHAR(50) NULL DEFAULT(CONVERT(NVARCHAR(50), SYSUTCDATETIME(), 127))
            );
        END
        """
    )


def upsert_user_local(email: str):
    email = (email or "").strip().lower()
    row = fetch_one(f"SELECT * FROM {T('users')} WHERE email=?", (email,))
    if row:
        return row

    execute(
        f"INSERT INTO {T('users')}(email, provider, created_at) VALUES (?,?,?)",
        (email, "local", now_iso()),
    )
    return fetch_one(f"SELECT * FROM {T('users')} WHERE email=?", (email,))


def upsert_user_google(sub: str, email: str, name: str = "", picture: str = ""):
    sub = (sub or "").strip()
    email = (email or "").strip().lower()

    row = fetch_one(f"SELECT * FROM {T('users')} WHERE google_sub=?", (sub,))
    if row:
        execute(
            f"UPDATE {T('users')} SET email=?, name=?, picture=? WHERE google_sub=?",
            (email, name, picture, sub),
        )
        return fetch_one(f"SELECT * FROM {T('users')} WHERE google_sub=?", (sub,))

    row2 = fetch_one(f"SELECT * FROM {T('users')} WHERE email=?", (email,))
    if row2:
        execute(
            f"UPDATE {T('users')} SET google_sub=?, provider=?, name=?, picture=? WHERE email=?",
            (sub, "google", name, picture, email),
        )
        return fetch_one(f"SELECT * FROM {T('users')} WHERE email=?", (email,))

    execute(
        f"""
        INSERT INTO {T('users')}(email, provider, google_sub, name, picture, created_at)
        VALUES (?,?,?,?,?,?)
        """,
        (email, "google", sub, name, picture, now_iso()),
    )
    return fetch_one(f"SELECT * FROM {T('users')} WHERE google_sub=?", (sub,))


def meta_get(k: str):
    r = fetch_one(f"SELECT v FROM {T('meta')} WHERE k=?", (k,))
    return r["v"] if r else None


def meta_set(k: str, v: str):
    if fetch_one(f"SELECT k FROM {T('meta')} WHERE k=?", (k,)):
        execute(f"UPDATE {T('meta')} SET v=? WHERE k=?", (v, k))
    else:
        execute(f"INSERT INTO {T('meta')}(k,v) VALUES (?,?)", (k, v))


def upsert_match(m: dict):
    mid = int(m.get("id"))
    if fetch_one(f"SELECT id FROM {T('matches')} WHERE id=?", (mid,)):
        execute(
            f"""
            UPDATE {T('matches')}
            SET utc_date=?, status=?, matchday=?, home_team_id=?, away_team_id=?,
                home_name=?, away_name=?, home_crest=?, away_crest=?,
                competition=?, season=?
            WHERE id=?
            """,
            (
                m.get("utc_date"),
                m.get("status"),
                m.get("matchday"),
                m.get("home_team_id"),
                m.get("away_team_id"),
                m.get("home_name"),
                m.get("away_name"),
                m.get("home_crest"),
                m.get("away_crest"),
                m.get("competition"),
                m.get("season"),
                mid,
            ),
        )
    else:
        execute(
            f"""
            INSERT INTO {T('matches')}(
              id, utc_date, status, matchday,
              home_team_id, away_team_id,
              home_name, away_name,
              home_crest, away_crest,
              competition, season
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
            """,
            (
                mid,
                m.get("utc_date"),
                m.get("status"),
                m.get("matchday"),
                m.get("home_team_id"),
                m.get("away_team_id"),
                m.get("home_name"),
                m.get("away_name"),
                m.get("home_crest"),
                m.get("away_crest"),
                m.get("competition"),
                m.get("season"),
            ),
        )


def list_upcoming_matches(limit: int = 10):
    limit = max(1, int(limit))
    # ✅ lấy cả TIMED và SCHEDULED
    return fetch_all(
        f"""
        SELECT TOP (?) *
        FROM {T('matches')}
        WHERE (status='SCHEDULED' OR status='TIMED')
          AND utc_date IS NOT NULL
        ORDER BY utc_date ASC
        """,
        (limit,),
    )


def get_upcoming_matches(limit: int = 10):
    return list_upcoming_matches(limit)


def log_login_session(
    user_id: int,
    provider: str = "google",
    ip: str | None = None,
    user_agent: str | None = None,
):
    execute(
        f"""
        INSERT INTO {T('login_sessions')} (user_id, provider, ip, user_agent)
        VALUES (?, ?, ?, ?)
        """,
        (user_id, provider, ip, user_agent),
    )