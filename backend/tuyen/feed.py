import json
from flask import Blueprint, jsonify, request

from csdl import fetch_all, execute, now_iso, T
from dich_vu.xu_huong import diem_xu_huong, tag_trung_khau_vi, tron_xep_hang

bp_feed = Blueprint("bp_feed", __name__)


def bad(msg, code=400):
    return jsonify({"ok": False, "error": msg}), code


@bp_feed.get("/api/entities")
def api_entities():
    rows = fetch_all(f"SELECT id,type,code,name FROM {T('entities')} ORDER BY type, name")
    return jsonify(rows)


@bp_feed.post("/api/user/preferences")
def api_user_prefs():
    body = request.get_json(silent=True) or {}
    user_id = int(body.get("user_id") or 0)
    entity_ids = body.get("entity_ids") or []
    weight = int(body.get("weight") or 3)

    if user_id <= 0:
        return bad("missing user_id")
    if not isinstance(entity_ids, list) or len(entity_ids) == 0:
        return bad("entity_ids must be list")

    execute(f"DELETE FROM {T('user_preferences')} WHERE user_id=?", (user_id,))
    for eid in entity_ids:
        execute(
            f"INSERT INTO {T('user_preferences')}(user_id,entity_id,weight,created_at) VALUES (?,?,?,?)",
            (user_id, int(eid), weight, now_iso()),
        )

    return jsonify({"ok": True, "saved": len(entity_ids)})


@bp_feed.get("/api/feed/global")
def api_feed_global():
    rows = fetch_all(f"SELECT * FROM {T('articles')} WHERE is_published=1 ORDER BY id DESC")
    out = []
    for a in rows:
        tags = json.loads(a["tags_json"] or "[]")
        score, imp, clk = diem_xu_huong(a["id"], a["created_at"])
        out.append(
            {
                "id": a["id"],
                "title": a["title"],
                "summary": a["summary"],
                "url": a["url"],
                "published_at": a["created_at"],
                "tags": tags,
                "matched": False,
                "impressions": imp,
                "clicks": clk,
                "score": score,
            }
        )
    out.sort(key=lambda x: x["score"], reverse=True)
    return jsonify(out)


@bp_feed.get("/api/feed/personal")
def api_feed_personal():
    user_id = int(request.args.get("user_id") or 0)
    if user_id <= 0:
        return bad("missing user_id")

    prefs = fetch_all(
        f"""
        SELECT e.code, e.type, up.weight
        FROM {T('user_preferences')} up
        JOIN {T('entities')} e ON e.id = up.entity_id
        WHERE up.user_id=?
        """,
        (user_id,),
    )
    pref_codes = set([p["code"] for p in prefs])

    rows = fetch_all(f"SELECT * FROM {T('articles')} WHERE is_published=1 ORDER BY id DESC")
    items = []
    for a in rows:
        tags = json.loads(a["tags_json"] or "[]")
        base, imp, clk = diem_xu_huong(a["id"], a["created_at"])
        matched = tag_trung_khau_vi(tags, pref_codes)
        boost = 2.0 if matched else 0.0
        score = round(base + boost, 3)

        items.append(
            {
                "id": a["id"],
                "title": a["title"],
                "summary": a["summary"],
                "url": a["url"],
                "published_at": a["created_at"],
                "tags": tags,
                "matched": matched,
                "impressions": imp,
                "clicks": clk,
                "score": score,
            }
        )

    ranked = tron_xep_hang(items, ratio=0.7, k=12)
    remaining_ids = set([x["id"] for x in ranked])
    rest = [x for x in items if x["id"] not in remaining_ids]
    rest.sort(key=lambda x: x["score"], reverse=True)
    return jsonify(ranked + rest)


@bp_feed.post("/api/log/impression")
def api_log_impression():
    body = request.get_json(silent=True) or {}
    user_id = int(body.get("user_id") or 0)
    article_id = int(body.get("article_id") or 0)
    if user_id <= 0 or article_id <= 0:
        return bad("missing user_id/article_id")

    execute(
        f"INSERT INTO {T('events')}(user_id,article_id,event_type,created_at) VALUES (?,?,?,?)",
        (user_id, article_id, "impression", now_iso()),
    )
    return jsonify({"ok": True})


@bp_feed.post("/api/log/click")
def api_log_click():
    body = request.get_json(silent=True) or {}
    user_id = int(body.get("user_id") or 0)
    article_id = int(body.get("article_id") or 0)
    if user_id <= 0 or article_id <= 0:
        return bad("missing user_id/article_id")

    execute(
        f"INSERT INTO {T('events')}(user_id,article_id,event_type,created_at) VALUES (?,?,?,?)",
        (user_id, article_id, "click", now_iso()),
    )
    return jsonify({"ok": True})