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

const PROMPTS = [
  "Cho thầy cô biết bạn là ai",
  "Nhập lời chúc mà bạn muốn gửi đến thầy cô giáo",
  "Thêm những tấm ảnh kỷ niệm",
  "Chọn con dấu và niêm phong lá thư"
];

/* ---------------------------------------------------------- */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const stage       = $("#stage");
const stepsEl     = $("#steps");
const promptEl    = $("#prompt");
const scene       = $("#scene");
const stack       = $("#sheetstack");
const pocket      = $("#pocket");
const flap        = $("#flap");
const seal        = $("#seal");
const sealWax     = $(".seal-wax");
const sealEmblem  = $(".seal-emblem");
const sealUse     = $("#sealUse");
const sealRipple  = $(".seal-ripple");
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
const stampInputs = $$('input[name="stamp"]');
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

/* ----------------------------------------------------------
   TRẠNG THÁI
   ---------------------------------------------------------- */
let step = 0;
let busy = false;
let sealed = false;
let lanternTween = null;

const photos = [];                       // { file, url }
const sheets = [];                       // { kind: 'text' | 'photos', el, ta? }
let cur = 0;                             // chỉ số tờ đang ở trên cùng
let lastFull = "";                       // lời chúc hợp lệ gần nhất
let lastCaret = 0;
const ROT = [-3, 2.5, -1.5, 3, -2.5, 1.5];

/* ==========================================================
   HIỆU ỨNG NỀN + CẢNH PHONG BÌ
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

/* Ba trạng thái của cảnh: peek (thiệp ló khỏi phong bì), open (thiệp rút hẳn ra), closed (thiệp nằm trong phong bì đã gập nắp) */
const SCENES = {
  peek:   { pocket: { yPercent: 0, opacity: 1 },   stack: { y: 0, scale: 1 },     flap: { opacity: 0, rotationX: 180 }, seal: 0 },
  open:   { pocket: { yPercent: 120, opacity: 0 }, stack: { y: 0, scale: 1 },     flap: { opacity: 0, rotationX: 180 }, seal: 0 },
  closed: { pocket: { yPercent: 0, opacity: 1 },   stack: { y: 200, scale: 0.52 }, flap: { opacity: 1, rotationX: 0 },   seal: 1 }
};
const sceneFor = (s) => (s === 0 ? "peek" : s === 3 ? "closed" : "open");
let sceneName = "peek";

function syncFlapZ() {
  flap.style.zIndex = gsap.getProperty(flap, "rotationX") < 90 ? 8 : 1;
}

function setScene(name, instant = false) {
  const prev = sceneName;
  sceneName = name;
  const S = SCENES[name];

  if (instant) {
    gsap.set(pocket, S.pocket);
    gsap.set(stack, S.stack);
    gsap.set(flap, S.flap);
    gsap.set(seal, { autoAlpha: S.seal });
    syncFlapZ();
    return Promise.resolve();
  }

  const tl = gsap.timeline({ defaults: { ease: "power3.inOut" } });
  if (name === "closed") {
    tl.to(pocket, { ...S.pocket, duration: T(0.6) }, 0)
      .to(stack, { ...S.stack, duration: T(0.75) }, 0)
      .set(flap, { opacity: 1, rotationX: 180 }, T(0.5))
      .to(flap, { rotationX: 0, duration: T(0.65), ease: "power2.inOut", onUpdate: syncFlapZ }, T(0.55))
      .to(seal, { autoAlpha: 1, duration: T(0.35) }, ">-0.05");
  } else if (prev === "closed") {
    tl.to(seal, { autoAlpha: 0, duration: T(0.2) }, 0)
      .to(flap, { rotationX: 180, duration: T(0.55), ease: "power2.inOut", onUpdate: syncFlapZ }, 0)
      .to(flap, { opacity: 0, duration: T(0.15) })
      .to(pocket, { ...S.pocket, duration: T(0.55) }, ">-0.1")
      .to(stack, { ...S.stack, duration: T(0.65) }, "<");
  } else {
    tl.to(pocket, { ...S.pocket, duration: T(0.7) }, 0)
      .to(stack, { ...S.stack, duration: T(0.7) }, 0);
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
    const d = i - j;
    return { x: -d * 16, y: d * 9, rotation: -d * 2.2, scale: 1 - d * 0.015, opacity: 1, zIndex: 20 - d };
  }
  return AHEAD;
}

/* Đưa tờ i lên trên cùng: tờ cũ "đút" ra phía sau, tờ mới nhảy vào */
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
  sheets.forEach((item, k) => {
    const no = $(".sheet-no", item.el);
    if (no) no.textContent = sheets.length > 1 ? `${k + 1} / ${sheets.length}` : "";
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
  let k = Math.max(lo, 1);
  if (k < text.length && !/\s/.test(text[k - 1]) && !/\s/.test(text[k])) {
    const start = text.slice(0, k).search(/\S+$/); // đầu của từ đang bị cắt đôi
    if (start > 0) k = start;
  } else {
    while (k < text.length && text[k] === " ") k++;
  }
  return k;
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
    const k = cutIndex(ta, rest);
    ta.value = rest.slice(0, k);
    rest = rest.slice(k);
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
   ĐỔI TRANG (câu dẫn, thanh bước, khu điều khiển)
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
  $$("li", stepsEl).forEach((li, k) => {
    li.classList.toggle("is-active", k === i);
    li.classList.toggle("is-done", k < i);
  });
  if (!instant) {
    gsap.fromTo($$("li", stepsEl)[i].querySelector(".dot"), { scale: 0.7 }, { scale: 1, duration: T(0.5), ease: "back.out(2.5)" });
  }
}

function showPanel(i, dir, instant = false) {
  panels.forEach((p, k) => {
    p.inert = k !== i;
    if (instant) {
      gsap.set(p, { autoAlpha: k === i ? 1 : 0, x: 0 });
    } else if (k === i) {
      gsap.fromTo(p, { autoAlpha: 0, x: 36 * dir }, { autoAlpha: 1, x: 0, duration: T(0.5), delay: T(0.15), ease: "power3.out" });
    } else if (gsap.getProperty(p, "autoAlpha") > 0) {
      gsap.to(p, { autoAlpha: 0, x: -36 * dir, duration: T(0.3), ease: "power2.in" });
    }
  });
}

function syncEditable() {
  [nameInput, classInput].forEach((el) => {
    el.readOnly = step !== 0;
    el.tabIndex = step !== 0 ? -1 : 0;
  });
  textSheets().forEach(({ ta }) => {
    ta.readOnly = step !== 1;
    ta.tabIndex = step !== 1 ? -1 : 0;
  });
}

function refreshButtons() {
  backBtn.hidden = step === 0;
  nextBtn.hidden = step === 3;
  $("span", nextBtn).textContent = step === 2 ? (photos.length ? "Hoàn tất" : "Bỏ qua") : "Tiếp tục";
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
  if (from === 0 && !anonToggle.checked && !nameInput.value.trim() && !classInput.value.trim()) {
    showError("Hãy nhập tên hoặc lớp của bạn (hoặc bật gửi ẩn danh).", nameInput);
    return false;
  }
  if (from === 1 && !getFull().trim()) {
    showError("Hãy viết vài dòng lời chúc trước khi sang bước tiếp theo nhé.", sheets[cur].ta);
    return false;
  }
  return true;
}

async function go(to) {
  if (busy || to === step || to < 0 || to > 3) return;
  if (to > step && !validate(step)) return;

  busy = true;
  hideError();
  const from = step;
  const dir = to > from ? 1 : -1;

  step = to;
  stage.dataset.step = String(to);
  syncEditable();
  updateStepsUI(to);
  refreshButtons();
  setPrompt(PROMPTS[to], dir);
  showPanel(to, dir);

  if (from === 3 && to === 2) { removePhotoSheet(); showSheet(cur); }
  else if (to === 0) showSheet(0);
  else if (to === 1) showSheet(Math.min(cur, textSheets().length - 1));

  await setScene(sceneFor(to));
  busy = false;

  if (to === 0) nameInput.focus({ preventScroll: true });
  else if (to === 1) focusEnd();
}

/* ==========================================================
   LỖI
   ========================================================== */
function showError(message, focusEl) {
  errorEl.textContent = message;
  errorEl.hidden = false;
  gsap.fromTo(errorEl, { opacity: 0, y: -6 }, { opacity: 1, y: 0, duration: T(0.3), clearProps: "all" });
  gsap.fromTo(scene, { x: -8 }, { x: 0, duration: T(0.5), ease: "elastic.out(1, 0.3)", clearProps: "x" });
  if (focusEl) focusEl.focus({ preventScroll: true });
}

function hideError() {
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

nameInput.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); classInput.focus(); } });
classInput.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); nextBtn.click(); } });

/* ==========================================================
   BƯỚC 2: CHUYỂN TỜ
   ========================================================== */
pagerPrev.addEventListener("click", () => { showSheet(cur - 1); focusEnd(); });
pagerNext.addEventListener("click", () => { showSheet(cur + 1); focusEnd(); });

/* ==========================================================
   BƯỚC 3: ẢNH
   ========================================================== */
function addThumb(p) {
  const li = document.createElement("li");
  li.className = "thumb";
  const img = document.createElement("img");
  img.src = p.url;
  img.alt = "Ảnh đã chọn";
  const x = document.createElement("button");
  x.type = "button";
  x.className = "thumb-x";
  x.setAttribute("aria-label", "Xoá ảnh");
  x.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  li.append(img, x);
  thumbs.appendChild(li);
  p.li = li;
  gsap.from(li, { scale: 0.6, opacity: 0, duration: T(0.35), ease: "back.out(2)" });

  x.addEventListener("click", () => {
    const idx = photos.indexOf(p);
    if (idx < 0) return;
    photos.splice(idx, 1);
    URL.revokeObjectURL(p.url);
    gsap.to(li, { scale: 0.6, opacity: 0, duration: T(0.2), onComplete: () => li.remove() });
    refreshButtons();
  });
}

function addFiles(list) {
  hideError();
  for (const f of list) {
    if (photos.length >= MAX_PHOTOS) { showError(`Chỉ thêm được tối đa ${MAX_PHOTOS} ảnh.`); break; }
    if (!/^image\/(png|jpe?g|webp)$/.test(f.type)) { showError("Ảnh phải là định dạng JPG, PNG hoặc WebP."); continue; }
    if (f.size > MAX_IMAGE_MB * 1024 * 1024) { showError(`Ảnh "${f.name}" quá lớn (tối đa ${MAX_IMAGE_MB}MB).`); continue; }
    const p = { file: f, url: URL.createObjectURL(f) };
    photos.push(p);
    addThumb(p);
  }
  imageInput.value = "";
  refreshButtons();
}

imageInput.addEventListener("change", () => addFiles([...imageInput.files]));

["dragenter", "dragover"].forEach((ev) =>
  dropBox.addEventListener(ev, (e) => { e.preventDefault(); dropBox.classList.add("is-over"); }));
["dragleave", "drop"].forEach((ev) =>
  dropBox.addEventListener(ev, (e) => { e.preventDefault(); dropBox.classList.remove("is-over"); }));
dropBox.addEventListener("drop", (e) => addFiles([...e.dataTransfer.files]));

function makePhotoSheet() {
  const el = document.createElement("article");
  el.className = "sheet sheet-photos";
  el.innerHTML =
    '<h3 class="photos-title">Kỷ niệm của chúng ta</h3>' +
    `<div class="polaroids" data-n="${photos.length}"></div>` +
    '<span class="sheet-no"></span>';
  const wrap = $(".polaroids", el);
  photos.forEach((p, i) => {
    const fig = document.createElement("figure");
    fig.className = "polaroid";
    const img = document.createElement("img");
    img.src = p.url;
    img.alt = "";
    fig.appendChild(img);
    wrap.appendChild(fig);
    gsap.set(fig, { rotation: ROT[i % ROT.length], opacity: 0, scale: 1.1 });
  });
  stack.appendChild(el);
  gsap.set(el, AHEAD);
  el.inert = true;
  return { kind: "photos", el };
}

function removePhotoSheet() {
  const idx = sheets.findIndex((s) => s.kind === "photos");
  if (idx < 0) return;
  const [item] = sheets.splice(idx, 1);
  gsap.to(item.el, { opacity: 0, y: 60, duration: T(0.3), onComplete: () => item.el.remove() });
  cur = Math.min(cur, sheets.length - 1);
}

/* Bấm Hoàn tất: tờ ảnh nhảy vào, từng ảnh lần lượt bay từ khung chọn vào thiệp */
async function placePhotos() {
  removePhotoSheet();
  if (!photos.length) return;

  const item = makePhotoSheet();
  sheets.push(item);
  await showSheet(sheets.length - 1);

  const thumbEls = $$(".thumb", thumbs);
  const slots = $$(".polaroid", item.el);
  const GAP = T(0.25);
  const FLY = T(0.55);
  const tl = gsap.timeline();

  slots.forEach((slot, i) => {
    const src = thumbEls[i] && $("img", thumbEls[i]);
    const dst = $("img", slot);
    if (!src || !dst) {
      gsap.set(slot, { opacity: 1, scale: 1 });
      return;
    }

    const srcRect = src.getBoundingClientRect();
    const dstRect = dst.getBoundingClientRect();
    const dx = srcRect.left + srcRect.width / 2 - (dstRect.left + dstRect.width / 2);
    const dy = srcRect.top + srcRect.height / 2 - (dstRect.top + dstRect.height / 2);
    const scale = srcRect.width / Math.max(1, dstRect.width);

    tl.fromTo(
      slot,
      { x: dx, y: dy, scale, opacity: 1 },
      { x: 0, y: 0, scale: 1, opacity: 1, duration: FLY, ease: "back.out(1.4)" },
      i * GAP
    );
  });

  return play(tl);
}

/* ==========================================================
   UPLOAD ẢNH & LƯU FIREBASE
   ========================================================== */
async function uploadAllImages(photoArray) {
  if (!photoArray || photoArray.length === 0) return "";
  const uploadPromises = photoArray.map(async (p) => {
    const formData = new FormData();
    formData.append("file", p.file);
    formData.append("upload_preset", cloudinaryConfig.uploadPreset);
    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/image/upload`, {
      method: "POST",
      body: formData
    });
    if (!res.ok) throw new Error("Upload ảnh thất bại");
    const data = await res.json();
    return data.secure_url;
  });
  const urls = await Promise.all(uploadPromises);
  return urls.filter(Boolean).join(",");
}

export async function saveWishToDatabase() {
  const isAnon = anonToggle.checked;
  const nameVal = nameInput.value.trim();
  const classVal = classInput.value.trim();

  let senderStr = "Ẩn danh";
  if (!isAnon) {
    if (nameVal && classVal) senderStr = `${nameVal} (${classVal})`;
    else if (nameVal) senderStr = nameVal;
    else if (classVal) senderStr = `Tập thể lớp ${classVal}`;
    else senderStr = "Học sinh giấu tên";
  }

  const messageStr = getFull().trim();
  const imageUrls = await uploadAllImages(photos);

  const newWishRef = push(ref(db, "wishes"));
  await set(newWishRef, {
    id: newWishRef.key,
    sender: senderStr,
    isAnonymous: isAnon,
    message: messageStr,
    imageUrl: imageUrls,
    timestamp: Date.now()
  });

  return newWishRef.key;
}

/* ==========================================================
   ĐIỀU HƯỚNG BƯỚC & NIÊM PHONG DẤU SÁP (BƯỚC 4)
   ========================================================== */
backBtn.addEventListener("click", () => go(step - 1));

nextBtn.addEventListener("click", async () => {
  if (busy) return;
  if (step === 2 && photos.length > 0) {
    busy = true;
    await placePhotos();
    busy = false;
  }
  await go(step + 1);
});

stampInputs.forEach((inp) => {
  inp.addEventListener("change", () => {
    if (!inp.checked) return;
    seal.dataset.wax = inp.value;
    sealUse.setAttribute("href", `#stamp-${inp.value}`);
  });
});

let holdTween = null;

function startHold(e) {
  if (sealed || busy || step !== 3) return;
  if (e.type === "mousedown" && e.button !== 0) return;
  e.preventDefault();

  hideError();
  if (holdTween) holdTween.kill();

  holdTitle.textContent = "Đang nhỏ sáp…";
  holdHint.textContent = "Giữ nguyên tay nhé";

  holdTween = gsap.fromTo(
    holdFill,
    { scaleX: 0 },
    {
      scaleX: 1,
      duration: T(HOLD_SECONDS),
      ease: "none",
      onComplete: completeSeal
    }
  );
}

function cancelHold() {
  if (sealed || !holdTween) return;
  holdTween.kill();
  holdTween = null;
  gsap.to(holdFill, { scaleX: 0, duration: T(0.25), ease: "power2.out" });
  holdTitle.textContent = "Đóng nến sáp";
  holdHint.textContent = "Nhấn giữ 1,5 giây";
}

async function completeSeal() {
  sealed = true;
  busy = true;
  holdTween = null;
  holdBtn.disabled = true;
  backBtn.hidden = true;

  if (navigator.vibrate) navigator.vibrate(60);

  // Hiệu ứng đóng dấu sáp lên phong bì
  const tl = gsap.timeline();
  tl.fromTo(sealWax, { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: T(0.4), ease: "back.out(2)" })
    .fromTo(sealEmblem, { scale: 1.6, opacity: 0 }, { scale: 1, opacity: 1, duration: T(0.35), ease: "power3.out" }, "-=0.15")
    .fromTo(sealRipple, { scale: 0.8, opacity: 0.9 }, { scale: 1.65, opacity: 0, duration: T(0.6), ease: "power2.out" }, "<");
  await play(tl);

  holdTitle.textContent = "Đang thả đèn lên trời…";
  holdHint.textContent = "Vui lòng đợi giây lát";

  try {
    await saveWishToDatabase();
    holdTitle.textContent = "Đã gửi thành công!";
    holdHint.textContent = "Cảm ơn bạn";

    modal.hidden = false;
    gsap.fromTo(modalCard, { scale: 0.85, opacity: 0 }, { scale: 1, opacity: 1, duration: T(0.45), ease: "back.out(1.6)" });
    if (!reduceMotion && lantern) {
      lanternTween = gsap.to(lantern, { y: -10, duration: 1.8, repeat: -1, yoyo: true, ease: "sine.inOut" });
    }
  } catch (err) {
    console.error("[send.js] Lỗi gửi thư:", err);
    sealed = false;
    holdBtn.disabled = false;
    backBtn.hidden = false;
    gsap.set(holdFill, { scaleX: 0 });
    holdTitle.textContent = "Đóng nến sáp";
    holdHint.textContent = "Nhấn giữ 1,5 giây";
    showError("Không gửi được thư. Vui lòng kiểm tra mạng hoặc cấu hình Firebase/Cloudinary!");
  } finally {
    busy = false;
  }
}

holdBtn.addEventListener("pointerdown", startHold);
window.addEventListener("pointerup", cancelHold);
window.addEventListener("pointercancel", cancelHold);
holdBtn.addEventListener("contextmenu", (e) => e.preventDefault());

if (writeAgain) {
  writeAgain.addEventListener("click", () => window.location.reload());
}

/* ==========================================================
   KHỞI TẠO BAN ĐẦU
   ========================================================== */
function init() {
  const firstItem = { kind: "text", el: firstSheet, ta: firstTa };
  sheets.push(firstItem);
  bindTextarea(firstItem);

  floatBlobs();
  setScene("peek", true);
  showSheet(0, true);
  syncEditable();
  refreshButtons();
}

init();