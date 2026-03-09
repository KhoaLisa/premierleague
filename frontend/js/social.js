(() => {
  const $ = (s, root = document) => root.querySelector(s);

  const STORAGE_KEY = "efi_social_posts_v2";

  const els = {
    currentUserAvatar: $("#currentUserAvatar"),
    currentUserName: $("#currentUserName"),
    composerAvatar: $("#composerAvatar"),
    postForm: $("#postForm"),
    postContent: $("#postContent"),
    postImageUrl: $("#postImageUrl"),
    postHashtags: $("#postHashtags"),
    hashtagSearch: $("#hashtagSearch"),
    clearFilterBtn: $("#clearFilterBtn"),
    activeFilter: $("#activeFilter"),
    popularTags: $("#popularTags"),
    postList: $("#postList"),
  };

  const state = {
    posts: [],
    filterTag: "",
  };

  function uid(prefix = "id") {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function normalizeTag(tag) {
    return String(tag || "")
      .trim()
      .toLowerCase()
      .replace(/^#+/, "")
      .replace(/[^\p{L}\p{N}_-]+/gu, "");
  }

  function extractHashtags(text) {
    const matches = String(text || "").match(/#[\p{L}\p{N}_-]+/gu) || [];
    return matches.map((x) => normalizeTag(x));
  }

  function parseExtraHashtags(input) {
    return String(input || "")
      .split(/[\s,]+/)
      .map((x) => normalizeTag(x))
      .filter(Boolean);
  }

  function uniqueTags(tags) {
    return [...new Set((tags || []).map(normalizeTag).filter(Boolean))];
  }

  function formatTime(iso) {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "Vừa xong";
    return new Intl.DateTimeFormat("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(date);
  }

  function getCurrentUser() {
    const id = localStorage.getItem("efi_user_id") || "guest";
    const name =
      localStorage.getItem("efi_user_name") ||
      localStorage.getItem("efi_user_email") ||
      "Khách";
    const avatar =
      localStorage.getItem("efi_user_picture") ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=1d1028&color=fff`;
    return { id: String(id), name, avatar };
  }

  function savePosts() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.posts));
  }

  function createSeedData() {
    return [
      {
        id: uid("post"),
        author: "Lisa Fan",
        authorId: "seed_lisa",
        avatar:
          "https://ui-avatars.com/api/?name=Lisa+Fan&background=2b0038&color=fff",
        content:
          "Hôm nay #Arsenal đá khá ổn ở khâu kiểm soát bóng nhưng mình vẫn thấy hàng công hơi thiếu lạnh lùng ở 1/3 cuối sân. Mọi người nghĩ sao?",
        imageUrl:
          "https://images.unsplash.com/photo-1517927033932-b3d18e61fb3a?auto=format&fit=crop&w=1200&q=80",
        hashtags: ["arsenal"],
        createdAt: new Date(Date.now() - 1000 * 60 * 42).toISOString(),
        likedBy: ["seed_lisa"],
        dislikedBy: [],
        comments: [
          {
            id: uid("comment"),
            author: "Minh",
            authorId: "seed_minh",
            avatar:
              "https://ui-avatars.com/api/?name=Minh&background=22304a&color=fff",
            text: "Đúng luôn, đặc biệt là pha xử lý cuối của cánh phải. Nhưng tuyến giữa vẫn rất ổn ❤️",
            createdAt: new Date(Date.now() - 1000 * 60 * 28).toISOString(),
            heartedBy: ["seed_lisa"],
            dislikedBy: [],
            replies: [
              {
                id: uid("reply"),
                author: "Huy",
                authorId: "seed_huy",
                avatar:
                  "https://ui-avatars.com/api/?name=Huy&background=122f24&color=fff",
                text: "Mình thấy nếu có thêm tiền đạo chớp thời cơ tốt hơn thì khác hẳn.",
                createdAt: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
                heartedBy: [],
                dislikedBy: [],
                replies: [],
              },
            ],
          },
        ],
      },
      {
        id: uid("post"),
        author: "Premier Talk",
        authorId: "seed_talk",
        avatar:
          "https://ui-avatars.com/api/?name=Premier+Talk&background=3c0d0d&color=fff",
        content:
          "Một topic vui: đội nào đang có hàng thủ đáng xem nhất mùa này? #PremierLeague #Football",
        imageUrl: "",
        hashtags: ["premierleague", "football"],
        createdAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
        likedBy: [],
        dislikedBy: [],
        comments: [],
      },
    ];
  }

  function loadPosts() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        state.posts = createSeedData();
        savePosts();
        return;
      }
      const parsed = JSON.parse(raw);
      state.posts = Array.isArray(parsed) ? parsed : createSeedData();
    } catch (err) {
      console.warn("loadPosts failed", err);
      state.posts = createSeedData();
      savePosts();
    }
  }

  function renderUser() {
    const user = getCurrentUser();
    if (els.currentUserAvatar) els.currentUserAvatar.src = user.avatar;
    if (els.composerAvatar) els.composerAvatar.src = user.avatar;
    if (els.currentUserName) els.currentUserName.textContent = user.name;
  }

  function getVisiblePosts() {
    const tag = normalizeTag(state.filterTag);
    if (!tag)
      return [...state.posts].sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
      );
    return [...state.posts]
      .filter((post) => (post.hashtags || []).map(normalizeTag).includes(tag))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  function countComments(list) {
    return (list || []).reduce(
      (sum, item) => sum + 1 + countComments(item.replies || []),
      0,
    );
  }

  function gatherTagStats() {
    const map = new Map();
    state.posts.forEach((post) => {
      (post.hashtags || []).forEach((tag) => {
        const key = normalizeTag(tag);
        map.set(key, (map.get(key) || 0) + 1);
      });
    });
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }

  function renderPopularTags() {
    const stats = gatherTagStats();
    if (!stats.length) {
      els.popularTags.innerHTML =
        '<span class="metaText">Chưa có hashtag nào.</span>';
      return;
    }
    els.popularTags.innerHTML = stats
      .map(
        ([tag, count]) =>
          `<button type="button" class="tagChip" data-tag="${escapeHtml(tag)}">#${escapeHtml(tag)} <span>${count}</span></button>`,
      )
      .join("");
  }

  function renderActiveFilter() {
    const tag = normalizeTag(state.filterTag);
    if (!tag) {
      els.activeFilter.classList.add("hidden");
      els.activeFilter.textContent = "";
      return;
    }
    els.activeFilter.classList.remove("hidden");
    els.activeFilter.textContent = `Đang lọc theo hashtag #${tag}`;
  }

  function renderTextWithTags(text) {
    return escapeHtml(text).replace(
      /#([\p{L}\p{N}_-]+)/gu,
      (_, tag) =>
        `<button type="button" class="tagChip tagChip--inline" data-tag="${escapeHtml(normalizeTag(tag))}">#${escapeHtml(tag)}</button>`,
    );
  }

  function renderComments(comments, postId, depth = 0) {
    if (!comments?.length) return "";
    return `
      <div class="${depth ? "replyList" : "commentList"}">
        ${comments
          .map((comment) => {
            const user = getCurrentUser();
            const hearted = (comment.heartedBy || []).includes(user.id);
            const disliked = (comment.dislikedBy || []).includes(user.id);
            return `
              <div class="commentItem" data-comment-id="${comment.id}">
                <div class="commentTop">
                  <img src="${escapeHtml(comment.avatar)}" alt="avatar" class="commentAvatar" />
                  <div class="commentBubble">
                    <div class="commentIdentity">
                      <div>
                        <h4 class="commentName">${escapeHtml(comment.author)}</h4>
                        <div class="commentMeta">${formatTime(comment.createdAt)}</div>
                      </div>
                    </div>
                    <div class="commentText">${renderTextWithTags(comment.text)}</div>
                    <div class="commentActions">
                      <button type="button" class="commentActionBtn ${hearted ? "is-active" : ""}" data-action="heart-comment" data-post-id="${postId}" data-comment-id="${comment.id}">❤️ ${comment.heartedBy?.length || 0}</button>
                      <button type="button" class="commentActionBtn ${disliked ? "is-negative" : ""}" data-action="dislike-comment" data-post-id="${postId}" data-comment-id="${comment.id}">👎 ${comment.dislikedBy?.length || 0}</button>
                      <button type="button" class="commentActionBtn" data-action="toggle-reply" data-post-id="${postId}" data-comment-id="${comment.id}">↩️ Trả lời</button>
                    </div>

                    <div class="replyBox hidden" data-reply-box="${comment.id}">
                      <form class="replyForm" data-post-id="${postId}" data-comment-id="${comment.id}">
                        <div class="replyFormRow">
                          <input class="inlineInput" name="replyText" type="text" placeholder="Viết phản hồi cho bình luận này..." />
                          <button type="submit" class="socialBtn">Gửi</button>
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
                ${comment.replies?.length ? `<div class="replyWrap">${renderComments(comment.replies, postId, depth + 1)}</div>` : ""}
              </div>
            `;
          })
          .join("")}
      </div>
    `;
  }

  function renderPosts() {
    const user = getCurrentUser();
    const visible = getVisiblePosts();

    if (!visible.length) {
      els.postList.innerHTML = `
        <article class="socialCard emptyBox">
          <h3>Chưa có bài phù hợp</h3>
          <p>Thử đổi hashtag đang tìm hoặc đăng bài mới để bắt đầu cuộc trò chuyện.</p>
        </article>
      `;
      return;
    }

    els.postList.innerHTML = visible
      .map((post) => {
        const liked = (post.likedBy || []).includes(user.id);
        const disliked = (post.dislikedBy || []).includes(user.id);
        return `
          <article class="socialCard postCard" data-post-id="${post.id}">
            <div class="postTop">
              <div class="postIdentity">
                <img src="${escapeHtml(post.avatar)}" alt="avatar" class="postAvatar" />
                <div>
                  <h3 class="postName">${escapeHtml(post.author)}</h3>
                  <div class="postTime">${formatTime(post.createdAt)}</div>
                </div>
              </div>
            </div>

            <div class="postContent">${renderTextWithTags(post.content)}</div>
            ${post.imageUrl ? `<div class="postImage"><img src="${escapeHtml(post.imageUrl)}" alt="ảnh bài viết" loading="lazy" /></div>` : ""}
            ${(post.hashtags || []).length ? `<div class="postTags">${post.hashtags.map((tag) => `<button type="button" class="tagChip" data-tag="${escapeHtml(tag)}">#${escapeHtml(tag)}</button>`).join("")}</div>` : ""}

            <div class="postStats">
              <div class="leftStat">
                <span>👍 ${post.likedBy?.length || 0}</span>
                <span>👎 ${post.dislikedBy?.length || 0}</span>
              </div>
              <div class="rightStat">
                <span>💬 ${countComments(post.comments || [])} bình luận</span>
              </div>
            </div>

            <div class="postActions">
              <button type="button" class="actionBtn ${liked ? "is-active" : ""}" data-action="like-post" data-post-id="${post.id}">👍 Thích</button>
              <button type="button" class="actionBtn ${disliked ? "is-negative" : ""}" data-action="dislike-post" data-post-id="${post.id}">👎 Dislike</button>
            </div>

            <div class="commentSection">
              <form class="commentForm" data-post-id="${post.id}">
                <div class="commentInputRow">
                  <img src="${escapeHtml(user.avatar)}" alt="avatar" class="commentAvatar" />
                  <input class="inlineInput" name="commentText" type="text" placeholder="Viết bình luận cho bài này..." />
                  <button type="submit" class="socialBtn">Bình luận</button>
                </div>
              </form>
              ${renderComments(post.comments || [], post.id)}
            </div>
          </article>
        `;
      })
      .join("");
  }

  function renderAll() {
    renderUser();
    renderActiveFilter();
    renderPopularTags();
    renderPosts();
  }

  function makePost(content, imageUrl, extraTags) {
    const user = getCurrentUser();
    const tags = uniqueTags([
      ...extractHashtags(content),
      ...parseExtraHashtags(extraTags),
    ]);
    return {
      id: uid("post"),
      author: user.name,
      authorId: user.id,
      avatar: user.avatar,
      content: String(content || "").trim(),
      imageUrl: String(imageUrl || "").trim(),
      hashtags: tags,
      createdAt: new Date().toISOString(),
      likedBy: [],
      dislikedBy: [],
      comments: [],
    };
  }

  function insertPost(post) {
    state.posts.unshift(post);
    savePosts();
    renderAll();
  }

  function findPost(postId) {
    return state.posts.find((post) => post.id === postId);
  }

  function walkComments(list, targetId) {
    for (const comment of list || []) {
      if (comment.id === targetId) return comment;
      const nested = walkComments(comment.replies || [], targetId);
      if (nested) return nested;
    }
    return null;
  }

  function toggleReaction(collection, userId) {
    const set = new Set(collection || []);
    if (set.has(userId)) set.delete(userId);
    else set.add(userId);
    return [...set];
  }

  function toggleExclusiveReaction(item, positiveKey, negativeKey, mode) {
    const userId = getCurrentUser().id;
    item[positiveKey] = item[positiveKey] || [];
    item[negativeKey] = item[negativeKey] || [];

    if (mode === "positive") {
      item[positiveKey] = toggleReaction(item[positiveKey], userId);
      item[negativeKey] = item[negativeKey].filter((id) => id !== userId);
    } else {
      item[negativeKey] = toggleReaction(item[negativeKey], userId);
      item[positiveKey] = item[positiveKey].filter((id) => id !== userId);
    }
  }

  function createComment(text) {
    const user = getCurrentUser();
    return {
      id: uid("comment"),
      author: user.name,
      authorId: user.id,
      avatar: user.avatar,
      text: String(text || "").trim(),
      createdAt: new Date().toISOString(),
      heartedBy: [],
      dislikedBy: [],
      replies: [],
    };
  }

  function setFilterTag(raw) {
    state.filterTag = normalizeTag(raw);
    if (els.hashtagSearch)
      els.hashtagSearch.value = state.filterTag ? `#${state.filterTag}` : "";
    renderAll();
  }

  function handleSubmitPost(event) {
    event.preventDefault();
    const content = els.postContent.value.trim();
    const imageUrl = els.postImageUrl.value.trim();
    const extraTags = els.postHashtags.value;

    if (!content) {
      alert("Bạn cần nhập nội dung bài viết trước đã.");
      return;
    }

    insertPost(makePost(content, imageUrl, extraTags));
    els.postForm.reset();
  }

  function handleCommentSubmit(form, isReply = false) {
    const postId = form.dataset.postId;
    const textInput = form.querySelector(
      '[name="commentText"], [name="replyText"]',
    );
    const text = textInput?.value.trim() || "";
    if (!text) return;

    const post = findPost(postId);
    if (!post) return;

    if (isReply) {
      const commentId = form.dataset.commentId;
      const target = walkComments(post.comments, commentId);
      if (!target) return;
      target.replies = target.replies || [];
      target.replies.push(createComment(text));
    } else {
      post.comments = post.comments || [];
      post.comments.push(createComment(text));
    }

    savePosts();
    renderAll();
  }

  function handleClick(event) {
    const btn = event.target.closest("[data-action], .tagChip");
    if (!btn) return;

    const tag = btn.dataset.tag;
    if (tag) {
      setFilterTag(tag);
      return;
    }

    const action = btn.dataset.action;
    const postId = btn.dataset.postId;
    const commentId = btn.dataset.commentId;
    const post = findPost(postId);
    if (!post) return;

    if (action === "like-post") {
      toggleExclusiveReaction(post, "likedBy", "dislikedBy", "positive");
    } else if (action === "dislike-post") {
      toggleExclusiveReaction(post, "likedBy", "dislikedBy", "negative");
    } else if (
      action === "heart-comment" ||
      action === "dislike-comment" ||
      action === "toggle-reply"
    ) {
      const comment = walkComments(post.comments, commentId);
      if (!comment) return;

      if (action === "heart-comment") {
        toggleExclusiveReaction(comment, "heartedBy", "dislikedBy", "positive");
      } else if (action === "dislike-comment") {
        toggleExclusiveReaction(comment, "heartedBy", "dislikedBy", "negative");
      } else if (action === "toggle-reply") {
        const box = document.querySelector(
          `[data-reply-box="${CSS.escape(commentId)}"]`,
        );
        if (box) box.classList.toggle("hidden");
        return;
      }
    }

    savePosts();
    renderAll();
  }

  function bindEvents() {
    els.postForm?.addEventListener("submit", handleSubmitPost);

    els.hashtagSearch?.addEventListener("input", (e) => {
      setFilterTag(e.target.value);
    });

    els.clearFilterBtn?.addEventListener("click", () => setFilterTag(""));

    document.addEventListener("click", handleClick);

    document.addEventListener("submit", (event) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) return;
      if (form.matches(".commentForm")) {
        event.preventDefault();
        handleCommentSubmit(form, false);
      }
      if (form.matches(".replyForm")) {
        event.preventDefault();
        handleCommentSubmit(form, true);
      }
    });
  }

  function init() {
    loadPosts();
    bindEvents();
    renderAll();
  }

  init();
})();
