/* frontend/js/shopHieu.js */
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));

  const els = {
    grid: $("#shopGrid"),
    cartCount: $("#cartCount"),
    toast: $("#toast"),

    btnSearch: $("#btnSearch"),
    btnCart: $("#btnCart"),
    btnCartClose: $("#btnCartClose"),
    btnClearCart: $("#btnClearCart"),

    modal: $("#searchModal"),
    q: $("#q"),
    navLinks: $$(".shopNav__a"),

    cartWrap: $("#cartWrap"),
    cartDrop: $("#cartDrop"),
    cartList: $("#cartList"),
    cartEmpty: $("#cartEmpty"),
    cartTotal: $("#cartTotal"),
  };

  // Demo data (bạn thay bằng API sau cũng được)
  const products = [
    {
      id: "p1",
      brand: "Premier League",
      name: "2025/26 PUMA Orbita 3 PL Thrill Edition",
      price: 40.0,
      colors: 1,
      badge: null,
      was: null,
    },
    {
      id: "p2",
      brand: "Premier League",
      name: "Topps 2026 Chrome Pack",
      price: 15.0,
      colors: 1,
      badge: null,
      was: null,
    },
    {
      id: "p3",
      brand: "Premier League",
      name: "2025/26 PUMA Orbita 1 PL Thrill (Match Ball)",
      price: 135.0,
      colors: 1,
      badge: null,
      was: null,
    },
    {
      id: "p4",
      brand: "Premier League",
      name: "2025/26 PUMA Orbita Brilliance (Training)",
      price: 11.99,
      was: 17.0,
      colors: 1,
      badge: "-30%",
    },
    {
      id: "p5",
      brand: "Premier League",
      name: "PUMA Core T-shirt",
      price: 12.5,
      was: 25.0,
      colors: 2,
      badge: "-50%",
    },
    {
      id: "p6",
      brand: "Premier League",
      name: "Graphic T-shirt",
      price: 12.5,
      was: 25.0,
      colors: 1,
      badge: "-50%",
    },
  ];

  const state = {
    cart: new Set(), // lưu id sản phẩm đã thêm
    likes: new Set(), // lưu id sản phẩm đã yêu thích
    q: "",
  };

  function byId(id) {
    return products.find((p) => p.id === id) || null;
  }

  function fmtGBP(n) {
    const v = Number(n || 0);
    return "£" + v.toFixed(2);
  }

  function toast(msg) {
    if (!els.toast) return;
    els.toast.textContent = msg;
    els.toast.classList.add("isShow");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => els.toast.classList.remove("isShow"), 1600);
  }

  function esc(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function cardHTML(p) {
    const inCart = state.cart.has(p.id);
    const liked = state.likes.has(p.id);

    return `
      <article class="shopCard" data-id="${esc(p.id)}">
        <div class="shopCard__img">
          <div class="shopCard__blob" aria-hidden="true"></div>
          ${p.badge ? `<div class="shopCard__badge">${esc(p.badge)}</div>` : ""}
        </div>

        <div class="shopCard__body">
          <div class="shopCard__brand">${esc(p.brand)}</div>
          <div class="shopCard__name">${esc(p.name)}</div>

          <div class="shopCard__meta">
            <div class="shopCard__price">${fmtGBP(p.price)}</div>
            ${p.was ? `<div class="shopCard__was">${fmtGBP(p.was)}</div>` : ""}
          </div>
          <div class="shopCard__colors">${p.colors} colour${p.colors > 1 ? "s" : ""}</div>

          <div class="shopCard__actions">
            <button class="shopBtn" data-add="1" type="button">${inCart ? "Đã thêm" : "Add"}</button>

            <button
              class="shopBtn isGhost shopLike ${liked ? "isLiked" : ""}"
              data-like="1"
              type="button"
              aria-label="Yêu thích"
              aria-pressed="${liked ? "true" : "false"}"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M12 21s-7-4.6-9.5-9.2C.7 8.1 2.9 5 6.5 5c2 0 3.3 1 4.1 2.2C11.4 6 12.7 5 14.7 5c3.6 0 5.8 3.1 4 6.8C19 16.4 12 21 12 21Z"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>
      </article>
    `;
  }

  function cartItemHTML(p) {
    return `
      <div class="cartItem" data-id="${esc(p.id)}">
        <div>
          <div class="cartItem__name">${esc(p.name)}</div>
          <div class="cartItem__price">${fmtGBP(p.price)}</div>
        </div>
        <button class="cartItem__rm" type="button" data-rm="1" aria-label="Bỏ sản phẩm">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          </svg>
        </button>
      </div>
    `;
  }

  function renderCartDrop() {
    if (!els.cartList || !els.cartTotal || !els.cartEmpty) return;

    const ids = Array.from(state.cart);
    const items = ids.map(byId).filter(Boolean);

    els.cartList.innerHTML = items.map(cartItemHTML).join("");

    const total = items.reduce((sum, p) => sum + Number(p.price || 0), 0);
    els.cartTotal.textContent = fmtGBP(total);

    const empty = items.length === 0;
    els.cartEmpty.style.display = empty ? "block" : "none";
    els.cartList.style.display = empty ? "none" : "grid";
    if (els.btnClearCart) els.btnClearCart.disabled = empty;
  }

  function render() {
    const q = state.q.trim().toLowerCase();
    const list = !q
      ? products
      : products.filter((p) =>
          (p.brand + " " + p.name).toLowerCase().includes(q),
        );

    if (els.grid) els.grid.innerHTML = list.map(cardHTML).join("");
    if (els.cartCount) els.cartCount.textContent = String(state.cart.size);

    renderCartDrop();
  }

  function openModal() {
    closeCart(); // tránh đè UI
    if (!els.modal) return;

    els.modal.classList.add("isOpen");
    els.modal.setAttribute("aria-hidden", "false");
    if (els.btnSearch) els.btnSearch.setAttribute("aria-expanded", "true");
    setTimeout(() => els.q?.focus(), 30);
  }

  function closeModal() {
    if (!els.modal) return;

    els.modal.classList.remove("isOpen");
    els.modal.setAttribute("aria-hidden", "true");
    if (els.btnSearch) els.btnSearch.setAttribute("aria-expanded", "false");
  }

  function openCart() {
    closeModal(); // tránh đè UI
    if (!els.cartDrop) return;

    els.cartDrop.classList.add("isOpen");
    els.cartDrop.setAttribute("aria-hidden", "false");
    if (els.btnCart) els.btnCart.setAttribute("aria-expanded", "true");
  }

  function closeCart() {
    if (!els.cartDrop) return;

    els.cartDrop.classList.remove("isOpen");
    els.cartDrop.setAttribute("aria-hidden", "true");
    if (els.btnCart) els.btnCart.setAttribute("aria-expanded", "false");
  }

  function toggleCart() {
    if (!els.cartDrop) return;
    const open = els.cartDrop.classList.contains("isOpen");
    if (open) closeCart();
    else openCart();
  }

  function bind() {
    // add-to-cart + like (event delegation)
    els.grid?.addEventListener("click", (e) => {
      const btn = e.target.closest("button");
      const card = e.target.closest(".shopCard");
      if (!btn || !card) return;

      const id = card.getAttribute("data-id");
      if (!id) return;

      if (btn.dataset.add) {
        if (state.cart.has(id)) {
          state.cart.delete(id);
          toast("Đã bỏ khỏi giỏ 🧺");
        } else {
          state.cart.add(id);
          toast("Đã thêm vào giỏ ✅");
        }
        render();
      }

      if (btn.dataset.like) {
        if (state.likes.has(id)) {
          state.likes.delete(id);
          toast("Đã bỏ yêu thích 💔");
        } else {
          state.likes.add(id);
          toast("Đã lưu yêu thích 💜");
        }
        render();
      }
    });

    // cart open/close + actions inside dropdown
    els.btnCart?.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleCart();
    });

    els.btnCartClose?.addEventListener("click", (e) => {
      e.stopPropagation();
      closeCart();
    });

    els.btnClearCart?.addEventListener("click", (e) => {
      e.stopPropagation();
      if (!state.cart.size) return;
      state.cart.clear();
      toast("Đã xóa giỏ 🧹");
      render();
    });

    els.cartDrop?.addEventListener("click", (e) => {
      const rm = e.target.closest("[data-rm]");
      if (!rm) return;

      const item = e.target.closest(".cartItem");
      const id = item?.getAttribute("data-id");
      if (!id) return;

      state.cart.delete(id);
      toast("Đã bỏ khỏi giỏ 🧺");
      render();
    });

    // click outside to close cart dropdown
    document.addEventListener("click", (e) => {
      if (!els.cartDrop || !els.cartWrap) return;
      if (!els.cartDrop.classList.contains("isOpen")) return;

      const inside = els.cartWrap.contains(e.target);
      if (!inside) closeCart();
    });

    // modal open/close
    els.btnSearch?.addEventListener("click", (e) => {
      e.stopPropagation();
      openModal();
    });

    els.modal?.addEventListener("click", (e) => {
      if (e.target && e.target.dataset && e.target.dataset.close) closeModal();
    });

    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        closeModal();
        closeCart();
      }
    });

    // search input: filter as you type
    els.q?.addEventListener("input", () => {
      state.q = els.q.value || "";
      render();
    });

    // ✅ Enter => áp dụng search và đóng textField (đóng modal + blur)
    els.q?.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;

      e.preventDefault();
      const q = (els.q.value || "").trim().toLowerCase();
      const count = !q
        ? products.length
        : products.filter((p) =>
            (p.brand + " " + p.name).toLowerCase().includes(q),
          ).length;

      closeModal();
      els.q.blur();
      toast(`Đã lọc: ${count} sản phẩm 🔎`);
    });

    // active nav highlight (nhìn cho giống mẫu)
    els.navLinks?.forEach((a) => {
      a.addEventListener("click", () => {
        els.navLinks.forEach((x) => x.classList.remove("isActive"));
        a.classList.add("isActive");
      });
    });
  }

  // init
  render();
  bind();
})();
