// frontend/js/admin_leaderboard.js
// FIX 400: đảm bảo payload đúng + rows luôn có 10 dòng

const API = "http://127.0.0.1:5000";

const seasonEl = document.getElementById("season");
const typeEl = document.getElementById("type");
const metricEl = document.getElementById("metric");
const thead = document.getElementById("thead");
const tbody = document.getElementById("tbody");
const msgEl = document.getElementById("msg");

const btnLoad = document.getElementById("btnLoad");
const btnSave = document.getElementById("btnSave");
const btnClear = document.getElementById("btnClear");

const PLAYER_METRICS = [
  { value: "goals", label: "Goals" },
  { value: "assists", label: "Assists" },
  { value: "passes", label: "Passes" },
  { value: "clean_sheets", label: "Clean Sheets" },
];

const CLUB_METRICS = [
  { value: "goals", label: "Goals" },
  { value: "tackles", label: "Tackles Won" },
  { value: "blocks", label: "Blocks" },
  { value: "passes", label: "Passes" },
];

function setMsg(text, ok = true) {
  msgEl.textContent = text || "";
  msgEl.className = "msg " + (text ? (ok ? "ok" : "bad") : "");
}

function setBusy(busy) {
  btnLoad.disabled = busy;
  btnSave.disabled = busy;
  btnClear.disabled = busy;
  seasonEl.disabled = busy;
  typeEl.disabled = busy;
  metricEl.disabled = busy;
}

function metricsForType() {
  return typeEl.value === "player" ? PLAYER_METRICS : CLUB_METRICS;
}

function renderMetricOptions() {
  metricEl.innerHTML = "";
  for (const m of metricsForType()) {
    const opt = document.createElement("option");
    opt.value = m.value;
    opt.textContent = m.label;
    metricEl.appendChild(opt);
  }
}

function renderTableSkeleton() {
  const isPlayer = typeEl.value === "player";

  thead.innerHTML = `
    <tr>
      <th style="width:56px">#</th>
      <th>${isPlayer ? "Player" : "Club"}</th>
      <th>${isPlayer ? "Team" : "Crest URL"}</th>
      ${isPlayer ? "<th>Avatar URL</th>" : ""}
      <th style="width:140px">Value</th>
    </tr>
  `;

  tbody.innerHTML = "";
  for (let i = 1; i <= 10; i++) {
    const tr = document.createElement("tr");
    tr.dataset.rank = String(i);

    if (isPlayer) {
      tr.innerHTML = `
        <td>${i}</td>
        <td><input data-k="player" placeholder="Tên cầu thủ" /></td>
        <td><input data-k="team" placeholder="Tên CLB" /></td>
        <td><input data-k="avatar" placeholder="Link ảnh (optional)" /></td>
        <td><input data-k="value" type="number" min="0" placeholder="Số" /></td>
      `;
    } else {
      tr.innerHTML = `
        <td>${i}</td>
        <td><input data-k="club" placeholder="Tên CLB" /></td>
        <td><input data-k="crest" placeholder="Link logo (optional)" /></td>
        <td><input data-k="value" type="number" min="0" placeholder="Số" /></td>
      `;
    }

    tbody.appendChild(tr);
  }
}

function clearForm() {
  [...tbody.querySelectorAll("input")].forEach((inp) => (inp.value = ""));
  setMsg("Đã xóa form ✅");
}

function fillForm(rows) {
  const mapByRank = new Map((rows || []).map((r) => [Number(r.rank_no), r]));

  for (const tr of [...tbody.querySelectorAll("tr")]) {
    const rank = Number(tr.dataset.rank);
    const r = mapByRank.get(rank) || {};

    for (const inp of [...tr.querySelectorAll("input")]) {
      const k = inp.dataset.k;
      if (k === "value") inp.value = r.value ?? 0;
      else inp.value = r[k] ?? "";
    }
  }
}

function collectRowsAlways10() {
  // ✅ luôn trả 10 dòng, không bao giờ []
  const out = [];
  for (const tr of [...tbody.querySelectorAll("tr")]) {
    const rank = Number(tr.dataset.rank);

    const row = { rank_no: rank };
    for (const inp of [...tr.querySelectorAll("input")]) {
      const k = inp.dataset.k;
      row[k] =
        k === "value" ? Number(inp.value || 0) : (inp.value || "").trim();
    }
    out.push(row);
  }

  // nếu tbody chưa render (hiếm) -> tạo rỗng đủ 10
  if (out.length === 0) {
    for (let i = 1; i <= 10; i++) out.push({ rank_no: i, value: 0 });
  }

  return out;
}

function validateBeforeSave() {
  const sid = Number(seasonEl.value || 0);
  const type = (typeEl.value || "").trim();
  const metric = (metricEl.value || "").trim();

  if (!sid || sid <= 0) {
    setMsg("Chưa có season_id. Đợi load mùa giải xong rồi thử lại nhé.", false);
    return null;
  }
  if (!type) {
    setMsg("Thiếu type (player/club).", false);
    return null;
  }
  if (!metric) {
    setMsg("Thiếu metric.", false);
    return null;
  }

  return { sid, type, metric };
}

async function loadSeasons() {
  setBusy(true);
  setMsg("Đang tải mùa giải...");
  try {
    const res = await fetch(`${API}/api/seasons`);
    const data = await res.json();

    if (!data.ok) throw new Error(data.message || "Không lấy được seasons");

    seasonEl.innerHTML = "";
    (data.data || []).forEach((s) => {
      const opt = document.createElement("option");
      opt.value = s.mua_giai_id;
      opt.textContent = s.ten_mua_giai || s.ten || `Season ${s.mua_giai_id}`;
      seasonEl.appendChild(opt);
    });

    if ((data.data || []).length === 0) {
      setMsg(
        "SQL chưa có mùa giải. Bạn insert vào dbo.mua_giai trước nhé.",
        false,
      );
    } else {
      setMsg("Đã tải mùa giải ✅");
    }
  } catch (e) {
    setMsg(String(e.message || e), false);
  } finally {
    setBusy(false);
  }
}

async function loadBoard() {
  const v = validateBeforeSave();
  if (!v) return;

  setBusy(true);
  setMsg("Đang tải leaderboard...");

  try {
    const { sid, type, metric } = v;
    const url = `${API}/api/admin/leaderboard?season_id=${sid}&type=${type}&metric=${metric}`;
    const res = await fetch(url);
    const data = await res.json();

    if (!data.ok) throw new Error(data.message || "Load thất bại");

    fillForm(data.rows || []);
    setMsg(
      data.rows && data.rows.length
        ? "Đã tải dữ liệu ✅"
        : "Chưa có dữ liệu metric này. Bạn nhập rồi bấm Lưu nhé 🙂",
    );
  } catch (e) {
    setMsg(String(e.message || e), false);
  } finally {
    setBusy(false);
  }
}

async function saveBoard() {
  const v = validateBeforeSave();
  if (!v) return;

  setBusy(true);
  setMsg("Đang lưu...");

  try {
    const { sid, type, metric } = v;

    const payload = {
      season_id: sid,
      type,
      metric,
      rows: collectRowsAlways10(),
    };

    // ✅ log để debug nếu cần
    console.log("PAYLOAD TO POST =", payload);

    const res = await fetch(`${API}/api/admin/leaderboard`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res
      .json()
      .catch(() => ({ ok: false, message: "Response JSON lỗi" }));

    if (!res.ok || !data.ok) {
      throw new Error(data.message || `HTTP ${res.status}`);
    }

    setMsg("Lưu xong ✅ (đã ghi SQL Server)");
  } catch (e) {
    setMsg(String(e.message || e), false);
  } finally {
    setBusy(false);
  }
}

// events
typeEl.addEventListener("change", () => {
  renderMetricOptions();
  renderTableSkeleton();
  setMsg("");
});

btnLoad.addEventListener("click", loadBoard);
btnSave.addEventListener("click", saveBoard);
btnClear.addEventListener("click", clearForm);

// init
(async function init() {
  renderMetricOptions();
  renderTableSkeleton();
  await loadSeasons();
})();
