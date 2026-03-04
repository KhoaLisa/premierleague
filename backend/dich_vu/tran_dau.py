# backend/dich_vu/tran_dau.py
import requests
from datetime import datetime, timezone

from cau_hinh import FOOTBALL_DATA_TOKEN, FD_BASE
from csdl import meta_get, meta_set, now_iso, upsert_match
from dich_vu.bong_da_data import norm_utc


def sync_pl_upcoming_if_needed(ttl_seconds: int = 600):
    """
    Sync lịch TIMED + SCHEDULED của Premier League về DB (matches) theo TTL.
    - Có FOOTBALL_DATA_TOKEN mới chạy
    - Cache timestamp lưu ở meta: pl_upcoming_synced_at
    """
    if not FOOTBALL_DATA_TOKEN:
        return

    last = meta_get("pl_upcoming_synced_at")
    if last:
        try:
            last_dt = datetime.fromisoformat(last)
            if last_dt.tzinfo is None:
                last_dt = last_dt.replace(tzinfo=timezone.utc)

            if (datetime.now(timezone.utc) - last_dt).total_seconds() < int(ttl_seconds):
                return
        except Exception:
            pass

    url = f"{FD_BASE}/competitions/PL/matches"
    r = requests.get(
        url,
        headers={"X-Auth-Token": FOOTBALL_DATA_TOKEN},
        # ✅ lấy cả TIMED (rất hay là trận kế tiếp)
        params={"status": "SCHEDULED,TIMED"},
        timeout=20,
    )
    r.raise_for_status()
    data = r.json()

    for m in data.get("matches", []):
        home = m.get("homeTeam") or {}
        away = m.get("awayTeam") or {}
        season = m.get("season") or {}

        upsert_match(
            {
                "id": m["id"],
                "utc_date": norm_utc(m.get("utcDate") or ""),
                "status": (m.get("status") or "").strip() or "SCHEDULED",
                "matchday": m.get("matchday"),
                "home_team_id": home.get("id"),
                "away_team_id": away.get("id"),
                "home_name": home.get("shortName") or home.get("name") or "Home",
                "away_name": away.get("shortName") or away.get("name") or "Away",
                # crest đôi khi missing ở endpoint matches -> vẫn lưu (fallback sẽ xử lý ở bxh.py)
                "home_crest": home.get("crest") or "",
                "away_crest": away.get("crest") or "",
                "competition": "PL",
                "season": int((season.get("startDate") or "0")[:4] or 0) or None,
            }
        )

    meta_set("pl_upcoming_synced_at", now_iso())