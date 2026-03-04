/* frontend/js/user-menu.js */
(() => {
  const API_BASE = "http://127.0.0.1:5000";
  const $ = (s) => document.querySelector(s);

  const els = {
    btnLogin: $("#btnLogin"),
    userMenuWrap: $("#userMenuWrap"),
    btnUser: $("#btnUser"),
    userAvatar: $("#userAvatar"),
    userName: $("#userName"),
    userMenu: $("#userMenu"),
    userName2: $("#userName2"),
    userEmail2: $("#userEmail2"),
    btnLogout: $("#btnLogout"),
  };

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
    if (!res.ok) throw new Error(`GET ${path} -> ${res.status}`);
    return res.json();
  }

  async function hydrateUserProfileIfMissing() {
    const uid = store.userId;
    if (!uid) return;

    const needName = !store.userName;
    const needEmail = !store.userEmail;
    const needPic = !store.userPicture;
    if (!needName && !needEmail && !needPic) return;

    try {
      const data = await apiGet(`/api/me?user_id=${uid}`);
      const u = data.user || {};
      if (u.email && needEmail) store.userEmail = u.email;
      if (u.name && needName) store.userName = u.name;
      if (u.picture && needPic) store.userPicture = u.picture;
    } catch (e) {
      console.warn("hydrateUserProfileIfMissing fail:", e);
    }
  }

  function closeUserMenu() {
    if (!els.userMenu) return;
    els.userMenu.classList.add("hidden");
    els.btnUser?.setAttribute("aria-expanded", "false");
  }

  function toggleUserMenu() {
    if (!els.userMenu) return;
    const open = !els.userMenu.classList.contains("hidden");
    if (open) closeUserMenu();
    else {
      els.userMenu.classList.remove("hidden");
      els.btnUser?.setAttribute("aria-expanded", "true");
    }
  }

  function setAuthUI(flag) {
    if (!els.btnLogin || !els.userMenuWrap) return;

    if (flag) {
      els.btnLogin.classList.add("efiHide");
      els.userMenuWrap.classList.remove("efiHide");

      const name = store.userName || store.userEmail || "User";
      const email = store.userEmail || "";

      if (els.userName) els.userName.textContent = name;
      if (els.userName2) els.userName2.textContent = name;
      if (els.userEmail2) els.userEmail2.textContent = email;

      if (els.userAvatar) {
        const pic = store.userPicture;
        els.userAvatar.src =
          pic ||
          `https://ui-avatars.com/api/?name=${encodeURIComponent(
            name,
          )}&background=2a2a2a&color=fff`;
      }
    } else {
      els.btnLogin.classList.remove("efiHide");
      els.userMenuWrap.classList.add("efiHide");
      closeUserMenu();
    }
  }

  function bindOutsideClick() {
    document.addEventListener("click", (e) => {
      const wrap = els.userMenuWrap;
      if (!wrap) return;
      if (!wrap.contains(e.target)) closeUserMenu();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeUserMenu();
    });
  }

  function bindActions() {
    els.btnLogin?.addEventListener("click", () => {
      window.location.href = "./login.html";
    });

    els.btnUser?.addEventListener("click", (e) => {
      e.preventDefault();
      toggleUserMenu();
    });

    els.btnLogout?.addEventListener("click", () => {
      localStorage.removeItem("efi_user_id");
      localStorage.removeItem("efi_user_email");
      localStorage.removeItem("efi_user_name");
      localStorage.removeItem("efi_user_picture");
      closeUserMenu();
      setAuthUI(false);
      window.location.href = "./home.html";
    });

    bindOutsideClick();
  }

  (async function init() {
    await hydrateUserProfileIfMissing();
    setAuthUI(isLoggedIn());
    bindActions();
  })();
})();
