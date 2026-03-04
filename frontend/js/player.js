/* frontend/js/player.js */
(() => {
  const API_BASE = "http://127.0.0.1:5000";
  const $ = (s) => document.querySelector(s);

  const els = {
    q: $("#q"),
    season: $("#season"),
    club: $("#club"),
    pos: $("#pos"),
    btnReset: $("#btnReset"),
    rows: $("#rows"),
    msg: $("#msg"),
    btnPrev: $("#btnPrev"),
    btnNext: $("#btnNext"),
    pageInfo: $("#pageInfo"),
  };

  const state = {
    league: "PL",
    season: 2025,
    q: "",
    club_id: "",
    position: "",
    pageSize: 20,
    page: 1,
    allItems: [],
  };

  function esc(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function setMsg(text) {
    if (els.msg) els.msg.textContent = text || "";
  }

  async function apiGet(path) {
    const res = await fetch(`${API_BASE}${path}`, { method: "GET" });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(`${res.status} ${t}`);
    }
    return res.json();
  }

  function normalizeSeason(v) {
    if (!v || v === "all") return 2025;
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : 2025;
  }

  function normalizeAllToEmpty(v) {
    if (v == null) return "";
    const s = String(v).trim();
    return s === "all" ? "" : s;
  }

  function buildPlayersQueryAll() {
    const p = new URLSearchParams();
    p.set("league", state.league);
    p.set("season", String(state.season));
    if (state.q) p.set("q", state.q);
    if (state.club_id) p.set("club_id", state.club_id);
    if (state.position) p.set("position", state.position);
    p.set("limit", "5000");
    p.set("offset", "0");
    return `/api/players?${p.toString()}`;
  }

  function sortPlayersAZ(items) {
    items.sort((a, b) =>
      (a.name || "").localeCompare(b.name || "", "vi", { sensitivity: "base" }),
    );
  }

  /* =========================
     VIETNAMIZE LABELS
     ========================= */
  const POS_VI = {
    Goalkeeper: "Thủ môn",
    Defender: "Hậu vệ",
    Midfielder: "Tiền vệ",
    Forward: "Tiền đạo",

    "Right-Back": "Hậu vệ phải",
    "Left-Back": "Hậu vệ trái",
    "Centre-Back": "Trung vệ",
    "Center-Back": "Trung vệ",

    "Defensive Midfield": "Tiền vệ phòng ngự",
    "Defensive Midfielder": "Tiền vệ phòng ngự",
    "Central Midfield": "Tiền vệ trung tâm",
    "Central Midfielder": "Tiền vệ trung tâm",
    "Attacking Midfield": "Tiền vệ tấn công",
    "Attacking Midfielder": "Tiền vệ tấn công",

    "Right Midfield": "Tiền vệ phải",
    "Left Midfield": "Tiền vệ trái",
    "Right Winger": "Tiền đạo cánh phải",
    "Left Winger": "Tiền đạo cánh trái",

    "Centre-Forward": "Trung phong",
    "Center-Forward": "Trung phong",
    Striker: "Tiền đạo",
  };

  function posVi(pos) {
    const s = String(pos || "").trim();
    return POS_VI[s] || s || "—";
  }

  const NAT_VI = {
    England: "Anh",
    Scotland: "Scotland",
    Wales: "Wales",
    "Northern Ireland": "Bắc Ireland",
    "United Kingdom": "Vương quốc Anh",

    France: "Pháp",
    Spain: "Tây Ban Nha",
    Portugal: "Bồ Đào Nha",
    Germany: "Đức",
    Netherlands: "Hà Lan",
    Belgium: "Bỉ",
    Italy: "Ý",
    Norway: "Na Uy",
    Sweden: "Thụy Điển",
    Denmark: "Đan Mạch",
    Switzerland: "Thụy Sĩ",
    Austria: "Áo",
    Poland: "Ba Lan",
    Croatia: "Croatia",
    Serbia: "Serbia",
    Ukraine: "Ukraina",
    Russia: "Nga",
    Turkey: "Thổ Nhĩ Kỳ",
    Greece: "Hy Lạp",
    Ireland: "Ireland",

    Morocco: "Ma-rốc",
    Ghana: "Ghana",
    Nigeria: "Nigeria",
    Senegal: "Senegal",
    Egypt: "Ai Cập",
    Algeria: "Algeria",
    Tunisia: "Tunisia",

    Brazil: "Brazil",
    Argentina: "Argentina",
    Uruguay: "Uruguay",
    Colombia: "Colombia",

    Uzbekistan: "Uzbekistan",
    Iran: "Iran",
    Iraq: "Iraq",
    "Saudi Arabia": "Ả Rập Xê Út",
    Qatar: "Qatar",
    Israel: "Israel",
  };

  function natVi(nat) {
    const s = String(nat || "").trim();
    return NAT_VI[s] || s || "—";
  }

  /* =========================
     Player avatar fallback
     ========================= */
  function playerAvatarUrl(it) {
    if (it?.photo_url) return it.photo_url;
    const name = it?.name || "Player";
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(
      name,
    )}&background=1f2230&color=fff&size=96&rounded=true&bold=true`;
  }

  /* =========================
     FLAGS: LOCAL FIRST, CDN BACKUP
     ========================= */
  const FLAG_LOCAL_BASE = "../assets/flags"; // từ /frontend/html/player.html
  const FLAG_CDN_BASE = "https://flagcdn.com";

  // map nationality (EN gốc) -> ISO alpha-2 code
  const NAT_TO_CODE = {
    nigeria: "ng",
    spain: "es",
    ireland: "ie",
    "republic of ireland": "ie",

    england: "gb",
    scotland: "gb",
    wales: "gb",
    "united kingdom": "gb",
    "great britain": "gb",
    "northern ireland": "gb",

    hungary: "hu",
    sweden: "se",
    argentina: "ar",
    brazil: "br",
    portugal: "pt",
    france: "fr",
    germany: "de",
    netherlands: "nl",
    belgium: "be",
    italy: "it",
    norway: "no",
    denmark: "dk",
    switzerland: "ch",
    austria: "at",
    poland: "pl",
    serbia: "rs",
    croatia: "hr",
    slovenia: "si",
    slovakia: "sk",
    "czech republic": "cz",
    czechia: "cz",
    romania: "ro",
    ukraine: "ua",
    russia: "ru",
    turkey: "tr",
    greece: "gr",
    iceland: "is",
    finland: "fi",

    cameroon: "cm",
    ghana: "gh",
    senegal: "sn",
    mali: "ml",
    egypt: "eg",
    morocco: "ma",
    tunisia: "tn",
    algeria: "dz",
    "ivory coast": "ci",
    "cote d'ivoire": "ci",
    "côte d’ivoire": "ci",
    "côte d'ivoire": "ci",
    "south africa": "za",

    "united states": "us",
    usa: "us",
    canada: "ca",
    mexico: "mx",

    japan: "jp",
    "south korea": "kr",
    "korea republic": "kr",
    china: "cn",
    australia: "au",
    "new zealand": "nz",

    uruguay: "uy",
    colombia: "co",
    ecuador: "ec",
    chile: "cl",
    peru: "pe",
    venezuela: "ve",
    paraguay: "py",
    bolivia: "bo",

    uzbekistan: "uz",
    iran: "ir",
    iraq: "iq",
    "saudi arabia": "sa",
    qatar: "qa",
    israel: "il",
  };

  function normNat(nat) {
    return String(nat || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");
  }

  function flagLocal(code) {
    return `${FLAG_LOCAL_BASE}/${code}.png`;
  }

  function flagCdn(code) {
    return `${FLAG_CDN_BASE}/w40/${code}.png`;
  }

  // ✅ natRaw: dùng để map cờ | natLabel: chữ hiển thị tiếng Việt
  function nationalityHTML(natRaw, natLabel) {
    const nat = String(natRaw || "").trim(); // để map cờ
    const label = String(natLabel || natRaw || "").trim(); // để hiển thị
    const key = normNat(nat);
    const code = NAT_TO_CODE[key] || "";
    const codeUp = (code || "??").toUpperCase();
    const title = esc(label || "");

    if (!code) {
      return `
        <div class="natCell" title="${title}">
          <span class="natCode show">${codeUp}</span>
          <span class="natText">${esc(label || "—")}</span>
        </div>
      `;
    }

    const localSrc = flagLocal(code);
    const cdnSrc = flagCdn(code);

    return `
      <div class="natCell" title="${title}">
        <img class="natFlag"
          loading="lazy"
          src="${localSrc}"
          data-alt-src="${cdnSrc}"
          alt="${title}"
          onload="this.nextElementSibling.classList.remove('show')"
          onerror="
            if (this.dataset.altSrc) {
              const u = this.dataset.altSrc;
              this.dataset.altSrc = '';
              this.src = u;
            } else {
              this.style.display='none';
              this.nextElementSibling.classList.add('show');
            }
          "
        />
        <span class="natCode">${codeUp}</span>
        <span class="natText">${esc(label || "—")}</span>
      </div>
    `;
  }

  function renderRows(items) {
    if (!els.rows) return;
    if (!items || !items.length) {
      els.rows.innerHTML = "";
      return;
    }

    els.rows.innerHTML = items
      .map((it) => {
        const pid = it.id;
        const name = esc(it.name || "Unknown");

        const posLabel = posVi(it.position);
        const pos = esc(posLabel);

        const club = it.club || {};
        const crest = esc(club.crest || "");
        const clubName = esc(club.name || "");
        const avatar = playerAvatarUrl(it);

        return `
          <div class="playerRow">
            <div class="playerCell">
              <img class="playerAvatar" src="${esc(avatar)}" alt="avatar" referrerpolicy="no-referrer"/>
              <div class="playerName" title="${name}">${name}</div>
            </div>

            <div class="clubCell">
              ${
                crest
                  ? `<img class="clubCrest" src="${crest}" alt="crest" />`
                  : `<span style="opacity:.6">—</span>`
              }
              <div class="clubName" title="${clubName}">${clubName}</div>
            </div>

            <div>${pos || "—"}</div>

            ${nationalityHTML(it.nationality, natVi(it.nationality))}

            <button class="followBtn" type="button" data-player="${esc(pid)}">
              Follow
            </button>
          </div>
        `;
      })
      .join("");

    els.rows.querySelectorAll(".followBtn").forEach((btn) => {
      btn.addEventListener("click", () => {
        btn.textContent = btn.textContent === "Follow" ? "Following" : "Follow";
      });
    });
  }

  function updatePager() {
    const total = state.allItems.length;
    const totalPages = Math.max(1, Math.ceil(total / state.pageSize));
    if (state.page > totalPages) state.page = totalPages;
    if (state.page < 1) state.page = 1;

    if (els.pageInfo)
      els.pageInfo.textContent = `${state.page} / ${totalPages}`;
    if (els.btnPrev) els.btnPrev.disabled = state.page <= 1;
    if (els.btnNext) els.btnNext.disabled = state.page >= totalPages;

    setMsg(
      total
        ? `Total: ${total} • Trang ${state.page}/${totalPages}`
        : "Không có dữ liệu.",
    );
  }

  function renderCurrentPage() {
    const start = (state.page - 1) * state.pageSize;
    const slice = state.allItems.slice(start, start + state.pageSize);
    renderRows(slice);
    updatePager();
  }

  function fillClubSelect(clubs) {
    if (!els.club) return;
    const current = els.club.value || "";

    const opts = [`<option value="">Club</option>`];
    (clubs || []).forEach((c) => {
      if (!c || !c.id || !c.name) return;
      opts.push(
        `<option value="${esc(String(c.id))}">${esc(String(c.name))}</option>`,
      );
    });

    els.club.innerHTML = opts.join("");
    if (current && (clubs || []).some((c) => String(c.id) === current)) {
      els.club.value = current;
    }
  }

  async function loadClubs({ forceRefresh = false } = {}) {
    try {
      const p = new URLSearchParams();
      p.set("league", state.league);
      p.set("season", String(state.season));
      if (forceRefresh) p.set("refresh", "1");

      let data = await apiGet(`/api/clubs?${p.toString()}`);
      let clubs = data.clubs || [];
      fillClubSelect(clubs);

      if (!forceRefresh && clubs.length > 0 && clubs.length < 20) {
        data = await apiGet(
          `/api/clubs?league=${state.league}&season=${state.season}&refresh=1`,
        );
        clubs = data.clubs || [];
        fillClubSelect(clubs);
      }
    } catch (e) {
      console.warn("loadClubs fail:", e);
    }
  }

  async function loadPlayersAllThenPaginate() {
    setMsg("Đang tải cầu thủ…");
    try {
      const data = await apiGet(buildPlayersQueryAll());
      const items = data.items || [];

      sortPlayersAZ(items);
      state.allItems = items;
      state.page = 1;
      renderCurrentPage();
    } catch (e) {
      console.error(e);
      state.allItems = [];
      renderRows([]);
      updatePager();
      setMsg("Lỗi tải players. Kiểm tra backend /api/players.");
    }
  }

  function bind() {
    els.season?.addEventListener("change", async () => {
      state.season = normalizeSeason(els.season.value);

      state.q = "";
      state.club_id = "";
      state.position = "";
      state.page = 1;

      if (els.q) els.q.value = "";
      if (els.club) els.club.value = "";
      if (els.pos) els.pos.value = "";

      await loadClubs({ forceRefresh: false });
      await loadPlayersAllThenPaginate();
    });

    els.club?.addEventListener("change", () => {
      state.club_id = normalizeAllToEmpty(els.club.value);
      state.page = 1;
      loadPlayersAllThenPaginate();
    });

    els.pos?.addEventListener("change", () => {
      state.position = normalizeAllToEmpty(els.pos.value);
      state.page = 1;
      loadPlayersAllThenPaginate();
    });

    let t = null;
    els.q?.addEventListener("input", () => {
      state.q = (els.q.value || "").trim();
      state.page = 1;
      if (t) clearTimeout(t);
      t = setTimeout(loadPlayersAllThenPaginate, 350);
    });

    els.btnReset?.addEventListener("click", async () => {
      if (els.q) els.q.value = "";
      if (els.club) els.club.value = "";
      if (els.pos) els.pos.value = "";

      state.q = "";
      state.club_id = "";
      state.position = "";
      state.page = 1;

      await loadClubs({ forceRefresh: false });
      await loadPlayersAllThenPaginate();
    });

    els.btnPrev?.addEventListener("click", () => {
      if (state.page > 1) {
        state.page -= 1;
        renderCurrentPage();
      }
    });

    els.btnNext?.addEventListener("click", () => {
      const totalPages = Math.max(
        1,
        Math.ceil(state.allItems.length / state.pageSize),
      );
      if (state.page < totalPages) {
        state.page += 1;
        renderCurrentPage();
      }
    });
  }

  (async function init() {
    state.season = normalizeSeason(els.season?.value);
    bind();
    await loadClubs({ forceRefresh: false });
    await loadPlayersAllThenPaginate();
  })();
})();
