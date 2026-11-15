// home.js - Bản 2: Dựng lại hoàn toàn Trang 1 "Góc Ký Ức" theo đúng tài liệu Đề án
// Tuân thủ rule.txt: Chỉ xử lý hiệu ứng & điều hướng của trang Home (Cặp 1). Không đụng tới Firebase.

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Danh sách 30 câu ca dao, tục ngữ, danh ngôn về thầy cô hiển thị trên Bảng đen (15s chuyển 1 lần)
const CHALKBOARD_QUOTES = [
  {
    quote: '“Muốn sang thì bắc cầu kiều, muốn con hay chữ thì yêu lấy thầy.”',
    author: '— Ca dao Việt Nam'
  },
  {
    quote: '“Nhất tự vi sư, bán tự vi sư.”',
    author: '— Tục ngữ truyền thống'
  },
  {
    quote: '“Không thầy đố mày làm nên.”',
    author: '— Tục ngữ Việt Nam'
  },
  {
    quote: '“Cơm cha, áo mẹ, chữ thầy — Gắng công mà học có ngày thành danh.”',
    author: '— Ca dao Việt Nam'
  },
  {
    quote: '“Mười năm rèn luyện sách đèn, công danh gặp bước chớ quên ơn thầy.”',
    author: '— Ca dao Việt Nam'
  },
  {
    quote: '“Ơn thầy soi lối mở đường, cho con vững bước dặm trường tương lai.”',
    author: '— Ca dao tri ân'
  },
  {
    quote: '“Mồng một tết cha, mồng hai tết mẹ, mồng ba tết thầy.”',
    author: '— Tục ngữ Việt Nam'
  },
  {
    quote: '“Gươm vàng rớt xuống Hồ Tây, ơn cha nghĩa trọng công thầy cũng sâu.”',
    author: '— Ca dao Việt Nam'
  },
  {
    quote: '“Tôn sư trọng đạo, uống nước nhớ nguồn.”',
    author: '— Truyền thống hiếu học'
  },
  {
    quote: '“Ăn quả nhớ kẻ trồng cây, có danh có vọng nhớ thầy khi xưa.”',
    author: '— Ca dao Việt Nam'
  },
  {
    quote: '“Chữ thầy trong cõi người ta, dẫu dài muôn dặm chẳng nhòa tháng năm.”',
    author: '— Thơ tri ân'
  },
  {
    quote: '“Bụi phấn rơi rơi trên bục giảng, tóc thầy bạc trắng theo tháng năm.”',
    author: '— Ký ức mái trường'
  },
  {
    quote: '“Con đò dịch bến sang ngang, lời thầy ấm áp hành trang vào đời.”',
    author: '— Ca dao tri ân'
  },
  {
    quote: '“Dẫu đi khắp bốn phương trời, công thầy nghĩa nặng trọn đời khắc ghi.”',
    author: '— Ca dao Việt Nam'
  },
  {
    quote: '“Một đời chở khách qua sông, thuyền neo bến cũ nhớ mong học trò.”',
    author: '— Thơ tặng thầy cô'
  },
  {
    quote: '“Có một nghề bụi phấn bám đầy tay, người ta bảo đó là nghề trong sạch nhất.”',
    author: '— Thơ Đinh Văn Nhã'
  },
  {
    quote: '“Có một nghề không trồng cây vào đất, mà mang lại cho Đời đầy trái ngọt hoa tươi.”',
    author: '— Thơ Đinh Văn Nhã'
  },
  {
    quote: '“Một người thầy giỏi giống như ngọn nến — cháy hết mình để thắp sáng đường đi cho những người khác.”',
    author: '— Mustafa Kemal Atatürk'
  },
  {
    quote: '“Dưới ánh mặt trời không có nghề nào cao quý hơn nghề dạy học.”',
    author: '— Comenius'
  },
  {
    quote: '“Người thầy trung bình chỉ biết nói, người thầy giỏi biết giải thích, người thầy xuất chúng biết minh họa, người thầy vĩ đại biết truyền cảm hứng.”',
    author: '— William Arthur Ward'
  },
  {
    quote: '“Vì lợi ích mười năm thì phải trồng cây, vì lợi ích trăm năm thì phải trồng người.”',
    author: '— Chủ tịch Hồ Chí Minh'
  },
  {
    quote: '“Nghề dạy học là nghề cao quý nhất trong những nghề cao quý, nghề sáng tạo nhất trong những nghề sáng tạo.”',
    author: '— Phạm Văn Đồng'
  },
  {
    quote: '“Một gánh sách không bằng một người thầy giỏi.”',
    author: '— Ngạn ngữ phương Đông'
  },
  {
    quote: '“Trọng thầy mới được làm thầy.”',
    author: '— Tục ngữ Việt Nam'
  },
  {
    quote: '“Học thầy không tày học bạn, nhưng vắng thầy chèo chống khó qua sông.”',
    author: '— Ca dao học đường'
  },
  {
    quote: '“Thầy cô là người gieo hạt giống tri thức và tưới tắm ước mơ cho bao thế hệ học trò.”',
    author: '— Tri ân 20/11'
  },
  {
    quote: '“Thời gian dẫu có phai mờ, tình thầy nghĩa bạn bao giờ lãng quên.”',
    author: '— Ca dao kỷ niệm'
  },
  {
    quote: '“Bảng đen phấn trắng một thời, lời thầy cô dạy suốt đời mang theo.”',
    author: '— Ca dao học trò'
  },
  {
    quote: '“Nắng mưa dãi dầu con đò nhỏ, đưa biết bao người cập bến ước mơ.”',
    author: '— Lưu bút ngày xanh'
  },
  {
    quote: '“Dạy con từ thuở còn thơ, ơn thầy dạy dỗ bến bờ tương lai.”',
    author: '— Ca dao Việt Nam'
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

// ===== 3. Hiệu ứng các ngôi sao đi xuống hết màn hình rồi lặp lại vòng lặp từ trên xuống =====
function initStarParticles() {
  const el = document.getElementById('particles-js');
  if (!el) return;

  if (typeof window.particlesJS !== 'undefined') {
    window.particlesJS('particles-js', {
      particles: {
        number: {
          value: window.innerWidth < 640 ? 35 : 68,
          density: { enable: true, value_area: 850 }
        },
        color: {
          value: ['#FDE68A', '#F59E0B', '#F8FAFC']
        },
        shape: {
          type: 'star',
          stroke: { width: 0, color: '#000000' },
          polygon: { nb_sides: 5 }
        },
        opacity: {
          value: 0.8,
          random: true,
          anim: {
            enable: true,
            speed: 0.8,
            opacity_min: 0.25,
            sync: false
          }
        },
        size: {
          value: 5,
          random: true,
          anim: {
            enable: true,
            speed: 1.2,
            size_min: 2,
            sync: false
          }
        },
        line_linked: { enable: false },
        move: {
          enable: true,
          speed: 1.45,
          direction: 'bottom',
          random: false,
          straight: false,
          out_mode: 'out',
          bounce: false
        }
      },
      interactivity: {
        detect_on: 'canvas',
        events: {
          onhover: { enable: true, mode: 'bubble' },
          onclick: { enable: false },
          resize: true
        },
        modes: {
          bubble: { distance: 120, size: 7, duration: 2, opacity: 1, speed: 2 }
        }
      },
      retina_detect: true
    });
  }
}

// ===== 4. Thời tiết: Khi chuyển từ Mưa -> Nắng, những giọt đang trên màn hình tiếp tục rơi hết xuống đáy mới dừng =====
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

  const dropCount = window.innerWidth < 640 ? 24 : 48;
  const spawn = (initial) => {
    const len = Math.random() * 14 + 14;
    return {
      x: Math.random() * window.innerWidth,
      y: initial ? -Math.random() * window.innerHeight * 0.6 : -len - Math.random() * 150,
      len,
      speed: Math.random() * 3 + 6,
      alpha: Math.random() * 0.3 + 0.45,
      active: true
    };
  };

  let raindrops = [];
  let isLoopRunning = false;

  function renderRain() {
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    ctx.lineWidth = 1.6;
    ctx.lineCap = 'round';

    let activeCount = 0;

    raindrops.forEach((drop, i) => {
      if (!drop.active) return;

      // Vẽ những giọt đang rơi
      ctx.strokeStyle = `rgba(241, 245, 249, ${drop.alpha})`;
      ctx.beginPath();
      ctx.moveTo(drop.x, drop.y);
      ctx.lineTo(drop.x, drop.y + drop.len);
      ctx.stroke();

      drop.y += drop.speed;

      // Khi giọt mưa chạm đáy màn hình:
      if (drop.y > window.innerHeight) {
        if (weatherState === 'rainy') {
          // Đang ở chế độ mưa -> sinh giọt mới từ trên đỉnh rơi tiếp
          raindrops[i] = spawn(false);
          activeCount++;
        } else {
          // Đã chuyển sang chế độ sáng -> không sinh thêm giọt mới, đánh dấu giọt này đã rơi xong
          drop.active = false;
        }
      } else {
        // Nếu đang ở chế độ sáng mà giọt mưa lúc đầu còn nằm khuất phía trên màn hình (y + len < 0)
        // thì huỷ luôn để không có giọt mới bất ngờ xuất hiện từ rìa trên
        if (weatherState !== 'rainy' && drop.y + drop.len < 0) {
          drop.active = false;
        } else {
          activeCount++;
        }
      }
    });

    // Tiếp tục chạy vòng lặp cho đến khi giọt mưa cuối cùng trên màn hình rơi khuất hẳn xuống đáy
    if (weatherState === 'rainy' || activeCount > 0) {
      windowRainAnimId = requestAnimationFrame(renderRain);
    } else {
      isLoopRunning = false;
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    }
  }

  const toggleWeather = () => {
    weatherState = weatherState === 'sunny' ? 'rainy' : 'sunny';
    document.body.setAttribute('data-weather', weatherState);

    if (weatherState === 'rainy') {
      // Nếu lúc chuyển lại sang mưa mà vẫn còn vài giọt cũ đang rơi dở thì giữ nguyên cho tự nhiên,
      // chỉ khởi tạo lại những giọt đã rơi xong (active === false)
      if (raindrops.length === 0) {
        raindrops = Array.from({ length: dropCount }, () => spawn(true));
      } else {
        raindrops.forEach((d, i) => {
          if (!d.active) {
            raindrops[i] = spawn(true);
          }
        });
      }

      if (!isLoopRunning) {
        isLoopRunning = true;
        cancelAnimationFrame(windowRainAnimId);
        renderRain();
      }
    }
    // Khi chuyển sang 'sunny': KHÔNG gọi cancelAnimationFrame hay clearRect ngay lập tức,
    // để vòng lặp renderRain() tự cho những giọt đang có trên màn hình chảy nốt xuống đáy rồi mới tự tắt.
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

// ===== 5. Bảng đen: 30 câu ca dao, 15s chuyển 1 lần (chữ mất dần từ trái sang phải rồi hiện lại từ trái sang phải) =====
function setupBlackboardQuotes() {
  const quoteEl = document.getElementById('chalk-quote');
  const authorEl = document.getElementById('chalk-author');
  const bodyEl = document.querySelector('.blackboard__body');

  if (!quoteEl || !authorEl) return;

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

    if (typeof window.gsap === 'undefined') {
      currentQuoteIdx = nextIdx;
      renderQuote(currentQuoteIdx);
      return;
    }

    isTransitioning = true;
    const gsap = window.gsap;
    const oldChars = [...quoteEl.querySelectorAll('.q-char'), ...authorEl.querySelectorAll('.q-char')];

    // Bước 1: Các ký tự câu cũ mất dần êm ái từ trái sang phải
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

  // Tự động chuyển câu mỗi 15 giây (15000ms)
  setInterval(cycleQuote, 15000);
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
  initStarParticles();
  setupWeatherSystem();
  setupBlackboardQuotes();
  setupTeacherDeskInteractions();
  setupParallaxAndIntro();
});