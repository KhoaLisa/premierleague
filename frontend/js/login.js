// frontend/js/login.js

const KEY_USER = "efi_user";
const API_PORT = 5000;

const GOOGLE_CLIENT_ID_FALLBACK =
  "484313079101-cj4uh8jlif4h39bakmtj6bkdl90fo1qg.apps.googleusercontent.com";

const FACEBOOK_APP_ID = "1397966001439587";

const $ = (id) => document.getElementById(id);

// =====================
// API base
// =====================
function computeApiBase() {
  if (location.protocol === "file:") return `http://127.0.0.1:${API_PORT}`;
  if (location.port === String(API_PORT)) return "";
  const host = location.hostname || "127.0.0.1";
  return `${location.protocol}//${host}:${API_PORT}`;
}
const API_BASE = computeApiBase();

// =====================
// UI helpers
// =====================
function setMsg(t) {
  const el = $("msg");
  if (!el) return;
  el.textContent = t || "";
}

function clearUserCompat() {
  localStorage.removeItem("efi_user_id");
  localStorage.removeItem("efi_user_email");
  localStorage.removeItem("efi_user_name");
  localStorage.removeItem("efi_user_picture");
  localStorage.removeItem(KEY_USER);
}

function saveUserCompat(user) {
  const uid = Number(user?.id ?? user?.user_id ?? 0);
  if (!uid) throw new Error("Không có user id hợp lệ để lưu.");

  // ✅ key mà home.js đang đọc
  localStorage.setItem("efi_user_id", String(uid));
  localStorage.setItem("efi_user_email", user?.email || "");
  localStorage.setItem("efi_user_name", user?.name || "");
  localStorage.setItem("efi_user_picture", user?.picture || "");

  // ✅ giữ key cũ nếu code khác còn dùng
  localStorage.setItem(KEY_USER, JSON.stringify({ ...user, user_id: uid }));
}

function getUserCompat() {
  const uid = Number(localStorage.getItem("efi_user_id") || 0);
  if (uid > 0) return { user_id: uid };

  try {
    const s = localStorage.getItem(KEY_USER);
    if (!s) return null;
    const u = JSON.parse(s);
    const id2 = Number(u?.user_id ?? u?.id ?? 0);
    if (!id2 || id2 <= 0) return null;
    return { ...u, user_id: id2 };
  } catch {
    return null;
  }
}

/**
 * ✅ Fix UX:
 * - KHÔNG auto redirect nữa (vì bạn cần vào login để đổi account)
 * - Nếu muốn vẫn auto redirect: đổi AUTO_REDIRECT = true
 * - Vẫn có ?force=1 để chắc chắn không redirect
 */
const AUTO_REDIRECT = false;

function shouldAutoRedirectHome() {
  if (!AUTO_REDIRECT) return false;
  if (location.search.includes("force=1")) return false;
  return !!getUserCompat();
}

// =====================
// network
// =====================
async function fetchJson(path, options = {}, timeoutMs = 12000) {
  const url = `${API_BASE}${path}`;
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);

  try {
    const r = await fetch(url, {
      cache: "no-store",
      ...options,
      signal: ctl.signal,
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok)
      throw new Error(data?.message || data?.error || `HTTP ${r.status}`);
    return data;
  } finally {
    clearTimeout(t);
  }
}

const apiGet = (p) => fetchJson(p);
const apiPost = (p, body) =>
  fetchJson(p, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body || {}),
  });

// =====================
// Local login
// =====================
function wireLocalLogin() {
  const togglePw = $("togglePw");
  const btnSignIn = $("btnSignIn");

  if (togglePw) {
    togglePw.onclick = () => {
      const inp = $("password");
      if (!inp) return;
      inp.type = inp.type === "password" ? "text" : "password";
    };
  }

  if (btnSignIn) {
    btnSignIn.onclick = async () => {
      setMsg("");
      const email = ($("email")?.value || "").trim();
      const password = ($("password")?.value || "").trim();

      if (!email.includes("@")) return setMsg("Email không hợp lệ.");

      try {
        const resp = await apiPost("/api/login", { email, password });
        const user = resp.user || resp;
        saveUserCompat(user);

        setMsg("Login OK ✅ Đang chuyển về Home…");
        setTimeout(() => (location.href = "./home.html"), 250);
      } catch (e) {
        setMsg(String(e.message || e));
      }
    };
  }
}

// =====================
// Fake buttons (Apple/X)
// =====================
function wireFakeOauthButtons() {
  document.querySelectorAll(".btnOauth[data-provider]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const p = btn.getAttribute("data-provider");
      const name = p === "apple" ? "Apple" : "X";
      setMsg(`Demo UI ✅ Nút ${name} chỉ để trình bày, chưa implement login.`);
    });
  });
}

// =====================
// Google GIS
// =====================
function waitForGsiReady(timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const tick = () => {
      if (window.google?.accounts?.id) return resolve();
      if (Date.now() - start > timeoutMs)
        return reject(new Error("Google GIS chưa load xong (timeout)."));
      requestAnimationFrame(tick);
    };
    tick();
  });
}

async function getGoogleClientId() {
  try {
    const cfg = await apiGet("/api/config");
    const cid = String(cfg?.google_client_id || "").trim();
    if (cid) return cid;
  } catch {}
  return GOOGLE_CLIENT_ID_FALLBACK;
}

async function initGoogle() {
  const wrap = $("googleBtnWrap");
  if (!wrap) return;

  const clientId = (await getGoogleClientId()).trim();
  if (!clientId) {
    wrap.innerHTML = `<button class="btnOauth google" type="button" disabled>
      <span class="ico">G</span><span class="label">Thiếu GOOGLE_CLIENT_ID</span></button>`;
    return;
  }

  wrap.innerHTML = `<button class="btnOauth google" type="button" disabled>
    <span class="ico">G</span><span class="label">Loading Google…</span></button>`;

  await waitForGsiReady();

  google.accounts.id.initialize({
    client_id: clientId,
    callback: async (resp) => {
      try {
        setMsg("Đang xác thực Google…");

        const credential = resp?.credential;
        if (!credential)
          throw new Error("Không nhận được credential từ Google.");

        const data = await apiPost("/api/auth/google", { credential });

        const user = data.user || data;
        saveUserCompat(user);

        setMsg("Google login OK ✅ Đang chuyển về Home…");
        setTimeout(() => (location.href = "./home.html"), 200);
      } catch (e) {
        setMsg(String(e.message || e));
        alert("Đăng nhập thất bại: " + String(e.message || e));
      }
    },
  });

  wrap.innerHTML = "";
  const box = document.createElement("div");
  wrap.appendChild(box);

  google.accounts.id.renderButton(box, {
    theme: "outline",
    size: "large",
    text: "signin_with",
    shape: "pill",
    width: 420,
  });
}

// =====================
// Facebook
// =====================
function loadFacebookSdk() {
  if (window.FB) return Promise.resolve();
  if (window.__fb_loading) return window.__fb_loading;

  window.__fb_loading = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://connect.facebook.net/vi_VN/sdk.js";
    s.async = true;
    s.defer = true;
    s.crossOrigin = "anonymous";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Không load được Facebook SDK."));
    document.head.appendChild(s);
  });

  return window.__fb_loading;
}

async function initFacebook() {
  const btn = $("btnFbLogin");
  if (!btn) return;

  try {
    await loadFacebookSdk();
  } catch (e) {
    btn.addEventListener("click", () => setMsg(String(e.message || e)));
    return;
  }

  window.FB.init({
    appId: FACEBOOK_APP_ID,
    cookie: true,
    xfbml: false,
    version: "v20.0",
  });

  btn.addEventListener("click", () => {
    setMsg("");
    window.FB.login(
      (response) => {
        if (!response || !response.authResponse) {
          setMsg("Facebook login: user cancel / fail (demo).");
          return;
        }
        setMsg("Facebook popup OK ✅ (demo). Token nằm trong Console.");
        console.log("FB authResponse:", response.authResponse);
      },
      { scope: "public_profile,email" },
    );
  });
}

// =====================
// Extra: button clear session (đổi tài khoản)
// =====================
function wireClearSessionBtn() {
  const btn = $("btnClearSession");
  if (!btn) return;
  btn.addEventListener("click", () => {
    clearUserCompat();
    setMsg("✅ Đã xoá session. Bạn có thể đăng nhập lại.");
    location.reload();
  });
}

// =====================
// boot
// =====================
(async function boot() {
  if (shouldAutoRedirectHome()) {
    location.href = "./home.html";
    return;
  }

  wireClearSessionBtn();
  wireLocalLogin();
  wireFakeOauthButtons();
  await initGoogle();
  await initFacebook();
})();
