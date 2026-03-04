// chat.js - bubble chat gọi /api/chat

const BASE = window.API_BASE || "";

const chatToggle = document.getElementById("chatToggle");
const chatWindow = document.getElementById("chatWindow");
const chatClose = document.getElementById("chatClose");
const chatMsgs = document.getElementById("chatMsgs");
const chatInput = document.getElementById("chatInput");
const chatSend = document.getElementById("chatSend");

function escapeHtml(s) {
  return (s || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function addMsg(text, who = "bot", meta = "") {
  const div = document.createElement("div");
  div.className = `msg ${who}`;
  div.innerHTML = `
    <div>${escapeHtml(text)}</div>
    ${meta ? `<div class="msgMeta">${escapeHtml(meta)}</div>` : ""}
  `;
  chatMsgs.appendChild(div);
  chatMsgs.scrollTop = chatMsgs.scrollHeight;
  return div;
}

function addQuickButtons(container, actions) {
  if (!actions || actions.length === 0) return;
  const row = document.createElement("div");
  row.className = "quickRow";
  for (const a of actions) {
    const b = document.createElement("button");
    b.className = "quickBtn";
    b.textContent = a.label;
    b.onclick = () => handleAction(a);
    row.appendChild(b);
  }
  container.appendChild(row);
  chatMsgs.scrollTop = chatMsgs.scrollHeight;
}

function handleAction(a) {
  if (a.type === "text") {
    chatInput.value = a.value;
    sendChat();
  } else if (a.type === "scroll") {
    const el = document.getElementById(a.value);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  } else if (a.type === "call") {
    if (a.value === "refreshFeed" && typeof window.refreshFeed === "function") {
      window.refreshFeed();
    }
  }
}

async function sendChat() {
  const msg = (chatInput.value || "").trim();
  if (!msg) return;

  addMsg(msg, "me");
  chatInput.value = "";

  try {
    const r = await fetch(`${BASE}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: msg }),
    });

    if (!r.ok) throw new Error("chat api failed");
    const data = await r.json();

    const meta = `intent: ${data.intent} • conf: ${Math.round((data.confidence || 0) * 100)}%`;
    const botDiv = addMsg(data.reply || "OK", "bot", meta);
    addQuickButtons(botDiv, data.actions || []);
  } catch {
    addMsg(
      "Backend đang tắt hoặc lỗi API 😵 Bạn kiểm tra Flask còn chạy không.",
      "bot",
    );
  }
}

chatToggle.onclick = () => {
  chatWindow.classList.toggle("hidden");
  if (
    !chatWindow.classList.contains("hidden") &&
    chatMsgs.childElementCount === 0
  ) {
    const first = addMsg(
      "Chào bạn 👋 Gõ: 'BXH PL', 'lịch đấu', 'top ghi bàn', hoặc 'gợi ý tin' nhé.",
    );
    addQuickButtons(first, [
      { label: "BXH PL", type: "text", value: "BXH PL" },
      { label: "Lịch đấu", type: "text", value: "lịch đấu" },
      { label: "Top ghi bàn", type: "text", value: "top ghi bàn" },
      { label: "Gợi ý tin", type: "text", value: "gợi ý tin" },
    ]);
  }
};

chatClose.onclick = () => chatWindow.classList.add("hidden");
chatSend.onclick = sendChat;
chatInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendChat();
});
