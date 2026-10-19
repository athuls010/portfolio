/**
 * ===================================================================
 * ATHUL S KUMAR - PORTFOLIO CONTROLLER
 * Minimalist White Theme, Command Palette, Copy Actions & Navigation
 * ===================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initScrollSpy();
  initCounters();
  initCommandPalette();
  initCopyActions();
  initMobileMenu();
});

/* -------------------------------------------------------------------
   1. THEME MANAGEMENT (DEFAULT ELEGANT WHITE / LIGHT)
   ------------------------------------------------------------------- */
function initTheme() {
  const toggleBtn = document.getElementById('themeToggleBtn');
  const storedTheme = localStorage.getItem('athul-portfolio-theme');
  const defaultTheme = storedTheme || 'light';

  document.documentElement.setAttribute('data-theme', defaultTheme);
  updateThemeIcon(defaultTheme);

  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') || 'light';
      const next = current === 'light' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('athul-portfolio-theme', next);
      updateThemeIcon(next);
      window.dispatchEvent(new Event('resize')); // redraw canvas charts for theme
      showToast(`Switched to ${next === 'light' ? 'Editorial White' : 'Dark'} Mode`);
    });
  }
}

function updateThemeIcon(theme) {
  const icon = document.getElementById('themeToggleIcon');
  const text = document.getElementById('themeToggleText');
  if (icon) {
    icon.textContent = theme === 'light' ? '🌙' : '☀️';
  }
  if (text) {
    text.textContent = theme === 'light' ? 'Dark' : 'Light';
  }
}

/* -------------------------------------------------------------------
   2. SCROLL SPY & STICKY NAVBAR
   ------------------------------------------------------------------- */
function initScrollSpy() {
  const navLinks = document.querySelectorAll('.nav-link');
  const sections = document.querySelectorAll('section[id]');

  window.addEventListener('scroll', () => {
    const scrollY = window.pageYOffset;
    let currentSection = '';

    sections.forEach(section => {
      const sectionTop = section.offsetTop - 100;
      const sectionHeight = section.offsetHeight;
      if (scrollY >= sectionTop && scrollY < sectionTop + sectionHeight) {
        currentSection = section.getAttribute('id');
      }
    });

    navLinks.forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('href') === `#${currentSection}`) {
        link.classList.add('active');
      }
    });
  });
}

/* -------------------------------------------------------------------
   3. ANIMATED METRICS COUNTERS
   ------------------------------------------------------------------- */
function initCounters() {
  const counters = document.querySelectorAll('.counter-val');
  if (!counters.length) return;

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        counters.forEach(counter => {
          const target = parseFloat(counter.getAttribute('data-target') || '0');
          const isDecimal = target % 1 !== 0;
          const duration = 1000;
          const start = performance.now();

          function step(time) {
            const progress = Math.min((time - start) / duration, 1);
            const current = progress * target;
            counter.textContent = isDecimal ? current.toFixed(1) : Math.floor(current);
            if (progress < 1) {
              requestAnimationFrame(step);
            } else {
              counter.textContent = isDecimal ? target.toFixed(1) : target;
            }
          }
          requestAnimationFrame(step);
        });
        obs.disconnect();
      }
    });
  }, { threshold: 0.2 });

  const banner = document.querySelector('.stats-ribbon') || document.querySelector('.metrics-strip');
  if (banner) observer.observe(banner);
}

/* -------------------------------------------------------------------
   4. RECRUITER COMMAND PALETTE (CMD+K / CTRL+K)
   ------------------------------------------------------------------- */
function initCommandPalette() {
  const modalBackdrop = document.getElementById('cmdModal');
  const triggerBtn = document.getElementById('cmdKTrigger');
  const input = document.getElementById('cmdInput');
  const list = document.getElementById('cmdList');
  if (!modalBackdrop || !input) return;

  const commands = [
    { label: '📄 Download Official Resume (PDF)', action: () => downloadResume() },
    { label: '🔗 Open LinkedIn Profile', action: () => window.open('https://www.linkedin.com/in/athulskumar010/', '_blank') },
    { label: '📧 Copy Email Address (athulskumar010@gmail.com)', action: () => copyEmail() },
    { label: '🫁 Jump to AI CXR Software Validation', action: () => jumpTo('projects') },
    { label: '🚶‍♂️ Jump to Markerless Gait Analysis Project', action: () => jumpTo('projects') },
    { label: '🤖 Jump to Indoor Robotics SLAM Project', action: () => jumpTo('projects') },
    { label: '🔬 Jump to Research Areas of Interest', action: () => jumpTo('interests') },
    { label: '📑 View Publication (The Lancet Regional Health Paper)', action: () => jumpTo('publications') },
    { label: '💼 View Experience & AI Systems', action: () => jumpTo('experience') },
    { label: '🛠️ View Technical Expertise Matrix', action: () => jumpTo('expertise') },
    { label: '✍️ Get in Touch / Contact', action: () => jumpTo('contact') }
  ];

  function openPalette() {
    modalBackdrop.classList.add('active');
    input.value = '';
    renderCommands(commands);
    setTimeout(() => input.focus(), 50);
  }

  function closePalette() {
    modalBackdrop.classList.remove('active');
  }

  function renderCommands(items) {
    if (!list) return;
    if (items.length === 0) {
      list.innerHTML = '<div style="padding: 14px; text-align: center; color: var(--text-muted); font-size: 0.85rem;">No matching commands found</div>';
      return;
    }
    list.innerHTML = items.map((cmd, idx) => `
      <div class="cmd-item" data-index="${idx}">
        <span>${cmd.label}</span>
        <span style="font-family: var(--font-mono); font-size: 0.72rem; color: var(--text-muted);">↵</span>
      </div>
    `).join('');

    list.querySelectorAll('.cmd-item').forEach((el, i) => {
      el.addEventListener('click', () => {
        closePalette();
        items[i].action();
      });
    });
  }

  window.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      modalBackdrop.classList.contains('active') ? closePalette() : openPalette();
    }
    if (e.key === 'Escape' && modalBackdrop.classList.contains('active')) {
      closePalette();
    }
  });

  if (triggerBtn) triggerBtn.addEventListener('click', openPalette);

  modalBackdrop.addEventListener('click', (e) => {
    if (e.target === modalBackdrop) closePalette();
  });

  input.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    const filtered = commands.filter(c => c.label.toLowerCase().includes(q));
    renderCommands(filtered);
  });
}

function jumpTo(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth' });
}

function jumpToLab(tabId) {
  jumpTo('labs');
  const btn = document.querySelector(`.lab-tab-btn[data-tab="${tabId}"]`);
  if (btn) btn.click();
}

function downloadResume() {
  const link = document.createElement('a');
  link.href = 'Athul_S_Kumar_Resume.pdf';
  link.download = 'Athul_S_Kumar_Resume.pdf';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast('Downloading Athul_S_Kumar_Resume.pdf...');
}

/* -------------------------------------------------------------------
   5. COPY ACTIONS (EMAIL, PHONE, BIBTEX)
   ------------------------------------------------------------------- */
function copyEmail() {
  const email = 'athulskumar010@gmail.com';
  navigator.clipboard.writeText(email).then(() => {
    showToast(`Copied ${email} to clipboard!`);
  }).catch(() => {
    showToast(`Email: ${email}`);
  });
}

function initCopyActions() {
  const emailBtns = document.querySelectorAll('.copy-email-btn');
  emailBtns.forEach(btn => btn.addEventListener('click', copyEmail));

  const resumeBtns = document.querySelectorAll('.download-resume-btn');
  resumeBtns.forEach(btn => btn.addEventListener('click', downloadResume));

  const bibtexBtn = document.getElementById('copyBibtexBtn');
  if (bibtexBtn) {
    const bibtexStr = `@article{kumar2026chestai,
  title={Performance and Implementation Considerations of an AI-Based Chest Radiography Tool for Tuberculosis Screening in a High-Burden Tertiary Care Setting in India},
  author={Kumar, Athul S. and Colleagues},
  journal={Submitted to The Lancet Regional Health -- Southeast Asia},
  year={2026},
  note={Under Peer Review}
}`;
    bibtexBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(bibtexStr).then(() => {
        showToast('BibTeX citation copied to clipboard!');
      });
    });
  }
}

/* -------------------------------------------------------------------
   6. TOAST NOTIFICATIONS
   ------------------------------------------------------------------- */
function showToast(message) {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<span>✓</span><span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(8px)';
    toast.style.transition = 'all 0.25s ease';
    setTimeout(() => toast.remove(), 250);
  }, 2500);
}

/* -------------------------------------------------------------------
   7. MOBILE NAVIGATION DRAWER
   ------------------------------------------------------------------- */
function initMobileMenu() {
  const menuBtn = document.getElementById('mobileMenuBtn');
  const navLinks = document.getElementById('navLinks');

  if (menuBtn && navLinks) {
    menuBtn.addEventListener('click', () => {
      const isOpen = navLinks.style.display === 'flex';
      navLinks.style.display = isOpen ? 'none' : 'flex';
      if (!isOpen) {
        navLinks.style.position = 'absolute';
        navLinks.style.top = '64px';
        navLinks.style.left = '0';
        navLinks.style.width = '100%';
        navLinks.style.background = 'var(--bg-primary)';
        navLinks.style.flexDirection = 'column';
        navLinks.style.padding = '20px 28px';
        navLinks.style.borderBottom = '1px solid var(--border-card)';
        navLinks.style.boxShadow = 'var(--shadow-md)';
      }
    });

    navLinks.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        if (window.innerWidth <= 640) {
          navLinks.style.display = 'none';
        }
      });
    });
  }
}
