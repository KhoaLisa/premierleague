// frontend/js/chanthuong.js
// Trang: /frontend/html/chanthuong.html
// Data demo: /frontend/data/injuries-demo.json

(() => {
  const DATA_URL = "../data/injuries-demo.json";

  const $ = (s) => document.querySelector(s);

  const els = {
    updated: $("#injUpdated"),
    lead: $("#injLead"),
    bullet: $("#injBullet"),

    impWrap: $("#impWrap"),
    btnImpLeft: $("#btnImpLeft"),
    btnImpRight: $("#btnImpRight"),

    q: $("#q"),
    club: $("#club"),
    status: $("#status"),
    btnReset: $("#btnReset"),
    clubsWrap: $("#clubsWrap"),
  };

  const state = {
    data: null,
    q: "",
    club: "",
    status: "",
  };

  function esc(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function fmtDate(iso) {
    if (!iso) return "—";
    try {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return iso;
      return d.toLocaleDateString("vi-VN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
    } catch {
      return iso;
    }
  }

  async function load() {
    const res = await fetch(DATA_URL, { cache: "no-store" });
    if (!res.ok)
      throw new Error(`Không tải được injuries-demo.json (${res.status})`);
    state.data = await res.json();
  }

  function renderHero() {
    const d = state.data || {};
    if (els.updated) els.updated.textContent = fmtDate(d.updated_at);
    if (els.lead && d.lead) els.lead.textContent = d.lead;

    if (els.bullet) {
      const list = Array.isArray(d.bullets) ? d.bullets : [];
      els.bullet.innerHTML = list.map((x) => `<li>${esc(x)}</li>`).join("");
    }
  }

  function renderImportant() {
    if (!els.impWrap) return;
    const list = state.data?.important || [];

    els.impWrap.innerHTML = list
      .map(
        (it) => `
          <article class="injCard" tabindex="0" role="group" aria-label="${esc(it.title)}">
            <div class="injCard__img">
              <img src="${esc(it.image || "")}" alt="" loading="lazy" />
            </div>
            <div class="injCard__body">
              <div class="injCard__tag">${esc(it.tag || "Tin")}</div>
              <div class="injCard__title">${esc(it.title || "—")}</div>
              <div class="injCard__sub">${esc(it.sub || "")}</div>
              <div class="injCard__meta">
                <span>${esc(it.updated || "")}</span>
                <span>Đọc →</span>
              </div>
            </div>
          </article>
        `,
      )
      .join("");
  }

  function fillClubSelect() {
    if (!els.club) return;
    const clubs = state.data?.clubs || [];
    const opts = [
      `<option value="">Tất cả CLB</option>`,
      ...clubs.map(
        (c) => `<option value="${esc(c.id)}">${esc(c.name)}</option>`,
      ),
    ];
    els.club.innerHTML = opts.join("");
  }

  function matchText(item, q) {
    if (!q) return true;
    const hay =
      `${item.player} ${item.pos} ${item.issue} ${item.status} ${item.return} ${item.note}`
        .toLowerCase()
        .replaceAll("đ", "d");
    const needle = q.toLowerCase().replaceAll("đ", "d");
    return hay.includes(needle);
  }

  function matchStatus(item, s) {
    if (!s) return true;
    return String(item.status || "").toLowerCase() === String(s).toLowerCase();
  }

  function rowStatusPill(status) {
    const s = String(status || "");
    const map = {
      Injured: "Chấn thương",
      Suspended: "Treo giò",
      Doubtful: "Nghi ngờ",
      Returning: "Sắp trở lại",
    };
    return `<span class="injStatus" data-s="${esc(s)}">${esc(map[s] || s || "—")}</span>`;
  }

  function renderClubs() {
    if (!els.clubsWrap) return;

    const clubs = state.data?.clubs || [];
    const q = (state.q || "").trim();
    const clubId = state.club || "";
    const stt = state.status || "";

    const filteredClubs = clubId ? clubs.filter((c) => c.id === clubId) : clubs;

    const html = filteredClubs
      .map((club) => {
        const items0 = Array.isArray(club.items) ? club.items : [];
        const items = items0
          .filter((it) => matchText(it, q))
          .filter((it) => matchStatus(it, stt));

        if (!items.length) return "";

        const rows = items
          .map(
            (it) => `
              <tr>
                <td><b>${esc(it.player || "—")}</b><div class="injMuted">${esc(
                  it.pos || "",
                )}</div></td>
                <td>${esc(it.issue || "—")}<div class="injMuted">${esc(
                  it.note || "",
                )}</div></td>
                <td class="injRight">${esc(it.return || "—")}</td>
                <td class="injRight">${rowStatusPill(it.status)}</td>
              </tr>
            `,
          )
          .join("");

        return `
          <section class="injClubCard">
            <div class="injClubHead">
              <img class="injClubLogo" src="${esc(club.logo || "")}" alt="" loading="lazy" />
              <div class="injClubName">${esc(club.name || "CLB")}</div>
              <div class="injClubCount">${items.length} ca</div>
            </div>
            <div class="injTableWrap">
              <table class="injTable">
                <thead>
                  <tr>
                    <th style="width:34%">Người chơi</th>
                    <th>Chấn thương</th>
                    <th class="injRight" style="width:16%">Trở lại</th>
                    <th class="injRight" style="width:18%">Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  ${rows}
                </tbody>
              </table>
            </div>
          </section>
        `;
      })
      .filter(Boolean)
      .join("");

    els.clubsWrap.innerHTML =
      html ||
      `<div class="injMuted" style="padding:10px">Không có kết quả phù hợp 😭</div>`;
  }

  function scrollImp(dir) {
    const wrap = els.impWrap;
    if (!wrap) return;
    const delta = Math.round(wrap.clientWidth * 0.85) * dir;
    wrap.scrollBy({ left: delta, behavior: "smooth" });
  }

  function bind() {
    els.btnImpLeft?.addEventListener("click", () => scrollImp(-1));
    els.btnImpRight?.addEventListener("click", () => scrollImp(1));

    const rerender = () => {
      state.q = els.q?.value || "";
      state.club = els.club?.value || "";
      state.status = els.status?.value || "";
      renderClubs();
    };

    els.q?.addEventListener("input", rerender);
    els.club?.addEventListener("change", rerender);
    els.status?.addEventListener("change", rerender);

    els.btnReset?.addEventListener("click", () => {
      if (els.q) els.q.value = "";
      if (els.club) els.club.value = "";
      if (els.status) els.status.value = "";
      state.q = "";
      state.club = "";
      state.status = "";
      renderClubs();
    });
  }

  async function init() {
    try {
      await load();
      renderHero();
      renderImportant();
      fillClubSelect();
      bind();
      renderClubs();
    } catch (e) {
      console.warn(e);
      if (els.clubsWrap)
        els.clubsWrap.innerHTML = `<div class="injMuted" style="padding:10px">Không tải được dữ liệu chấn thương.</div>`;
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
