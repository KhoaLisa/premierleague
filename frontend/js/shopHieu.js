/* frontend/js/shopHieu.js */
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));

  const LS_ORDERS = "shop_orders_v2";
  const STATUS_FLOW = ["pending", "paid", "shipping", "done"];
  const VIETQR_BASE = "https://img.vietqr.io/image/momo-0983947901-qr_only.png";

  const els = {
    grid: $("#shopGrid"),

    // badges + toast
    cartCount: $("#cartCount"),
    favCount: $("#favCount"),
    orderCount: $("#orderCount"),
    toast: $("#toast"),

    // top actions
    btnSearch: $("#btnSearch"),
    btnCart: $("#btnCart"),
    btnFav: $("#btnFav"),
    btnOrders: $("#btnOrders"),

    // search modal
    modal: $("#searchModal"),
    q: $("#q"),
    navLinks: $$(".shopNav__a"),

    // cart dropdown
    cartWrap: $("#cartWrap"),
    cartDrop: $("#cartDrop"),
    btnCartClose: $("#btnCartClose"),
    btnClearCart: $("#btnClearCart"),
    btnCheckout: $("#btnCheckout"),
    cartList: $("#cartList"),
    cartEmpty: $("#cartEmpty"),
    cartTotal: $("#cartTotal"),

    // favorites dropdown
    favWrap: $("#favWrap"),
    favDrop: $("#favDrop"),
    btnFavClose: $("#btnFavClose"),
    btnClearFav: $("#btnClearFav"),
    favList: $("#favList"),
    favEmpty: $("#favEmpty"),

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

    // orders modal
    ordModal: $("#ordModal"),
    ordList: $("#ordList"),
    ordEmpty: $("#ordEmpty"),
    btnClearOrders: $("#btnClearOrders"),

    // checkout modal
    ckModal: $("#ckModal"),
    ckList: $("#ckList"),
    ckTotal: $("#ckTotal"),
    ckName: $("#ckName"),
    ckPhone: $("#ckPhone"),
    ckAddr: $("#ckAddr"),
    ckQrBox: $("#ckQrBox"),
    ckQrImg: $("#ckQrImg"),
    ckQrAmount: $("#ckQrAmount"),
    ckQrDesc: $("#ckQrDesc"),
    btnPayConfirm: $("#btnPayConfirm"),

    // invoice modal
    invModal: $("#invModal"),
    invBody: $("#invBody"),
    btnInvPrint: $("#btnInvPrint"),
  };

  // -----------------------------
  // Demo products
  // -----------------------------
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
        </defs>
        <rect width="100%" height="100%" fill="rgba(14, 10, 22, 1)"/>
        <circle cx="680" cy="250" r="340" fill="url(#g)" opacity="0.72"/>
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
      desc: "Bóng thi đấu phiên bản giới hạn, bề mặt bám sân tốt, đường bay ổn định.",
      price: 1000,
      colors: 1,
      badge: null,
      was: null,
    },
    {
      id: "p2",
      brand: "Premier League",
      name: "Topps 2026 Chrome Pack",
      desc: "Pack thẻ Chrome 2026 – sưu tầm, trưng bày hoặc trao đổi.",
      price: 1000,
      colors: 1,
      badge: null,
      was: null,
    },
    {
      id: "p3",
      brand: "Premier League",
      name: "2025/26 PUMA Orbita 1 PL Thrill (Match Ball)",
      desc: "Bóng thi đấu chuẩn match ball – độ nảy tốt, trọng lượng cân bằng.",
      price: 1000,
      colors: 1,
      badge: null,
      was: null,
    },
    {
      id: "p4",
      brand: "Premier League",
      name: "2025/26 PUMA Orbita Brilliance (Training)",
      desc: "Bóng tập luyện bền bỉ, vỏ dày hơn và giữ form tốt.",
      price: 1000,
      was: null,
      colors: 1,
      badge: null,
    },
    {
      id: "p5",
      brand: "Premier League",
      name: "PUMA Core T-shirt",
      desc: "Áo thun basic, thoáng, form dễ mặc.",
      price: 1000,
      was: null,
      colors: 2,
      badge: null,
    },
    {
      id: "p6",
      brand: "Premier League",
      name: "Graphic T-shirt",
      desc: "Áo graphic – in nổi bật, chất vải mềm, phối đồ nhanh gọn.",
      price: 1000,
      was: null,
      colors: 1,
      badge: null,
    },
  ].map((p) => ({ ...p, img: svgDataUrl(p.name) }));

  // -----------------------------
  // State
  // -----------------------------
  const state = {
    cart: new Map(), // id -> qty
    likes: new Set(), // id
    orders: [], // persisted
    q: "",
    activeId: null,
    activeOrderId: null,
    ckDraftId: null, // để nhét vào addInfo (mã hoá đơn)
  };

  // -----------------------------
  // Helpers
  // -----------------------------
  function esc(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function fmtMoney(n) {
    const v = Number(n || 0);
    // bạn có thể đổi format theo currency thật
    return v.toLocaleString("vi-VN");
  }

  function toast(msg) {
    if (!els.toast) return;
    els.toast.textContent = msg;
    els.toast.classList.add("isShow");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => els.toast.classList.remove("isShow"), 1600);
  }

  function byId(id) {
    return products.find((p) => p.id === id) || null;
  }

  function statusLabel(s) {
    if (s === "paid") return "Đã thanh toán";
    if (s === "shipping") return "Đang giao";
    if (s === "done") return "Hoàn tất";
    return "Chờ xử lý";
  }

  function normalizeStatus(s) {
    return STATUS_FLOW.includes(s) ? s : "pending";
  }

  function nextStatus(s) {
    const cur = normalizeStatus(s);
    const i = STATUS_FLOW.indexOf(cur);
    return STATUS_FLOW[(i + 1) % STATUS_FLOW.length];
  }

  function payLabel(code) {
    if (code === "CARD") return "Thẻ (Demo)";
    if (code === "BANK") return "Chuyển khoản (Demo)";
    if (code === "QR") return "QR MoMo (VietQR)";
    return "COD";
  }

  // ✅ amount + description => URL VietQR
  function qrAmountFromTotal(total) {
    // VietQR/MoMo thường dùng VND dạng số nguyên, nên lấy tổng (integer)
    return Math.max(0, Math.round(Number(total || 0)));
  }
  function buildVietQrUrl(amount, description) {
    const a = encodeURIComponent(String(amount || 0));
    const d = encodeURIComponent(String(description || ""));
    return `${VIETQR_BASE}?amount=${a}&addInfo=${d}`;
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
    setQty(id, getQty(id) + Number(delta || 0));
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

  function lockScroll() {
    document.documentElement.style.overflow = "hidden";
  }
  function unlockScroll() {
    document.documentElement.style.overflow = "";
  }

  function safeJsonParse(s, fallback) {
    try {
      return JSON.parse(s);
    } catch {
      return fallback;
    }
  }

  function ensureOrderShape(o) {
    const x = { ...o };
    x.status = normalizeStatus(x.status || "pending");
    x.items = Array.isArray(x.items) ? x.items : [];
    x.customer = x.customer || {};
    x.total = Number(x.total || 0);
    return x;
  }

  function loadOrders() {
    const raw = localStorage.getItem(LS_ORDERS);
    const data = safeJsonParse(raw, []);
    state.orders = Array.isArray(data) ? data.map(ensureOrderShape) : [];
  }
  function saveOrders() {
    localStorage.setItem(LS_ORDERS, JSON.stringify(state.orders));
  }

  function genOrderId() {
    const d = new Date();
    const ymd = d.toISOString().slice(0, 10).replaceAll("-", "");
    const hms = d.toTimeString().slice(0, 8).replaceAll(":", "");
    const rand = Math.random().toString(16).slice(2, 6).toUpperCase();
    return `ODR-${ymd}-${hms}-${rand}`;
  }

  function setOrderStatus(orderId, status) {
    const s = normalizeStatus(status);
    const i = (state.orders || []).findIndex((x) => x.id === orderId);
    if (i < 0) return;

    state.orders[i] = { ...state.orders[i], status: s };
    saveOrders();
    render();
    if (state.activeOrderId === orderId) openInvoice(orderId);
  }

  // -----------------------------
  // Templates
  // -----------------------------
  function cardHTML(p) {
    const qty = getQty(p.id);
    const liked = state.likes.has(p.id);

    return `
      <article class="shopCard" data-id="${esc(p.id)}" role="button" tabindex="0" aria-label="Xem chi tiết ${esc(p.name)}">
        <div class="shopCard__img">
          <img class="shopCard__photo" alt="${esc(p.name)}" src="${esc(p.img)}"/>
          ${p.badge ? `<div class="shopCard__badge">${esc(p.badge)}</div>` : ""}
        </div>

        <div class="shopCard__body">
          <div class="shopCard__brand">${esc(p.brand)}</div>
          <div class="shopCard__name">${esc(p.name)}</div>

          <div class="shopCard__meta">
            <div class="shopCard__price">${fmtMoney(p.price)}</div>
            ${p.was ? `<div class="shopCard__was">${fmtMoney(p.was)}</div>` : ""}
          </div>

          <div class="shopCard__colors">${p.colors} colour${p.colors > 1 ? "s" : ""}</div>

          <div class="shopCard__actions">
            <button class="shopBtn" data-add="1" type="button">${qty ? `Add · x${qty}` : "Add"}</button>
            <button class="shopBtn isGhost shopLike ${liked ? "isLiked" : ""}" data-like="1" type="button" aria-label="Yêu thích" aria-pressed="${liked ? "true" : "false"}">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 21s-7-4.6-9.5-9.2C.7 8.1 2.9 5 6.5 5c2 0 3.3 1 4.1 2.2C11.4 6 12.7 5 14.7 5c3.6 0 5.8 3.1 4 6.8C19 16.4 12 21 12 21Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
      </article>
    `;
  }

  function cartItemHTML(p, qty) {
    const line = Number(p.price || 0) * Number(qty || 0);
    return `
      <div class="cartItem" data-id="${esc(p.id)}" role="button" tabindex="0" aria-label="Xem chi tiết ${esc(p.name)}">
        <div>
          <div class="cartItem__name">${esc(p.name)}</div>
          <div class="cartItem__sub">
            <span class="cartItem__qty">x${qty}</span>
            <span class="cartItem__price">${fmtMoney(line)}</span>
          </div>
        </div>
        <button class="cartItem__rm" type="button" data-rm="1" aria-label="Bỏ sản phẩm">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
    `;
  }

  function favItemHTML(p) {
    return `
      <div class="favItem" data-id="${esc(p.id)}" role="button" tabindex="0" aria-label="Xem chi tiết ${esc(p.name)}">
        <div>
          <div class="favItem__name">${esc(p.name)}</div>
          <div class="favItem__price">${fmtMoney(p.price)}</div>
        </div>
        <button class="favItem__rm" type="button" data-fav-rm="1" aria-label="Bỏ yêu thích">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
    `;
  }

  function orderItemHTML(o) {
    const oo = ensureOrderShape(o);
    const dt = new Date(oo.createdAt || Date.now()).toLocaleString("vi-VN");
    const count = (oo.items || []).reduce(
      (s, it) => s + Number(it.qty || 0),
      0,
    );
    const st = normalizeStatus(oo.status);

    return `
      <div class="ordItem" data-oid="${esc(oo.id)}" role="button" tabindex="0" aria-label="Xem hóa đơn ${esc(oo.id)}">
        <div>
          <div class="ordItem__id">${esc(oo.id)}</div>
          <div class="ordItem__sub">${dt} • ${count} món • ${esc(payLabel(oo.customer?.pay))}</div>
        </div>

        <div class="ordItem__right">
          <div class="ordItem__amt">${fmtMoney(oo.total || 0)}</div>
          <button class="ordStatus ordStatus--${esc(st)}" type="button" data-ord-status="1">${esc(statusLabel(st))}</button>
        </div>
      </div>
    `;
  }

  // -----------------------------
  // Renders
  // -----------------------------
  function renderCartDrop() {
    if (!els.cartList || !els.cartTotal || !els.cartEmpty) return;

    const items = Array.from(state.cart.entries())
      .map(([id, qty]) => [byId(id), qty])
      .filter(([p]) => !!p);

    els.cartList.innerHTML = items
      .map(([p, qty]) => cartItemHTML(p, qty))
      .join("");
    els.cartTotal.textContent = fmtMoney(cartSubtotal());

    const empty = items.length === 0;
    els.cartEmpty.style.display = empty ? "block" : "none";
    els.cartList.style.display = empty ? "none" : "grid";
    if (els.btnCheckout) els.btnCheckout.disabled = empty;
    if (els.btnClearCart) els.btnClearCart.disabled = empty;
  }

  function renderFavDrop() {
    if (!els.favList || !els.favEmpty) return;

    const items = Array.from(state.likes).map(byId).filter(Boolean);
    els.favList.innerHTML = items.map(favItemHTML).join("");

    const empty = items.length === 0;
    els.favEmpty.style.display = empty ? "block" : "none";
    els.favList.style.display = empty ? "none" : "grid";
    if (els.btnClearFav) els.btnClearFav.disabled = empty;
  }

  function renderOrders() {
    if (!els.ordList || !els.ordEmpty) return;

    const list = Array.from(state.orders || [])
      .slice()
      .reverse();
    els.ordList.innerHTML = list.map(orderItemHTML).join("");

    const empty = list.length === 0;
    els.ordEmpty.style.display = empty ? "block" : "none";
    els.ordList.style.display = empty ? "none" : "grid";
    if (els.btnClearOrders) els.btnClearOrders.disabled = empty;
  }

  function render() {
    const q = (state.q || "").trim().toLowerCase();
    const list = !q
      ? products
      : products.filter((p) =>
          (p.brand + " " + p.name).toLowerCase().includes(q),
        );

    if (els.grid) els.grid.innerHTML = list.map(cardHTML).join("");

    if (els.cartCount) els.cartCount.textContent = String(cartCountTotal());
    if (els.favCount) els.favCount.textContent = String(state.likes.size);
    if (els.orderCount)
      els.orderCount.textContent = String((state.orders || []).length);

    renderCartDrop();
    renderFavDrop();
    renderOrders();
  }

  // -----------------------------
  // Open/close helpers
  // -----------------------------
  function openSearch() {
    closeCart();
    closeFav();
    closeOrders();
    closeCheckout();
    closeInvoice();
    closeProduct();
    els.modal?.classList.add("isOpen");
    els.modal?.setAttribute("aria-hidden", "false");
    els.btnSearch?.setAttribute("aria-expanded", "true");
    setTimeout(() => els.q?.focus(), 30);
  }
  function closeSearch() {
    els.modal?.classList.remove("isOpen");
    els.modal?.setAttribute("aria-hidden", "true");
    els.btnSearch?.setAttribute("aria-expanded", "false");
  }

  function openCart() {
    closeSearch();
    closeFav();
    closeOrders();
    closeCheckout();
    closeInvoice();
    closeProduct();
    els.cartDrop?.classList.add("isOpen");
    els.cartDrop?.setAttribute("aria-hidden", "false");
    els.btnCart?.setAttribute("aria-expanded", "true");
  }
  function closeCart() {
    els.cartDrop?.classList.remove("isOpen");
    els.cartDrop?.setAttribute("aria-hidden", "true");
    els.btnCart?.setAttribute("aria-expanded", "false");
  }
  function toggleCart() {
    els.cartDrop?.classList.contains("isOpen") ? closeCart() : openCart();
  }

  function openFav() {
    closeSearch();
    closeCart();
    closeOrders();
    closeCheckout();
    closeInvoice();
    closeProduct();
    els.favDrop?.classList.add("isOpen");
    els.favDrop?.setAttribute("aria-hidden", "false");
    els.btnFav?.setAttribute("aria-expanded", "true");
  }
  function closeFav() {
    els.favDrop?.classList.remove("isOpen");
    els.favDrop?.setAttribute("aria-hidden", "true");
    els.btnFav?.setAttribute("aria-expanded", "false");
  }
  function toggleFav() {
    els.favDrop?.classList.contains("isOpen") ? closeFav() : openFav();
  }

  function openOrders() {
    closeSearch();
    closeCart();
    closeFav();
    closeCheckout();
    closeInvoice();
    closeProduct();
    renderOrders();
    els.ordModal?.classList.add("isOpen");
    els.ordModal?.setAttribute("aria-hidden", "false");
    els.btnOrders?.setAttribute("aria-expanded", "true");
    lockScroll();
  }
  function closeOrders() {
    els.ordModal?.classList.remove("isOpen");
    els.ordModal?.setAttribute("aria-hidden", "true");
    els.btnOrders?.setAttribute("aria-expanded", "false");
    unlockScroll();
  }

  function setPdQty(n) {
    const v = Math.max(1, Math.floor(Number(n || 1)));
    if (els.pdQty) els.pdQty.value = String(v);
  }
  function getPdQty() {
    const v = Math.floor(Number(els.pdQty?.value || 1));
    return Math.max(1, isFinite(v) ? v : 1);
  }
  function syncPdLikeBtn() {
    const id = state.activeId;
    const liked = id && state.likes.has(id);
    els.pdLike?.classList.toggle("isLiked", !!liked);
    els.pdLike?.setAttribute("aria-pressed", liked ? "true" : "false");
  }

  function openProduct(id) {
    closeSearch();
    closeCart();
    closeFav();
    closeOrders();
    closeCheckout();
    closeInvoice();
    const p = byId(id);
    if (!p || !els.pdModal) return;

    state.activeId = p.id;
    els.pdBrand && (els.pdBrand.textContent = p.brand || "");
    els.pdName && (els.pdName.textContent = p.name || "");
    els.pdDesc && (els.pdDesc.textContent = p.desc || "");
    if (els.pdPrice) els.pdPrice.textContent = fmtMoney(p.price);
    if (els.pdWas) {
      if (p.was) {
        els.pdWas.style.display = "block";
        els.pdWas.textContent = fmtMoney(p.was);
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
    els.pdAdd &&
      (els.pdAdd.textContent = current ? "Cập nhật giỏ" : "Thêm vào giỏ");

    syncPdLikeBtn();
    els.pdModal.classList.add("isOpen");
    els.pdModal.setAttribute("aria-hidden", "false");
    lockScroll();
  }
  function closeProduct() {
    els.pdModal?.classList.remove("isOpen");
    els.pdModal?.setAttribute("aria-hidden", "true");
    unlockScroll();
    state.activeId = null;
  }

  function ckItemHTML(p, qty) {
    const line = Number(p.price || 0) * Number(qty || 0);
    return `
      <div class="ckItem">
        <div>
          <div class="ckItem__name">${esc(p.name)}</div>
          <div class="ckItem__meta">x${qty} • ${fmtMoney(p.price)} / món</div>
        </div>
        <div class="ckItem__price">${fmtMoney(line)}</div>
      </div>
    `;
  }
  function renderCheckout() {
    if (!els.ckList || !els.ckTotal) return;

    const items = Array.from(state.cart.entries())
      .map(([id, qty]) => [byId(id), qty])
      .filter(([p]) => !!p);
    els.ckList.innerHTML = items.map(([p, qty]) => ckItemHTML(p, qty)).join("");
    const total = cartSubtotal();
    els.ckTotal.textContent = fmtMoney(total);

    // ✅ QR integration: amount + addInfo (mã hoá đơn)
    const pay = "QR";
    const isQr = pay === "QR";
    if (els.ckQrBox && els.ckQrImg && els.ckQrAmount && els.ckQrDesc) {
      els.ckQrBox.style.display = isQr ? "block" : "none";
      if (isQr) {
        const amount = qrAmountFromTotal(total);
        const desc = state.ckDraftId || genOrderId();
        els.ckQrAmount.textContent = String(amount);
        els.ckQrDesc.textContent = desc;
        els.ckQrImg.src = buildVietQrUrl(amount, desc);
      }
    }
  }

  function openCheckout() {
    closeSearch();
    closeCart();
    closeFav();
    closeOrders();
    closeInvoice();
    closeProduct();
    if (!els.ckModal) return;
    if (!state.cart.size) {
      toast("Giỏ đang trống 😄");
      return;
    }

    // draft mã hoá đơn để nhét vào addInfo
    state.ckDraftId = genOrderId();

    renderCheckout();
    els.ckModal.classList.add("isOpen");
    els.ckModal.setAttribute("aria-hidden", "false");
    lockScroll();
    setTimeout(() => els.ckName?.focus(), 30);
  }
  function closeCheckout() {
    els.ckModal?.classList.remove("isOpen");
    els.ckModal?.setAttribute("aria-hidden", "true");
    unlockScroll();
  }

  function buildOrderItems() {
    return Array.from(state.cart.entries())
      .map(([id, qty]) => {
        const p = byId(id);
        if (!p) return null;
        return {
          id: p.id,
          name: p.name,
          price: Number(p.price || 0),
          qty: Number(qty || 0),
        };
      })
      .filter(Boolean);
  }

  function confirmPayment() {
    if (!state.cart.size) {
      toast("Giỏ đang trống 😄");
      return;
    }

    const name = (els.ckName?.value || "").trim();
    const phone = (els.ckPhone?.value || "").trim();
    const addr = (els.ckAddr?.value || "").trim();
    const pay = "QR";

    if (!name || !phone || !addr) {
      toast("Vui lòng nhập đủ thông tin khách hàng ✍️");
      return;
    }

    const items = buildOrderItems();
    const total = cartSubtotal();
    const id = state.ckDraftId || genOrderId();

    const order = {
      id,
      createdAt: new Date().toISOString(),
      customer: { name, phone, addr, pay },
      status: pay === "COD" || pay === "QR" ? "pending" : "paid",
      items,
      total,
      currency: "VND",
      qr:
        pay === "QR"
          ? {
              amount: qrAmountFromTotal(total),
              addInfo: id,
              url: buildVietQrUrl(qrAmountFromTotal(total), id),
            }
          : null,
    };

    state.orders.push(order);
    saveOrders();

    state.cart.clear();
    render();

    closeCheckout();
    toast("Đã tạo đơn ✅");

    openInvoice(order.id);
  }

  function invoiceHTML(o) {
    const oo = ensureOrderShape(o);
    const dt = new Date(oo.createdAt || Date.now()).toLocaleString("vi-VN");
    const st = normalizeStatus(oo.status);
    const stLabel = statusLabel(st);

    const rows = (oo.items || [])
      .map((it) => {
        const line = Number(it.price || 0) * Number(it.qty || 0);
        return `
        <div class="invRow">
          <div>
            <div class="invRow__name">${esc(it.name)}</div>
            <div class="invRow__meta">x${it.qty} • ${fmtMoney(it.price)} / món</div>
          </div>
          <div class="invRow__amt">${fmtMoney(line)}</div>
        </div>
      `;
      })
      .join("");

    const qrBlock =
      oo.customer?.pay === "QR"
        ? `
        <div class="invQr">
          <div class="invQr__ttl">Thanh toán QR</div>
          <div class="invQr__sub">Quét QR để chuyển khoản • Nội dung: <strong>${esc(oo.id)}</strong></div>
          <img class="invQr__img" alt="QR thanh toán" src="${buildVietQrUrl(qrAmountFromTotal(oo.total), oo.id)}"/>
        </div>
      `
        : "";

    return `
      <div class="invCard">
        <div class="invTop">
          <div>
            <div class="invTop__ttl">European Football Shop</div>
            <div class="invTop__sub">Mã đơn: <strong>${esc(oo.id)}</strong></div>
            <div class="invTop__sub">${dt}</div>
          </div>
          <div>
            <div class="invTop__sub"><strong>Khách:</strong> ${esc(oo.customer?.name || "")}</div>
            <div class="invTop__sub"><strong>SĐT:</strong> ${esc(oo.customer?.phone || "")}</div>
            <div class="invTop__sub"><strong>ĐC:</strong> ${esc(oo.customer?.addr || "")}</div>
            <div class="invTop__sub"><strong>TT:</strong> ${esc(payLabel(oo.customer?.pay))}</div>
            <div class="invTop__sub">
              <strong>Trạng thái:</strong>
              <button class="invStatus invStatus--${esc(st)}" type="button" data-inv-status="1">${esc(stLabel)}</button>
            </div>
          </div>
        </div>

        <div class="invTable">
          ${rows || ""}
        </div>

        ${qrBlock}

        <div class="invTotal">
          <span>Tổng thanh toán</span>
          <strong>${fmtMoney(oo.total || 0)}</strong>
        </div>
      </div>
    `;
  }

  function openInvoice(orderId) {
    closeSearch();
    closeCart();
    closeFav();
    closeOrders();
    closeCheckout();
    closeProduct();
    const o = (state.orders || []).find((x) => x.id === orderId);
    if (!o || !els.invModal || !els.invBody) return;

    state.activeOrderId = o.id;
    els.invBody.innerHTML = invoiceHTML(o);

    els.invModal.classList.add("isOpen");
    els.invModal.setAttribute("aria-hidden", "false");
    lockScroll();
  }
  function closeInvoice() {
    els.invModal?.classList.remove("isOpen");
    els.invModal?.setAttribute("aria-hidden", "true");
    unlockScroll();
    state.activeOrderId = null;
  }

  function printInvoice() {
    const id = state.activeOrderId;
    const o = (state.orders || []).find((x) => x.id === id);
    if (!o) return;

    const w = window.open("", "_blank");
    if (!w) {
      toast("Trình duyệt chặn popup 😅 Hãy cho phép để in.");
      return;
    }

    const qrLine =
      o.customer?.pay === "QR"
        ? `<div class="meta">QR: ${buildVietQrUrl(qrAmountFromTotal(o.total), o.id)}</div>`
        : "";

    const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8"/>
          <meta name="viewport" content="width=device-width,initial-scale=1"/>
          <title>Invoice ${esc(o.id)}</title>
          <style>
            body{ font-family: system-ui, -apple-system, Segoe UI, Roboto; padding: 18px; }
            .box{ border:1px solid #ddd; border-radius: 12px; padding: 14px; }
            h2{ margin: 0 0 10px; }
            .meta{ font-size: 12px; color:#555; margin-bottom: 8px; }
            .row{ display:flex; justify-content:space-between; gap:10px; padding: 10px 0; border-bottom: 1px dashed #ddd; }
            .row:last-child{ border-bottom:0; }
            .name{ font-weight: 700; }
            .small{ font-size: 12px; color:#555; margin-top: 4px; }
            .total{ display:flex; justify-content:space-between; margin-top: 12px; font-weight: 800; }
          </style>
        </head>
        <body>
          <div class="box">
            <h2>European Football Shop</h2>
            <div class="meta">Mã đơn: <strong>${esc(o.id)}</strong> • ${new Date(o.createdAt).toLocaleString("vi-VN")}</div>
            <div class="meta">Khách: <strong>${esc(o.customer?.name || "")}</strong> • SĐT: ${esc(o.customer?.phone || "")}</div>
            <div class="meta">Địa chỉ: ${esc(o.customer?.addr || "")}</div>
            <div class="meta">Thanh toán: ${esc(payLabel(o.customer?.pay))}</div>
            <div class="meta">Trạng thái: ${esc(statusLabel(normalizeStatus(o.status)))}</div>
            ${qrLine}

            ${(o.items || [])
              .map((it) => {
                const line = Number(it.price || 0) * Number(it.qty || 0);
                return `
                <div class="row">
                  <div>
                    <div class="name">${esc(it.name)}</div>
                    <div class="small">x${it.qty} • ${fmtMoney(it.price)} / món</div>
                  </div>
                  <div><strong>${fmtMoney(line)}</strong></div>
                </div>
              `;
              })
              .join("")}

            <div class="total">
              <span>Tổng</span>
              <span>${fmtMoney(o.total || 0)}</span>
            </div>
          </div>

          <script>
            window.onload = () => { window.print(); setTimeout(() => window.close(), 250); };
          </script>
        </body>
      </html>
    `;
    w.document.open();
    w.document.write(html);
    w.document.close();
  }

  // -----------------------------
  // Events
  // -----------------------------
  function bind() {
    // grid click
    els.grid?.addEventListener("click", (e) => {
      const btn = e.target.closest("button");
      const card = e.target.closest(".shopCard");
      if (!card) return;
      const id = card.getAttribute("data-id");
      if (!id) return;

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
      openProduct(id);
    });

    els.grid?.addEventListener("keydown", (e) => {
      const card = e.target.closest?.(".shopCard");
      if (!card) return;
      if (e.key !== "Enter" && e.key !== " ") return;
      e.preventDefault();
      const id = card.getAttribute("data-id");
      if (id) openProduct(id);
    });

    // search
    els.btnSearch?.addEventListener("click", (e) => {
      e.stopPropagation();
      openSearch();
    });
    els.modal?.addEventListener("click", (e) => {
      if (e.target?.dataset?.close) closeSearch();
    });
    els.q?.addEventListener("input", () => {
      state.q = els.q.value || "";
      render();
    });
    els.q?.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      e.preventDefault();
      closeSearch();
      els.q.blur();
      toast("Đã áp dụng tìm kiếm 🔎");
    });

    // cart dropdown
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
    els.btnCheckout?.addEventListener("click", (e) => {
      e.stopPropagation();
      openCheckout();
    });

    els.cartDrop?.addEventListener("click", (e) => {
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
      const item = e.target.closest?.(".cartItem");
      const id = item?.getAttribute("data-id");
      if (id) openProduct(id);
    });

    document.addEventListener("click", (e) => {
      if (
        els.cartDrop?.classList.contains("isOpen") &&
        els.cartWrap &&
        !els.cartWrap.contains(e.target)
      )
        closeCart();
      if (
        els.favDrop?.classList.contains("isOpen") &&
        els.favWrap &&
        !els.favWrap.contains(e.target)
      )
        closeFav();
    });

    // favorites dropdown
    els.btnFav?.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleFav();
    });
    els.btnFavClose?.addEventListener("click", (e) => {
      e.stopPropagation();
      closeFav();
    });
    els.btnClearFav?.addEventListener("click", (e) => {
      e.stopPropagation();
      if (!state.likes.size) return;
      state.likes.clear();
      toast("Đã xóa yêu thích 💔");
      render();
    });

    els.favDrop?.addEventListener("click", (e) => {
      const rm = e.target.closest?.("[data-fav-rm]");
      if (rm) {
        e.stopPropagation();
        const item = e.target.closest(".favItem");
        const id = item?.getAttribute("data-id");
        if (!id) return;
        state.likes.delete(id);
        toast("Đã bỏ yêu thích 💔");
        render();
        return;
      }
      const item = e.target.closest?.(".favItem");
      const id = item?.getAttribute("data-id");
      if (id) openProduct(id);
    });

    // product modal events
    els.pdModal?.addEventListener("click", (e) => {
      if (e.target?.dataset?.pdClose) closeProduct();
    });
    els.pdMinus?.addEventListener("click", () => setPdQty(getPdQty() - 1));
    els.pdPlus?.addEventListener("click", () => setPdQty(getPdQty() + 1));
    els.pdQty?.addEventListener("change", () => setPdQty(getPdQty()));
    els.pdAdd?.addEventListener("click", () => {
      const id = state.activeId;
      if (!id) return;
      const qty = getPdQty();
      setQty(id, qty);
      toast(`Đã cập nhật giỏ: x${qty} ✅`);
      render();
    });
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

    // orders
    els.btnOrders?.addEventListener("click", (e) => {
      e.stopPropagation();
      openOrders();
    });
    els.ordModal?.addEventListener("click", (e) => {
      if (e.target?.dataset?.ordClose) closeOrders();
    });
    els.btnClearOrders?.addEventListener("click", () => {
      state.orders = [];
      saveOrders();
      toast("Đã xóa lịch sử giao dịch 🧹");
      render();
    });

    els.ordList?.addEventListener("click", (e) => {
      const statusBtn = e.target.closest?.("[data-ord-status]");
      if (statusBtn) {
        e.stopPropagation();
        const it = e.target.closest?.(".ordItem");
        const oid = it?.getAttribute("data-oid");
        if (!oid) return;
        const o = (state.orders || []).find((x) => x.id === oid);
        const next = nextStatus(o?.status);
        setOrderStatus(oid, next);
        toast(`Trạng thái: ${statusLabel(next)} ✅`);
        return;
      }

      const it = e.target.closest?.(".ordItem");
      const oid = it?.getAttribute("data-oid");
      if (oid) openInvoice(oid);
    });

    // checkout
    els.ckModal?.addEventListener("click", (e) => {
      if (e.target?.dataset?.ckClose) closeCheckout();
    });
    els.btnPayConfirm?.addEventListener("click", confirmPayment);

    // invoice
    els.invModal?.addEventListener("click", (e) => {
      const st = e.target.closest?.("[data-inv-status]");
      if (st) {
        e.stopPropagation();
        const oid = state.activeOrderId;
        if (!oid) return;
        const o = (state.orders || []).find((x) => x.id === oid);
        const next = nextStatus(o?.status);
        setOrderStatus(oid, next);
        toast(`Trạng thái: ${statusLabel(next)} ✅`);
        return;
      }
      if (e.target?.dataset?.invClose) closeInvoice();
    });
    els.btnInvPrint?.addEventListener("click", printInvoice);

    // esc
    window.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      closeSearch();
      closeCart();
      closeFav();
      closeOrders();
      closeCheckout();
      closeInvoice();
      closeProduct();
    });

    // nav highlight
    els.navLinks?.forEach((a) => {
      a.addEventListener("click", () => {
        els.navLinks.forEach((x) => x.classList.remove("isActive"));
        a.classList.add("isActive");
      });
    });
  }

  // init
  loadOrders();
  render();
  bind();
})();
