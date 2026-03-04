/* frontend/js/auth-ui.js */
(() => {
  const API_PORT = 5000;

  if (window.__EFI_AUTH_UI_INIT__) return;
  window.__EFI_AUTH_UI_INIT__ = true;

  function computeApiBase() {
    if (location.protocol === "file:") return `http://127.0.0.1:${API_PORT}`;
    if (location.port === String(API_PORT)) return "";
    const host = location.hostname || "127.0.0.1";
    return `${location.protocol}//${host}:${API_PORT}`;
  }
  const API_BASE = computeApiBase();

  const $ = (id) => document.getElementById(id);

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

  async function apiGet(path) {
    const res = await fetch(`${API_BASE}${path}`, { method: "GET" });
    if (!res.ok) return null;
    return res.json().catch(() => null);
  }

  async function hydrateUserProfileIfMissing() {
    const uid = store.userId;
    if (!uid) return;

    const needName = !store.userName;
    const needEmail = !store.userEmail;
    const needPic = !store.userPicture;
    if (!needName && !needEmail && !needPic) return;

    const data = await apiGet(`/api/me?user_id=${uid}`);
    const u = data?.user || {};
    if (u.email && needEmail) store.userEmail = u.email;
    if (u.name && needName) store.userName = u.name;
    if (u.picture && needPic) store.userPicture = u.picture;
  }

  function closeUserMenu() {
    const userMenu = $("userMenu");
    const btnUser = $("btnUser");
    if (!userMenu) return;
    userMenu.classList.add("hidden");
    btnUser?.setAttribute("aria-expanded", "false");
  }

  function toggleUserMenu() {
    const userMenu = $("userMenu");
    const btnUser = $("btnUser");
    if (!userMenu) return;

    const open = !userMenu.classList.contains("hidden");
    if (open) closeUserMenu();
    else {
      userMenu.classList.remove("hidden");
      btnUser?.setAttribute("aria-expanded", "true");
    }
  }

  function setAuthUI(flag) {
    const btnLogin = $("btnLogin");
    const userMenuWrap = $("userMenuWrap");
    if (!btnLogin || !userMenuWrap) return;

    if (flag) {
      btnLogin.classList.add("efiHide");
      userMenuWrap.classList.remove("efiHide");

      const name = store.userName || store.userEmail || "User";
      const email = store.userEmail || "";

      $("userName") && ($("userName").textContent = name);
      $("userName2") && ($("userName2").textContent = name);
      $("userEmail2") && ($("userEmail2").textContent = email);

      const userAvatar = $("userAvatar");
      if (userAvatar) {
        const pic = store.userPicture;
        userAvatar.src =
          pic ||
          `https://ui-avatars.com/api/?name=${encodeURIComponent(
            name,
          )}&background=2a2a2a&color=fff`;
      }
    } else {
      btnLogin.classList.remove("efiHide");
      userMenuWrap.classList.add("efiHide");
      closeUserMenu();
    }
  }

  function logout() {
    store.userId = null;
    store.userEmail = "";
    store.userName = "";
    store.userPicture = "";
    setAuthUI(false);
    closeUserMenu();
  }

  function bindEvents() {
    $("btnLogin")?.addEventListener("click", () => {
      location.href = "./login.html?force=1";
    });

    $("btnUser")?.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleUserMenu();
    });

    $("btnLogout")?.addEventListener("click", logout);

    $("btnOpenPrefs")?.addEventListener("click", () => {
      closeUserMenu();
      location.href = "./home.html#news";
    });

    document.addEventListener("click", (e) => {
      const wrap = $("userMenuWrap");
      if (!wrap) return;
      if (!wrap.contains(e.target)) closeUserMenu();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeUserMenu();
    });

    window.addEventListener("storage", (e) => {
      if (!String(e.key || "").startsWith("efi_user_")) return;
      setAuthUI(isLoggedIn());
    });
  }

  document.addEventListener("DOMContentLoaded", async () => {
    await hydrateUserProfileIfMissing();
    setAuthUI(isLoggedIn());
    bindEvents();
  });
})();
