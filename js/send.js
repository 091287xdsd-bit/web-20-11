/* ==========================================================
   send.js – Trang gửi thư (Cặp 2) · 4 bước
   1) Tên + lớp   2) Lời chúc (ghi thẳng lên thiệp, hết dòng sang tờ mới)
   3) Ảnh kỷ niệm (bấm Hoàn tất → ảnh bay vào thiệp)
   4) Chọn con dấu, GIỮ 1,5 giây để đóng nến sáp
   Toàn bộ chuyển động dùng GSAP; CSS chỉ định hình.
   ========================================================== */

import { gsap } from "https://cdn.jsdelivr.net/npm/gsap@3.12.5/+esm";
/* ----------------------------------------------------------
   KẾT NỐI FIREBASE & CLOUDINARY
   ---------------------------------------------------------- */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, push, set } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { firebaseConfig, cloudinaryConfig } from "./config.js";

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const MAX_IMAGE_MB = 5;
const MAX_PHOTOS = 6;
const MAX_TEXT_SHEETS = 3;
const HOLD_SECONDS = 1.5;
const LAST_STEP = 2;

const PROMPTS = [
  "Nhập lời chúc mà bạn muốn gửi đến thầy cô giáo",
  "Thêm những tấm ảnh kỷ niệm",
  "Niêm phong lá thư bằng con dấu"
];

/* Kích thước thiết kế của lá thư + bao bì (đơn vị px thiết kế, được co lại cho vừa màn hình) */
const DESIGNS = {
  wide:   { cardW: 720, cardH: 410, envW: 520, envH: 250, envX: 100, envY: 150, rowsFirst: 9, rowsCont: 10 },
  narrow: { cardW: 420, cardH: 400, envW: 340, envH: 210, envX: 40,  envY: 180, rowsFirst: 9, rowsCont: 10 }
};
const mqNarrow = window.matchMedia("(max-width: 640px)"); // khớp với @media trong css/send.css

/* ---------------------------------------------------------- */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const stage       = $("#stage");
const stepsEl     = $("#steps");
const stepsFill   = $("#stepsFill");
const promptEl    = $("#prompt");
const sceneSlot   = $("#sceneSlot");
const sceneFit    = $("#sceneFit");
const sceneScale  = $("#sceneScale");
const scene       = $("#scene");
const stack       = $("#sheetstack");
const envBack     = $("#envBack");
const pocket      = $("#pocket");
const flap        = $("#flap");
const seal        = $("#seal");
const sealImg     = $("#sealImg");
const sealRipple  = $("#sealRipple");
const panels      = $$(".panel");
const panelsWrap  = $("#panels");
const actionsEl   = $("#actions");
const errorEl     = $("#formError");
const backBtn     = $("#backBtn");
const nextBtn     = $("#nextBtn");
const firstSheet  = $("#sheetFirst");
const firstTa     = $("#messageFirst");
const nameInput   = $("#senderName");
const classInput  = $("#senderClass");
const anonToggle  = $("#anonToggle");
const anonText    = $(".anon-text");
const pagerPrev   = $("#pagerPrev");
const pagerNext   = $("#pagerNext");
const pagerLabel  = $("#pagerLabel");
const imageInput  = $("#imageInput");
const dropBox     = $("#dropBox");
const thumbs      = $("#thumbs");
const photoCount  = $("#photoCount");
const holdBtn     = $("#holdBtn");
const holdFill    = $("#holdFill");
const holdTitle   = $("#holdTitle");
const holdHint    = $("#holdHint");
const modal       = $("#successModal");
const modalCard   = $(".success-card");
const lantern     = $(".success-lantern");
const writeAgain  = $("#writeAgain");

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const T = (s) => (reduceMotion ? 0.01 : s);

/* Chờ timeline GSAP xong (không await trực tiếp vì timeline là "thenable") */
const play = (tl) =>
  tl.duration() === 0
    ? Promise.resolve()
    : new Promise((resolve) => tl.eventCallback("onComplete", resolve));
const wait = (s) => new Promise((r) => setTimeout(r, s * 1000));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const renderIcons = () => { if (window.lucide && window.lucide.createIcons) window.lucide.createIcons(); };

/* ----------------------------------------------------------
   TRẠNG THÁI
   ---------------------------------------------------------- */
let D = mqNarrow.matches ? DESIGNS.narrow : DESIGNS.wide;
let k = 1;                               // hệ số co của cả khung thư
let step = 0;
let busy = false;
let sealed = false;
let sceneName = "letter";                // "letter" (chưa có bao bì) | "closed" (thư đã nằm trong bao bì)
let lanternTween = null;
let errTimer = null;

const photos = [];                       // { file, url, li }
const sheets = [];                       // { kind: 'text' | 'photos', el, ta? }
let cur = 0;                             // chỉ số tờ đang nằm trên cùng
let lastFull = "";                       // lời chúc hợp lệ gần nhất
let lastCaret = 0;
const ROT = [-3, 2.5, -1.5, 3, -2.5, 1.5];

/* ==========================================================
   CO KHUNG THƯ CHO VỪA 1 MÀN HÌNH
   ========================================================== */
function applyDesign() {
  D = mqNarrow.matches ? DESIGNS.narrow : DESIGNS.wide;
  const s = scene.style;
  s.setProperty("--card-w", D.cardW + "px");
  s.setProperty("--card-h", D.cardH + "px");
  s.setProperty("--env-x", D.envX + "px");
  s.setProperty("--env-y", D.envY + "px");
  s.setProperty("--env-w", D.envW + "px");
  s.setProperty("--env-h", D.envH + "px");
  s.setProperty("--rows-first", String(D.rowsFirst));
  s.setProperty("--rows-cont", String(D.rowsCont));
  sceneScale.style.width = D.cardW + "px";
  sceneScale.style.height = D.cardH + "px";
  fitScene();
}

function fitScene() {
  const w = sceneSlot.clientWidth;
  const h = sceneSlot.clientHeight - 16;   // trừ phần chừa phía trên (khớp .scene-fit trong CSS)
  k = Math.max(0.35, Math.min(1, w / D.cardW, (h - 4) / D.cardH));
  sceneFit.style.width = D.cardW * k + "px";
  sceneFit.style.height = D.cardH * k + "px";
  sceneScale.style.transform = `scale(${k})`;
}

/* ==========================================================
   HIỆU ỨNG NỀN
   ========================================================== */
function floatBlobs() {
  if (reduceMotion) return;
  $$(".blob").forEach((b) => {
    gsap.to(b, {
      x: gsap.utils.random(-40, 40),
      y: gsap.utils.random(-30, 30),
      duration: gsap.utils.random(6, 10),
      ease: "sine.inOut",
      repeat: -1,
      yoyo: true
    });
  });
}

/* ==========================================================
   CẢNH: THƯ  ⇄  THƯ TRONG BAO BÌ
   - Mới vào: chỉ có lá thư, CHƯA có bao bì.
   - Sang bước đóng dấu: bao bì hiện ra (nắp mở) → thư thu nhỏ rồi chui vào
     → nắp đóng lại → hiện chỗ đóng dấu.
   Thư luôn nằm SAU mặt trước bao bì nên không bao giờ "lòi" ra ngoài.
   ========================================================== */
const letterScale = () => Math.min((D.envW - 40) / D.cardW, (D.envH - 26) / D.cardH);
const letterInsideY = () => D.envY + 14;
// sau khi đóng nắp, nâng cả bao bì lên giữa khung cho cân đối (chỉ dịch cả khối, không đụng tới thư)
const closedShiftY = () => -(D.envY + D.envH / 2 - D.cardH / 2) * k;

function syncFlapZ() {
  // nắp mở (ra sau) thì nằm dưới thư; nắp đóng thì nằm đè lên thư
  flap.style.zIndex = gsap.getProperty(flap, "rotationX") < 90 ? 8 : 2;
}

function setScene(name, instant = false) {
  const prev = sceneName;
  sceneName = name;
  const body = [envBack, pocket];

  if (instant) {
    if (name === "closed") {
      gsap.set(stack, { scale: letterScale(), y: letterInsideY(), autoAlpha: 0 }); // thư đã kín trong bao bì: ẩn hẳn để không ló viền/bóng ra ngoài
      gsap.set(body, { autoAlpha: 1, y: 0 });
      gsap.set(flap, { autoAlpha: 1, rotationX: 0, y: 0 });
      gsap.set(seal, { autoAlpha: 1 });
      gsap.set(sceneFit, { y: closedShiftY() });
    } else {
      gsap.set(sceneFit, { y: 0 });
      gsap.set(stack, { scale: 1, y: 0, autoAlpha: 1 });
      gsap.set([...body, flap, seal], { autoAlpha: 0 });
      gsap.set(flap, { rotationX: 180 });
    }
    syncFlapZ();
    return Promise.resolve();
  }

  if (name === prev) return Promise.resolve();

  const tl = gsap.timeline();

  if (name === "closed") {
    gsap.set(flap, { rotationX: 180, y: 0 });
    syncFlapZ();
    // gom các tờ lại cho gọn trước khi bỏ vào bao bì
    sheets.forEach((s, j) => {
      if (j !== cur) tl.to(s.el, { x: 0, y: 0, rotation: 0, scale: 1, duration: T(0.4), ease: "power2.out" }, 0);
    });
    tl.fromTo([envBack, pocket, flap], { autoAlpha: 0, y: 40 },
        { autoAlpha: 1, y: 0, duration: T(0.55), ease: "power2.out" }, T(0.1))                       // 1) bao bì hiện ra, nắp đang mở
      .to(stack, { scale: letterScale(), duration: T(0.65), ease: "power3.inOut" }, 0)              // 2) thư thu nhỏ
      .to(stack, { y: letterInsideY(), duration: T(0.85), ease: "power2.inOut" }, T(0.75))          // 3) thư chui vào bao bì
      .to(flap, { rotationX: 0, duration: T(0.7), ease: "power2.inOut", onUpdate: syncFlapZ }, T(1.7)) // 4) nắp đóng lại
      .set(stack, { autoAlpha: 0 }, T(2.4))                                                          //    thư đã nằm kín bên trong → ẩn hẳn (không còn gì ló ra ngoài)
      .to(sceneFit, { y: closedShiftY(), duration: T(0.6), ease: "power2.inOut" }, T(2.4))           // 5) nâng bao bì lên giữa khung
      .to(seal, { autoAlpha: 1, duration: T(0.4) }, T(2.6));                                         // 6) hiện chỗ đóng dấu
  } else {
    tl.to(seal, { autoAlpha: 0, duration: T(0.25) }, 0)
      .to(sceneFit, { y: 0, duration: T(0.5), ease: "power2.inOut" }, 0)
      .set(stack, { autoAlpha: 1 }, T(0.5))                                                          // thư hiện lại ngay khi nắp bắt đầu mở
      .to(flap, { rotationX: 180, duration: T(0.6), ease: "power2.inOut", onUpdate: syncFlapZ }, T(0.5))
      .to(stack, { y: 0, duration: T(0.8), ease: "power2.inOut" }, T(1.1))
      .to(stack, { scale: 1, duration: T(0.6), ease: "power3.inOut" }, T(1.8))
      .to([envBack, pocket, flap], { autoAlpha: 0, y: 40, duration: T(0.5), ease: "power2.in" }, T(1.8));
  }
  return play(tl);
}

/* ==========================================================
   CÁC TỜ THIỆP
   ========================================================== */
const AHEAD = { x: 0, y: 90, rotation: 4, scale: 0.96, opacity: 0, zIndex: 0 };

function stateFor(j, i) {
  if (j === i) return { x: 0, y: 0, rotation: 0, scale: 1, opacity: 1, zIndex: 20 };
  if (j < i) {
    const d = i - j; // tờ cũ "đút" ra phía sau, nhô nhẹ lên trên-trái (không đè xuống khu điều khiển)
    return { x: -d * 12, y: -d * 6, rotation: -d * 1.4, scale: 1 - d * 0.012, opacity: 1, zIndex: 20 - d };
  }
  return AHEAD;
}

/* Đưa tờ i lên trên cùng: tờ cũ đút ra sau, tờ mới nhảy vào */
function showSheet(i, instant = false) {
  cur = i;
  const tl = gsap.timeline();
  sheets.forEach((item, j) => {
    item.el.inert = j !== i;
    const st = stateFor(j, i);
    if (instant) {
      gsap.set(item.el, st);
    } else {
      const entering = j === i;
      tl.to(item.el, {
        ...st,
        duration: T(entering ? 0.8 : 0.55),
        ease: entering ? "back.out(1.4)" : "power3.inOut"
      }, 0);
    }
  });
  refreshPager();
  return instant ? Promise.resolve() : play(tl);
}

const textSheets = () => sheets.filter((s) => s.kind === "text");

function refreshPager() {
  const total = textSheets().length;
  pagerLabel.textContent = `Tờ ${Math.min(cur + 1, total)}/${total}`;
  pagerPrev.disabled = cur <= 0;
  pagerNext.disabled = cur >= total - 1;
  sheets.forEach((item, idx) => {
    const no = $(".sheet-no", item.el);
    if (no) no.textContent = sheets.length > 1 ? `${idx + 1} / ${sheets.length}` : "";
  });
}

function makeTextSheet() {
  const el = document.createElement("article");
  el.className = "sheet sheet-cont";
  el.innerHTML =
    '<textarea class="ta" spellcheck="false" aria-label="Lời chúc (tờ tiếp theo)"></textarea>' +
    '<span class="sheet-no"></span>';
  stack.appendChild(el);
  gsap.set(el, AHEAD);
  el.inert = true;
  const item = { kind: "text", el, ta: $(".ta", el) };
  item.ta.readOnly = step !== 0;
  sheets.splice(textSheets().length, 0, item);
  bindTextarea(item);
  return item;
}

function ensureTextSheet(i) {
  while (textSheets().length <= i) makeTextSheet();
  return textSheets()[i];
}

function trimTextSheets(count) {
  const extra = textSheets().slice(count);
  extra.forEach((item) => {
    sheets.splice(sheets.indexOf(item), 1);
    gsap.to(item.el, { opacity: 0, y: 60, duration: T(0.3), onComplete: () => item.el.remove() });
  });
  if (extra.length) {
    cur = Math.min(cur, sheets.length - 1);
    refreshPager();
  }
}

/* ----- Chia lời chúc thành các tờ khi hết dòng ----- */
const fits = (ta) => ta.scrollHeight <= ta.clientHeight + 1;

function cutIndex(ta, text) {
  let lo = 0;
  let hi = text.length;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    ta.value = text.slice(0, mid);
    if (fits(ta)) lo = mid; else hi = mid - 1;
  }
  let cut = Math.max(lo, 1);
  if (cut < text.length && !/\s/.test(text[cut - 1]) && !/\s/.test(text[cut])) {
    const start = text.slice(0, cut).search(/\S+$/); // đầu của từ đang bị cắt đôi
    if (start > 0) cut = start;
  } else {
    while (cut < text.length && text[cut] === " ") cut++;
  }
  return cut;
}

/* Trả về false nếu vượt quá số tờ cho phép */
function layoutText(full) {
  let rest = full;
  let i = 0;
  for (;;) {
    if (i >= MAX_TEXT_SHEETS) return false;
    const { ta } = ensureTextSheet(i);
    if (ta.value !== rest) ta.value = rest;
    if (fits(ta)) break;
    const cut = cutIndex(ta, rest);
    ta.value = rest.slice(0, cut);
    rest = rest.slice(cut);
    i++;
  }
  trimTextSheets(i + 1);
  return true;
}

const getFull = () => textSheets().map((s) => s.ta.value).join("");

function offsetOf(i, pos) {
  let acc = 0;
  textSheets().slice(0, i).forEach((s) => (acc += s.ta.value.length));
  return acc + pos;
}

function applyCaret(g) {
  const list = textSheets();
  let acc = 0;
  for (let j = 0; j < list.length; j++) {
    const len = list[j].ta.value.length;
    if (g < acc + len || j === list.length - 1) {
      focusAt(j, Math.max(0, Math.min(g - acc, len)));
      return;
    }
    acc += len;
  }
}

function focusAt(j, pos) {
  if (j !== cur) showSheet(j);
  const ta = textSheets()[j].ta;
  ta.focus({ preventScroll: true });
  ta.setSelectionRange(pos, pos);
}

function commitText(full, caret) {
  if (!layoutText(full)) {
    layoutText(lastFull);
    applyCaret(lastCaret);
    showError("Đã hết giấy rồi, bạn hãy rút gọn lời chúc một chút nhé.");
    return;
  }
  lastFull = full;
  lastCaret = caret;
  applyCaret(caret);
  refreshPager();
}

function bindTextarea(item) {
  const { ta } = item;

  const onType = () => {
    const i = sheets.indexOf(item);
    commitText(getFull(), offsetOf(i, ta.selectionStart));
  };

  ta.addEventListener("input", (e) => { if (!e.isComposing) onType(); });
  ta.addEventListener("compositionend", onType); // gõ Telex/VNI bằng bộ gõ của trình duyệt

  ta.addEventListener("keydown", (e) => {
    if (e.key !== "Backspace" || ta.selectionStart !== 0 || ta.selectionEnd !== 0) return;
    const i = sheets.indexOf(item);
    if (i <= 0) return;
    e.preventDefault();
    const g = offsetOf(i, 0);
    const full = getFull();
    commitText(full.slice(0, g - 1) + full.slice(g), g - 1);
  });
}

/* ==========================================================
   ĐỔI TRANG (câu dẫn, thanh tiến độ, khu điều khiển)
   ========================================================== */
function setPrompt(text, dir, instant = false) {
  if (instant) { promptEl.textContent = text; return; }
  gsap.to(promptEl, {
    y: -14 * dir, opacity: 0, duration: T(0.2), ease: "power2.in",
    onComplete: () => {
      promptEl.textContent = text;
      gsap.fromTo(promptEl, { y: 16 * dir, opacity: 0 }, { y: 0, opacity: 1, duration: T(0.4), ease: "power3.out" });
    }
  });
}

function updateStepsUI(i, instant = false) {
  const items = $$("li", stepsEl);
  items.forEach((li, idx) => {
    li.classList.toggle("is-active", idx === i);
    li.classList.toggle("is-done", idx < i);
  });
  const progress = i / LAST_STEP;
  if (instant) {
    gsap.set(stepsFill, { scaleX: progress });
  } else {
    gsap.to(stepsFill, { scaleX: progress, duration: T(0.6), ease: "power2.inOut" });
    gsap.fromTo($(".dot", items[i]), { scale: 0.7 }, { scale: 1, duration: T(0.5), ease: "back.out(2.5)" });
  }
}

function showPanel(i, dir, instant = false) {
  panels.forEach((p, idx) => {
    p.inert = idx !== i;
    if (instant) {
      gsap.set(p, { autoAlpha: idx === i ? 1 : 0, x: 0 });
    } else if (idx === i) {
      gsap.fromTo(p, { autoAlpha: 0, x: 36 * dir }, { autoAlpha: 1, x: 0, duration: T(0.5), delay: T(0.15), ease: "power3.out" });
    } else if (gsap.getProperty(p, "autoAlpha") > 0) {
      gsap.to(p, { autoAlpha: 0, x: -36 * dir, duration: T(0.3), ease: "power2.in" });
    }
  });
}

function syncEditable() {
  const editable = step === 0;
  [nameInput, classInput].forEach((el) => {
    el.readOnly = !editable;
    el.tabIndex = editable ? 0 : -1;
  });
  textSheets().forEach(({ ta }) => {
    ta.readOnly = !editable;
    ta.tabIndex = editable ? 0 : -1;
  });
}

function refreshButtons() {
  backBtn.hidden = step === 0;
  nextBtn.hidden = step === LAST_STEP;
  $("span", nextBtn).textContent = step === 1 ? (photos.length ? "Hoàn tất" : "Bỏ qua") : "Tiếp tục";
  photoCount.textContent = `${photos.length}/${MAX_PHOTOS}`;
}

function focusEnd() {
  const item = sheets[cur];
  if (!item || item.kind !== "text") return;
  item.ta.focus({ preventScroll: true });
  const n = item.ta.value.length;
  item.ta.setSelectionRange(n, n);
}

function validate(from) {
  if (from === 0) {
    if (!anonToggle.checked && !nameInput.value.trim() && !classInput.value.trim()) {
      if (cur !== 0) showSheet(0);
      showError("Hãy nhập tên hoặc lớp của bạn (hoặc bật gửi ẩn danh).", nameInput);
      return false;
    }
    if (!getFull().trim()) {
      showError("Hãy viết vài dòng lời chúc trước khi sang bước tiếp theo nhé.", sheets[cur].ta);
      return false;
    }
  }
  return true;
}

async function go(to) {
  if (busy || to === step || to < 0 || to > LAST_STEP) return;
  if (to > step && !validate(step)) return;

  busy = true;
  hideError();
  const from = step;
  const dir = to > from ? 1 : -1;

  try {
    step = to;
    stage.dataset.step = String(to);
    syncEditable();
    updateStepsUI(to);
    refreshButtons();
    setPrompt(PROMPTS[to], dir);
    showPanel(to, dir);

    if (from === 2) { removePhotoSheet(); showSheet(cur); } // rời bước đóng dấu: tờ ảnh sẽ được đặt lại khi bấm Hoàn tất

    await setScene(to === 2 ? "closed" : "letter");
  } finally {
    busy = false;
  }

  if (to === 0 && from > 0) focusEnd();
}

/* ==========================================================
   THÔNG BÁO LỖI (nổi lên, tự tắt)
   ========================================================== */
function showError(message, focusEl) {
  errorEl.textContent = message;
  errorEl.hidden = false;
  gsap.fromTo(errorEl, { opacity: 0, y: -8 }, { opacity: 1, y: 0, duration: T(0.3), clearProps: "all" });
  gsap.fromTo(scene, { x: -8 }, { x: 0, duration: T(0.5), ease: "elastic.out(1, 0.3)", clearProps: "x" });
  if (focusEl) focusEl.focus({ preventScroll: true });
  clearTimeout(errTimer);
  errTimer = setTimeout(hideError, 4500);
}

function hideError() {
  clearTimeout(errTimer);
  errorEl.hidden = true;
  errorEl.textContent = "";
}

/* ==========================================================
   BƯỚC 1: TÊN, LỚP, ẨN DANH
   ========================================================== */
anonToggle.addEventListener("change", () => {
  firstSheet.classList.toggle("is-anon", anonToggle.checked);
  if (anonToggle.checked) {
    gsap.fromTo(anonText, { opacity: 0, x: -10 }, { opacity: 1, x: 0, duration: T(0.35), ease: "power2.out" });
  } else {
    gsap.fromTo($(".line1", firstSheet), { opacity: 0.2 }, { opacity: 1, duration: T(0.35) });
  }
});

nam
