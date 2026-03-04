# backend/tuyen/quan_tri.py
import secrets
from datetime import datetime, timedelta, timezone

from flask import Blueprint, jsonify, request

from csdl import fetch_all, fetch_one, execute, now_iso, T

bp_admin = Blueprint("admin", __name__)

ADMIN_USER = "admin"
ADMIN_PASS = "123456"
SESSION_HOURS = 24


def _get_bearer_token():
    auth = request.headers.get("Authorization", "")
    if auth.lower().startswith("bearer "):
        return auth.split(" ", 1)[1].strip()
    # fallback: token trong json/body/query (cho tương thích)
    if request.is_json:
        return (request.json or {}).get("token")
    return request.args.get("token")


def _require_admin():
    token = _get_bearer_token()
    if not token:
        return None, jsonify({"ok": False, "message": "Thiếu token admin"}), 401

    row = fetch_one(f"SELECT token, expires_at FROM {T('admin_sessions')} WHERE token=?", (token,))
    if not row:
        return None, jsonify({"ok": False, "message": "Token không hợp lệ"}), 401

    # check expiry (expires_at lưu ISO string)
    try:
        exp = row.get("expires_at") or ""
        exp_dt = datetime.fromisoformat(exp.replace("Z", "+00:00"))
        if exp_dt < datetime.now(timezone.utc):
            return None, jsonify({"ok": False, "message": "Token hết hạn"}), 401
    except Exception:
        # nếu parse lỗi thì vẫn cho qua (tránh block), nhưng tốt nhất lưu đúng ISO
        pass

    return token, None, None


@bp_admin.post("/api/admin/login")
def admin_login():
    data = request.json or {}
    u = (data.get("username") or "").strip()
    p = (data.get("password") or "").strip()

    if u != ADMIN_USER or p != ADMIN_PASS:
        return jsonify({"ok": False, "message": "Sai tài khoản hoặc mật khẩu"}), 401

    token = secrets.token_urlsafe(32)
    created = now_iso()
    expires = (datetime.now(timezone.utc) + timedelta(hours=SESSION_HOURS)).isoformat()

    execute(
        f"INSERT INTO {T('admin_sessions')}(token, created_at, expires_at) VALUES (?,?,?)",
        (token, created, expires),
    )

    return jsonify({"ok": True, "token": token, "expires_at": expires})


@bp_admin.get("/api/admin/articles")
def admin_list_articles():
    # auth
    _, err, code = _require_admin()
    if err:
        return err, code

    q = (request.args.get("query") or "").strip()
    sort = (request.args.get("sort") or "new").strip().lower()
    try:
        limit = int(request.args.get("limit", 50))
    except Exception:
        limit = 50
    limit = max(1, min(limit, 200))

    where = ""
    params = []
    if q:
        where = "WHERE title LIKE ? OR summary LIKE ?"
        params.extend([f"%{q}%", f"%{q}%"])

    order = "created_at DESC"
    if sort == "old":
        order = "created_at ASC"

    rows = fetch_all(
        f"""
        SELECT TOP (?) id, title, summary, url, tags_json, is_published, created_at
        FROM {T('articles')}
        {where}
        ORDER BY {order}
        """,
        (limit, *params),
    )

    return jsonify({"ok": True, "count": len(rows), "articles": rows})


@bp_admin.post("/api/admin/articles")
def admin_create_article():
    _, err, code = _require_admin()
    if err:
        return err, code

    data = request.json or {}
    title = (data.get("title") or "").strip()
    summary = (data.get("summary") or "").strip()
    url = (data.get("url") or "").strip()
    tags_json = data.get("tags_json")
    if tags_json is None:
        tags_json = "[]"
    is_published = 1 if bool(data.get("is_published", True)) else 0

    if not title:
        return jsonify({"ok": False, "message": "Thiếu title"}), 400

    execute(
        f"""
        INSERT INTO {T('articles')}(title, summary, url, tags_json, is_published, created_at)
        VALUES (?,?,?,?,?,?)
        """,
        (title, summary, url, str(tags_json), is_published, now_iso()),
    )

    # lấy bài mới nhất
    row = fetch_one(
        f"SELECT TOP 1 * FROM {T('articles')} ORDER BY id DESC"
    )
    return jsonify({"ok": True, "article": row})


@bp_admin.put("/api/admin/articles/<int:article_id>")
def admin_update_article(article_id: int):
    _, err, code = _require_admin()
    if err:
        return err, code

    data = request.json or {}
    title = (data.get("title") or "").strip()
    summary = (data.get("summary") or "").strip()
    url = (data.get("url") or "").strip()
    tags_json = data.get("tags_json")
    is_published = 1 if bool(data.get("is_published", True)) else 0

    row = fetch_one(f"SELECT id FROM {T('articles')} WHERE id=?", (article_id,))
    if not row:
        return jsonify({"ok": False, "message": "Không tìm thấy bài"}), 404

    execute(
        f"""
        UPDATE {T('articles')}
        SET title=?, summary=?, url=?, tags_json=?, is_published=?
        WHERE id=?
        """,
        (title, summary, url, str(tags_json), is_published, article_id),
    )

    updated = fetch_one(f"SELECT * FROM {T('articles')} WHERE id=?", (article_id,))
    return jsonify({"ok": True, "article": updated})


@bp_admin.delete("/api/admin/articles/<int:article_id>")
def admin_delete_article(article_id: int):
    _, err, code = _require_admin()
    if err:
        return err, code

    row = fetch_one(f"SELECT id FROM {T('articles')} WHERE id=?", (article_id,))
    if not row:
        return jsonify({"ok": False, "message": "Không tìm thấy bài"}), 404

    execute(f"DELETE FROM {T('articles')} WHERE id=?", (article_id,))
    return jsonify({"ok": True, "deleted_id": article_id})