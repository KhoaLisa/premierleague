import json, re, unicodedata
from typing import Dict, Tuple

def _strip_accents(s: str) -> str:
    s = unicodedata.normalize("NFKD", s)
    return "".join(ch for ch in s if not unicodedata.combining(ch))

def norm_key(s: str) -> str:
    s = _strip_accents((s or "").strip().lower())
    s = re.sub(r"\s+", " ", s)
    s = re.sub(r"[^a-z0-9 \-']", "", s)
    return s

def load_soccerwiki(path: str) -> Tuple[Dict[str, str], Dict[str, str]]:
    with open(path, "r", encoding="utf-8") as f:
        d = json.load(f)

    # player fullname -> image
    pmap: Dict[str, str] = {}
    for p in d.get("PlayerData", []):
        url = (p.get("ImageURL") or "").strip()
        if not url:
            continue
        full = f"{p.get('Forename','')} {p.get('Surname','')}".strip()
        k = norm_key(full)
        if k and k not in pmap:
            pmap[k] = url

    # club name -> image
    cmap: Dict[str, str] = {}
    for c in d.get("ClubData", []):
        url = (c.get("ImageURL") or "").strip()
        name = (c.get("Name") or "").strip()
        if not url or not name:
            continue
        cmap[norm_key(name)] = url

    return pmap, cmap