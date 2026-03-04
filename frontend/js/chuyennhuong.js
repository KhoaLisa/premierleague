// frontend/js/chuyennhuong.js
// Trang: /frontend/html/chuyennhuong.html
// Data:  /frontend/data/transfers-demo.json  ✅

const DATA_URL = "../data/transfers-demo.json";

const el = {
  qTim: document.getElementById("qTim"),
  selMua: document.getElementById("selMua"),
  selKy: document.getElementById("selKy"),
  btnReset: document.getElementById("btnReset"),
  btnReload: document.getElementById("btnReload"),

  wrapFeatured: document.getElementById("wrapFeatured"),
  wrapNews: document.getElementById("wrapNews"),
  btnXemThem: document.getElementById("btnXemThem"),
  wrapChipLoai: document.getElementById("wrapChipLoai"),

  btnFeatLeft: document.getElementById("btnFeatLeft"),
  btnFeatRight: document.getElementById("btnFeatRight"),

  wrapClb: document.getElementById("wrapClb"),
  imgClb: document.getElementById("imgClb"),
  txtClb: document.getElementById("txtClb"),
  tbodyClb: document.getElementById("tbodyClb"),

  modal: document.getElementById("modal"),
  modalTitle: document.getElementById("modalTitle"),
  modalBody: document.getElementById("modalBody"),
  modalLink: document.getElementById("modalLink"),
  btnCloseModal: document.getElementById("btnCloseModal"),
  btnOkModal: document.getElementById("btnOkModal"),

  btnLogin: document.getElementById("btnLogin"),
};

const state = {
  data: null,
  loaiDangChon: "all",
  page: 1,
  pageSize: 8,
  clbDangChon: "arsenal",
};

// ===== helpers =====
function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function toDateLabel(iso) {
  if (!iso) return "—";
  const [y, m, d] = String(iso).split("-");
  if (!y || !m || !d) return "—";
  return `${d}/${m}/${y}`;
}

function openModal(item) {
  el.modal.classList.add("is-open");
  el.modal.setAttribute("aria-hidden", "false");

  el.modalTitle.textContent = item.tieu_de || "Chi tiết";
  el.modalBody.innerHTML = `
    <div style="display:grid;gap:10px">
      <div><b>Loại:</b> ${escapeHtml(item.loai_nhan || "—")}</div>
      <div><b>CLB:</b> ${escapeHtml(item.clb || "—")}</div>
      <div><b>Ngày:</b> ${escapeHtml(toDateLabel(item.ngay))}</div>
      <div style="color:rgba(255,255,255,.72)">
        ${escapeHtml(item.mo_ta || "Không có mô tả thêm.")}
      </div>
    </div>
  `;

  if (item.url) {
    el.modalLink.href = item.url;
    el.modalLink.style.display = "inline-flex";
  } else {
    el.modalLink.href = "#";
    el.modalLink.style.display = "none";
  }
}

function closeModal() {
  el.modal.classList.remove("is-open");
  el.modal.setAttribute("aria-hidden", "true");
}

function scrollFeatured(dir) {
  const wrap = el.wrapFeatured;
  const delta = Math.round(wrap.clientWidth * 0.85) * dir;
  wrap.scrollBy({ left: delta, behavior: "smooth" });
}

// ===== load data =====
async function taiData() {
  const res = await fetch(DATA_URL, { cache: "no-store" });
  if (!res.ok) throw new Error(`Không tải được data JSON (${res.status})`);
  state.data = await res.json();
}

// ===== render featured =====
function renderFeatured() {
  const list = state.data?.featured || [];
  el.wrapFeatured.innerHTML = list
    .map(
      (it) => `
      <article class="trCard" role="button" tabindex="0" data-open="featured" data-id="${escapeHtml(it.id)}">
        <div class="trCard__img">
          ${it.anh ? `<img src="${escapeHtml(it.anh)}" alt="${escapeHtml(it.tieu_de)}" loading="lazy"/>` : ""}
        </div>
        <div class="trCard__body">
          <div class="trBadge">${escapeHtml(it.tag || "Chuyển nhượng")}</div>
          <h3 class="trCard__ttl">${escapeHtml(it.tieu_de)}</h3>
          <div class="trMeta">
            <span class="trPill">${escapeHtml(it.clb || "Premier League")}</span>
            <span>${escapeHtml(toDateLabel(it.ngay))}</span>
          </div>
        </div>
      </article>
    `,
    )
    .join("");
}

// ===== filter =====
function locNews() {
  const q = (el.qTim.value || "").trim().toLowerCase();
  const mua = el.selMua.value;
  const ky = el.selKy.value;
  const loai = state.loaiDangChon;

  let list = (state.data?.news || []).slice();

  list = list.filter((it) => {
    const okMua = !it.mua || it.mua === mua;
    const okKy = !it.ky || it.ky === ky;
    return okMua && okKy;
  });

  if (loai !== "all") list = list.filter((it) => it.loai === loai);

  if (q) {
    list = list.filter((it) => {
      const hay =
        `${it.tieu_de} ${it.mo_ta || ""} ${it.clb || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }

  return list;
}

// ===== render news =====
function renderNews() {
  const list = locNews();
  const max = state.page * state.pageSize;
  const pageItems = list.slice(0, max);

  el.wrapNews.innerHTML = pageItems
    .map(
      (it) => `
      <article class="trCard" role="button" tabindex="0" data-open="news" data-id="${escapeHtml(it.id)}">
        <div class="trCard__img">
          ${it.anh ? `<img src="${escapeHtml(it.anh)}" alt="${escapeHtml(it.tieu_de)}" loading="lazy"/>` : ""}
        </div>
        <div class="trCard__body">
          <div class="trBadge">${escapeHtml(it.tag || "Chuyển nhượng")}</div>
          <h3 class="trCard__ttl">${escapeHtml(it.tieu_de)}</h3>
          <div class="trMeta">
            <span class="trPill">${escapeHtml(it.clb || "—")}</span>
            <span>${escapeHtml(toDateLabel(it.ngay))}</span>
          </div>
        </div>
      </article>
    `,
    )
    .join("");

  el.btnXemThem.style.display = list.length > max ? "inline-flex" : "none";
}

// ===== clubs =====
function renderClubBar() {
  const clubs = state.data?.clubs || [];
  el.wrapClb.innerHTML = clubs
    .map((c) => {
      const active = c.id === state.clbDangChon ? "is-active" : "";
      return `
        <button class="trClubBtn ${active}" data-clb="${escapeHtml(c.id)}" type="button">
          <img src="${escapeHtml(c.logo)}" alt="" />
          <span>${escapeHtml(c.ten)}</span>
        </button>
      `;
    })
    .join("");
}

function renderClubTable() {
  const clubs = state.data?.clubs || [];
  const club = clubs.find((c) => c.id === state.clbDangChon) || clubs[0];
  if (!club) return;

  el.imgClb.src = club.logo;
  el.imgClb.alt = club.ten;
  el.txtClb.textContent = club.ten;

  el.tbodyClb.innerHTML = (club.giao_dich || [])
    .map((row) => {
      const url = row.url
        ? `<a class="trLink" href="${escapeHtml(row.url)}" target="_blank" rel="noreferrer">⤴ Chi tiết</a>`
        : `<span style="color:rgba(255,255,255,.6);font-weight:800">Không có</span>`;

      return `
        <tr>
          <td><b>${escapeHtml(row.cau_thu)}</b></td>
          <td><b>${escapeHtml(row.loai_nhan)}</b> — ${escapeHtml(row.doi)}</td>
          <td class="trRight">${url}</td>
        </tr>
      `;
    })
    .join("");
}

// ===== events =====
function bindEvents() {
  el.btnFeatLeft.addEventListener("click", () => scrollFeatured(-1));
  el.btnFeatRight.addEventListener("click", () => scrollFeatured(1));

  const onChange = () => {
    state.page = 1;
    renderNews();
  };

  el.qTim.addEventListener("input", onChange);
  el.selMua.addEventListener("change", onChange);
  el.selKy.addEventListener("change", onChange);

  el.btnReset.addEventListener("click", () => {
    el.qTim.value = "";
    state.loaiDangChon = "all";
    state.page = 1;

    [...el.wrapChipLoai.querySelectorAll(".trChip")].forEach((b) =>
      b.classList.remove("is-active"),
    );
    el.wrapChipLoai
      .querySelector('[data-loai="all"]')
      .classList.add("is-active");

    renderNews();
  });

  el.btnReload.addEventListener("click", init);

  el.wrapChipLoai.addEventListener("click", (e) => {
    const btn = e.target.closest(".trChip");
    if (!btn) return;

    state.loaiDangChon = btn.dataset.loai;
    [...el.wrapChipLoai.querySelectorAll(".trChip")].forEach((b) =>
      b.classList.remove("is-active"),
    );
    btn.classList.add("is-active");

    state.page = 1;
    renderNews();
  });

  el.btnXemThem.addEventListener("click", () => {
    state.page += 1;
    renderNews();
  });

  document.addEventListener("click", (e) => {
    const card = e.target.closest(".trCard");
    if (!card) return;

    const type = card.dataset.open;
    const id = card.dataset.id;

    const pool = type === "featured" ? state.data.featured : state.data.news;
    const item = pool.find((x) => String(x.id) === String(id));
    if (item) openModal(item);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });

  el.modal.addEventListener("click", (e) => {
    if (e.target.dataset.close === "1") closeModal();
  });
  el.btnCloseModal.addEventListener("click", closeModal);
  el.btnOkModal.addEventListener("click", closeModal);

  el.wrapClb.addEventListener("click", (e) => {
    const btn = e.target.closest(".trClubBtn");
    if (!btn) return;

    state.clbDangChon = btn.dataset.clb;
    [...el.wrapClb.querySelectorAll(".trClubBtn")].forEach((b) =>
      b.classList.remove("is-active"),
    );
    btn.classList.add("is-active");

    renderClubTable();
  });

  // ✅ cho nút login đỡ “chết”
  if (el.btnLogin) {
    el.btnLogin.addEventListener("click", () => {
      window.location.href = "./login.html";
    });
  }
}

async function init() {
  try {
    await taiData();

    // clubs default
    const clubs = state.data?.clubs || [];
    if (!clubs.find((c) => c.id === state.clbDangChon) && clubs[0]) {
      state.clbDangChon = clubs[0].id;
    }

    renderFeatured();
    renderNews();
    renderClubBar();
    renderClubTable();
  } catch (err) {
    console.error(err);
    alert("Lỗi tải data. Check đường dẫn JSON + vị trí file nhé.");
  }
}

bindEvents();
init();
