// ======================================
// intro.js • Skip luôn bấm được (NO countdown)
// ======================================

const NEXT_URL = "./home.html";
const HOLD_MS = 900; // chữ đứng yên 12s rồi tự vào trang chủ

const vid = document.getElementById("introVid");
const btnSkip = document.getElementById("skip");
const soundBtn = document.getElementById("soundBtn");

function goNext() {
  window.location.replace(NEXT_URL);
}

// ===== SKIP (luôn bấm được) =====
btnSkip?.addEventListener("click", (e) => {
  e.stopPropagation();
  goNext();
});
// ===== SOUND =====
function setSoundUI(isOn) {
  if (!soundBtn) return;
  soundBtn.textContent = isOn ? "🔊 Sound: On" : "🔇 Sound: Off";
  soundBtn.classList.toggle("is-on", isOn);
}
setSoundUI(false);

soundBtn?.addEventListener("click", async (e) => {
  e.stopPropagation();
  if (!vid) return;

  vid.muted = false;
  vid.volume = 1;
  try {
    await vid.play();
  } catch {}
  setSoundUI(true);
});

// ===== INIT: Ẩn text lúc đầu =====
gsap.set(".introMain", { autoAlpha: 0 });

// ===== Anti-flicker guards =====
let outroStarted = false;
let fallbackTimer = null;
let holdTimer = null;

function clearTimers() {
  if (fallbackTimer) clearTimeout(fallbackTimer);
  if (holdTimer) clearTimeout(holdTimer);
  fallbackTimer = null;
  holdTimer = null;
}

// ===== OUTRO: hiện chữ chậm + GIỮ (không fade) =====
function startOutroOnce() {
  if (outroStarted) return;
  outroStarted = true;

  clearTimers();
  if (vid) vid.onended = null;

  const tl = gsap.timeline({ defaults: { ease: "power2.out" } });

  tl.to(".introMain", { autoAlpha: 1, duration: 0.7 })
    .from(".badge", { y: 16, autoAlpha: 0, duration: 1.1 }, "-=0.2")
    .from("#title .t1", { y: 26, autoAlpha: 0, duration: 1.9 }, "-=0.55")
    .from("#title .t2", { y: 26, autoAlpha: 0, duration: 2.0 }, "-=1.45")
    .from("#sub", { y: 14, autoAlpha: 0, duration: 1.2 }, "-=1.25")
    .to("#bar", { width: "100%", duration: 1.8 }, "-=1.1")
    .add(() => {
      // ✅ giữ chữ đứng yên, không fade
      holdTimer = setTimeout(goNext, HOLD_MS);
    });
}

// ===== FALLBACK theo duration =====
function armFallbackByDuration() {
  if (!vid) return;
  const dur = vid.duration;
  if (!Number.isFinite(dur) || dur <= 0) return;

  clearTimeout(fallbackTimer);
  fallbackTimer = setTimeout(() => startOutroOnce(), Math.ceil(dur * 1000));
}

// ===== VIDEO EVENTS =====
if (vid) {
  vid.loop = false;
  vid.muted = true; // autoplay ổn định
  vid.playsInline = true;

  // dùng onended để tránh dính nhiều listener
  vid.onended = () => startOutroOnce();

  vid.addEventListener("loadedmetadata", armFallbackByDuration);

  vid.addEventListener("error", () => {
    clearTimeout(fallbackTimer);
    setTimeout(() => startOutroOnce(), 1000);
  });

  vid.play().catch(() => {
    console.warn("Autoplay bị chặn. (Thường do có tiếng hoặc policy browser)");
  });
} else {
  setTimeout(() => startOutroOnce(), 1500);
}
