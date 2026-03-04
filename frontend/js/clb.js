/* frontend/js/clb.js - Clubs page (v3) */
(() => {
  const API_BASE = "http://127.0.0.1:5000";
  const $ = (s) => document.querySelector(s);

  const els = {
    league: $("#league"),
    season: $("#season"),
    q: $("#q"),
    btnReload: $("#btnReload"),
    btnReset: $("#btnReset"),

    msg: $("#msg"),
    seasonTitle: $("#seasonTitle"),
    heroSeason: $("#heroSeason"),
    heroCount: $("#heroCount"),

    btnViewGrid: $("#btnViewGrid"),
    btnViewList: $("#btnViewList"),
    clubGrid: $("#clubGrid"),
  };

  const state = {
    league: "PL",
    season: null,
    q: "",
    view: "grid",
    teams: [],
    seasons: [],
  };

  function esc(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function showMsg(text, kind = "info") {
    if (!els.msg) return;
    if (!text) {
      els.msg.style.display = "none";
      els.msg.textContent = "";
      return;
    }

    els.msg.style.display = "block";
    els.msg.textContent = text;

    if (kind === "error")
      els.msg.style.borderColor = "rgba(255, 45, 109, 0.38)";
    else if (kind === "warn")
      els.msg.style.borderColor = "rgba(255, 154, 47, 0.35)";
    else els.msg.style.borderColor = "rgba(255, 255, 255, 0.18)";
  }

  async function apiGet(path) {
    const res = await fetch(`${API_BASE}${path}`);
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(`GET ${path} -> ${res.status} ${t}`);
    }
    return res.json();
  }

  function seasonLabel(y) {
    if (!y) return "—";
    const yy = String(y + 1).slice(-2);
    return `${y}/${yy}`;
  }

  function initials(name) {
    const s = String(name || "").trim();
    if (!s) return "?";
    const parts = s.split(/\s+/).filter(Boolean);
    const a = parts[0]?.[0] || "?";
    const b = parts.length > 1 ? parts[parts.length - 1]?.[0] : "";
    return (a + b).toUpperCase();
  }

  function normWebsite(url) {
    const s = String(url || "").trim();
    if (!s) return "";
    if (s.startsWith("http://") || s.startsWith("https://")) return s;
    return `https://${s.replace(/^\/+/, "")}`;
  }

  function filterTeams(list) {
    const q = (state.q || "").trim().toLowerCase();
    if (!q) return list;
    return list.filter((t) => {
      const hay =
        `${t.name || ""} ${t.tla || ""} ${t.venue || ""} ${t.area || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }

  function setView(view) {
    state.view = view;
    if (els.clubGrid) els.clubGrid.dataset.view = view;

    els.btnViewGrid?.classList.toggle("isActive", view === "grid");
    els.btnViewList?.classList.toggle("isActive", view === "list");

    render();
  }

  function renderGrid(items) {
    if (!els.clubGrid) return;

    els.clubGrid.innerHTML = items
      .map((t) => {
        const crest = t.crest
          ? `<img src="${esc(t.crest)}" alt="${esc(t.name)}" loading="lazy"/>`
          : `<div class="clubCrestFallback">${esc(initials(t.name))}</div>`;

        const founded = t.founded ? String(t.founded) : "—";
        const web = normWebsite(t.website);

        return `
          <article class="clubCard" data-id="${esc(t.id)}">
            <div class="clubCard__top">
              <div class="clubCard__crest">${crest}</div>
              <div>
                <h3 class="clubCard__name">${esc(t.name || "Unknown")}</h3>
                <div class="clubCard__sub">${esc(t.tla || "")} ${t.area ? `• ${esc(t.area)}` : ""}</div>
              </div>
            </div>

            <div class="clubCard__mid">
              <div class="clubLine"><b>Sân</b><span>${esc(t.venue || "—")}</span></div>
              <div class="clubLine"><b>Năm TL</b><span>${esc(founded)}</span></div>
              <div class="clubLine"><b>Màu</b><span>${esc(t.clubColors || "—")}</span></div>
            </div>

            <div class="clubCard__foot">
              ${web ? `<button class="clubMiniBtn primary" data-web="${esc(web)}" type="button">Website</button>` : ``}
              <button class="clubMiniBtn" data-copy="${esc(t.name || "")}" type="button">Copy tên</button>
            </div>
          </article>
        `;
      })
      .join("");

    els.clubGrid.querySelectorAll("[data-web]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const url = btn.dataset.web;
        if (url) window.open(url, "_blank", "noopener,noreferrer");
      });
    });

    els.clubGrid.querySelectorAll("[data-copy]").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const text = btn.dataset.copy || "";
        try {
          await navigator.clipboard.writeText(text);
          showMsg(`Đã copy: ${text}`, "info");
          setTimeout(() => showMsg(""), 1200);
        } catch {
          showMsg(
            "Trình duyệt chặn copy 😅 Bạn copy thủ công giúp mình nha.",
            "warn",
          );
        }
      });
    });
  }

  function render() {
    const filtered = filterTeams(state.teams);
    const ss = seasonLabel(Number(state.season));

    if (els.seasonTitle) els.seasonTitle.textContent = `CLB mùa ${ss}`;
    if (els.heroSeason) els.heroSeason.textContent = `Mùa: ${ss}`;
    if (els.heroCount) els.heroCount.textContent = `${filtered.length} CLB`;

    renderGrid(filtered);
  }

  async function loadSeasons() {
    const league = state.league;
    const json = await apiGet(
      `/api/available-seasons?league=${encodeURIComponent(league)}`,
    );
    const list = json?.data || [];
    state.seasons = list;

    if (els.season) {
      els.season.innerHTML = list
        .map((x) => `<option value="${esc(x.value)}">${esc(x.label)}</option>`)
        .join("");

      if (!state.season && list[0]) state.season = list[0].value;
      els.season.value = String(state.season || "");
    }

    render();
  }

  async function loadTeams() {
    const league = state.league;
    const season = state.season;

    if (!season) {
      state.teams = [];
      render();
      return;
    }

    showMsg("Đang tải danh sách CLB...", "info");

    try {
      const json = await apiGet(
        `/api/teams?league=${encodeURIComponent(league)}&season=${encodeURIComponent(season)}`,
      );

      if (!json?.ok) {
        state.teams = [];
        showMsg(json?.error || "Không tải được danh sách CLB", "error");
        render();
        return;
      }

      state.teams = (json?.teams || []).map((t) => ({
        id: t.id,
        name: t.name,
        tla: t.tla,
        crest: t.crest,
        venue: t.venue,
        website: t.website,
        founded: t.founded,
        clubColors: t.clubColors,
        area: t.area,
      }));

      showMsg("", "info");
      render();

      if (!state.teams.length) {
        showMsg(
          "API trả về 0 đội. Nếu bạn chưa set FOOTBALL_DATA_TOKEN thì /api/teams sẽ rỗng.",
          "warn",
        );
      }
    } catch (e) {
      console.error(e);
      state.teams = [];
      render();
      showMsg(
        "Lỗi tải CLB 😵 Kiểm tra backend đang chạy (http://127.0.0.1:5000) và endpoint /api/teams nhé.",
        "error",
      );
    }
  }

  function bind() {
    els.league?.addEventListener("change", async () => {
      state.league = (els.league.value || "PL").toUpperCase();
      showMsg("", "info");
      state.season = null;
      await loadSeasons();
      await loadTeams();
    });

    els.season?.addEventListener("change", async () => {
      const v = Number(els.season.value || 0) || null;
      state.season = v;
      await loadTeams();
    });

    els.q?.addEventListener("input", () => {
      state.q = els.q.value || "";
      render();
    });

    els.btnReload?.addEventListener("click", async () => {
      await loadTeams();
    });

    els.btnReset?.addEventListener("click", async () => {
      state.q = "";
      if (els.q) els.q.value = "";

      // reset view + league giữ nguyên, mùa về option đầu
      setView("grid");
      if (els.season && els.season.options.length) {
        state.season = Number(els.season.options[0].value) || null;
        els.season.value = String(state.season || "");
      }

      showMsg("", "info");
      await loadTeams();
    });

    els.btnViewGrid?.addEventListener("click", () => setView("grid"));
    els.btnViewList?.addEventListener("click", () => setView("list"));
  }

  async function init() {
    state.league = (els.league?.value || "PL").toUpperCase();
    bind();

    try {
      await loadSeasons();
      await loadTeams();
    } catch (e) {
      console.error(e);
      showMsg("Không init được trang CLB 😵", "error");
    }
  }

  window.addEventListener("DOMContentLoaded", init);
})();
