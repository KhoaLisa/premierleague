from flask import Blueprint, jsonify, redirect

from csdl import now_iso
from cau_hinh import GOOGLE_CLIENT_ID

bp_trang = Blueprint("bp_trang", __name__)


@bp_trang.get("/")
def root():
    return redirect("/frontend/html/home.html")


@bp_trang.get("/admin")
def admin_page():
    return redirect("/frontend/html/admin.html")


@bp_trang.get("/login")
def login_page():
    return redirect("/frontend/html/login.html")


@bp_trang.get("/html/<path:p>")
def compat_html(p):
    return redirect(f"/frontend/html/{p}")


@bp_trang.get("/health")
def health():
    return jsonify({"ok": True})


@bp_trang.get("/api/ping")
def api_ping():
    return jsonify({"ok": True, "ts": now_iso()})


@bp_trang.get("/api/config")
def api_config():
    return jsonify({"ok": True, "google_client_id": GOOGLE_CLIENT_ID})