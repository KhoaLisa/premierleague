from datetime import datetime, timezone
from csdl import fetch_one, T


def dem_su_kien(article_id: int):
    imp = fetch_one(
        f"SELECT COUNT(*) AS n FROM {T('events')} WHERE article_id=? AND event_type='impression'",
        (article_id,),
    )["n"]
    clk = fetch_one(
        f"SELECT COUNT(*) AS n FROM {T('events')} WHERE article_id=? AND event_type='click'",
        (article_id,),
    )["n"]
    return imp, clk


def diem_xu_huong(article_id: int, created_at_iso: str):
    imp, clk = dem_su_kien(article_id)
    raw = imp * 1.0 + clk * 3.0

    try:
        created = datetime.fromisoformat(created_at_iso)
        if created.tzinfo is None:
            created = created.replace(tzinfo=timezone.utc)
    except Exception:
        created = datetime.now(timezone.utc)

    age_hours = max(0.0, (datetime.now(timezone.utc) - created).total_seconds() / 3600.0)
    half_life = 48.0
    decay = 0.5 ** (age_hours / half_life)
    score = raw * decay
    return round(score, 3), imp, clk


def tag_trung_khau_vi(tags_bai, pref_codes: set):
    for t in tags_bai:
        if t in pref_codes:
            return True
    return False


def tron_xep_hang(items, ratio=0.7, k=12):
    matched = [x for x in items if x.get("matched")]
    global_ = [x for x in items if not x.get("matched")]

    matched.sort(key=lambda x: x["score"], reverse=True)
    global_.sort(key=lambda x: x["score"], reverse=True)

    need_m = int(round(k * ratio))
    need_g = k - need_m

    out = matched[:need_m] + global_[:need_g]
    if len(out) < k:
        rest = matched[need_m:] + global_[need_g:]
        rest.sort(key=lambda x: x["score"], reverse=True)
        out += rest[: (k - len(out))]
    return out[:k]