(() => {
  const API_BASE = (() => {
    const host = window.location.hostname;
    const port = window.location.port;
    if ((host === "127.0.0.1" || host === "localhost") && port === "5000") return "";
    return "http://127.0.0.1:5000";
  })();

  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => Array.from(root.querySelectorAll(s));

  const els = {
    btnLogin: $("#btnLogin"),
    btnLogout: $("#btnLogout"),
    btnUser: $("#btnUser"),
    userMenuWrap: $("#userMenuWrap"),
    userMenu: $("#userMenu"),
    userAvatar: $("#userAvatar"),
    userName: $("#userName"),
    userName2: $("#userName2"),
    userEmail2: $("#userEmail2"),
    sidebarAvatar: $("#sidebarAvatar"),
    composerAvatar: $("#composerAvatar"),
    modalAvatar: $("#modalAvatar"),
    sidebarName: $("#sidebarName"),
    sidebarMeta: $("#sidebarMeta"),
    modalUserName: $("#modalUserName"),
    statPosts: $("#statPosts"),
    statSaved: $("#statSaved"),
    storiesList: $("#storiesList"),
    feedList: $("#feedList"),
    feedMeta: $("#feedMeta"),
    feedSearchInput: $("#feedSearchInput"),
    btnFeedSearch: $("#btnFeedSearch"),
    btnOpenComposer: $("#btnOpenComposer"),
    btnOpenComposerInline: $("#btnOpenComposerInline"),
    composerModal: $("#composerModal"),
    postTitleInput: $("#postTitleInput"),
    postBodyInput: $("#postBodyInput"),
    postImageInput: $("#postImageInput"),
    postTagsInput: $("#postTagsInput"),
    btnSubmitPost: $("#btnSubmitPost"),
    btnSeedSample: $("#btnSeedSample"),
    postTemplate: $("#postTemplate"),
  };

  const STORE_KEYS = {
    userId: "efi_user_id",
    userName: "efi_user_name",
    userEmail: "efi_user_email",
    userPicture: "efi_user_picture",
    posts: "efi_social_posts_v1",
  };

  const state = {
    filter: "all",
    search: "",
    posts: [],
  };

  const store = {
    get userId() {
      const v = localStorage.getItem(STORE_KEYS.userId);
      return v ? parseInt(v, 10) : null;
    },
    get userName() {
      return localStorage.getItem(STORE_KEYS.userName) || "";
    },
    get userEmail() {
      return localStorage.getItem(STORE_KEYS.userEmail) || "";
    },
    get userPicture() {
      return localStorage.getItem(STORE_KEYS.userPicture) || "";
    },
    clearUser() {
      Object.values(STORE_KEYS).slice(0, 4).forEach((k) => localStorage.removeItem(k));
    },
  };

  function apiGet(path) {
    return fetch(`${API_BASE}${path}`, { method: "GET" }).then(async (res) => {
      if (!res.ok) throw new Error(`GET ${path} -> ${res.status}`);
      return res.json();
    });
  }

  async function hydrateUserProfileIfMissing() {
    if (!store.userId) return;
    if (store.userName && store.userEmail && store.userPicture) return;
    try {
      const data = await apiGet(`/api/me?user_id=${store.userId}`);
      const user = data.user || {};
      if (user.name) localStorage.setItem(STORE_KEYS.userName, user.name);
      if (user.email) localStorage.setItem(STORE_KEYS.userEmail, user.email);
      if (user.picture) localStorage.setItem(STORE_KEYS.userPicture, user.picture);
    } catch (err) {
      console.warn("hydrate user fail", err);
    }
  }

  function escapeHtml(str) {
    return String(str ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function getAvatarUrl(name = "Fan EFI", picture = "") {
    if (picture) return picture;
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=2a0634&color=ffffff`;
  }

  function getDisplayUser() {
    const name = store.userName || (store.userId ? `User #${store.userId}` : "Fan EFI");
    const email = store.userEmail || "Chưa đăng nhập";
    const avatar = getAvatarUrl(name, store.userPicture);
    return { name, email, avatar };
  }

  function seedStories() {
    const stories = [
      {
        name: "An Khang",
        text: "Đêm nay phải thắng thôi!",
        image: "https://images.unsplash.com/photo-1547347298-4074fc3086f0?auto=format&fit=crop&w=900&q=80",
      },
      {
        name: "Thu Hà",
        text: "Goal cam góc này đẹp quá.",
        image: "https://images.unsplash.com/photo-1518604666860-9ed391f76460?auto=format&fit=crop&w=900&q=80",
      },
      {
        name: "Minh Đức",
        text: "Đội hình ra sân ổn áp chưa?",
        image: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=900&q=80",
      },
      {
        name: "Linh Nhi",
        text: "Sân cỏ tối nay đúng điện ảnh.",
        image: "https://images.unsplash.com/photo-1486286701208-1d58e9338013?auto=format&fit=crop&w=900&q=80",
      },
    ];

    els.storiesList.innerHTML = stories
      .map((story) => {
        const avatar = getAvatarUrl(story.name);
        return `
          <article class="storyCard" style="background-image:url('${story.image}')">
            <img class="storyCard__avatar" src="${avatar}" alt="${escapeHtml(story.name)}" />
            <b>${escapeHtml(story.name)}</b>
            <span>${escapeHtml(story.text)}</span>
          </article>
        `;
      })
      .join("");
  }

  function defaultPosts() {
    return [
      {
        id: crypto.randomUUID(),
        authorName: "EFI Admin",
        authorAvatar: getAvatarUrl("EFI Admin"),
        userId: -1,
        createdAt: Date.now() - 1000 * 60 * 34,
        title: "Cuối tuần này ai là đội có áp lực lớn nhất?",
        body: "Mình thấy cuộc đua top 4 đang căng thật sự. Không chỉ điểm số sát nhau mà lịch thi đấu cũng bắt đầu dồn. Theo mọi người, đội nào đang chịu áp lực tâm lý lớn nhất lúc này?",
        image: "https://images.unsplash.com/photo-1508098682722-e99c643e7485?auto=format&fit=crop&w=1200&q=80",
        tags: ["#Top4Race", "#PremierLeague"],
        likes: 82,
        comments: [
          {
            id: crypto.randomUUID(),
            author: "Khánh Vy",
            text: "Mình vote cho đội đang phải đá 2 mặt trận, dễ hụt hơi lắm.",
            createdAt: Date.now() - 1000 * 60 * 28,
          },
        ],
        likedBy: [],
        savedBy: [],
      },
      {
        id: crypto.randomUUID(),
        authorName: "Stats Lab",
        authorAvatar: getAvatarUrl("Stats Lab"),
        userId: -2,
        createdAt: Date.now() - 1000 * 60 * 96,
        title: "Một con số đáng chú ý về khả năng pressing",
        body: "5 vòng gần nhất, cường độ thu hồi bóng bên 1/3 sân đối phương tăng rõ. Điều thú vị là đội có pressing hiệu quả nhất chưa chắc là đội cầm bóng nhiều nhất. Data đẹp để đào sâu thêm nha 😎",
        image: "",
        tags: ["#Data", "#Pressing", "#TacticalTalk"],
        likes: 51,
        comments: [],
        likedBy: [],
        savedBy: [],
      },
      {
        id: crypto.randomUUID(),
        authorName: "Fan Cam Weekly",
        authorAvatar: getAvatarUrl("Fan Cam Weekly"),
        userId: -3,
        createdAt: Date.now() - 1000 * 60 * 180,
        title: "Khoảnh khắc sân khách nhưng hát như sân nhà",
        body: "Có những trận nhìn qua màn hình thôi cũng nổi da gà. Fan đội khách đứng kín một góc khán đài mà tạo cảm giác như chiếm trọn bầu không khí. Ai có clip hay ảnh đẹp thì quăng xuống bình luận đi.",
        image: "https://images.unsplash.com/photo-1517927033932-b3d18e61fb3a?auto=format&fit=crop&w=1200&q=80",
        tags: ["#FanCulture", "#Matchday"],
        likes: 67,
        comments: [],
        likedBy: [],
        savedBy: [],
      },
    ];
  }

  function loadPosts() {
    try {
      const raw = localStorage.getItem(STORE_KEYS.posts);
      const parsed = raw ? JSON.parse(raw) : null;
      state.posts = Array.isArray(parsed) && parsed.length ? parsed : defaultPosts();
      persistPosts();
    } catch (err) {
      console.warn("load posts fail", err);
      state.posts = defaultPosts();
      persistPosts();
    }
  }

  function persistPosts() {
    localStorage.setItem(STORE_KEYS.posts, JSON.stringify(state.posts));
  }

  function closeUserMenu() {
    els.userMenu?.classList.add("hidden");
    els.btnUser?.setAttribute("aria-expanded", "false");
  }

  function toggleUserMenu() {
    if (!els.userMenu) return;
    const opening = els.userMenu.classList.contains("hidden");
    els.userMenu.classList.toggle("hidden", !opening);
    els.btnUser?.setAttribute("aria-expanded", String(opening));
  }

  function setAuthUI() {
    const user = getDisplayUser();
    const loggedIn = !!store.userId;

    els.btnLogin?.classList.toggle("efiHide", loggedIn);
    els.userMenuWrap?.classList.toggle("efiHide", !loggedIn);

    [els.userAvatar, els.sidebarAvatar, els.composerAvatar, els.modalAvatar].forEach((img) => {
      if (img) img.src = user.avatar;
    });

    if (els.userName) els.userName.textContent = user.name;
    if (els.userName2) els.userName2.textContent = user.name;
    if (els.userEmail2) els.userEmail2.textContent = user.email;
    if (els.sidebarName) els.sidebarName.textContent = user.name;
    if (els.sidebarMeta) {
      els.sidebarMeta.textContent = loggedIn
        ? `Đã đăng nhập bằng ${user.email}`
        : "Đăng nhập để đăng bài bằng tài khoản của bạn.";
    }
    if (els.modalUserName) els.modalUserName.textContent = user.name;
  }

  function formatTime(ts) {
    const diff = Date.now() - Number(ts);
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Vừa xong";
    if (mins < 60) return `${mins} phút trước`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} giờ trước`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} ngày trước`;
    return new Date(ts).toLocaleDateString("vi-VN");
  }

  function getCurrentUserToken() {
    return store.userId ? `user:${store.userId}` : "guest";
  }

  function getVisiblePosts() {
    const q = state.search.trim().toLowerCase();
    const currentToken = getCurrentUserToken();
    return state.posts
      .filter((post) => {
        if (state.filter === "mine" && post.userId !== store.userId) return false;
        if (state.filter === "liked" && !post.likedBy.includes(currentToken)) return false;
        if (state.filter === "saved" && !post.savedBy.includes(currentToken)) return false;
        if (!q) return true;
        const haystack = `${post.authorName} ${post.title} ${post.body} ${(post.tags || []).join(" ")}`.toLowerCase();
        return haystack.includes(q);
      })
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  function updateStats() {
    const currentToken = getCurrentUserToken();
    const myPosts = state.posts.filter((p) => p.userId === store.userId).length;
    const savedPosts = state.posts.filter((p) => p.savedBy.includes(currentToken)).length;
    if (els.statPosts) els.statPosts.textContent = String(myPosts);
    if (els.statSaved) els.statSaved.textContent = String(savedPosts);
  }

  function renderFeed() {
    const posts = getVisiblePosts();
    const currentToken = getCurrentUserToken();
    els.feedList.innerHTML = "";

    if (els.feedMeta) {
      const labelMap = {
        all: "Đang hiển thị toàn bộ bài viết",
        mine: "Đang hiển thị bài viết của bạn",
        liked: "Đang hiển thị bài viết bạn đã thích",
        saved: "Đang hiển thị bài viết bạn đã lưu",
      };
      els.feedMeta.textContent = `${labelMap[state.filter]} · ${posts.length} kết quả`;
    }

    if (!posts.length) {
      els.feedList.innerHTML = `<article class="glassCard emptyState">Không có bài viết nào khớp bộ lọc hiện tại ✨</article>`;
      updateStats();
      return;
    }

    posts.forEach((post) => {
      const node = els.postTemplate.content.firstElementChild.cloneNode(true);
      const likeActive = post.likedBy.includes(currentToken);
      const saveActive = post.savedBy.includes(currentToken);

      $(".postAuthor__avatar", node).src = post.authorAvatar || getAvatarUrl(post.authorName);
      $(".postAuthor__name", node).textContent = post.authorName;
      $(".postAuthor__meta", node).textContent = `${formatTime(post.createdAt)} · ${post.tags.join(" ") || "#Football"}`;
      $(".postTitle", node).textContent = post.title;
      $(".postText", node).textContent = post.body;
      $(".postLikes", node).textContent = `${post.likes} lượt thích`;
      $(".postCommentsCount", node).textContent = `${post.comments.length} bình luận`;

      const saveBtn = $(".postSaveBtn", node);
      saveBtn.textContent = saveActive ? "★" : "☆";
      saveBtn.classList.toggle("isSaved", saveActive);

      const likeBtn = $(".btnLike", node);
      likeBtn.classList.toggle("isActive", likeActive);
      likeBtn.textContent = likeActive ? "💙 Đã thích" : "👍 Thích";

      const tagsWrap = $(".postTags", node);
      tagsWrap.innerHTML = (post.tags || [])
        .map((tag) => `<span class="postTag">${escapeHtml(tag)}</span>`)
        .join("");

      const imageWrap = $(".postImageWrap", node);
      const imageEl = $(".postImage", node);
      if (post.image) {
        imageWrap.classList.remove("hidden");
        imageEl.src = post.image;
      } else {
        imageWrap.classList.add("hidden");
      }

      const commentList = $(".commentList", node);
      commentList.innerHTML = post.comments
        .slice()
        .reverse()
        .map(
          (comment) => `
            <article class="commentItem">
              <strong>${escapeHtml(comment.author)}</strong>
              <div class="commentItem__meta">${formatTime(comment.createdAt)}</div>
              <p>${escapeHtml(comment.text)}</p>
            </article>
          `,
        )
        .join("");

      saveBtn.addEventListener("click", () => toggleSave(post.id));
      likeBtn.addEventListener("click", () => toggleLike(post.id));
      $(".btnComment", node).addEventListener("click", () => $(".commentInput", node).focus());
      $(".btnShare", node).addEventListener("click", () => sharePost(post));
      $(".commentSubmit", node).addEventListener("click", () => submitComment(post.id, $(".commentInput", node)));
      $(".commentInput", node).addEventListener("keydown", (e) => {
        if (e.key === "Enter") submitComment(post.id, e.currentTarget);
      });

      els.feedList.appendChild(node);
    });

    updateStats();
  }

  function toggleLike(postId) {
    const token = getCurrentUserToken();
    const post = state.posts.find((p) => p.id === postId);
    if (!post) return;
    const idx = post.likedBy.indexOf(token);
    if (idx >= 0) {
      post.likedBy.splice(idx, 1);
      post.likes = Math.max(0, post.likes - 1);
    } else {
      post.likedBy.push(token);
      post.likes += 1;
    }
    persistPosts();
    renderFeed();
  }

  function toggleSave(postId) {
    const token = getCurrentUserToken();
    const post = state.posts.find((p) => p.id === postId);
    if (!post) return;
    const idx = post.savedBy.indexOf(token);
    if (idx >= 0) post.savedBy.splice(idx, 1);
    else post.savedBy.push(token);
    persistPosts();
    renderFeed();
  }

  function submitComment(postId, inputEl) {
    const text = String(inputEl?.value || "").trim();
    if (!text) return;
    const post = state.posts.find((p) => p.id === postId);
    if (!post) return;
    const user = getDisplayUser();
    post.comments.push({
      id: crypto.randomUUID(),
      author: user.name,
      text,
      createdAt: Date.now(),
    });
    inputEl.value = "";
    persistPosts();
    renderFeed();
  }

  async function sharePost(post) {
    const text = `${post.title}\n\n${post.body}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: post.title, text });
        return;
      } catch (err) {
        console.warn("share cancelled", err);
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      alert("Đã sao chép nội dung bài viết để chia sẻ ✨");
    } catch {
      alert("Không thể chia sẻ tự động, nhưng bạn vẫn có thể copy nội dung bài viết thủ công nhé.");
    }
  }

  function openComposer(prefill = "") {
    els.composerModal?.classList.remove("hidden");
    els.composerModal?.setAttribute("aria-hidden", "false");
    if (prefill && els.postBodyInput) {
      els.postBodyInput.value = prefill;
    }
  }

  function closeComposer() {
    els.composerModal?.classList.add("hidden");
    els.composerModal?.setAttribute("aria-hidden", "true");
  }

  function resetComposer() {
    [els.postTitleInput, els.postBodyInput, els.postImageInput, els.postTagsInput].forEach((el) => {
      if (el) el.value = "";
    });
  }

  function normalizeTags(raw) {
    return String(raw || "")
      .split(/[\s,]+/)
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => (item.startsWith("#") ? item : `#${item}`));
  }

  function submitPost() {
    const title = String(els.postTitleInput?.value || "").trim();
    const body = String(els.postBodyInput?.value || "").trim();
    const image = String(els.postImageInput?.value || "").trim();
    const tags = normalizeTags(els.postTagsInput?.value || "");

    if (!title || !body) {
      alert("Bạn cần nhập ít nhất tiêu đề và nội dung bài viết nhé.");
      return;
    }

    const user = getDisplayUser();
    state.posts.unshift({
      id: crypto.randomUUID(),
      authorName: user.name,
      authorAvatar: user.avatar,
      userId: store.userId,
      createdAt: Date.now(),
      title,
      body,
      image,
      tags: tags.length ? tags : ["#Community"],
      likes: 0,
      comments: [],
      likedBy: [],
      savedBy: [],
    });

    persistPosts();
    resetComposer();
    closeComposer();
    state.filter = "all";
    $$(".feedTab").forEach((btn) => btn.classList.toggle("isActive", btn.dataset.filter === "all"));
    renderFeed();
  }

  function bindEvents() {
    els.btnLogin?.addEventListener("click", () => {
      window.location.href = "./login.html";
    });

    els.btnLogout?.addEventListener("click", () => {
      store.clearUser();
      setAuthUI();
      closeUserMenu();
      renderFeed();
    });

    els.btnUser?.addEventListener("click", toggleUserMenu);

    document.addEventListener("click", (e) => {
      if (els.userMenuWrap && !els.userMenuWrap.contains(e.target)) closeUserMenu();

      if (e.target instanceof HTMLElement && e.target.matches("[data-close-composer]")) {
        closeComposer();
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        closeUserMenu();
        closeComposer();
      }
    });

    els.btnOpenComposer?.addEventListener("click", () => openComposer());
    els.btnOpenComposerInline?.addEventListener("click", () => openComposer());
    els.btnSubmitPost?.addEventListener("click", submitPost);
    els.btnSeedSample?.addEventListener("click", () => {
      if (els.postTitleInput) els.postTitleInput.value = "Một góc nhìn cá nhân sau trận đấu";
      if (els.postBodyInput)
        els.postBodyInput.value =
          "Mình thấy nhịp độ trận này rất thú vị: đầu trận pressing mạnh, giữa trận chùng xuống rồi cuối trận lại bùng nổ. Điều làm mình thích nhất là cách fan hai đội tạo bầu không khí cực kỳ cuốn.";
      if (els.postTagsInput) els.postTagsInput.value = "#Matchday #FanTalk #PremierLeague";
      if (els.postImageInput)
        els.postImageInput.value =
          "https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?auto=format&fit=crop&w=1200&q=80";
    });

    $$(".composerQuickActions button").forEach((btn) => {
      btn.addEventListener("click", () => openComposer(btn.dataset.fill || ""));
    });

    $$(".feedTab").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.filter = btn.dataset.filter || "all";
        $$(".feedTab").forEach((x) => x.classList.toggle("isActive", x === btn));
        renderFeed();
      });
    });

    const applySearch = () => {
      state.search = String(els.feedSearchInput?.value || "").trim();
      renderFeed();
    };

    els.btnFeedSearch?.addEventListener("click", applySearch);
    els.feedSearchInput?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") applySearch();
    });

    $("#btnOpenQuickSearch")?.addEventListener("click", () => {
      els.feedSearchInput?.focus();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  async function init() {
    await hydrateUserProfileIfMissing();
    setAuthUI();
    seedStories();
    loadPosts();
    bindEvents();
    renderFeed();
  }

  init();
})();
