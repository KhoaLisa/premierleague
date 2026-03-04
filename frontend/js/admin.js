// frontend/js/admin.js
const API_BASE = "http://127.0.0.1:5000";
const KEY_ADMIN = "efi_admin_token";

const ROUTES = {
  login: "/api/admin/login",
  list: "/api/admin/articles",
  create: "/api/admin/articles",
  update: (id) => `/api/admin/articles/${id}`,
  del: (id) => `/api/admin/articles/${id}`,
};

const $ = (id) => document.getElementById(id);

function getToken() {
  return localStorage.getItem(KEY_ADMIN) || "";
}
function setToken(t) {
  localStorage.setItem(KEY_ADMIN, t || "");
}
function clearToken() {
  localStorage.removeItem(KEY_ADMIN);
}

async function apiGet(path, token = "") {
  const r = await fetch(`${API_BASE}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || `GET ${path} failed`);
  return data;
}

async function apiPost(path, body, token = "") {
  const r = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body || {}),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || `POST ${path} failed`);
  return data;
}

async function apiPut(path, body, token = "") {
  const r = await fetch(`${API_BASE}${path}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body || {}),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || `PUT ${path} failed`);
  return data;
}

async function apiDelete(path, token = "") {
  const r = await fetch(`${API_BASE}${path}`, {
    method: "DELETE",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || `DELETE ${path} failed`);
  return data;
}

function escapeHtml(s) {
  return String(s || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function uiLoggedIn(username = "admin") {
  $("loginBox")?.classList.add("hidden");
  $("mainGrid")?.classList.remove("hidden");
  $("who").textContent = `Đăng nhập: ${username}`;
  $("btnLogout")?.classList.remove("hidden");
}

function uiLoggedOut() {
  $("loginBox")?.classList.remove("hidden");
  $("mainGrid")?.classList.add("hidden");
  $("who").textContent = "Chưa đăng nhập";
}

function splitTags(s) {
  return String(s || "")
    .replaceAll(";", ",")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 20);
}

// ===== state =====
let editingId = 0;
let cacheItems = [];

// ===== form =====
function clearForm() {
  editingId = 0;
  $("title").value = "";
  $("summary").value = "";
  $("url").value = "";
  $("image").value = "";
  $("tags").value = "";
  $("pub").checked = true;
  $("feat").checked = false;
  $("imgPreview").src = "";
  $("btnCreate").textContent = "Đăng bài";
  $("createMsg").textContent = "";
}

function fillFormFromArticle(a) {
  editingId = a.id;
  $("title").value = a.title || "";
  $("summary").value = a.summary || "";
  $("url").value = a.url || "";
  $("image").value = a.image_url || "";
  $("tags").value = (a.tags || []).join(", ");
  $("pub").checked = !!a.is_published;
  $("feat").checked = !!a.is_featured;
  $("imgPreview").src = a.image_url || "";
  $("btnCreate").textContent = `Cập nhật (#${a.id})`;
  $("createMsg").textContent = `Đang sửa bài #${a.id} ✍️`;
}

function bindPreview() {
  const img = $("image");
  if (!img) return;
  img.addEventListener("input", () => {
    const v = img.value.trim();
    $("imgPreview").src = v || "";
  });
}

// ===== login/logout =====
async function doLogin() {
  const u = $("u").value.trim();
  const p = $("p").value;

  $("loginMsg").textContent = "Đang đăng nhập…";
  try {
    const res = await apiPost(ROUTES.login, { username: u, password: p });
    const token = res.token || "";
    if (!token) throw new Error("Backend không trả token");

    setToken(token);
    uiLoggedIn(u);
    $("loginMsg").textContent = "OK ✅";
    await reloadList();
  } catch (e) {
    $("loginMsg").textContent = `Lỗi: ${e.message}`;
  }
}

async function doLogout() {
  clearToken();
  uiLoggedOut();
  $("loginMsg").textContent = "Đã logout.";
}

// ===== CRUD =====
async function submitArticle() {
  const token = getToken();

  const title = $("title").value.trim();
  const summary = $("summary").value.trim();
  const url = $("url").value.trim() || "#";
  const image_url = $("image").value.trim();
  const tags = splitTags($("tags").value);
  const is_published = !!$("pub").checked;
  const is_featured = !!$("feat").checked;

  if (!title || !summary) {
    $("createMsg").textContent = "Thiếu Title/Summary.";
    return;
  }

  $("createMsg").textContent = editingId ? "Đang cập nhật…" : "Đang đăng bài…";
  try {
    if (!editingId) {
      const res = await apiPost(
        ROUTES.create,
        { title, summary, url, image_url, tags, is_published, is_featured },
        token,
      );
      $("createMsg").textContent = `Đăng thành công ✅ (id=${res.id ?? "?"})`;
    } else {
      await apiPut(
        ROUTES.update(editingId),
        { title, summary, url, image_url, tags, is_published, is_featured },
        token,
      );
      $("createMsg").textContent = `Cập nhật thành công ✅ (#${editingId})`;
    }

    await reloadList();
  } catch (e) {
    $("createMsg").textContent = `Lỗi: ${e.message}`;
  }
}

async function togglePublish(id, nextVal) {
  const token = getToken();
  await apiPut(ROUTES.update(id), { is_published: !!nextVal }, token);
  await reloadList();
}

async function toggleFeatured(id, nextVal) {
  const token = getToken();
  await apiPut(ROUTES.update(id), { is_featured: !!nextVal }, token);
  await reloadList();
}

async function deleteArticle(id) {
  const token = getToken();
  const ok = confirm(`Xóa bài #${id}? (Không hoàn tác)`);
  if (!ok) return;
  await apiDelete(ROUTES.del(id), token);
  await reloadList();
  if (editingId === id) clearForm();
}

// ===== list render =====
function normalizeRow(a) {
  return {
    id: Number(a.id),
    title: a.title || "",
    summary: a.summary || "",
    url: a.url || "#",
    tags: Array.isArray(a.tags) ? a.tags : [],
    image_url: a.image_url || "",
    created_at: a.created_at || "",
    impressions: Number(a.impressions || 0),
    clicks: Number(a.clicks || 0),
    score: Number(a.trending_score ?? a.score ?? 0),
    is_published: !!(a.is_published ?? a.published),
    is_featured: !!(a.is_featured ?? a.featured),
  };
}

function passesFilter(a, q, filter) {
  const qq = (q || "").toLowerCase().trim();
  const hay = (a.title + " " + (a.tags || []).join(" ")).toLowerCase();

  if (qq && !hay.includes(qq)) return false;
  if (filter === "published" && !a.is_published) return false;
  if (filter === "draft" && a.is_published) return false;
  if (filter === "featured" && !a.is_featured) return false;

  return true;
}

function renderList(items) {
  const q = $("q")?.value || "";
  const filter = $("filter")?.value || "all";

  const filtered = items
    .filter((a) => passesFilter(a, q, filter))
    .sort((x, y) => y.score - x.score);

  if (!filtered.length) {
    $("list").innerHTML = "";
    $("listMsg").textContent = "Không có dữ liệu.";
    return;
  }

  $("listMsg").textContent = "";
  $("list").innerHTML = filtered
    .slice(0, 60)
    .map((a) => {
      const pub = a.is_published ? "Published" : "Draft";
      const feat = a.is_featured ? "Featured" : "—";

      return `
      <div class="rowItem">
        <div class="rowTop">
          <div style="min-width:0">
            <div class="rowTitle">#${a.id} • ${escapeHtml(a.title)}</div>
            <div class="rowMeta">
              <span class="pill">${pub}</span>
              <span class="pill">${feat}</span>
              <span>👁 ${a.impressions}</span>
              <span>🖱 ${a.clicks}</span>
              <span class="badgeScore">🔥 ${a.score}</span>
            </div>
          </div>
        </div>

        <div class="rowBtns">
          <button class="btn ghost small" data-act="open" data-id="${a.id}">Open</button>
          <button class="btn ghost small" data-act="edit" data-id="${a.id}">Edit</button>

          <button class="btn ghost small" data-act="pub" data-id="${a.id}">
            ${a.is_published ? "Unpublish" : "Publish"}
          </button>

          <button class="btn ghost small" data-act="feat" data-id="${a.id}">
            ${a.is_featured ? "Unfeature" : "Feature"}
          </button>

          <button class="btn danger small" data-act="del" data-id="${a.id}">Delete</button>
        </div>
      </div>
    `;
    })
    .join("");

  $("list").onclick = (ev) => {
    const btn = ev.target.closest("button[data-act]");
    if (!btn) return;
    const act = btn.getAttribute("data-act");
    const id = Number(btn.getAttribute("data-id") || 0);
    if (!id) return;

    const a = cacheItems.find((x) => x.id === id);
    if (!a) return;

    if (act === "open") {
      if (a.url) window.open(a.url, "_blank", "noopener");
      return;
    }
    if (act === "edit") return fillFormFromArticle(a);
    if (act === "pub") return togglePublish(id, !a.is_published);
    if (act === "feat") return toggleFeatured(id, !a.is_featured);
    if (act === "del") return deleteArticle(id);
  };
}

async function reloadList() {
  const token = getToken();
  $("listMsg").textContent = "";
  $("list").innerHTML = `<div class="muted">Loading…</div>`;

  try {
    const res = await apiGet(ROUTES.list, token);
    const rows = Array.isArray(res) ? res : [];
    cacheItems = rows.map(normalizeRow);
    renderList(cacheItems);
  } catch (e) {
    $("list").innerHTML = "";
    $("listMsg").textContent = `Không load được: ${e.message}`;
  }
}

// ===== wire UI =====
function bindUI() {
  $("btnLogin")?.addEventListener("click", doLogin);
  $("btnLogout")?.addEventListener("click", doLogout);

  $("btnCreate")?.addEventListener("click", submitArticle);
  $("btnClear")?.addEventListener("click", clearForm);
  $("btnReload")?.addEventListener("click", reloadList);

  $("q")?.addEventListener("input", () => renderList(cacheItems));
  $("filter")?.addEventListener("change", () => renderList(cacheItems));

  bindPreview();
}

async function init() {
  bindUI();

  const token = getToken();
  if (token) {
    uiLoggedIn("admin");
    await reloadList();
  } else {
    uiLoggedOut();
    $("btnLogout")?.classList.add("hidden");
  }
}

init();
