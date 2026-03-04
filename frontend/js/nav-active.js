// frontend/js/nav-active.js
(() => {
  function baseName(path) {
    const p = (path || "").split("?")[0].split("#")[0];
    const parts = p.split("/").filter(Boolean);
    return parts.length ? parts[parts.length - 1] : "";
  }

  function parseHref(href) {
    const a = document.createElement("a");
    a.href = href;
    return {
      file: baseName(a.pathname) || "home.html",
      hash: a.hash || "",
    };
  }

  function getCurrent() {
    const file = baseName(location.pathname) || "home.html";
    const hash = location.hash || "";
    return { file, hash };
  }

  function setActive(links, target) {
    links.forEach((x) => x.removeAttribute("aria-current"));
    if (target) target.setAttribute("aria-current", "page");
  }

  function pickBest(links, cur) {
    // 1) nếu có hash (#news/#table/...) -> ưu tiên match file + hash
    if (cur.hash) {
      const exact = links.find((a) => {
        const p = parseHref(a.getAttribute("href") || "");
        return p.file === cur.file && p.hash === cur.hash;
      });
      if (exact) return exact;
    }

    // 2) match file (home.html, index.html, bxh.html...)
    const sameFile = links.find((a) => {
      const p = parseHref(a.getAttribute("href") || "");
      return p.file === cur.file && (!p.hash || p.hash === "");
    });
    if (sameFile) return sameFile;

    // 3) fallback: nếu đang home.html nhưng có link Trang chủ -> chọn nó
    if (cur.file === "home.html") {
      const homeLink = links.find((a) => {
        const p = parseHref(a.getAttribute("href") || "");
        return p.file === "home.html" && (!p.hash || p.hash === "");
      });
      if (homeLink) return homeLink;
    }

    return null;
  }

  function run() {
    const links = [
      ...document.querySelectorAll(".plNav a.plNav__link"),
      ...document.querySelectorAll(".plDrawer__links a"),
    ];

    if (!links.length) return;

    const cur = getCurrent();
    const target = pickBest(links, cur);
    setActive(links, target);
  }

  window.addEventListener("DOMContentLoaded", run);
  window.addEventListener("hashchange", run);
})();
