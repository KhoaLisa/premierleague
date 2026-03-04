# backend/cau_hinh.py
import os

GOOGLE_CLIENT_ID = "484313079101-cj4uh8jlif4h39bakmtj6bkdl90fo1qg.apps.googleusercontent.com"

FOOTBALL_DATA_TOKEN = (os.getenv("FOOTBALL_DATA_TOKEN") or "").strip()
FD_BASE = "https://api.football-data.org/v4"

MAX_START_YEAR = 2025  # 2025/26 có start year = 2025

LEAGUE_MAP = {
    "PL": "PL",
    "PD": "PD",
    "SA": "SA",
    "BL1": "BL1",
    "FL1": "FL1",
    "DED": "DED",
    "PPL": "PPL",
    "CL": "CL",
    "EL": "EL",
}

STANDINGS_CACHE_TTL_SEC = 15 * 60  # 15 phút

CORS_ORIGINS = [
    "http://127.0.0.1:5500",
    "http://localhost:5500",
    "http://127.0.0.1:5000",
    "http://localhost:5000",
]