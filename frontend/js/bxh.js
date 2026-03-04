const API_BASE = "http://127.0.0.1:5000";

const els = {
  statusPill: document.getElementById("statusPill"),
  season: document.getElementById("seasonSelect"),
  league: document.getElementById("leagueSelect"),
  search: document.getElementById("searchInput"),
  reload: document.getElementById("reloadBtn"),
  gridBody: document.getElementById("gridBody"),
};

let state = {
  scope: "ALL",
  sortKey: "pts",
  sortDir: "desc",
  data: [],
};

// scope buttons
document.querySelectorAll(".seg__btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document
      .querySelectorAll(".seg__btn")
      .forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    state.scope = btn.dataset.scope;
    render();
  });
});

// sort header (grid head)
document.querySelectorAll(".gridHead [data-sort]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const key = btn.dataset.sort;
    if (state.sortKey === key)
      state.sortDir = state.sortDir === "desc" ? "asc" : "desc";
    else {
      state.sortKey = key;
      state.sortDir = key === "team" ? "asc" : "desc";
    }
    render();
  });
});

els.search?.addEventListener("input", () => render());
els.reload?.addEventListener("click", () => load());
els.season?.addEventListener("change", () => load());
els.league?.addEventListener("change", async () => {
  await loadSeasonOptions(true);
  await load();
});

function setStatus(ok, text) {
  if (!els.statusPill) return;
  els.statusPill.textContent = `● ${text}`;
  els.statusPill.style.borderColor = ok ? "#42d36f66" : "#ff4d6d66";
  els.statusPill.style.color = ok ? "#dfffe8cc" : "#ffd8decc";
  els.statusPill.style.background = ok ? "#42d36f14" : "#ff4d6d14";
}

function normalize(str) {
  return (str || "").toLowerCase().trim();
}

function pickScopeRow(row) {
  if (state.scope === "HOME") return row.home || row;
  if (state.scope === "AWAY") return row.away || row;
  return row;
}

function rankClass(pos) {
  if (pos >= 1 && pos <= 4) return "rank--ucl";
  if (pos === 5) return "rank--uel";
  if (pos >= 18) return "rank--rel";
  return "";
}

function getTeamName(row) {
  return row.team || row.name || row.club || row.team_name || "";
}
function getTeamCode(row) {
  return row.short || row.tla || row.code || "";
}

function formPills(arr) {
  const safe = Array.isArray(arr) ? arr : [];
  const last = safe.slice(-5);
  if (!last.length) return `<span class="dash">—</span>`;

  return `
    <div class="form" title="${last.join(" ")}">
      ${last
        .map((x) => {
          if (x === "W") return `<span class="pill pill--w">W</span>`;
          if (x === "D") return `<span class="pill pill--d">D</span>`;
          return `<span class="pill pill--l">L</span>`;
        })
        .join("")}
    </div>
  `;
}

function rowHtml(row) {
  const scoped = pickScopeRow(row);
  const pos = Number(row.pos || 0);

  const teamName = getTeamName(row);
  const teamCode = getTeamCode(row);

  const crest = row.crest
    ? `<span class="badge"><img src="${row.crest}" alt="${teamCode || teamName || "team"}"></span>`
    : `<span class="badge"></span>`;

  const nextCrest = row?.next?.opponent_crest
    ? `<img class="nextCrest" src="${row.next.opponent_crest}" alt="next" title="Next opponent" />`
    : `<span class="dash">—</span>`;

  return `
    <div class="gridRow ${rankClass(pos)}">
      <div class="gtd gtd--pos">${pos || "—"}</div>

      <div class="gtd gtd--team">
        <div class="team">
          ${crest}
          <div>
            <div class="teamName">${teamName}</div>
            <div class="teamSub">${teamCode}</div>
          </div>
        </div>
      </div>

      <div class="gtd">${scoped.pld ?? row.pld ?? 0}</div>
      <div class="gtd">${scoped.w ?? row.w ?? 0}</div>
      <div class="gtd">${scoped.d ?? row.d ?? 0}</div>
      <div class="gtd">${scoped.l ?? row.l ?? 0}</div>

      <div class="gtd">${scoped.gf ?? row.gf ?? 0}</div>
      <div class="gtd">${scoped.ga ?? row.ga ?? 0}</div>
      <div class="gtd">${scoped.gd ?? row.gd ?? 0}</div>

      <div class="gtd gtd--pts"><b>${scoped.pts ?? row.pts ?? 0}</b></div>
      <div class="gtd" style="text-align:center">${formPills(row.form)}</div>
      <div class="gtd" style="text-align:center">${nextCrest}</div>
    </div>
  `;
}

function render() {
  const q = normalize(els.search?.value);

  let list = (state.data || []).filter((x) => {
    const name = normalize(getTeamName(x));
    const code = normalize(getTeamCode(x));
    return name.includes(q) || code.includes(q);
  });

  const key = state.sortKey;
  const dir = state.sortDir === "desc" ? -1 : 1;

  list = list.map((row) => {
    const scoped = pickScopeRow(row);
    const teamName = getTeamName(row);
    return {
      ...row,
      _sort: key === "team" ? teamName : Number(scoped[key] ?? row[key] ?? 0),
    };
  });

  list.sort((a, b) => {
    if (key === "team")
      return (
        normalize(getTeamName(a)).localeCompare(normalize(getTeamName(b))) * dir
      );
    return (a._sort - b._sort) * dir;
  });

  if (!list.length)
    els.gridBody.innerHTML = `<div class="emptyRow">Không có dữ liệu.</div>`;
  else els.gridBody.innerHTML = list.map(rowHtml).join("");
}

async function loadSeasonOptions(forcePickNewest = false) {
  const league = els.league?.value || "PL";
  const url = `${API_BASE}/api/available-seasons?league=${encodeURIComponent(league)}`;

  try {
    setStatus(false, "loading seasons...");
    const res = await fetch(url);
    if (!res.ok) throw new Error("HTTP " + res.status);
    const json = await res.json();

    const arr = json?.data || [];
    if (!arr.length) throw new Error("No seasons");

    const prev = els.season?.value;
    els.season.innerHTML = arr
      .map((s) => `<option value="${s.value}">${s.label}</option>`)
      .join("");

    if (!prev || forcePickNewest) els.season.value = String(arr[0].value);
    else {
      els.season.value = arr.some((s) => String(s.value) === String(prev))
        ? prev
        : String(arr[0].value);
    }

    setStatus(true, "online");
  } catch {
    const fallback = [2025, 2024, 2023].map((y) => ({
      value: y,
      label: `${y}/${String(y + 1).slice(2)}`,
    }));
    els.season.innerHTML = fallback
      .map((s) => `<option value="${s.value}">${s.label}</option>`)
      .join("");
    els.season.value = String(fallback[0].value);
    setStatus(false, "offline seasons");
  }
}

async function load() {
  const league = els.league?.value || "PL";
  let season = els.season?.value || "2025";
  if (season === "undefined" || season === "null" || season === "")
    season = "2025";

  const url = `${API_BASE}/api/standings?league=${encodeURIComponent(league)}&season=${encodeURIComponent(season)}`;

  try {
    setStatus(false, "loading...");
    const res = await fetch(url);
    const json = await res.json();

    if (!res.ok || json?.ok === false) {
      state.data = [];
      setStatus(false, "offline");
      render();
      return;
    }

    state.data = json?.standings || [];
    setStatus(true, "online");
    render();
  } catch {
    state.data = [];
    setStatus(false, "offline");
    render();
  }
}

(async function init() {
  await loadSeasonOptions(true);
  await load();
})();
