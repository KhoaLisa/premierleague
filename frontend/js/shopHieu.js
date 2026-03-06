/* frontend/js/shop.js */
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));

  const els = {
    grid: $("#shopGrid"),
    cartCount: $("#cartCount"),
    toast: $("#toast"),
    btnSearch: $("#btnSearch"),
    btnCart: $("#btnCart"),
    modal: $("#searchModal"),
    q: $("#q"),
    navLinks: $$(".shopNav__a"),
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
    cart: new Set(),
    q: "",
  };

  function fmtGBP(n) {
    // giữ format kiểu shop mẫu (GBP)
    const v = Number(n || 0);
    return "£" + v.toFixed(v % 1 === 0 ? 2 : 2);
  }

  function toast(msg) {
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
            <button class="shopBtn isGhost" data-like="1" type="button" aria-label="Yêu thích">
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

  function render() {
    const q = state.q.trim().toLowerCase();
    const list = !q
      ? products
      : products.filter((p) =>
          (p.brand + " " + p.name).toLowerCase().includes(q),
        );

    els.grid.innerHTML = list.map(cardHTML).join("");
    els.cartCount.textContent = String(state.cart.size);
  }

  function openModal() {
    els.modal.classList.add("isOpen");
    els.modal.setAttribute("aria-hidden", "false");
    setTimeout(() => els.q?.focus(), 50);
  }

  function closeModal() {
    els.modal.classList.remove("isOpen");
    els.modal.setAttribute("aria-hidden", "true");
  }

  function bind() {
    // add-to-cart
    els.grid.addEventListener("click", (e) => {
      const btn = e.target.closest("button");
      const card = e.target.closest(".shopCard");
      if (!btn || !card) return;

      const id = card.getAttribute("data-id");
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
        toast("Đã lưu yêu thích 💜");
      }
    });

    // modal open/close
    els.btnSearch.addEventListener("click", openModal);
    els.modal.addEventListener("click", (e) => {
      if (e.target && e.target.dataset && e.target.dataset.close) closeModal();
    });
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeModal();
    });

    // search input
    els.q.addEventListener("input", () => {
      state.q = els.q.value || "";
      render();
    });

    // click cart (demo)
    els.btnCart.addEventListener("click", () => {
      toast(
        state.cart.size
          ? `Giỏ: ${state.cart.size} món 🛒`
          : "Giỏ đang trống 😄",
      );
    });

    // active nav highlight (nhìn cho giống mẫu)
    els.navLinks.forEach((a) => {
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
