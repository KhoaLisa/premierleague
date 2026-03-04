/* frontend/js/thongke.js */

const API_BASE = (() => {
  const host = window.location.hostname;
  const port = window.location.port;
  if ((host === "127.0.0.1" || host === "localhost") && port === "5000")
    return "";
  return "http://127.0.0.1:5000";
})();

const PLACEHOLDER =
  "https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png";

const $ = (id) => document.getElementById(id);

const seasonSelect = $("seasonSelect");
const seasonNote = $("seasonNote");

// player lists
const goalsList = $("goalsList");
const assistsList = $("assistsList");
const passesList = $("passesList");
const cleansheetsList = $("cleansheetsList");

// club lists (nếu bạn có tạo thêm trong HTML)
const clubGoalsList = $("clubGoalsList");
const clubTacklesList = $("clubTacklesList");
const clubBlocksList = $("clubBlocksList");
const clubPassesList = $("clubPassesList");

async function fetchJSON(url) {
  const r = await fetch(url, {
    headers: { "Content-Type": "application/json" },
  });
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return r.json();
}

function imgTag(src) {
  const s = (src || "").trim();
  return `<img class="avatar" src="${s || PLACEHOLDER}" onerror="this.src='${PLACEHOLDER}'" alt="" />`;
}

function renderPlayerRank(listEl, items, valueKey = "value") {
  if (!listEl) return;
  const arr = Array.isArray(items) ? items : [];

  if (!arr.length) {
    listEl.innerHTML = `<li class="hint">Không có dữ liệu.</li>`;
    return;
  }

  listEl.innerHTML = arr
    .slice(0, 10)
    .map((it, idx) => {
      const name = it.player || it.name || "Unknown";
      const team = it.team || "";
      const avatar = it.avatar || "";
      const val = Number(it[valueKey] ?? it.value ?? 0);

      return `
      <li class="rank__row">
        <span class="rank__no">${idx + 1}</span>
        ${imgTag(avatar)}
        <div class="rank__info">
          <div class="rank__name">${name}</div>
          <div class="rank__sub">${team}</div>
        </div>
        <div class="rank__val">${val}</div>
      </li>
    `;
    })
    .join("");
}

function renderClubRank(listEl, items, valueKey = "value") {
  if (!listEl) return;
  const arr = Array.isArray(items) ? items : [];

  if (!arr.length) {
    listEl.innerHTML = `<li class="hint">Không có dữ liệu.</li>`;
    return;
  }

  listEl.innerHTML = arr
    .slice(0, 10)
    .map((it, idx) => {
      const club = it.club || it.team || it.name || "Unknown";
      const crest = it.crest || it.logo || "";
      const val = Number(it[valueKey] ?? it.value ?? 0);

      return `
      <li class="rank__row">
        <span class="rank__no">${idx + 1}</span>
        ${imgTag(crest)}
        <div class="rank__info">
          <div class="rank__name">${club}</div>
          <div class="rank__sub"></div>
        </div>
        <div class="rank__val">${val}</div>
      </li>
    `;
    })
    .join("");
}

async function loadSeasons() {
  const res = await fetchJSON(`${API_BASE}/api/seasons`);
  const seasons = res?.data || res?.seasons || res || [];

  if (!Array.isArray(seasons) || !seasons.length) {
    seasonSelect.innerHTML = `<option value="">Chưa có mùa</option>`;
    seasonNote.textContent = "—";
    return;
  }

  seasonSelect.innerHTML = seasons
    .map((s) => {
      const id = s.mua_giai_id ?? s.season_id ?? s.id;
      const name = s.ten_mua_giai ?? s.name ?? `Season ${id}`;
      return `<option value="${id}">${name}</option>`;
    })
    .join("");

  seasonNote.textContent = "OK";
  await loadStats(seasonSelect.value);
}

async function loadStats(seasonId) {
  if (!seasonId) return;
  seasonNote.textContent = "Đang tải...";

  const res = await fetchJSON(
    `${API_BASE}/api/stats?season_id=${encodeURIComponent(seasonId)}`,
  );

  // player stats
  renderPlayerRank(goalsList, res.goals, "value");
  renderPlayerRank(assistsList, res.assists, "value");
  renderPlayerRank(passesList, res.passes, "value");
  renderPlayerRank(cleansheetsList, res.clean_sheets, "value");

  // club stats (nếu HTML có)
  renderClubRank(clubGoalsList, res.club_goals, "value");
  renderClubRank(clubTacklesList, res.club_tackles, "value");
  renderClubRank(clubBlocksList, res.club_blocks, "value");
  renderClubRank(clubPassesList, res.club_passes, "value");

  seasonNote.textContent = "OK";
}

seasonSelect?.addEventListener("change", () => loadStats(seasonSelect.value));

(async () => {
  try {
    await loadSeasons();
  } catch (e) {
    console.error(e);
    if (seasonSelect)
      seasonSelect.innerHTML = `<option value="">Lỗi load</option>`;
    if (seasonNote) seasonNote.textContent = "Lỗi";
  }
})();
