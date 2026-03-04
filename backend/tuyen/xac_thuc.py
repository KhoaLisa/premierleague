# backend/tuyen/xac_thuc.py
import os
import traceback
import requests
from flask import Blueprint, jsonify, request

from csdl import (
    upsert_user_google,
    log_login_session,
    fetch_all,
    fetch_one,
    T,
)

bp_auth = Blueprint("auth", __name__)


@bp_auth.get("/api/debug/env")
def debug_env():
    return jsonify({"ok": True, "GOOGLE_CLIENT_ID": os.getenv("GOOGLE_CLIENT_ID")})


def _client_ip() -> str | None:
    xff = (request.headers.get("X-Forwarded-For") or "").strip()
    if xff:
        return xff.split(",")[0].strip()
    return request.remote_addr


def _user_agent() -> str | None:
    ua = (request.headers.get("User-Agent") or "").strip()
    return ua[:300] if ua else None


def _tokeninfo_verify(id_token: str, google_client_id: str):
    """
    Verify id_token bằng endpoint tokeninfo (đỡ phụ thuộc cert/JWK).
    """
    url = "https://oauth2.googleapis.com/tokeninfo"
    r = requests.get(url, params={"id_token": id_token}, timeout=10)
    r.raise_for_status()
    info = r.json()

    aud = (info.get("aud") or "").strip()
    if aud != google_client_id:
        raise ValueError("Audience mismatch (aud != GOOGLE_CLIENT_ID)")

    return info


@bp_auth.post("/api/auth/google")
def auth_google():
    google_client_id = (os.getenv("GOOGLE_CLIENT_ID") or "").strip()

    try:
        data = request.json or {}
        credential = (data.get("credential") or data.get("id_token") or "").strip()

        if not credential:
            return jsonify({"ok": False, "message": "Thiếu credential (id_token)"}), 400
        if not google_client_id:
            return jsonify({"ok": False, "message": "Thiếu GOOGLE_CLIENT_ID (env)"}), 500

        info = _tokeninfo_verify(credential, google_client_id)

        sub = (info.get("sub") or "").strip()
        email = (info.get("email") or "").strip().lower()

        # ✅ fallback để luôn có name hiển thị
        name = (info.get("name") or info.get("given_name") or "").strip()
        if not name and email:
            name = email.split("@")[0]

        picture = (info.get("picture") or "").strip()

        if not sub or not email:
            return jsonify({"ok": False, "message": "Token thiếu sub/email"}), 400

        user = upsert_user_google(sub=sub, email=email, name=name, picture=picture)

        # ✅ log login session (SQL Server)
        log_login_session(
            user_id=int(user["id"]),
            provider="google",
            ip=_client_ip(),
            user_agent=_user_agent(),
        )

        # ✅ trả cả dạng flat + dạng user để frontend nào cũng dễ parse
        return jsonify(
            {
                "ok": True,
                "id": user.get("id"),
                "user_id": user.get("id"),
                "email": user.get("email"),
                "name": user.get("name"),
                "picture": user.get("picture"),
                "provider": user.get("provider"),
                "user": user,
}
        )

    except Exception as e:
        print("❌ auth_google error:", repr(e))
        traceback.print_exc()
        return jsonify({"ok": False, "message": f"Lỗi server: {e}"}), 500


@bp_auth.get("/api/me")
def api_me():
    """
    Lấy thông tin user để home.js hydrate (nếu localStorage thiếu name/email/picture).
    """
    uid = (request.args.get("user_id") or "").strip()
    if not uid.isdigit():
        return jsonify({"ok": False, "message": "Thiếu/không hợp lệ user_id"}), 400

    u = fetch_one(f"SELECT * FROM {T('users')} WHERE id=?", (int(uid),))
    if not u:
        return jsonify({"ok": False, "message": "User không tồn tại"}), 404

    return jsonify({"ok": True, "user": u})


@bp_auth.get("/api/admin/logins")
def admin_recent_logins():
    """
    Xem lịch sử login mới nhất (để bạn kiểm tra SQL).
    """
    limit = (request.args.get("limit") or "50").strip()
    try:
        n = max(1, min(200, int(limit)))
    except:
        n = 50

    rows = fetch_all(
        f"""
        SELECT TOP ({n})
          s.id,
          s.login_at,
          s.provider,
          s.ip,
          u.id AS user_id,
          u.name,
          u.email
        FROM dbo.login_sessions s
        JOIN dbo.users u ON u.id = s.user_id
        ORDER BY s.id DESC
        """
    )
    return jsonify({"ok": True, "items": rows}) 