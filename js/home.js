// home.js - Bản 2: Dựng lại hoàn toàn Trang 1 "Góc Ký Ức" theo đúng tài liệu Đề án
// Tuân thủ rule.txt: Chỉ xử lý hiệu ứng & điều hướng của trang Home (Cặp 1). Không đụng tới Firebase.

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Danh sách câu ngạn ngữ, trích dẫn về thầy cô hiển thị ngẫu nhiên trên Bảng đen
const CHALKBOARD_QUOTES = [
  {
    quote: '“Một người thầy giỏi giống như ngọn nến — cháy hết mình để thắp sáng đường đi cho những người khác.”',
    author: '— Mustafa Kemal Atatürk'
  },
  {
    quote: '“Muốn sang thì bắc cầu kiều, muốn con hay chữ thì yêu lấy thầy.”',
    author: '— Ca dao Việt Nam'
  },
  {
    quote: '“Dưới ánh mặt trời không có nghề nào cao quý hơn nghề dạy học.”',
    author: '— Comenius'
  },
  {
    quote: '“Có một nghề bụi phấn bám đầy tay, người ta bảo đó là nghề trong sạch nhất. Có một nghề không trồng cây vào đất, mà mang lại cho Đời đầy trái ngọt hoa tươi.”',
    author: '— Thơ Đinh Văn Nhã'
  },
  {
    quote: '“Người thầy trung bình chỉ biết nói, người thầy giỏi biết giải thích, người thầy xuất chúng biết minh họa, người thầy vĩ đại biết truyền cảm hứng.”',
    author: '— William Arthur Ward'
  }
];

let currentQuoteIdx = Math.floor(Math.random() * CHALKBOARD_QUOTES.length);
let weatherState = 'sunny'; // 'sunny' | 'rainy'
let windowRainAnimId = null;

// ===== 1. Khởi tạo Lucide Icons & Tippy.js Tooltips (theo Technical Stack) =====
function initUI() {
  if (typeof window.lucide !== 'undefined') {
    window.lucide.createIcons();
  }

  if (typeof window.tippy !== 'undefined') {
    window.tippy('[data-tippy-content]', {
      animation: 'shift-away',
      duration: [240, 180]
    });
  }
}

// ===== 2. Hiệu ứng viết tay slow-motion cho tiêu đề "Góc Ký Ức" (theo Đề án) =====
function playHandwritingTitle() {
  const target = document.getElementById('handwrite-target');
  const pen = document.getElementById('handwrite-pen');
  if (!target) return;

  const text = target.textContent.trim();
  target.innerHTML = '';

  const chars = [...text].map((ch) => {
    const span = document.createElement('span');
    span.className = 'handwrite-char';
    span.textContent = ch === ' ' ? '\u00A0' : ch;
    target.appendChild(span);
    return span;
  });

  if (prefersReducedMotion || typeof window.gsap === 'undefined') {
    chars.forEach((c) => {
      c.style.opacity = '1';
      c.style.transform = 'none';
    });
    return;
  }

  const gsap = window.gsap;
  gsap.to(chars, {
    opacity: 1,
    y: 0,
    scale: 1,
    duration: 0.45,
    stagger: 0.14,
    ease: 'back.out(1.6)'
  });

  if (pen) {
    gsap.fromTo(
      pen,
      { x: -16, y: -8, rotation: -18, opacity: 0 },
      {
        x: 0,
        y: 0,
        rotation: 8,
        opacity: 1,
        duration: chars.length * 0.14 + 0.3,
        ease: 'sine.inOut'
      }
    );
  }
}

// ===== 3. Hiệu ứng bụi phấn rơi nhẹ trong không trung bằng Particles.js =====
function initChalkParticles() {
  const el = document.getElementById('particles-js');
  if (!el || typeof window.particlesJS === 'undefined') return;

  window.particlesJS('particles-js', {
    particles: {
      number: {
        value: window.innerWidth < 640 ? 28 : 55,
        density: { enable: true, value_area: 850 }
      },
      color: {
        value: ['#F8FAFC', '#FDE68A', '#F59E0B']
      },
      shape: { type: 'circle' },
      opacity: {
        value: 0.45,
        random: true,
        anim: { enable: !prefersReducedMotion, speed: 0.6, opacity_min: 0.1, sync: false }
      },
      size: {
        value: 3.2,
        random: true
      },
      line_linked: { enable: false },
      move: {
        enable: !prefersReducedMotion,
        speed: 0.75,
        direction: 'bottom',
        random: true,
        straight: false,
        out_mode: 'out'
      }
    },
    interactivity: {
      detect_on: 'canvas',
      events: {
        onhover: { enable: true, mode: 'repulse' },
        onclick: { enable: false },
        resize: true
      },
      modes: {
        repulse: { distance: 70, duration: 0.4 }
      }
    },
    retina_detect: true
  });
}

// ===== 4. Thời tiết: Tự động đổi mỗi 30 giây HOẶC nhấp trực tiếp vào Cửa sổ lớp học (không chú thích) =====
function setupWeatherSystem() {
  const canvas = document.getElementById('fullscreen-rain-canvas');
  const windowEl = document.getElementById('classroom-window');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const resizeCanvas = () => {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  // Mưa thưa phủ toàn background, rơi thẳng từ trên xuống
  const dropCount = window.innerWidth < 640 ? 24 : 48;
  const spawn = (initial) => {
    const len = Math.random() * 14 + 14;
    return {
      x: Math.random() * window.innerWidth,
      y: initial ? -Math.random() * window.innerHeight * 0.5 : -len - Math.random() * 150,
      len,
      speed: Math.random() * 3 + 6,
      alpha: Math.random() * 0.3 + 0.45
    };
  };
  const raindrops = Array.from({ length: dropCount }, () => spawn(true));

  function renderRain() {
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    if (weatherState !== 'rainy') return;

    ctx.lineWidth = 1.6;
    ctx.lineCap = 'round';

    raindrops.forEach((drop, i) => {
      ctx.strokeStyle = `rgba(241, 245, 249, ${drop.alpha})`;
      ctx.beginPath();
      ctx.moveTo(drop.x, drop.y);
      ctx.lineTo(drop.x, drop.y + drop.len);
      ctx.stroke();

      drop.y += drop.speed;
      if (drop.y > window.innerHeight) {
        raindrops[i] = spawn(false);
      }
    });

    windowRainAnimId = requestAnimationFrame(renderRain);
  }

  const toggleWeather = () => {
    weatherState = weatherState === 'sunny' ? 'rainy' : 'sunny';
    document.body.setAttribute('data-weather', weatherState);

    if (weatherState === 'rainy') {
      if (!prefersReducedMotion) {
        cancelAnimationFrame(windowRainAnimId);
        raindrops.forEach((_, i) => { raindrops[i] = spawn(true); });
        renderRain();
      }
    } else {
      cancelAnimationFrame(windowRainAnimId);
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    }
  };

  let autoTimer = setInterval(toggleWeather, 30000);

  if (windowEl) {
    const handleManualToggle = () => {
      clearInterval(autoTimer);
      toggleWeather();
      autoTimer = setInterval(toggleWeather, 30000);
    };
    windowEl.addEventListener('click', handleManualToggle);
    windowEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleManualToggle();
      }
    });
  }
}

// ===== 5. Bảng đen: Chữ mất dần từ trái sang phải, rồi hiện lại câu mới từ trái sang phải thật nhẹ nhàng & mượt mà =====
function setupBlackboardQuotes() {
  const quoteEl = document.getElementById('chalk-quote');
  const authorEl = document.getElementById('chalk-author');
  const bodyEl = document.querySelector('.blackboard__body');

  if (!quoteEl || !authorEl) return;

  // Tách chữ thành từng ký tự (gom theo từ để không bị gãy dòng giữa từ)
  const fillWithChars = (el, text) => {
    el.textContent = '';
    const words = text.split(' ');
    words.forEach((word, wi) => {
      const w = document.createElement('span');
      w.className = 'q-word';
      [...word].forEach((ch) => {
        const c = document.createElement('span');
        c.className = 'q-char';
        c.textContent = ch;
        w.appendChild(c);
      });
      el.appendChild(w);
      if (wi < words.length - 1) el.appendChild(document.createTextNode(' '));
    });
  };

  const renderQuote = (idx) => {
    const item = CHALKBOARD_QUOTES[idx];
    fillWithChars(quoteEl, item.quote);
    fillWithChars(authorEl, item.author);
    return [...quoteEl.querySelectorAll('.q-char'), ...authorEl.querySelectorAll('.q-char')];
  };

  // Đo câu dài nhất để khóa chiều cao bảng, đổi câu không làm bảng bị giật kích thước
  const lockBoardSize = () => {
    if (!bodyEl) return;
    bodyEl.style.minHeight = '0px';
    let maxH = 0;
    CHALKBOARD_QUOTES.forEach((_, i) => {
      renderQuote(i);
      maxH = Math.max(maxH, bodyEl.offsetHeight);
    });
    bodyEl.style.minHeight = maxH + 'px';
    renderQuote(currentQuoteIdx);
  };

  renderQuote(currentQuoteIdx);
  lockBoardSize();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(lockBoardSize);

  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(lockBoardSize, 150);
  });

  let isTransitioning = false;

  const cycleQuote = () => {
    if (isTransitioning) return;
    const nextIdx = (currentQuoteIdx + 1) % CHALKBOARD_QUOTES.length;

    if (typeof window.gsap === 'undefined' || prefersReducedMotion) {
      currentQuoteIdx = nextIdx;
      renderQuote(currentQuoteIdx);
      return;
    }

    isTransitioning = true;
    const gsap = window.gsap;
    const oldChars = [...quoteEl.querySelectorAll('.q-char'), ...authorEl.querySelectorAll('.q-char')];

    // Bước 1: Các ký tự câu cũ mất dần êm ái từ trái sang phải (kèm độ nhòe nhẹ như lau phấn)
    gsap.to(oldChars, {
      opacity: 0,
      x: 4,
      filter: 'blur(3px)',
      duration: 0.65,
      ease: 'power2.inOut',
      stagger: {
        each: 0.016,
        from: 'start'
      },
      onComplete: () => {
        // Bước 2: Dựng câu mới ở trạng thái ẩn và cho hiện dần từ trái sang phải thật mượt
        currentQuoteIdx = nextIdx;
        const newChars = renderQuote(currentQuoteIdx);

        gsap.set(newChars, {
          opacity: 0,
          x: -5,
          filter: 'blur(3px)'
        });

        gsap.to(newChars, {
          opacity: 1,
          x: 0,
          filter: 'blur(0px)',
          duration: 0.85,
          ease: 'power2.out',
          stagger: {
            each: 0.018,
            from: 'start'
          },
          onComplete: () => {
            isTransitioning = false;
          }
        });
      }
    });
  };

  // Tự động chuyển câu nhẹ nhàng sau mỗi 11 giây
  setInterval(cycleQuote, 11000);
}

// ===== 6. Cuốn sổ tri ân: bấm vào là sang trang ngắm đèn trời =====
function setupTeacherDeskInteractions() {
  const notebookEl = document.getElementById('gratitude-notebook');
  if (!notebookEl) return;

  const goToLanterns = () => {
    window.location.href = 'view.html';
  };

  notebookEl.addEventListener('click', goToLanterns);
  notebookEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      goToLanterns();
    }
  });
}

// ===== 7. Hiệu ứng chiều sâu Parallax & GSAP Intro =====
function setupParallaxAndIntro() {
  if (typeof window.gsap === 'undefined' || prefersReducedMotion) return;
  const gsap = window.gsap;

  gsap.from('.club-plaque', { y: -28, opacity: 0, duration: 0.85, delay: 0.1, ease: 'power3.out' });
  gsap.from('.window-frame', { x: -35, opacity: 0, duration: 0.85, delay: 0.2, ease: 'power3.out' });
  gsap.from('.blackboard', { x: 35, opacity: 0, duration: 0.85, delay: 0.3, ease: 'power3.out' });
  gsap.from('.teacher-desk', { y: 40, opacity: 0, duration: 0.9, delay: 0.45, ease: 'power3.out' });

  // Hiệu ứng chiều sâu nhẹ khi di chuyển chuột trong phòng học
  const parallaxItems = document.querySelectorAll('[data-parallax]');
  window.addEventListener('mousemove', (e) => {
    const cx = (e.clientX / window.innerWidth - 0.5) * 2;
    const cy = (e.clientY / window.innerHeight - 0.5) * 2;

    parallaxItems.forEach((el) => {
      const depth = parseFloat(el.getAttribute('data-parallax') || '0.03');
      gsap.to(el, {
        x: cx * depth * 320,
        y: cy * depth * 220,
        duration: 0.6,
        ease: 'power2.out'
      });
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initUI();
  playHandwritingTitle();
  initChalkParticles();
  setupWeatherSystem();
  setupBlackboardQuotes();
  setupTeacherDeskInteractions();
  setupParallaxAndIntro();
});