// frontend/js/lichthidau.js
// Lịch thi đấu lấy trực tiếp từ backend -> football-data.org
// ✅ Việt hoá header/day label/status + hiển thị giờ VN (UTC+7) (kể cả khi backend thiếu utcDate)

const API = "http://127.0.0.1:5000";

const board = document.getElementById("fixturesBoard");
const mwTitle = document.getElementById("mwTitle");
const mwSub = document.getElementById("mwSub");
const btnPrev = document.getElementById("btnPrev");
const btnNext = document.getElementById("btnNext");

let matchweek = 30;

// ===== Utils =====
function escapeHtml(s) {
  return String(s ?? "").replace(
    /[&<>"']/g,
    (m) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[m],
  );
}
function escapeAttr(s) {
  return escapeHtml(s).replace(/"/g, "&quot;");
}

// ===== VN Date/Time helpers =====
const TZ_VN = "Asia/Ho_Chi_Minh";
const WEEKDAY_MAP = {
  Sun: "CN",
  Mon: "T2",
  Tue: "T3",
  Wed: "T4",
  Thu: "T5",
  Fri: "T6",
  Sat: "T7",
};
const MONTH_MAP = {
  Jan: "01",
  Feb: "02",
  Mar: "03",
  Apr: "04",
  May: "05",
  Jun: "06",
  Jul: "07",
  Aug: "08",
  Sep: "09",
  Oct: "10",
  Nov: "11",
  Dec: "12",
};

function pad2(n) {
  return String(n).padStart(2, "0");
}

function looksLikeIsoDateTime(s) {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s);
}
function hasTimezoneSuffix(s) {
  return /Z$|[+-]\d{2}:\d{2}$/.test(s);
}
function ensureUtcTimezone(iso) {
  // Nếu ISO datetime mà không có timezone → coi như UTC (thêm Z)
  if (!looksLikeIsoDateTime(iso)) return iso;
  return hasTimezoneSuffix(iso) ? iso : `${iso}Z`;
}

function vnPartsFromUtc(utcStr) {
  if (!utcStr) return null;

  const safe = ensureUtcTimezone(utcStr);
  const d = new Date(safe);
  if (Number.isNaN(d.getTime())) return null;

  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ_VN,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);

  const get = (type) => parts.find((p) => p.type === type)?.value || "";

  const wdEn = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ_VN,
    weekday: "short",
  }).format(d);

  return {
    wd: WEEKDAY_MAP[wdEn] || wdEn,
    dd: get("day"),
    mm: get("month"),
    yyyy: get("year"),
    hh: get("hour"),
    mi: get("minute"),
  };
}

function fmtKickVN(utcStr) {
  const p = vnPartsFromUtc(utcStr);
  if (!p) return "";
  return `${p.hh}:${p.mi}`;
}

function fmtDayVNFromUtc(utcStr) {
  const p = vnPartsFromUtc(utcStr);
  if (!p) return "";
  return `${p.wd} ${p.dd}/${p.mm}`;
}

// Convert label "Fri 27 Feb" -> "T6 27/02"
function vnizeDayLabel(label) {
  const s = String(label || "").trim();
  if (!s) return "";

  // đã là VN thì giữ
  if (/^\s*(CN|T[2-7])\b/i.test(s) && /\d{1,2}\/\d{1,2}/.test(s)) return s;

  const m = s.match(
    /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+(\d{1,2})\s+([A-Za-z]{3})/,
  );
  if (m) {
    const wd = WEEKDAY_MAP[m[1]] || m[1];
    const dd = pad2(parseInt(m[2], 10));
    const mm = MONTH_MAP[m[3]] || m[3];
    return `${wd} ${dd}/${mm}`;
  }

  return s;
}

function buildRangeText(data) {
  const startUtc = data?.rangeStartUtc || data?.rangeStart || "";
  const endUtc = data?.rangeEndUtc || data?.rangeEnd || "";
  if (startUtc && endUtc) {
    const a = fmtDayVNFromUtc(startUtc);
    const b = fmtDayVNFromUtc(endUtc);
    if (a && b) return `${a} – ${b}`;
  }

  const days = data?.days || [];
  if (days.length) {
    const first = vnizeDayLabel(days[0]?.label || "");
    const last = vnizeDayLabel(days[days.length - 1]?.label || "");
    if (first && last) return `${first} – ${last}`;
  }

  const rt = String(data?.rangeText || "").trim();
  if (!rt) return "";
  const parts = rt
    .split(/–|-/)
    .map((x) => x.trim())
    .filter(Boolean);
  if (parts.length >= 2)
    return `${vnizeDayLabel(parts[0])} – ${vnizeDayLabel(parts[1])}`;
  return rt;
}

// ===== Header =====
function setHeader(mw, rangeText) {
  mwTitle.textContent = `Vòng ${mw}`;
  mwSub.textContent = rangeText || "";
}

// ===== Status thuần Việt =====
function statusLabel(status) {
  const s = (status || "").toUpperCase();

  if (s === "IN_PLAY" || s === "PAUSED")
    return { text: "ĐANG ĐÁ", cls: "live" };
  if (s === "FINISHED") return { text: "HẾT TRẬN", cls: "ft" };
  if (s === "TIMED" || s === "SCHEDULED")
    return { text: "SẮP DIỄN RA", cls: "scheduled" };

  if (s === "POSTPONED") return { text: "HOÃN", cls: "scheduled" };
  if (s === "CANCELLED") return { text: "HỦY", cls: "scheduled" };
  if (s === "SUSPENDED") return { text: "TẠM DỪNG", cls: "scheduled" };

  if (s) return { text: s, cls: "scheduled" };
  return { text: "", cls: "" };
}

function formatScore(m) {
  const h = m.scoreHome;
  const a = m.scoreAway;
  if (typeof h === "number" && typeof a === "number") return `${h} - ${a}`;
  return "";
}

// ===== Time conversion fallback (+7h) =====
function parseHHMM(s) {
  const m = String(s || "")
    .trim()
    .match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const hh = parseInt(m[1], 10);
  const mi = parseInt(m[2], 10);
  if (hh < 0 || hh > 23 || mi < 0 || mi > 59) return null;
  return { hh, mi };
}
function addHoursHHMM(hhmm, addHours) {
  const p = parseHHMM(hhmm);
  if (!p) return "";
  let h = (p.hh + addHours) % 24;
  if (h < 0) h += 24;
  return `${pad2(h)}:${pad2(p.mi)}`;
}

// ===== Try to find datetime in match object =====
function deepFindIsoDatetime(obj, maxDepth = 2) {
  const seen = new Set();
  function walk(o, depth) {
    if (!o || typeof o !== "object" || seen.has(o) || depth > maxDepth)
      return "";
    seen.add(o);

    for (const k of Object.keys(o)) {
      const v = o[k];
      if (looksLikeIsoDateTime(v)) return v;
    }
    for (const k of Object.keys(o)) {
      const v = o[k];
      if (v && typeof v === "object") {
        const r = walk(v, depth + 1);
        if (r) return r;
      }
    }
    return "";
  }
  return walk(obj, 0);
}

function getMatchUtc(m) {
  // 1) key quen thuộc
  const known =
    m.utcDate ||
    m.utc_date ||
    m.kickoffUtc ||
    m.kickoff_utc ||
    m.kickoff ||
    m.dateUtc ||
    m.date_utc ||
    m.datetime ||
    m.startTime ||
    "";

  if (looksLikeIsoDateTime(known)) return known;

  // 2) quét sâu tìm ISO datetime
  const found = deepFindIsoDatetime(m, 2);
  if (found) return found;

  return "";
}

function getKickoffText(m) {
  // Ưu tiên: nếu có datetime → convert chuẩn sang VN
  const utc = getMatchUtc(m);
  const vn = fmtKickVN(utc);
  if (vn) return vn;

  // Fallback: nếu chỉ có time "14:00" (đang là giờ UTC từ API) → cộng 7 tiếng
  const t = String(m.time || "").trim();
  if (t) return addHoursHHMM(t, 7) || t;

  return "";
}

// ===== Render =====
function renderEmpty(mw, msg) {
  setHeader(mw, msg || "");
  board.innerHTML = `<div class="board__empty">${escapeHtml(msg || "Không có dữ liệu")}</div>`;
}

function renderMatch(m) {
  const home = m.home || "";
  const away = m.away || "";
  const time = getKickoffText(m);

  const homeLogo = m.homeLogo || "";
  const awayLogo = m.awayLogo || "";

  const st = statusLabel(m.status);
  const score = formatScore(m);

  return `
    <div class="match">
      <div class="side left">
        <div class="team" title="${escapeAttr(home)}">${escapeHtml(home)}</div>
        ${
          homeLogo
            ? `<img class="badge" src="${escapeAttr(homeLogo)}" alt="" onerror="this.style.display='none'"/>`
            : `<span class="badge" style="display:inline-block;"></span>`
        }
      </div>

      <div class="center">
        <div class="kickoff">${escapeHtml(time)}</div>
        ${score ? `<div class="score">${escapeHtml(score)}</div>` : ``}
        ${st.text ? `<div class="status ${st.cls}">${escapeHtml(st.text)}</div>` : ``}
      </div>

      <div class="side right">
        ${
          awayLogo
            ? `<img class="badge" src="${escapeAttr(awayLogo)}" alt="" onerror="this.style.display='none'"/>`
            : `<span class="badge" style="display:inline-block;"></span>`
        }
        <div class="team" title="${escapeAttr(away)}">${escapeHtml(away)}</div>
      </div>
    </div>
  `;
}

function renderWeek(data) {
  const rangeText = buildRangeText(data);
  setHeader(data.matchweek, rangeText);

  const days = data.days || [];
  if (!days.length) {
    renderEmpty(data.matchweek, rangeText || "Không có trận ở vòng này");
    return;
  }

  board.innerHTML = days
    .map(
      (day) => `
    <div class="day">
      <div class="day__label">${escapeHtml(vnizeDayLabel(day.label || ""))}</div>
      <div class="matches">
        ${(day.matches || []).map(renderMatch).join("")}
      </div>
    </div>
  `,
    )
    .join("");
}

// ===== Fetch fixtures =====
async function fetchFixtures(mw) {
  const url = `${API}/api/fixtures?matchweek=${mw}&competition=PL`;
  const res = await fetch(url);
  const data = await res.json().catch(() => null);
  if (!data) return { ok: false, message: "Response không phải JSON" };
  return data;
}

function setBoardLoading(isLoading) {
  board.classList.toggle("is-loading", !!isLoading);
}

function playEnterAnim() {
  board.classList.remove("is-enter");
  void board.offsetHeight;
  board.classList.add("is-enter");
}

async function loadWeek(mw) {
  setBoardLoading(true);
  renderEmpty(mw, "Đang tải lịch thi đấu...");
  playEnterAnim();

  try {
    const data = await fetchFixtures(mw);

    if (!data.ok) {
      console.error("fixtures error:", data);
      renderEmpty(mw, data.message || "Lỗi lấy dữ liệu lịch thi đấu");
      return;
    }

    renderWeek(data);
    playEnterAnim();
  } catch (e) {
    console.error(e);
    renderEmpty(
      mw,
      "Không kết nối được backend (check app.py đang chạy + token).",
    );
  } finally {
    setBoardLoading(false);
  }
}

// ===== Controls =====
btnPrev.addEventListener("click", () => {
  matchweek = Math.max(1, matchweek - 1);
  loadWeek(matchweek);
});
btnNext.addEventListener("click", () => {
  matchweek = matchweek + 1;
  loadWeek(matchweek);
});

// init
loadWeek(matchweek);
