/* frontend/js/shopHieu.js */
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));

  const els = {
    grid: $("#shopGrid"),
    cartCount: $("#cartCount"),
    toast: $("#toast"),

    // top actions
    btnSearch: $("#btnSearch"),
    btnCart: $("#btnCart"),

    // search modal
    modal: $("#searchModal"),
    q: $("#q"),
    navLinks: $$(".shopNav__a"),

    // cart dropdown
    cartWrap: $("#cartWrap"),
    cartDrop: $("#cartDrop"),
    btnCartClose: $("#btnCartClose"),
    btnClearCart: $("#btnClearCart"),
    cartList: $("#cartList"),
    cartEmpty: $("#cartEmpty"),
    cartTotal: $("#cartTotal"),

    // product detail modal
    pdModal: $("#pdModal"),
    pdBrand: $("#pdBrand"),
    pdImg: $("#pdImg"),
    pdName: $("#pdName"),
    pdDesc: $("#pdDesc"),
    pdPrice: $("#pdPrice"),
    pdWas: $("#pdWas"),
    pdMinus: $("#pdMinus"),
    pdPlus: $("#pdPlus"),
    pdQty: $("#pdQty"),
    pdAdd: $("#pdAdd"),
    pdLike: $("#pdLike"),
  };

  // ---------------------------------------------------------
  // Demo data (bạn thay bằng API sau cũng được)
  // ---------------------------------------------------------
  function svgDataUrl(title) {
    const t = String(title || "Product").slice(0, 28);
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="960" height="720">
        <defs>
          <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="#7a2cff"/>
            <stop offset="0.45" stop-color="#4b6bff"/>
            <stop offset="1" stop-color="#00e5ff"/>
          </linearGradient>
          <radialGradient id="r" cx="68%" cy="35%" r="65%">
            <stop offset="0" stop-color="rgba(255,255,255,0.75)"/>
            <stop offset="1" stop-color="rgba(255,255,255,0)"/>
          </radialGradient>
        </defs>
        <rect width="100%" height="100%" fill="rgba(14, 10, 22, 1)"/>
        <circle cx="700" cy="220" r="320" fill="url(#g)" opacity="0.75"/>
        <circle cx="590" cy="300" r="380" fill="url(#r)" opacity="0.6"/>
        <text x="54" y="640" font-size="54" font-family="system-ui,Segoe UI,Roboto" fill="rgba(255,255,255,0.88)" font-weight="800">
          ${t.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")}
        </text>
      </svg>
    `;
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  }

  const products = [
    {
      id: "p1",
      brand: "Premier League",
      name: "2025/26 PUMA Orbita 3 PL Thrill Edition",
      desc: "Bóng thi đấu phiên bản giới hạn, bề mặt bám sân tốt, đường bay ổn định. Phù hợp đá phủi lẫn tập luyện.",
      price: 40.0,
      colors: 1,
      badge: null,
      was: null,
    },
    {
      id: "p2",
      brand: "Premier League",
      name: "Topps 2026 Chrome Pack",
      desc: "Pack thẻ Chrome 2026 – sưu tầm, trưng bày hoặc trao đổi. Bề mặt bóng, in sắc nét, cảm giác “đã tay”.",
      price: 15.0,
      colors: 1,
      badge: null,
      was: null,
    },
    {
      id: "p3",
      brand: "Premier League",
      name: "2025/26 PUMA Orbita 1 PL Thrill (Match Ball)",
      desc: "Bóng thi đấu chuẩn match ball – độ nảy tốt, trọng lượng cân bằng, phù hợp sân 11 và 7.",
      price: 135.0,
      colors: 1,
      badge: null,
      was: null,
    },
    {
      id: "p4",
      brand: "Premier League",
      name: "2025/26 PUMA Orbita Brilliance (Training)",
      desc: "Bóng tập luyện bền bỉ, vỏ dày hơn và giữ form tốt – đá nhiều vẫn “trâu”.",
      price: 11.99,
      was: 17.0,
      colors: 1,
      badge: "-30%",
    },
    {
      id: "p5",
      brand: "Premier League",
      name: "PUMA Core T-shirt",
      desc: "Áo thun basic, thoáng, form dễ mặc. Hợp đi chơi lẫn tập nhẹ.",
      price: 12.5,
      was: 25.0,
      colors: 2,
      badge: "-50%",
    },
    {
      id: "p6",
      brand: "Premier League",
      name: "Graphic T-shirt",
      desc: "Áo graphic – in nổi bật, chất vải mềm, phối đồ nhanh gọn.",
      price: 12.5,
      was: 25.0,
      colors: 1,
      badge: "-50%",
    },
  ].map((p) => ({ ...p, img: svgDataUrl(p.name) }));

  // ---------------------------------------------------------
  // State
  // ---------------------------------------------------------
  const state = {
    cart: new Map(), // id -> qty
    likes: new Set(), // id
    q: "",
    activeId: null, // product detail modal
  };

  // ---------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------
  function byId(id) {
    return products.find((p) => p.id === id) || null;
  }

  function esc(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
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

  function getQty(id) {
    return Number(state.cart.get(id) || 0);
  }

  function setQty(id, qty) {
    const q = Math.max(0, Math.floor(Number(qty || 0)));
    if (!q) state.cart.delete(id);
    else state.cart.set(id, q);
  }

  function addQty(id, delta = 1) {
    const next = getQty(id) + Number(delta || 0);
    setQty(id, next);
  }

  function cartCountTotal() {
    let sum = 0;
    for (const v of state.cart.values()) sum += Number(v || 0);
    return sum;
  }

  function cartSubtotal() {
    let sum = 0;
    for (const [id, qty] of state.cart.entries()) {
      const p = byId(id);
      if (!p) continue;
      sum += Number(p.price || 0) * Number(qty || 0);
    }
    return sum;
  }

  // ---------------------------------------------------------
  // Render
  // ---------------------------------------------------------
  function cardHTML(p) {
    const qty = getQty(p.id);
    const liked = state.likes.has(p.id);

    return `
      <article class="shopCard" data-id="${esc(p.id)}" role="button" tabindex="0" aria-label="Xem chi tiết ${esc(p.name)}">
        <div class="shopCard__img">
          <img class="shopCard__photo" alt="${esc(p.name)}" src="${esc(p.img)}" />
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
            <button class="shopBtn" data-add="1" type="button">
              ${qty ? `Add · x${qty}` : "Add"}
            </button>

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

  function cartItemHTML(p, qty) {
    const lineTotal = Number(p.price || 0) * Number(qty || 0);
    return `
      <div class="cartItem" data-id="${esc(p.id)}" role="button" tabindex="0" aria-label="Xem chi tiết ${esc(p.name)}">
        <div>
          <div class="cartItem__name">${esc(p.name)}</div>
          <div class="cartItem__sub">
            <span class="cartItem__qty">x${qty}</span>
            <span class="cartItem__price">${fmtGBP(lineTotal)}</span>
          </div>
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

    const items = Array.from(state.cart.entries())
      .map(([id, qty]) => [byId(id), qty])
      .filter(([p]) => !!p);

    els.cartList.innerHTML = items
      .map(([p, qty]) => cartItemHTML(p, qty))
      .join("");
    els.cartTotal.textContent = fmtGBP(cartSubtotal());

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

    if (els.cartCount) els.cartCount.textContent = String(cartCountTotal());

    renderCartDrop();
  }

  // ---------------------------------------------------------
  // Search modal
  // ---------------------------------------------------------
  function openSearch() {
    closeCart();
    closeProduct();

    if (!els.modal) return;
    els.modal.classList.add("isOpen");
    els.modal.setAttribute("aria-hidden", "false");
    els.btnSearch?.setAttribute("aria-expanded", "true");
    setTimeout(() => els.q?.focus(), 30);
  }

  function closeSearch() {
    if (!els.modal) return;
    els.modal.classList.remove("isOpen");
    els.modal.setAttribute("aria-hidden", "true");
    els.btnSearch?.setAttribute("aria-expanded", "false");
  }

  // ---------------------------------------------------------
  // Cart dropdown
  // ---------------------------------------------------------
  function openCart() {
    closeSearch();
    closeProduct();

    if (!els.cartDrop) return;
    els.cartDrop.classList.add("isOpen");
    els.cartDrop.setAttribute("aria-hidden", "false");
    els.btnCart?.setAttribute("aria-expanded", "true");
  }

  function closeCart() {
    if (!els.cartDrop) return;
    els.cartDrop.classList.remove("isOpen");
    els.cartDrop.setAttribute("aria-hidden", "true");
    els.btnCart?.setAttribute("aria-expanded", "false");
  }

  function toggleCart() {
    if (!els.cartDrop) return;
    els.cartDrop.classList.contains("isOpen") ? closeCart() : openCart();
  }

  // ---------------------------------------------------------
  // Product detail modal
  // ---------------------------------------------------------
  function setPdQty(n) {
    const v = Math.max(1, Math.floor(Number(n || 1)));
    if (els.pdQty) els.pdQty.value = String(v);
  }

  function getPdQty() {
    const v = Math.floor(Number(els.pdQty?.value || 1));
    return Math.max(1, isFinite(v) ? v : 1);
  }

  function syncPdLikeBtn() {
    if (!els.pdLike) return;
    const id = state.activeId;
    const liked = id && state.likes.has(id);

    els.pdLike.classList.toggle("isLiked", !!liked);
    els.pdLike.setAttribute("aria-pressed", liked ? "true" : "false");
  }

  function openProduct(id) {
    const p = byId(id);
    if (!p || !els.pdModal) return;

    state.activeId = p.id;

    els.pdBrand && (els.pdBrand.textContent = p.brand || "");
    els.pdName && (els.pdName.textContent = p.name || "");
    els.pdDesc && (els.pdDesc.textContent = p.desc || "");

    if (els.pdPrice) els.pdPrice.textContent = fmtGBP(p.price);
    if (els.pdWas) {
      if (p.was) {
        els.pdWas.style.display = "block";
        els.pdWas.textContent = fmtGBP(p.was);
      } else {
        els.pdWas.style.display = "none";
        els.pdWas.textContent = "";
      }
    }

    if (els.pdImg) {
      els.pdImg.src = p.img || "";
      els.pdImg.alt = p.name || "Ảnh sản phẩm";
    }

    const current = getQty(p.id);
    setPdQty(current || 1);
    if (els.pdAdd)
      els.pdAdd.textContent = current ? "Cập nhật giỏ" : "Thêm vào giỏ";

    syncPdLikeBtn();

    els.pdModal.classList.add("isOpen");
    els.pdModal.setAttribute("aria-hidden", "false");
    document.documentElement.style.overflow = "hidden";
  }

  function closeProduct() {
    if (!els.pdModal) return;

    els.pdModal.classList.remove("isOpen");
    els.pdModal.setAttribute("aria-hidden", "true");
    document.documentElement.style.overflow = "";
    state.activeId = null;
  }

  // ---------------------------------------------------------
  // Events
  // ---------------------------------------------------------
  function bind() {
    // click / keyboard open product detail, add cart, like
    els.grid?.addEventListener("click", (e) => {
      const btn = e.target.closest("button");
      const card = e.target.closest(".shopCard");
      if (!card) return;

      const id = card.getAttribute("data-id");
      if (!id) return;

      // clicks on buttons
      if (btn) {
        if (btn.dataset.add) {
          addQty(id, 1);
          toast(`Đã thêm 1 • x${getQty(id)} 🛒`);
          render();
          return;
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
          return;
        }
        return;
      }

      // click on card background => open detail
      openProduct(id);
    });

    // accessibility: Enter/Space on card opens modal
    els.grid?.addEventListener("keydown", (e) => {
      const card = e.target.closest?.(".shopCard");
      if (!card) return;
      if (e.key !== "Enter" && e.key !== " ") return;
      e.preventDefault();
      const id = card.getAttribute("data-id");
      if (id) openProduct(id);
    });

    // search modal open/close
    els.btnSearch?.addEventListener("click", (e) => {
      e.stopPropagation();
      openSearch();
    });
    els.modal?.addEventListener("click", (e) => {
      if (e.target && e.target.dataset && e.target.dataset.close) closeSearch();
    });

    // search input: filter as you type
    els.q?.addEventListener("input", () => {
      state.q = els.q.value || "";
      render();
    });

    // ✅ Enter => đóng textField (đóng modal + blur)
    els.q?.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      e.preventDefault();

      const q = (els.q.value || "").trim().toLowerCase();
      const count = !q
        ? products.length
        : products.filter((p) =>
            (p.brand + " " + p.name).toLowerCase().includes(q),
          ).length;

      closeSearch();
      els.q.blur();
      toast(`Đã lọc: ${count} sản phẩm 🔎`);
    });

    // cart dropdown open/close
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

    // cart dropdown interactions
    els.cartDrop?.addEventListener("click", (e) => {
      // remove
      const rm = e.target.closest?.("[data-rm]");
      if (rm) {
        e.stopPropagation();
        const item = e.target.closest(".cartItem");
        const id = item?.getAttribute("data-id");
        if (!id) return;

        state.cart.delete(id);
        toast("Đã bỏ khỏi giỏ 🧺");
        render();
        return;
      }

      // open product detail when clicking cart item
      const item = e.target.closest?.(".cartItem");
      const id = item?.getAttribute("data-id");
      if (id) {
        openProduct(id);
      }
    });

    // click outside to close cart dropdown
    document.addEventListener("click", (e) => {
      if (!els.cartDrop || !els.cartWrap) return;
      if (!els.cartDrop.classList.contains("isOpen")) return;
      const inside = els.cartWrap.contains(e.target);
      if (!inside) closeCart();
    });

    // product modal close
    els.pdModal?.addEventListener("click", (e) => {
      if (e.target && e.target.dataset && e.target.dataset.pdClose)
        closeProduct();
    });

    // product qty controls
    els.pdMinus?.addEventListener("click", () => setPdQty(getPdQty() - 1));
    els.pdPlus?.addEventListener("click", () => setPdQty(getPdQty() + 1));
    els.pdQty?.addEventListener("change", () => setPdQty(getPdQty()));

    // product add to cart with quantity
    els.pdAdd?.addEventListener("click", () => {
      const id = state.activeId;
      const p = id ? byId(id) : null;
      if (!p) return;

      const qty = getPdQty();
      setQty(id, qty);
      toast(`Đã cập nhật giỏ: x${qty} ✅`);
      render();
      // giữ modal mở để user tiếp tục, nếu bạn muốn auto close thì bật dòng dưới:
      // closeProduct();
    });

    // product like
    els.pdLike?.addEventListener("click", () => {
      const id = state.activeId;
      if (!id) return;

      if (state.likes.has(id)) {
        state.likes.delete(id);
        toast("Đã bỏ yêu thích 💔");
      } else {
        state.likes.add(id);
        toast("Đã lưu yêu thích 💜");
      }
      syncPdLikeBtn();
      render();
    });

    // global ESC: close all overlays
    window.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      closeSearch();
      closeCart();
      closeProduct();
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
