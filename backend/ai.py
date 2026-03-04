def chat_reply(message: str):
    msg = (message or "").strip().lower()

    if "bxh" in msg or "bảng" in msg or "table" in msg:
        return {
            "intent": "table",
            "confidence": 0.92,
            "reply": "OK ✅ Mình kéo bạn xuống khu BXH (demo).",
            "actions": [
                {"label": "Xem BXH", "type": "scroll", "value": "table"},
                {"label": "Top ghi bàn", "type": "scroll", "value": "scorers"},
            ],
        }

    if "lịch" in msg or "fixtures" in msg or "match" in msg:
        return {
            "intent": "fixtures",
            "confidence": 0.90,
            "reply": "OK ✅ Mình kéo bạn xuống khu Fixtures/Results (demo).",
            "actions": [
                {"label": "Xem lịch", "type": "scroll", "value": "fixtures"},
                {"label": "Tin mới", "type": "scroll", "value": "news"},
            ],
        }

    if "top" in msg and ("ghi" in msg or "scor" in msg):
        return {
            "intent": "scorers",
            "confidence": 0.90,
            "reply": "OK ✅ Mình kéo bạn xuống Top scorers (demo).",
            "actions": [
                {"label": "Top scorers", "type": "scroll", "value": "scorers"},
            ],
        }

    if "gợi ý" in msg or "tin" in msg or "news" in msg:
        return {
            "intent": "refresh_feed",
            "confidence": 0.86,
            "reply": "OK ✅ Mình refresh news feed cho bạn.",
            "actions": [
                {"label": "Refresh news", "type": "call", "value": "refreshFeed"},
                {"label": "Kéo xuống News", "type": "scroll", "value": "news"},
            ],
        }

    return {
        "intent": "help",
        "confidence": 0.70,
        "reply": "Gõ thử: 'BXH PL', 'lịch đấu', 'top ghi bàn', hoặc 'gợi ý tin' nhé 👇",
        "actions": [
            {"label": "BXH PL", "type": "text", "value": "BXH PL"},
            {"label": "Lịch đấu", "type": "text", "value": "lịch đấu"},
            {"label": "Top ghi bàn", "type": "text", "value": "top ghi bàn"},
            {"label": "Gợi ý tin", "type": "text", "value": "gợi ý tin"},
        ],
    }
