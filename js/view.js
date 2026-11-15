/* ==========================================================================
   view.js - TRANG XEM THƯ "ĐÊM THẢ ĐÈN TRỜI"
   Cặp 3 (Member 4 + Member 5) | Nhánh: feature/view

   Cấu trúc file (mỗi khối có đánh dấu để 2 bạn dễ gộp code, tránh conflict):
     [0] Cấu hình Firebase + dữ liệu mẫu
     [1] Tiện ích
     [2] ★ MEMBER 5 ★  NightSky  - sao đêm, sao băng, ĐOM ĐÓM (canvas)
     [3] LanternField            - đèn trời bay lên chậm
     [4] Đọc thư                 - phong thư mở + lá thư + Thắp Sáng + Toàn cảnh
     [5] Dữ liệu Firebase        - đọc node "wishes" (đúng 6 trường theo rule)
     [6] Khởi động
   ========================================================================== */

/* ==========================================================================
   [0] CẤU HÌNH
   ========================================================================== */

// Config Firebase lấy từ js/config.js (dùng chung với send.js, đúng theo lệnh-git.txt):
//   import { firebaseConfig } from "./config.js";
// Dùng import() động để nếu config.js thiếu/lỗi thì giao diện vẫn chạy bằng DỮ LIỆU MẪU.
const FIREBASE_SDK_VERSION = "10.8.0";   // cùng phiên bản với code mẫu send.js / view.js trong lệnh-git.txt
const WISHES_NODE = "wishes";
// Lượt Thắp Sáng lưu ở node RIÊNG "lights/{id} = số" -> node "wishes" vẫn giữ đúng 6 trường theo rule
const LIGHTS_NODE = "lights";
const LIKED_KEY = "dtdt-liked-v1";      // localStorage: các thư máy này đã thắp sáng (mỗi máy 1 lượt / thư)
const TOP_N = 3;                         // số đèn "Top" có quầng sáng đặc biệt

// Dữ liệu mẫu - đúng 6 trường theo rule.txt. Dùng khi chưa có config hoặc mở ?demo=1
const DEMO_WISHES = [
  { id: "demo-1", sender: "Lớp 12A1", isAnonymous: false, imageUrl: "", timestamp: 1763100000000,
    message: "Chúng em kính chúc Thầy Cô luôn mạnh khỏe, hạnh phúc và tràn đầy niềm vui.\nCảm ơn Thầy Cô đã kiên nhẫn dìu dắt chúng em suốt những năm tháng qua. Mỗi bài giảng của Thầy Cô là một hành trang quý giá." },
  { id: "demo-2", sender: "", isAnonymous: true, imageUrl: "", timestamp: 1763100100000,
    message: "Em cảm ơn cô đã không bỏ rơi em những lúc em chán nản nhất. Chúc cô 20/11 thật nhiều hoa và nụ cười ạ!" },
  { id: "demo-3", sender: "Nguyễn Minh Anh", isAnonymous: false, imageUrl: "", timestamp: 1763100200000,
    message: "Tri ân thầy - người đã thắp lên trong em ngọn lửa đam mê với môn Toán." },
  { id: "demo-4", sender: "Tập thể lớp 11B3", isAnonymous: false, imageUrl: "", timestamp: 1763100300000,
    message: "Một nhành hoa, một lời chúc, một tấm lòng. Chúc quý Thầy Cô ngày Nhà giáo Việt Nam thật ý nghĩa và ấm áp!" },
  { id: "demo-5", sender: "Trần Bảo Ngọc", isAnonymous: false, imageUrl: "", timestamp: 1763100400000,
    message: "Cô ơi, em nhớ giờ Văn của cô lắm. Chúc cô luôn trẻ trung và yêu nghề mãi mãi." },
  { id: "demo-6", sender: "", isAnonymous: true, imageUrl: "", timestamp: 1763100500000,
    message: "Cảm ơn thầy vì bài học làm người mà không có trong sách giáo khoa." },
  { id: "demo-7", sender: "CLB Robotics", isAnonymous: false, imageUrl: "", timestamp: 1763100600000,
    message: "Chúc các Thầy Cô một mùa 20/11 tràn ngập yêu thương. Cảm ơn Thầy Cô đã luôn đồng hành cùng CLB chúng em!" },
  { id: "demo-8", sender: "Lê Hoàng Nam", isAnonymous: false, imageUrl: "", timestamp: 1763100700000,
    message: "Con đò đưa khách sang sông, thầy cô là người lái đò thầm lặng. Em biết ơn thầy cô rất nhiều." }
];

/* ==========================================================================
   [1] TIỆN ÍCH
   ========================================================================== */
const $ = (sel, root = document) => root.querySelector(sel);
const hasGSAP = typeof window.gsap !== "undefined";
const reducedMotion = window.matchMedia
  ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
  : false;

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const rand = (min, max) => min + Math.random() * (max - min);
const isMobile = () => window.innerWidth < 640;

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Nội hoà góc theo đường ngắn nhất
function lerpAngle(a, b, t) {
  const d = ((b - a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
  return a + d * t;
}

// Tên hiển thị: tôn trọng isAnonymous
function displayName(w) {
  if (w.isAnonymous) return "Ẩn danh";
  const s = (w.sender || "").trim();
  return s || "Ẩn danh";
}

let toastTimer = 0;
function showToast(text) {
  const el = $("#toast");
  el.textContent = text;
  el.classList.add("is-show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("is-show"), 2800);
}

function setStatus(text) { $("#status").textContent = text || ""; }

/* ---------- Lượt Thắp Sáng + độ nổi bật ---------- */
const lightCounts = new Map();           // id -> tổng lượt thắp sáng (Firebase hoặc demo)
let pushLight = null;                    // hàm ghi +1 lên Firebase (gán khi đã kết nối)

const likedSet = (() => {
  try { return new Set(JSON.parse(localStorage.getItem(LIKED_KEY) || "[]")); }
  catch (e) { return new Set(); }
})();
let persistLiked = true;                 // demo: không lưu localStorage
function saveLiked() {
  if (!persistLiked) return;
  try { localStorage.setItem(LIKED_KEY, JSON.stringify(Array.from(likedSet))); } catch (e) { /* bỏ qua */ }
}

// heat: 0..1 theo thang log (đèn 40 lượt nổi hơn đèn 4 lượt, nhưng đèn 4 lượt vẫn khác đèn 0 lượt)
const popularity = {
  max: 0,
  top: new Map(),                        // id -> hạng 1..TOP_N
  recompute(wishes) {
    const ranked = wishes
      .map((w) => ({ id: w.id, c: lightCounts.get(w.id) || 0 }))
      .filter((x) => x.c > 0)
      .sort((a, b) => b.c - a.c);
    this.max = ranked.length ? ranked[0].c : 0;
    this.top = new Map();
    ranked.slice(0, TOP_N).forEach((x, i) => this.top.set(x.id, i + 1));
  },
  count(id) { return lightCounts.get(id) || 0; },
  heat(id) {
    const c = this.count(id);
    return c && this.max ? Math.log1p(c) / Math.log1p(this.max) : 0;
  },
  rank(id) { return this.top.get(id) || 0; }
};

/* ==========================================================================
   [2] ★ MEMBER 5 ★  NightSky - SAO ĐÊM + SAO BĂNG + ĐOM ĐÓM
   Canvas 2D thuần (không cần thư viện), tối ưu cho mobile:
   - Glow đom đóm vẽ từ 1 sprite dựng sẵn (drawImage) thay vì tạo gradient mỗi frame
   - Giới hạn devicePixelRatio <= 2, giới hạn tổng số đom đóm
   - Tự giảm số lượng trên màn hình nhỏ; giảm chuyển động nếu người dùng bật reduced-motion
   API dùng bên ngoài:  sky.update(dt) | sky.draw() | sky.resize() | sky.burst(x, y, n)
   ========================================================================== */
class NightSky {
  constructor(canvas, reduced) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.reduced = reduced;
    this.w = 0;
    this.h = 0;
    this.dpr = 1;
    this.time = 0;

    this.stars = [];          // toạ độ chuẩn hoá 0..1 nên không phải dựng lại khi resize
    this.flies = [];          // đom đóm (ambient + extra do "Thắp Sáng")
    this.shooting = null;
    this.nextShoot = rand(4, 9);

    this.glow = this.makeGlowSprite();
    this.resize();
  }

  makeGlowSprite() {
    const s = 64;
    const c = document.createElement("canvas");
    c.width = c.height = s;
    const g = c.getContext("2d");
    const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    gr.addColorStop(0, "rgba(253,230,138,1)");      // #FDE68A
    gr.addColorStop(0.25, "rgba(253,230,138,0.55)");
    gr.addColorStop(0.6, "rgba(245,158,11,0.14)");  // #F59E0B
    gr.addColorStop(1, "rgba(245,158,11,0)");
    g.fillStyle = gr;
    g.fillRect(0, 0, s, s);
    return c;
  }

  get ambientTarget() {
    if (this.reduced) return 12;
    return isMobile() ? 18 : 34;
  }
  get maxFlies() { return isMobile() ? 90 : 160; }
  get extraCount() { return this.flies.filter((f) => f.extra).length; }

  resize() {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = window.innerWidth;
    this.h = window.innerHeight;
    this.canvas.width = Math.round(this.w * this.dpr);
    this.canvas.height = Math.round(this.h * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    // Sao: số lượng theo diện tích
    const want = clamp(Math.round((this.w * this.h) / 4500), 60, 520);
    while (this.stars.length < want) {
      this.stars.push({
        x: Math.random(),
        y: Math.random() * 0.88,                 // không vẽ sao xuống phần mặt nước
        r: Math.random() < 0.12 ? rand(1.6, 2.2) : rand(0.6, 1.3),
        a: rand(0.35, 0.95),
        sp: rand(0.6, 2.2),
        ph: Math.random() * Math.PI * 2
      });
    }
    this.stars.length = want;

    // Đom đóm ambient
    let ambient = this.flies.filter((f) => !f.extra);
    while (ambient.length < this.ambientTarget) {
      const f = this.spawnFly(rand(0, this.w), rand(this.h * 0.3, this.h * 0.95), false, null);
      this.flies.push(f);
      ambient.push(f);
    }
    if (ambient.length > this.ambientTarget) {
      let remove = ambient.length - this.ambientTarget;
      this.flies = this.flies.filter((f) => f.extra || remove-- <= 0);
    }
  }

  spawnFly(x, y, extra, home) {
    return {
      x, y,
      a: Math.random() * Math.PI * 2,           // hướng bay
      turn: rand(-0.6, 0.6),                    // tốc độ đổi hướng (tạo đường bay lượn)
      sp: rand(8, 22),                          // px / giây
      size: rand(10, 24),                       // kích thước quầng sáng
      ph: Math.random() * Math.PI * 2,
      pf: rand(0.8, 2.2),                       // tần số nhấp nháy
      extra,
      home,
      born: this.time,
      ttl: extra ? 60 : Infinity
    };
  }

  // "Thắp Sáng": thêm đom đóm quanh một điểm (ngọn đèn)
  burst(x, y, n = 6) {
    for (let i = 0; i < n; i++) {
      const ang = Math.random() * Math.PI * 2;
      const r = rand(24, 70);
      const f = this.spawnFly(x + Math.cos(ang) * r, y + Math.sin(ang) * r, true, { x, y });
      f.size = rand(14, 26);
      f.pf *= 1.25;
      this.flies.push(f);
    }
    // Vượt trần -> bỏ bớt đom đóm "extra" cũ nhất
    while (this.flies.length > this.maxFlies) {
      const idx = this.flies.findIndex((f) => f.extra);
      if (idx < 0) break;
      this.flies.splice(idx, 1);
    }
  }

  update(dt) {
    this.time += dt;
    const k = this.reduced ? 0.35 : 1;

    // Đom đóm
    for (let i = this.flies.length - 1; i >= 0; i--) {
      const f = this.flies[i];
      const age = this.time - f.born;
      if (age > f.ttl) { this.flies.splice(i, 1); continue; }

      f.turn = clamp(f.turn + (Math.random() - 0.5) * dt * 3, -1.2, 1.2);
      f.a += f.turn * dt;

      // Đom đóm "extra" lởn vởn quanh ngọn đèn trong ~14 giây đầu
      if (f.home && age < 14) {
        const dx = f.home.x - f.x, dy = f.home.y - f.y;
        if (Math.hypot(dx, dy) > 70) {
          f.a = lerpAngle(f.a, Math.atan2(dy, dx), Math.min(1, dt * 1.5));
        }
      }

      f.x += Math.cos(f.a) * f.sp * k * dt;
      f.y += Math.sin(f.a) * f.sp * k * dt;

      // Cuộn ngang qua mép; đẩy nhẹ lại nếu bay quá cao hoặc chìm xuống nước
      if (f.x < -30) f.x = this.w + 30;
      else if (f.x > this.w + 30) f.x = -30;
      const top = this.h * 0.22, bottom = this.h * 0.97;
      if (f.y < top) f.y += (top - f.y) * Math.min(1, dt * 2);
      else if (f.y > bottom) f.y -= (f.y - bottom) * Math.min(1, dt * 2);
    }

    // Sao băng thỉnh thoảng
    if (!this.reduced) {
      this.nextShoot -= dt;
      if (this.nextShoot <= 0 && !this.shooting) {
        const fromLeft = Math.random() < 0.5;
        const speed = rand(520, 760);
        const ang = rand(0.35, 0.6);
        this.shooting = {
          x: fromLeft ? rand(0, this.w * 0.5) : rand(this.w * 0.5, this.w),
          y: rand(0, this.h * 0.3),
          vx: (fromLeft ? 1 : -1) * Math.cos(ang) * speed,
          vy: Math.sin(ang) * speed,
          life: 0,
          max: rand(0.7, 1.1)
        };
        this.nextShoot = rand(7, 15);
      }
      if (this.shooting) {
        const s = this.shooting;
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.life += dt;
        if (s.life > s.max) this.shooting = null;
      }
    }
  }

  draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.w, this.h);
    ctx.globalCompositeOperation = "source-over";

    // Sao nhấp nháy
    ctx.fillStyle = "#F8FAFC";
    for (let i = 0; i < this.stars.length; i++) {
      const s = this.stars[i];
      const tw = this.reduced ? 1 : 0.6 + 0.4 * Math.sin(this.time * s.sp + s.ph);
      ctx.globalAlpha = s.a * tw;
      ctx.fillRect(s.x * this.w, s.y * this.h, s.r, s.r);
    }

    // Sao băng
    if (this.shooting) {
      const s = this.shooting;
      const fade = 1 - s.life / s.max;
      const len = 90;
      const nx = s.vx / Math.hypot(s.vx, s.vy);
      const ny = s.vy / Math.hypot(s.vx, s.vy);
      const g = ctx.createLinearGradient(s.x, s.y, s.x - nx * len, s.y - ny * len);
      g.addColorStop(0, "rgba(248,250,252," + (0.9 * fade).toFixed(3) + ")");
      g.addColorStop(1, "rgba(248,250,252,0)");
      ctx.globalAlpha = 1;
      ctx.strokeStyle = g;
      ctx.lineWidth = 1.6;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x - nx * len, s.y - ny * len);
      ctx.stroke();
    }

    // Đom đóm (cộng sáng)
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < this.flies.length; i++) {
      const f = this.flies[i];
      const pulse = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(this.time * f.pf + f.ph));
      let alpha = pulse;
      if (f.extra) {                                   // mờ dần 5 giây cuối đời
        const left = f.ttl - (this.time - f.born);
        if (left < 5) alpha *= clamp(left / 5, 0, 1);
      }
      ctx.globalAlpha = alpha;
      const s = f.size;
      ctx.drawImage(this.glow, f.x - s / 2, f.y - s / 2, s, s);
      // lõi sáng nhỏ ở giữa cho "đúng chất" đom đóm
      ctx.globalAlpha = Math.min(1, alpha + 0.15);
      ctx.fillStyle = "#FDE68A";
      ctx.fillRect(f.x - 0.8, f.y - 0.8, 1.6, 1.6);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }
}

/* ==========================================================================
   [3] LanternField - ĐÈN TRỜI MANG LỜI CHÚC BAY LÊN CHẬM
   - Mỗi ngọn đèn gắn với 1 lời chúc ngẫu nhiên; bay hết màn hình sẽ nhận lời chúc mới
   - Rê chuột vào đèn: đèn chậm lại để dễ bấm
   ========================================================================== */
class LanternField {
  constructor(container, { reduced, onSelect }) {
    this.container = container;
    this.reduced = reduced;
    this.onSelect = onSelect;
    this.items = [];
    this.wishes = [];
    this.queue = [];
    this.scaleMul = 1;
    this.paused = false;

    this.container.addEventListener("click", (e) => {
      const el = e.target.closest ? e.target.closest(".lantern") : null;
      if (el && el.__item && el.__item.wish) this.onSelect(el.__item.wish, el.__item);
    });
  }

  setWishes(list) {
    this.wishes = list;
    this.queue = [];
  }

  // Xáo trộn có trọng số (Efraimidis–Spirakis): thư nhiều lượt thắp sáng xuất hiện thường xuyên hơn
  refillQueue() {
    this.queue = this.wishes
      .map((w) => ({ w, k: Math.pow(Math.random(), 1 / (1 + 4 * popularity.heat(w.id))) }))
      .sort((a, b) => a.k - b.k)           // pop() lấy từ cuối -> k lớn nhất ra trước
      .map((x) => x.w);
  }

  // Lấy thư tiếp theo, tránh trùng với thư đang bay trên màn hình (nếu còn thư khác)
  nextWish(self) {
    if (!this.wishes.length) return null;
    const onScreen = new Set();
    for (const it of this.items) if (it !== self && it.wish) onScreen.add(it.wish.id);
    const canAvoid = this.wishes.length > onScreen.size;
    for (let tries = 0; tries <= this.wishes.length; tries++) {
      if (!this.queue.length) this.refillQueue();
      const w = this.queue.pop();
      if (!canAvoid || !onScreen.has(w.id)) return w;
    }
    return this.wishes[0];
  }

  rebuild(count, scaleMul) {
    this.scaleMul = scaleMul;
    this.container.textContent = "";
    this.items = [];
    if (!this.wishes.length) { this.queue = []; return; }

    // Đèn Top luôn được thả trước để chắc chắn có mặt trên bầu trời
    this.refillQueue();
    const tops = Array.from(popularity.top.keys())
      .map((id) => this.wishes.find((w) => w.id === id))
      .filter(Boolean);
    this.queue = this.queue.filter((w) => !popularity.top.has(w.id)).concat(tops.reverse());

    const h = window.innerHeight;
    for (let i = 0; i < count; i++) {
      const el = document.createElement("button");
      el.type = "button";
      el.className = "lantern";
      el.style.setProperty("--delay", (-Math.random() * 2).toFixed(2) + "s");

      const halo = document.createElement("span");
      halo.className = "lantern-halo";
      const body = document.createElement("span");
      body.className = "lantern-body";
      const flame = document.createElement("span");
      flame.className = "lantern-flame";
      body.appendChild(flame);
      const name = document.createElement("span");
      name.className = "lantern-name";
      const likes = document.createElement("span");
      likes.className = "lantern-likes";
      likes.hidden = true;
      el.appendChild(halo);
      el.appendChild(body);
      el.appendChild(name);
      el.appendChild(likes);

      const depth = Math.random();                       // 0 xa -> 1 gần
      const item = {
        el, nameEl: name, likesEl: likes, wish: null,
        depth,
        fx: rand(0.06, 0.94),
        y: rand(-0.05 * h, h * 0.95),                    // rải khắp bầu trời lúc đầu
        scale: 0.72 + depth * 0.43,
        speed: (this.reduced ? rand(4, 8) : rand(10, 26)) * (0.65 + depth * 0.6),
        amp: rand(8, 26),
        freq: rand(0.25, 0.6),
        phase: Math.random() * Math.PI * 2,
        t: Math.random() * 100,
        k: 1,
        heat: 0,                                         // độ nổi bật mục tiêu 0..1
        hs: 0,                                           // độ nổi bật đang hiển thị (nội suy mượt)
        hover: false
      };
      el.__item = item;
      el.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") item.hover = true; });
      el.addEventListener("pointerleave", () => { item.hover = false; });

      this.assign(item);
      item.hs = item.heat;                               // lúc đầu hiện đúng kích thước luôn
      this.container.appendChild(el);
      this.items.push(item);
    }
    this.update(0, true);
  }

  assign(item) {
    const wish = this.nextWish(item);
    item.wish = wish;
    if (!wish) return;
    item.nameEl.textContent = displayName(wish);
    this.applyPopularity(item);
  }

  // Cập nhật số lượt + độ nổi bật cho 1 ngọn đèn
  applyPopularity(item) {
    if (!item.wish) return;
    const id = item.wish.id;
    const n = popularity.count(id);
    const heat = popularity.heat(id);
    const rank = popularity.rank(id);
    item.heat = heat;

    item.el.style.setProperty("--glow", (heat * 12).toFixed(2));
    item.el.style.zIndex = String(Math.round(item.depth * 10) + Math.round(heat * 20) + (rank ? 40 - rank : 0));
    item.el.classList.toggle("is-top", rank > 0);
    item.el.classList.toggle("rank-1", rank === 1);

    item.likesEl.hidden = n === 0;
    item.likesEl.textContent = (rank ? "★ " : "✦ ") + n;

    const name = displayName(item.wish);
    item.el.setAttribute("aria-label",
      "Mở lời chúc của " + name + (n ? " - " + n + " lượt thắp sáng" : ""));
  }

  refreshPopularity() {
    for (const it of this.items) this.applyPopularity(it);
  }

  update(dt, force) {
    if (this.paused && !force) return;
    const w = window.innerWidth, h = window.innerHeight;
    const sm = this.scaleMul;

    for (let i = 0; i < this.items.length; i++) {
      const it = this.items[i];
      it.k += ((it.hover ? 0 : 1) - it.k) * Math.min(1, dt * 6);
      it.hs += (it.heat - it.hs) * Math.min(1, dt * 2.5);
      it.t += dt * it.k;
      // Đèn càng nổi bật càng bay chậm -> ở lại trên trời lâu hơn
      it.y -= it.speed * (1 - 0.35 * it.hs) * it.k * dt;

      if (it.y < -190) {                                  // bay khỏi màn hình -> thả ngọn mới từ mặt nước
        it.y = h * 0.9 + rand(0, h * 0.12);
        it.fx = rand(0.06, 0.94);
        this.assign(it);
      }

      const x = it.fx * w + Math.sin(it.t * it.freq + it.phase) * it.amp;
      const fadeTop = clamp((it.y + 140) / 160, 0, 1);
      const fadeBottom = clamp((h * 1.0 - it.y) / (h * 0.1), 0, 1);
      const grow = w < 640 ? 0.35 : 0.5;                 // đèn nhiều lượt thích to hơn tới 50% (mobile 35%)
      const scale = it.scale * sm * (1 + grow * it.hs);

      it.el.style.opacity = Math.min(fadeTop, fadeBottom).toFixed(2);
      it.el.style.transform =
        "translate3d(" + (x - 48).toFixed(1) + "px," + it.y.toFixed(1) + "px,0) scale(" + scale.toFixed(3) + ")";
    }
  }
}

/* ==========================================================================
   [4] ĐỌC THƯ + THẮP SÁNG + TOÀN CẢNH
   ========================================================================== */
// Bảo đảm có đủ phần tử mà hiệu ứng mới cần, kể cả khi view.html còn là bản cũ
(function ensureLetterDom() {
  const paper = $("#letter-paper");
  if (paper && !$("#paper-wrap")) {
    const wrap = document.createElement("div");
    wrap.className = "paper-wrap";
    wrap.id = "paper-wrap";
    paper.parentNode.insertBefore(wrap, paper);
    wrap.appendChild(paper);
  }
  const scene = $("#letter-scene");
  if (scene && !scene.classList.contains("is-read")) scene.classList.add("is-read");
  const flap = $("#env-flap");
  if (flap) flap.classList.remove("is-open");
  const btn = $("#btn-light");
  if (btn && !$("#light-label")) {
    const span = Array.prototype.find.call(btn.children, (c) => c.tagName === "SPAN" && !c.classList.contains("light-count"));
    if (span) span.id = "light-label";
  }
})();

const els = {
  overlay: $("#letter-overlay"),
  backdrop: $("#letter-backdrop"),
  stage: $(".letter-stage"),
  scene: $("#letter-scene"),
  wrap: $("#paper-wrap"),
  paper: $("#letter-paper"),
  scroll: $("#letter-scroll"),
  envBack: $("#env-back"),
  envFront: $("#env-front"),
  flap: $("#env-flap"),
  seal: $("#env-seal"),
  actions: $("#letter-actions"),
  message: $("#letter-message"),
  photo: $("#letter-photo"),
  photoImg: $("#letter-photo-img"),
  sign: $("#letter-sign"),
  date: $("#letter-date"),
  btnBack: $("#btn-back"),
  btnLight: $("#btn-light"),
  lightLabel: $("#light-label"),
  lightCount: $("#light-count"),
  btnCopy: $("#btn-copy"),
  panoramaBtn: $("#panorama-btn"),
  panoramaLabel: $("#panorama-label"),
  codeForm: $("#code-form"),
  codeInput: $("#code-input"),
  count: $("#wish-count")
};

const state = {
  wishes: [],
  panorama: false,
  deepLinkHandled: false,
  letter: "closed",          // closed | opening | open | closing
  current: null,             // { wish, item }
  tl: null,
  lastFocus: null
};

const sky = new NightSky($("#sky-canvas"), reducedMotion);
const field = new LanternField($("#lantern-field"), {
  reduced: reducedMotion,
  onSelect: (wish, item) => openLetter(wish, item)
});

function targetLanternCount() {
  const n = state.wishes.length;
  if (!n) return 0;
  const mobile = isMobile();
  if (state.panorama) return Math.min(mobile ? 34 : 80, Math.max(30, n));
  return Math.min(mobile ? 10 : 20, Math.max(6, n));
}
function rebuildField() {
  field.rebuild(targetLanternCount(), state.panorama ? 0.62 : 1);
}

function wishLink(id) {
  return location.origin + location.pathname + "?id=" + encodeURIComponent(id);
}
function setUrlId(id) {
  try {
    const url = id ? "?id=" + encodeURIComponent(id) : location.pathname;
    history.replaceState(null, "", url);
  } catch (e) { /* mở bằng file:// có thể bị chặn - bỏ qua */ }
}

function isHttpUrl(u) { return typeof u === "string" && /^https?:\/\//i.test(u); }

function fillLetter(w) {
  els.message.textContent = w.message;                       // textContent: chống chèn HTML/XSS
  els.sign.textContent = "- " + displayName(w);
  els.date.textContent = w.timestamp
    ? new Date(w.timestamp).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })
    : "";

  const urls = (w.imageUrl || "").split(",").map(s => s.trim()).filter(isHttpUrl);
  els.photo.innerHTML = ""; // Xóa trắng khung ảnh cũ
  
  if (urls.length > 0) {
    els.photo.hidden = false;
    // Lặp qua tất cả link ảnh và tạo thẻ img tương ứng
    urls.forEach(url => {
      const img = document.createElement("img");
      img.src = url;
      img.alt = "Ảnh kỷ niệm đính kèm";
      img.decoding = "async";
      
      // Thêm CSS margin nhỏ để các ảnh không bị dính sát vào nhau
      img.style.marginBottom = "8px"; 
      
      img.onerror = () => img.remove(); // Lỗi ảnh nào xóa ảnh đó
      els.photo.appendChild(img);
    });
  } else {
    els.photo.hidden = true;
  }
  els.scroll.scrollTop = 0;
  updateLightButton();
}

function updateLightButton() {
  const id = state.current ? state.current.wish.id : null;
  const n = id ? popularity.count(id) : 0;
  const liked = id ? likedSet.has(id) : false;
  els.lightCount.textContent = String(n);
  els.lightCount.hidden = n === 0;
  if (els.lightLabel) els.lightLabel.textContent = liked ? "Đã thắp sáng" : "Thắp Sáng";
  els.btnLight.classList.toggle("is-lit", liked);
  els.btnLight.setAttribute("aria-pressed", liked ? "true" : "false");
}

function lanternCenter(item) {
  if (item && item.el && item.el.isConnected) {
    const r = item.el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height * 0.3 };
  }
  return { x: window.innerWidth / 2, y: window.innerHeight * 0.4 };
}

const ENV_PARTS = () => [els.envBack, els.envFront, els.flap, els.seal];
const ANIM_TARGETS = () => [els.backdrop, els.scene, els.wrap, els.paper, els.actions,
  els.envBack, els.envFront, els.flap, els.seal];

/* Hiệu ứng mở thư (≈3,3 giây, bấm vào lá thư để bỏ qua):
   1. Phong thư bay ra từ ngọn đèn vừa bấm, xoay nhẹ rồi dừng giữa màn hình
   2. Con dấu sáp phồng lên rồi vỡ
   3. Nắp phong thư lật mở
   4. Lá thư được rút lên khỏi phong thư, phong thư hạ thấp xuống
   5. Phong thư được đẩy sang bên trái và mờ dần; lá thư hạ về giữa, mở rộng ra
   Nội dung thư hiện dần từng dòng ngay khi đang rút thư; cuối cùng là các nút */
function openLetter(wish, item) {
  if (state.letter !== "closed") return;
  try {
    openLetterAnimated(wish, item);
  } catch (err) {
    console.error("[view.js] Lỗi hiệu ứng mở thư -> mở thẳng:", err);
    if (state.tl) { state.tl.kill(); state.tl = null; }
    if (hasGSAP) gsap.set(ANIM_TARGETS().filter(Boolean), { clearProps: "all" });
    if (els.scene) els.scene.classList.add("is-read");
    if (els.wrap) els.wrap.classList.remove("is-tucked");
    if (state.current && !els.overlay.hidden) {
      state.letter = "open";
    } else {
      state.letter = "closed"; state.current = null; field.paused = false;
    }
  }
}

function openLetterAnimated(wish, item) {
  state.letter = "opening";
  state.current = { wish, item: item || null };
  state.lastFocus = document.activeElement;
  field.paused = true;

  fillLetter(wish);
  setUrlId(wish.id);

  els.overlay.hidden = false;
  els.overlay.setAttribute("aria-hidden", "false");

  if (!hasGSAP || reducedMotion) {
    // Không có GSAP / người dùng giảm chuyển động: hiện thẳng trạng thái đã đọc (định nghĩa trong CSS)
    els.scene.classList.add("is-read");
    state.letter = "open";
    els.btnBack.focus({ preventScroll: true });
    return;
  }

  // Dựng lại phong thư để đo kích thước
  els.scene.classList.remove("is-read");
  els.wrap.classList.add("is-tucked");
  els.flap.classList.remove("is-open");
  gsap.set(ANIM_TARGETS(), { clearProps: "all" });

  const S = els.paper.offsetHeight;             // chiều cao lá thư
  const E = els.envBack.offsetHeight;           // chiều cao phong thư
  const W = els.scene.offsetWidth;
  const envTop = els.envBack.offsetTop;

  const tuckY = envTop + E * 0.14;              // thư nằm trong bao, mép trên thấp hơn miệng bao
  const outY = envTop - S * 0.9 - 6;            // thư đã rút hẳn ra khỏi bao
  const drop = E * 0.9;                         // phong thư hạ xuống khi rút thư

  // Phong thư xuất phát từ vị trí ngọn đèn
  const from = lanternCenter(item);
  const r = els.scene.getBoundingClientRect();
  const dx = from.x - (r.left + W / 2);
  const dy = from.y - (r.top + envTop + E / 2);

  gsap.set(els.flap, { rotateX: 0, transformPerspective: 900, transformOrigin: "50% 0%" });
  gsap.set(els.seal, { opacity: 1, scale: 1, rotation: 0 });
  gsap.set(els.paper, { y: tuckY, scale: 0.9, rotation: 0, transformOrigin: "50% 0%" });
  gsap.set(els.wrap, { zIndex: 2 });
  gsap.set(els.actions, { opacity: 0, y: 14 });
  const lines = Array.prototype.filter.call(els.scroll.children, (c) => !c.hidden);
  gsap.set(lines, { opacity: 0, y: 10 });

  const tl = gsap.timeline({
    onComplete: () => {
      els.scene.classList.add("is-read");
      els.wrap.classList.remove("is-tucked");
      els.flap.classList.remove("is-open");
      // Xoá style inline của GSAP: tránh Chrome vẽ sai clip-path + trả lá thư về bố cục CSS
      gsap.set(ANIM_TARGETS().concat(lines), { clearProps: "all" });
      state.letter = "open";
      state.tl = null;
    }
  });
  state.tl = tl;

  tl.fromTo(els.backdrop, { opacity: 0 }, { opacity: 1, duration: 0.4, ease: "power1.out" }, 0)
    // 1. bay ra từ ngọn đèn
    .fromTo(els.scene,
      { x: dx, y: dy, scale: 0.16, rotation: -16, opacity: 0 },
      { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1, duration: 0.85, ease: "power3.out" }, 0)
    // 2. dấu sáp phồng lên rồi vỡ
    .to(els.seal, { scale: 1.28, duration: 0.14, ease: "power1.out" }, 0.8)
    .to(els.seal, { scale: 0.15, opacity: 0, rotation: 50, duration: 0.28, ease: "back.in(2)" }, 0.94)
    // 3. lật nắp
    .to(els.flap, { rotateX: 180, duration: 0.55, ease: "power2.inOut" }, 1.0)
    .call(() => els.flap.classList.add("is-open"), null, 1.27)     // nắp qua 90° -> nằm sau lá thư
    // 4. rút thư lên, phong thư hạ xuống
    .to(els.paper, { y: outY, duration: 0.85, ease: "power2.inOut" }, 1.5)
    .to([els.envBack, els.envFront, els.flap, els.seal, els.wrap], { y: drop, duration: 0.85, ease: "power2.inOut" }, 1.5)
    .call(() => {                                                   // thư đã ra khỏi bao
      els.wrap.classList.remove("is-tucked");
      gsap.set(els.wrap, { zIndex: 6 });
    }, null, 2.35)
    // 5. đẩy phong thư sang bên, lá thư hạ về giữa và mở rộng
    .to([els.envBack, els.envFront, els.flap], {
      x: -W * 0.9, y: drop + 50, opacity: 0, duration: 0.8, ease: "power2.in"
    }, 2.38)
    .to(els.wrap, { y: 0, duration: 0.85, ease: "power3.inOut" }, 2.38)
    .to(els.paper, { y: 0, scale: 1, duration: 0.85, ease: "power3.inOut" }, 2.38)
    .to(els.paper, { rotation: -2.2, duration: 0.4, ease: "sine.out" }, 2.38)
    .to(els.paper, { rotation: 0, duration: 0.6, ease: "back.out(2.2)" }, 2.78)
    // 6. nút (nội dung đã hiện dần từ lúc rút thư)
    .to(lines, { opacity: 1, y: 0, duration: 0.45, stagger: 0.09, ease: "power1.out" }, 1.85)
    .to(els.actions, { opacity: 1, y: 0, duration: 0.4, ease: "power1.out" }, 3.05)
    .call(() => els.btnBack.focus({ preventScroll: true }), null, 3.1);
}

function finishClose() {
  els.overlay.hidden = true;
  els.overlay.setAttribute("aria-hidden", "true");
  if (hasGSAP) gsap.set(ANIM_TARGETS().filter(Boolean), { clearProps: "all" });
  els.scene.classList.add("is-read");
  els.wrap.classList.remove("is-tucked");

  state.letter = "closed";
  state.current = null;
  state.tl = null;
  field.paused = false;
  setUrlId("");

  // Dữ liệu có thể đã đổi trong lúc đang đọc thư -> đồng bộ số lượng đèn
  if (field.items.length !== targetLanternCount()) rebuildField();

  const f = state.lastFocus;
  if (f && f.focus && f.isConnected) f.focus({ preventScroll: true });
}

// Đóng thư: lá thư gấp lại rồi bay về ngọn đèn của nó
function closeLetter() {
  if (state.letter !== "open" && state.letter !== "opening") return;
  if (state.tl) state.tl.progress(1);                         // bỏ qua nốt hiệu ứng mở
  state.letter = "closing";

  if (!hasGSAP || reducedMotion) { finishClose(); return; }

  const item = state.current && state.current.item;
  const to = lanternCenter(item);
  const r = els.scene.getBoundingClientRect();
  const dx = to.x - (r.left + r.width / 2);
  const dy = to.y - (r.top + r.height / 2);

  const tl = gsap.timeline({
    onComplete: () => {
      if (item && item.el && item.el.isConnected) sky.burst(to.x, to.y, 3);
      finishClose();
    }
  });
  state.tl = tl;
  tl.to(els.actions, { opacity: 0, y: 10, duration: 0.2 }, 0)
    .to(els.paper, { scaleY: 0.3, transformOrigin: "50% 50%", duration: 0.3, ease: "power2.in" }, 0.05)
    .to(els.scene, { x: dx, y: dy, scale: 0.08, rotation: 14, opacity: 0, duration: 0.6, ease: "power2.in" }, 0.3)
    .to(els.backdrop, { opacity: 0, duration: 0.4 }, 0.4);
}

// Thắp Sáng: mỗi máy 1 lượt / thư. Đèn được thắp càng nhiều càng to, sáng và có quầng Top
async function lightUp() {
  if (!state.current) return;
  const { wish, item } = state.current;
  const p = lanternCenter(item);
  const already = likedSet.has(wish.id);

  sky.burst(p.x, p.y, already ? 4 : 10);
  els.btnLight.classList.remove("is-pulse");
  void els.btnLight.offsetWidth;                              // restart animation
  els.btnLight.classList.add("is-pulse");

  if (already) { showToast("Bạn đã thắp sáng lá thư này rồi ✨"); return; }

  likedSet.add(wish.id);
  saveLiked();
  lightCounts.set(wish.id, popularity.count(wish.id) + 1);   // cập nhật ngay trên giao diện
  onLightsChanged();

  if (!pushLight) return;                                     // chế độ demo: chỉ lưu cục bộ
  try {
    await pushLight(wish.id);
  } catch (err) {
    console.error("[view.js] Không ghi được lượt thắp sáng:", err);
    likedSet.delete(wish.id);
    saveLiked();
    lightCounts.set(wish.id, Math.max(0, popularity.count(wish.id) - 1));
    onLightsChanged();
    showToast("Chưa thắp sáng được, vui lòng thử lại");
  }
}

function onLightsChanged() {
  popularity.recompute(state.wishes);
  field.refreshPopularity();
  updateLightButton();
}

async function copyLink() {
  if (!state.current) return;
  const link = wishLink(state.current.wish.id);
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(link);
    } else {
      const ta = document.createElement("textarea");
      ta.value = link;
      ta.setAttribute("readonly", "");
      ta.style.cssText = "position:fixed;top:0;left:0;opacity:0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    showToast("Đã sao chép liên kết lá thư");
  } catch (e) {
    showToast("Không sao chép được. Liên kết: " + link);
  }
}

function setPanorama(on) {
  state.panorama = on;
  document.body.classList.toggle("is-panorama", on);
  els.panoramaBtn.setAttribute("aria-pressed", on ? "true" : "false");
  els.panoramaLabel.textContent = on ? "Thu nhỏ" : "Toàn cảnh";
  if (state.letter === "closed") rebuildField();
}

// Mã Thư = id của lời chúc (hoặc dán nguyên link có ?id=...)
function parseCode(raw) {
  const s = (raw || "").trim();
  if (!s) return "";
  try { return new URL(s).searchParams.get("id") || ""; } catch (e) { /* không phải URL */ }
  return s;
}
function openByCode(code) {
  const wish = state.wishes.find((w) => w.id === code);
  if (!wish) { showToast("Không tìm thấy thư với Mã Thư này"); return false; }
  if (state.letter === "closed") openLetter(wish, null);
  return true;
}

/* ---------- Sự kiện giao diện ---------- */
els.btnBack.addEventListener("click", closeLetter);
els.backdrop.addEventListener("click", closeLetter);
els.stage.addEventListener("click", () => {      // bấm vào lá thư khi đang mở -> bỏ qua hiệu ứng
  if (state.letter === "opening" && state.tl) state.tl.progress(1);
});
els.btnLight.addEventListener("click", lightUp);
els.btnCopy.addEventListener("click", copyLink);
els.panoramaBtn.addEventListener("click", () => setPanorama(!state.panorama));
els.codeForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const code = parseCode(els.codeInput.value);
  if (code && openByCode(code)) els.codeInput.value = "";
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (state.letter === "open" || state.letter === "opening") closeLetter();
    else if (state.panorama) setPanorama(false);
    return;
  }
  // Giữ focus trong hộp thoại khi đang đọc thư
  if (e.key === "Tab" && state.letter !== "closed") {
    const f = Array.prototype.slice.call(els.overlay.querySelectorAll("button"));
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    else if (!els.overlay.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
  }
});

let resizeTimer = 0;
window.addEventListener("resize", () => {
  sky.resize();
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (state.letter === "closed" && field.items.length !== targetLanternCount()) rebuildField();
  }, 250);
});

/* ==========================================================================
   [5] DỮ LIỆU - đọc node "wishes" (6 trường: id, sender, isAnonymous, message, imageUrl, timestamp)
   ========================================================================== */
async function loadFirebaseConfig() {
  try {
    const mod = await import("./config.js");
    const cfg = mod.firebaseConfig;
    if (cfg && cfg.apiKey && !/YOUR_/.test(String(cfg.apiKey))) return cfg;
  } catch (e) {
    console.warn("[view.js] Không đọc được js/config.js:", e);
  }
  return null;
}

function normalize(val) {
  if (!val || typeof val !== "object") return [];
  return Object.entries(val)
    .map(([key, v]) => {
      if (!v || typeof v !== "object") return null;
      const message = typeof v.message === "string" ? v.message.trim() : "";
      if (!message) return null;
      return {
        id: key,                                              // id = key tự sinh của Firebase = Mã Thư
        sender: typeof v.sender === "string" ? v.sender : "",
        isAnonymous: v.isAnonymous === true,
        message,
        imageUrl: typeof v.imageUrl === "string" ? v.imageUrl : "",
        timestamp: Number(v.timestamp) || 0
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.timestamp - a.timestamp);
}

function applyWishes(list) {
  state.wishes = list;
  field.setWishes(list);
  popularity.recompute(list);
  if (state.current) updateLightButton();

  if (!list.length) {
    setStatus("Chưa có lời tri ân nào. Hãy quay lại sau nhé!");
    els.count.textContent = "";
    field.rebuild(0, 1);
  } else {
    setStatus("");
    els.count.textContent = "Đã có " + list.length + " lời tri ân đang bay lên";
    if (state.letter === "closed") rebuildField();
  }

  // Mở thẳng thư nếu truy cập bằng đường dẫn ?id=...
  if (!state.deepLinkHandled && list.length) {
    state.deepLinkHandled = true;
    const id = new URLSearchParams(location.search).get("id");
    if (id) openByCode(id);
  }
}

async function connectData() {
  const demo = new URLSearchParams(location.search).get("demo") === "1";
  //const demo = 1;
  const FIREBASE_CONFIG = demo ? null : await loadFirebaseConfig();
  if (demo || !FIREBASE_CONFIG) {
    if (!demo) console.warn("[view.js] Chưa có config Firebase hợp lệ -> đang dùng dữ liệu mẫu.");
    // Demo: mọi thư bắt đầu từ 0 lượt, thắp sáng chỉ lưu tạm trong phiên (tải lại trang là về 0)
    persistLiked = false;
    likedSet.clear();
    applyWishes(DEMO_WISHES);
    showToast("Đang hiển thị dữ liệu mẫu");
    return;
  }

  try {
    // import() động: nếu CDN Firebase lỗi thì chỉ phần dữ liệu lỗi, giao diện vẫn chạy
    const base = "https://www.gstatic.com/firebasejs/" + FIREBASE_SDK_VERSION + "/";
    const [appMod, dbMod] = await Promise.all([
      import(base + "firebase-app.js"),
      import(base + "firebase-database.js")
    ]);
    const app = appMod.initializeApp(FIREBASE_CONFIG);
    const db = dbMod.getDatabase(app);

    dbMod.onValue(
      dbMod.ref(db, WISHES_NODE),
      (snap) => applyWishes(normalize(snap.val())),
      (err) => {
        console.error("[view.js] Firebase error:", err);
        if (!state.wishes.length) setStatus("Không tải được lời chúc. Vui lòng thử tải lại trang.");
      }
    );

    // Lượt Thắp Sáng: node riêng "lights" = { [id]: số }, cập nhật realtime cho mọi người xem
    dbMod.onValue(
      dbMod.ref(db, LIGHTS_NODE),
      (snap) => {
        const v = snap.val() || {};
        lightCounts.clear();
        Object.keys(v).forEach((id) => {
          const n = Math.floor(Number(v[id]));
          if (n > 0) lightCounts.set(id, n);
        });
        onLightsChanged();
      },
      (err) => console.warn("[view.js] Không đọc được lượt thắp sáng:", err)
    );
    // Cộng 1 bằng transaction để nhiều người bấm cùng lúc không bị mất lượt
    pushLight = (id) => dbMod.runTransaction(
      dbMod.ref(db, LIGHTS_NODE + "/" + id),
      (cur) => (Number(cur) || 0) + 1
    );
  } catch (err) {
    console.error("[view.js] Không kết nối được Firebase:", err);
    setStatus("Không kết nối được máy chủ. Vui lòng kiểm tra mạng và tải lại trang.");
  }
}

/* ==========================================================================
   [6] KHỞI ĐỘNG
   ========================================================================== */
if (window.lucide && window.lucide.createIcons) window.lucide.createIcons();

if (hasGSAP && !reducedMotion) {
  gsap.from(".hero > *", { opacity: 0, y: 18, duration: 1.2, stagger: 0.25, ease: "power2.out", delay: 0.2 });
}

// Vòng lặp hoạt ảnh chung cho sao / đom đóm / đèn
let lastTime = performance.now();
let rafId = 0;
function frame(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  sky.update(dt);
  sky.draw();
  field.update(dt);
  rafId = requestAnimationFrame(frame);
}
function startLoop() {
  cancelAnimationFrame(rafId);
  lastTime = performance.now();
  rafId = requestAnimationFrame(frame);
}
document.addEventListener("visibilitychange", () => {
  if (document.hidden) cancelAnimationFrame(rafId);   // tiết kiệm pin khi chuyển tab
  else startLoop();
});

startLoop();
connectData();