/* frontend/js/home.js - FULL
   - User dropdown + hydrate profile
   - News feed global/personal
   - ✅ Upcoming fixtures: chỉ 2 ngày gần nhất có trận (group theo ngày VN)
   - ✅ BỎ KHUNG LOGO, tên nằm DƯỚI logo
   - ✅ Nickname (Man Utd / Spurs...) + tooltip full name
   - ✅ Fix utc_date thiếu timezone (thêm Z)
*/
(() => {
  const API_BASE = (() => {
    const host = window.location.hostname;
    const port = window.location.port;
    if ((host === "127.0.0.1" || host === "localhost") && port === "5000")
      return "";
    return "http://127.0.0.1:5000";
  })();

  const TZ_VN = "Asia/Ho_Chi_Minh";

  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));

  const els = {
    btnLogin: $("#btnLogin"),

    userMenuWrap: $("#userMenuWrap"),
    btnUser: $("#btnUser"),
    userAvatar: $("#userAvatar"),
    userName: $("#userName"),

    userMenu: $("#userMenu"),
    userName2: $("#userName2"),
    userEmail2: $("#userEmail2"),

    btnLogout: $("#btnLogout"),
    btnOpenPrefs: $("#btnOpenPrefs"),
    loginHint: $("#loginHint"),

    btnRefreshNews: $("#btnRefreshNews"),
    searchInput: $("#searchInput"),
    btnSearch: $("#btnSearch"),

    matchList: $("#matchList"),
    newsGrid: $("#newsGrid"),

    drawerOverlay: $("#drawerOverlay"),
    prefsDrawer: $("#prefsDrawer"),
    btnClosePrefs: $("#btnClosePrefs"),
  };

  const store = {
    get userId() {
      const v = localStorage.getItem("efi_user_id");
      return v ? parseInt(v, 10) : null;
    },
    set userId(v) {
      if (v === null || v === undefined) localStorage.removeItem("efi_user_id");
      else localStorage.setItem("efi_user_id", String(v));
    },
    get userEmail() {
      return localStorage.getItem("efi_user_email") || "";
    },
    set userEmail(v) {
      if (!v) localStorage.removeItem("efi_user_email");
      else localStorage.setItem("efi_user_email", v);
    },
    get userName() {
      return localStorage.getItem("efi_user_name") || "";
    },
    set userName(v) {
      if (!v) localStorage.removeItem("efi_user_name");
      else localStorage.setItem("efi_user_name", v);
    },
    get userPicture() {
      return localStorage.getItem("efi_user_picture") || "";
    },
    set userPicture(v) {
      if (!v) localStorage.removeItem("efi_user_picture");
      else localStorage.setItem("efi_user_picture", v);
    },
  };

  const isLoggedIn = () => !!store.userId;

  function escapeHtml(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  // ===== API =====
  async function apiGet(path) {
    const res = await fetch(`${API_BASE}${path}`, { method: "GET" });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(`GET ${path} -> ${res.status} ${t}`);
    }
    return res.json();
  }

  async function apiPost(path, body) {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body || {}),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(`POST ${path} -> ${res.status} ${t}`);
    }
    return res.json();
  }

  // ✅ Hydrate profile nếu localStorage thiếu name/email/picture
  async function hydrateUserProfileIfMissing() {
    const uid = store.userId;
    if (!uid) return;

    const needName = !store.userName;
    const needEmail = !store.userEmail;
    const needPic = !store.userPicture;
    if (!needName && !needEmail && !needPic) return;

    try {
      const data = await apiGet(`/api/me?user_id=${uid}`);
      const u = data.user || {};
      if (u.email && needEmail) store.userEmail = u.email;
      if (u.name && needName) store.userName = u.name;
      if (u.picture && needPic) store.userPicture = u.picture;
    } catch (e) {
      console.warn("hydrateUserProfileIfMissing fail:", e);
    }
  }

  // ===== Dropdown menu =====
  function closeUserMenu() {
    if (!els.userMenu) return;
    els.userMenu.classList.add("hidden");
    els.btnUser?.setAttribute("aria-expanded", "false");
  }

  function toggleUserMenu() {
    if (!els.userMenu) return;
    const isOpen = !els.userMenu.classList.contains("hidden");
    if (isOpen) closeUserMenu();
    else {
      els.userMenu.classList.remove("hidden");
      els.btnUser?.setAttribute("aria-expanded", "true");
    }
  }

  function bindOutsideClick() {
    document.addEventListener("click", (e) => {
      const wrap = els.userMenuWrap;
      if (!wrap) return;
      if (!wrap.contains(e.target)) closeUserMenu();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeUserMenu();
    });
  }

  // ===== Auth UI =====
  function setAuthUI(flag) {
    if (!els.btnLogin || !els.userMenuWrap) return;

    if (flag) {
      els.btnLogin.classList.add("efiHide");
      els.userMenuWrap.classList.remove("efiHide");

      const name = store.userName || store.userEmail || "User";
      const email = store.userEmail || "";

      if (els.userName) els.userName.textContent = name;
      if (els.userName2) els.userName2.textContent = name;
      if (els.userEmail2) els.userEmail2.textContent = email;

      if (els.userAvatar) {
        const pic = store.userPicture;
        els.userAvatar.src =
          pic ||
          `https://ui-avatars.com/api/?name=${encodeURIComponent(
            name,
          )}&background=2a2a2a&color=fff`;
      }

      if (els.loginHint) {
        els.loginHint.textContent =
          "Bạn đã đăng nhập → đang xem feed cá nhân hoá.";
      }
    } else {
      els.btnLogin.classList.remove("efiHide");
      els.userMenuWrap.classList.add("efiHide");
      closeUserMenu();

      if (els.loginHint) {
        els.loginHint.textContent = "Bạn chưa đăng nhập → đang xem feed chung.";
      }
    }
  }

  // ===== prefs drawer =====
  function openPrefs() {
    if (!els.drawerOverlay || !els.prefsDrawer) return;
    els.drawerOverlay.classList.remove("hidden");
    els.prefsDrawer.classList.remove("hidden");
    els.prefsDrawer.setAttribute("aria-hidden", "false");
  }

  function closePrefs() {
    if (!els.drawerOverlay || !els.prefsDrawer) return;
    els.drawerOverlay.classList.add("hidden");
    els.prefsDrawer.classList.add("hidden");
    els.prefsDrawer.setAttribute("aria-hidden", "true");
  }

  // ===== sticky fallback =====
  function enableHeaderStickyFallback() {
    const header = document.querySelector(".plHeader");
    if (!header) return;

    const THRESHOLD = header.offsetTop;
    const applyFixed = (on) => {
      if (on) {
        header.classList.add("isFixed");
        document.body.classList.add("hasFixedHeader");
      } else {
        header.classList.remove("isFixed");
        document.body.classList.remove("hasFixedHeader");
      }
    };

    window.addEventListener("scroll", () => {
      const y = window.scrollY || document.documentElement.scrollTop;
      applyFixed(y > THRESHOLD + 10);
    });
  }

  // =========================================================
  // ✅ Upcoming fixtures: 2 ngày gần nhất có trận (VN)
  // =========================================================
  const CREST_FALLBACK =
    "https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png";

  const pad2 = (n) => String(n).padStart(2, "0");

  function normalizeUtcString(s) {
    const str = String(s || "").trim();
    if (!str) return "";
    // ISO thiếu timezone -> thêm Z
    if (
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(str) &&
      !/(Z|[+-]\d{2}:\d{2})$/.test(str)
    ) {
      return `${str}Z`;
    }
    // "YYYY-MM-DD HH:mm:ss" -> ISO + Z
    if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}/.test(str)) {
      return `${str.replace(" ", "T")}Z`;
    }
    return str;
  }

  function safeDate(utcStr) {
    const s = normalizeUtcString(utcStr);
    if (!s) return null;
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return null;
    return d;
  }

  function vnDateKeyFromUtc(utcStr) {
    const d = safeDate(utcStr);
    if (!d) return "";
    const vn = new Date(d.toLocaleString("en-US", { timeZone: TZ_VN }));
    return `${vn.getFullYear()}-${pad2(vn.getMonth() + 1)}-${pad2(vn.getDate())}`;
  }

  function fmtKickVN(utcStr) {
    const d = safeDate(utcStr);
    if (!d) return "";
    return d.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: TZ_VN,
    });
  }

  function fmtDayHeaderVN(utcStr) {
    const d = safeDate(utcStr);
    if (!d) return "";
    const WD_MAP = {
      Sun: "CN",
      Mon: "T2",
      Tue: "T3",
      Wed: "T4",
      Thu: "T5",
      Fri: "T6",
      Sat: "T7",
    };

    const wdEn = new Intl.DateTimeFormat("en-US", {
      timeZone: TZ_VN,
      weekday: "short",
    }).format(d);

    const ddmm = new Intl.DateTimeFormat("en-GB", {
      timeZone: TZ_VN,
      day: "2-digit",
      month: "2-digit",
    }).format(d);

    return `${WD_MAP[wdEn] || wdEn} ${ddmm}`;
  }

  // Nickname mapping
  function toNickName(rawName) {
    const n = String(rawName || "")
      .replace(/\bAFC\b/gi, "")
      .replace(/\bFC\b/gi, "")
      .replace(/\s+/g, " ")
      .trim();

    const low = n.toLowerCase();
    if (low.includes("manchester united")) return "Man Utd";
    if (low.includes("manchester city")) return "Man City";
    if (low.includes("tottenham")) return "Spurs";
    if (low.includes("nottingham forest")) return "Nottm Forest";
    if (low.includes("wolverhampton")) return "Wolves";
    if (low.includes("brighton")) return "Brighton";
    if (low.includes("crystal palace")) return "Crystal Palace";
    if (low.includes("sheffield united")) return "Sheff Utd";
    if (low.includes("west ham")) return "West Ham";
    return n || "CLB";
  }

  function teamBadge(name) {
    const parts = String(name || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    return (parts[0]?.slice(0, 3) || "CLB").toUpperCase();
  }

  // ✅ logo không khung: img + fallback text (ẩn hiện bằng onload/onerror)
  function crestHtml(url, fallbackText) {
    const s = String(url || "").trim();
    const fb = escapeHtml(fallbackText || "");
    if (!s) {
      return `<span class="plCrestTxt" style="display:grid">${fb}</span>`;
    }
    const src = escapeHtml(s);
    return `
<img class="plCrest" src="${src}" alt="" loading="lazy" referrerpolicy="no-referrer"
  onload="this.nextElementSibling.style.display='none';"
  onerror="this.style.display='none';this.nextElementSibling.style.display='grid';" />
<span class="plCrestTxt">${fb}</span>
`;
  }

  function renderMatchRow(m) {
    const homeRaw = m.home_name || "Home";
    const awayRaw = m.away_name || "Away";

    const homeName = toNickName(homeRaw);
    const awayName = toNickName(awayRaw);

    const homeCrest = m.home_crest || "";
    const awayCrest = m.away_crest || "";

    const kick = fmtKickVN(m.utc_date) || "--:--";

    return `
<div class="plFixRow">
  <div class="plTeam plTeam--stack" title="${escapeHtml(homeRaw)}">
    ${crestHtml(homeCrest, teamBadge(homeRaw))}
    <span class="plTeamName">${escapeHtml(homeName)}</span>
  </div>

  <div class="plKick">${escapeHtml(kick)}</div>

  <div class="plTeam plTeam--stack" title="${escapeHtml(awayRaw)}">
    ${crestHtml(awayCrest, teamBadge(awayRaw))}
    <span class="plTeamName">${escapeHtml(awayName)}</span>
  </div>
</div>
`;
  }

  async function loadUpcomingMatches() {
    if (!els.matchList) return;

    try {
      const data = await apiGet(`/api/matches/upcoming?limit=250`);
      let matches = Array.isArray(data.matches) ? data.matches : [];

      // lọc trận có giờ hợp lệ & >= bây giờ
      const nowMs = Date.now();
      matches = matches
        .map((m) => ({ m, t: safeDate(m.utc_date)?.getTime() ?? null }))
        .filter((x) => x.t !== null && x.t >= nowMs)
        .sort((a, b) => a.t - b.t)
        .map((x) => x.m);

      if (!matches.length) {
        els.matchList.innerHTML = `<div class="muted" style="padding:10px">Không có lịch sắp tới.</div>`;
        return;
      }

      // group theo ngày VN -> lấy 2 ngày gần nhất có trận
      const groups = new Map(); // key => { label, items[] }
      const order = [];

      for (const m of matches) {
        const key = vnDateKeyFromUtc(m.utc_date);
        if (!key) continue;

        if (!groups.has(key)) {
          if (order.length >= 2) break; // gặp ngày thứ 3 => dừng (vì list đã sort)
          groups.set(key, {
            label: fmtDayHeaderVN(m.utc_date) || key,
            items: [],
          });
          order.push(key);
        }

        // chỉ push vào 2 ngày đầu
        if (order.includes(key)) groups.get(key).items.push(m);
      }

      const picked = order
        .filter((k) => groups.get(k)?.items?.length)
        .slice(0, 2);
      if (!picked.length) {
        els.matchList.innerHTML = `<div class="muted" style="padding:10px">Không có lịch sắp tới (thiếu utc_date).</div>`;
        return;
      }

      let html = "";
      picked.forEach((k, idx) => {
        const g = groups.get(k);
        html += `<div class="plFix__date2">${escapeHtml(g.label)}</div>`;
        html += g.items.map(renderMatchRow).join("");
        if (idx === 0 && picked.length > 1)
          html += `<div class="plFix__sep"></div>`;
      });

      els.matchList.innerHTML = html;
    } catch (e) {
      console.warn(e);
      els.matchList.innerHTML = `<div class="muted" style="padding:10px">Không tải được lịch.</div>`;
    }
  }

  // =========================================================
  // News feed
  // =========================================================
  function renderNewsCard(a) {
    const title = a.title || "Bài viết";
    const summary = a.summary || "";
    const url = a.url || "#";
    const id = a.id;
    return `
<article class="newsCard" data-article-id="${id ?? ""}">
  <div class="newsBody">
    <div class="newsTitle">${escapeHtml(title)}</div>
    <div class="newsDesc">${escapeHtml(summary)}</div>
    <div class="newsFoot">
      <a class="newsLink" href="${escapeHtml(url)}" target="_blank" rel="noopener">Đọc →</a>
    </div>
  </div>
</article>
`;
  }

  async function loadNewsFeed({ query = "" } = {}) {
    if (!els.newsGrid) return;

    const uid = store.userId;
    const logged = isLoggedIn();

    try {
      let data;
      if (logged && uid) {
        const q = query ? `&query=${encodeURIComponent(query)}` : "";
        data = await apiGet(`/api/feed/personal?user_id=${uid}${q}`);
      } else {
        const q = query ? `?query=${encodeURIComponent(query)}` : "";
        data = await apiGet(`/api/feed/global${q}`);
      }

      const items = data.articles || [];
      els.newsGrid.innerHTML = items.length
        ? items.map(renderNewsCard).join("")
        : `<div class="muted" style="padding:10px">Chưa có bài trong DB.</div>`;

      // log impression
      const topIds = items
        .slice(0, 12)
        .map((x) => x.id)
        .filter(Boolean);

      topIds.forEach((id) => {
        apiPost("/api/log/impression", {
          user_id: uid || null,
          article_id: id,
        }).catch(() => {});
      });

      // log click
      $$("#newsGrid .newsCard .newsLink").forEach((aEl) => {
        aEl.addEventListener("click", (ev) => {
          const card = ev.target.closest(".newsCard");
          const articleId = card?.getAttribute("data-article-id");
          if (!articleId) return;
          apiPost("/api/log/click", {
            user_id: uid || null,
            article_id: parseInt(articleId, 10),
          }).catch(() => {});
        });
      });
    } catch (e) {
      console.warn(e);
      els.newsGrid.innerHTML = `<div class="muted" style="padding:10px">Không tải được feed.</div>`;
    }
  }

  function logout() {
    store.userId = null;
    store.userEmail = "";
    store.userName = "";
    store.userPicture = "";
    setAuthUI(false);
    closeUserMenu();
    loadNewsFeed({}).catch(() => {});
  }

  function bindEvents() {
    els.btnLogin?.addEventListener("click", () => {
      window.location.href = "./login.html?force=1";
    });

    els.btnUser?.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleUserMenu();
    });

    els.btnLogout?.addEventListener("click", logout);

    els.btnOpenPrefs?.addEventListener("click", () => {
      closeUserMenu();
      openPrefs();
    });

    els.btnClosePrefs?.addEventListener("click", closePrefs);
    els.drawerOverlay?.addEventListener("click", closePrefs);

    els.btnRefreshNews?.addEventListener("click", () => loadNewsFeed({}));

    const doSearch = () =>
      loadNewsFeed({ query: (els.searchInput?.value || "").trim() });
    els.btnSearch?.addEventListener("click", doSearch);
    els.searchInput?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") doSearch();
    });
  }

  async function init() {
    await hydrateUserProfileIfMissing();

    setAuthUI(isLoggedIn());
    enableHeaderStickyFallback();
    bindEvents();
    bindOutsideClick();

    await loadUpcomingMatches();
    await loadNewsFeed({});
  }

  document.addEventListener("DOMContentLoaded", init);
})();
