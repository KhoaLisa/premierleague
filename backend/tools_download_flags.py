import os, requests, json

API = "http://127.0.0.1:5000/api/players?league=PL&season=2025&limit=5000&offset=0"
OUT_DIR = r"..\frontend\assets\flags"  # chạy từ backend/

NAT_TO_CODE = {
  "england":"gb","scotland":"gb","wales":"gb","united kingdom":"gb",
  "france":"fr","spain":"es","portugal":"pt","germany":"de","netherlands":"nl","belgium":"be","italy":"it",
  "norway":"no","sweden":"se","denmark":"dk","switzerland":"ch","austria":"at","poland":"pl","croatia":"hr",
  "serbia":"rs","slovakia":"sk","slovenia":"si","czech republic":"cz","czechia":"cz","romania":"ro","ukraine":"ua",
  "russia":"ru","turkey":"tr","greece":"gr","iceland":"is","finland":"fi","ireland":"ie",
  "ghana":"gh","morocco":"ma","nigeria":"ng","senegal":"sn","mali":"ml","algeria":"dz","tunisia":"tn",
  "egypt":"eg","cameroon":"cm","south africa":"za","ivory coast":"ci","cote d'ivoire":"ci","côte d’ivoire":"ci","côte d'ivoire":"ci",
  "brazil":"br","argentina":"ar","uruguay":"uy","colombia":"co","ecuador":"ec","chile":"cl",
  "united states":"us","usa":"us","canada":"ca","mexico":"mx",
  "japan":"jp","south korea":"kr","korea republic":"kr","china":"cn","australia":"au","new zealand":"nz",
  "uzbekistan":"uz","iran":"ir","iraq":"iq","saudi arabia":"sa","qatar":"qa","israel":"il"
}

def norm(s):
    return " ".join((s or "").strip().lower().split())

os.makedirs(OUT_DIR, exist_ok=True)

data = requests.get(API, timeout=60).json()
items = data.get("items", [])
nats = sorted({norm(it.get("nationality")) for it in items if it.get("nationality")})

codes = sorted({NAT_TO_CODE.get(n) for n in nats if NAT_TO_CODE.get(n)})
print("Unique nationalities:", len(nats))
print("Unique flag codes:", len(codes))

for cc in codes:
    fp = os.path.join(OUT_DIR, f"{cc}.png")
    if os.path.exists(fp):
        continue
    url = f"https://flagcdn.com/w40/{cc}.png"
    r = requests.get(url, timeout=30)
    if r.status_code == 200 and r.content:
        with open(fp, "wb") as f:
            f.write(r.content)
        print("saved", cc)
    else:
        print("fail", cc, r.status_code)

print("DONE. Flags in:", os.path.abspath(OUT_DIR))