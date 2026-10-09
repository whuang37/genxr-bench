const $ = selector => document.querySelector(selector);

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function smoothstep(min, max, value) {
  const x = Math.min(Math.max((value - min) / (max - min), 0), 1);
  return x * x * (3 - 2 * x);
}

export function initHeroScroll() {
  const wrapper = $('.hero-wrapper');
  const hero = $('.hero');
  const indicator = $('.hero-scroll-indicator');
  if (!wrapper || !hero) return;

  let ticking = false;

  function update() {
    ticking = false;
    if (reducedMotion.matches) {
      hero.style.removeProperty('--hero-content-opacity');
      hero.style.removeProperty('--hero-darkness');
      hero.style.removeProperty('--hero-light-fade');
      hero.style.removeProperty('--hero-scale');
      hero.style.removeProperty('--hero-translate-y');
      hero.style.removeProperty('--hero-exit-y');
      wrapper.style.removeProperty('background');
      hero.style.pointerEvents = 'auto';
      if (indicator) {
        indicator.style.removeProperty('--indicator-opacity');
        indicator.style.pointerEvents = 'auto';
      }
      return;
    }

    const rect = wrapper.getBoundingClientRect();
    const scrollDistance = rect.height - window.innerHeight;

    if (scrollDistance <= 0) {
      hero.style.removeProperty('--hero-content-opacity');
      hero.style.removeProperty('--hero-darkness');
      hero.style.removeProperty('--hero-light-fade');
      hero.style.removeProperty('--hero-scale');
      hero.style.removeProperty('--hero-translate-y');
      hero.style.removeProperty('--hero-exit-y');
      wrapper.style.removeProperty('background');
      hero.style.pointerEvents = 'auto';
      if (indicator) {
        indicator.style.removeProperty('--indicator-opacity');
        indicator.style.pointerEvents = 'auto';
      }
      return;
    }

    const scrolled = -rect.top;
    const progress = Math.min(Math.max(scrolled / scrollDistance, 0), 1);

    // 1. Text floats and fades out early (0 to 0.35 progress)
    const contentProgress = smoothstep(0, 0.35, progress);
    const contentOpacity = 1 - contentProgress;
    const translateY = -(contentProgress * 28);
    const scale = 1 - contentProgress * 0.025;
    const indicatorOpacity = 1 - smoothstep(0, 0.16, progress);

    // 2. Dark overlay clears up, leaving clean hero banner (0.16 to 0.65 progress)
    const undarkenProgress = smoothstep(0.16, 0.65, progress);
    const darkness = 1 - undarkenProgress;

    // 3. Soft white gradient sweeps in across bottom of banner (0.38 to 0.98 progress)
    const lightFadeProgress = smoothstep(0.38, 0.98, progress);

    // 4. Momentum Exit Bridge: hero smoothly begins translating up before unpinning (0.60 to 1.0 progress)
    const exitProgress = smoothstep(0.60, 1.0, progress);
    const exitY = -(exitProgress * 48);

    // 5. Wrapper background smoothly brightens to clean white
    const r = Math.round(12 + (255 - 12) * lightFadeProgress);
    const g = Math.round(18 + (255 - 18) * lightFadeProgress);
    const b = Math.round(14 + (255 - 14) * lightFadeProgress);
    wrapper.style.background = `rgb(${r}, ${g}, ${b})`;

    hero.style.setProperty('--hero-content-opacity', contentOpacity.toFixed(3));
    hero.style.setProperty('--hero-darkness', darkness.toFixed(3));
    hero.style.setProperty('--hero-light-fade', lightFadeProgress.toFixed(3));
    hero.style.setProperty('--hero-scale', scale.toFixed(3));
    hero.style.setProperty('--hero-translate-y', `${translateY.toFixed(1)}px`);
    hero.style.setProperty('--hero-exit-y', `${exitY.toFixed(1)}px`);
    hero.style.pointerEvents = contentOpacity <= 0.04 ? 'none' : 'auto';

    if (indicator) {
      indicator.style.setProperty('--indicator-opacity', indicatorOpacity.toFixed(3));
      indicator.style.pointerEvents = indicatorOpacity <= 0.04 ? 'none' : 'auto';
    }
  }

  function onScroll() {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  reducedMotion.addEventListener('change', update);
  update();
}

export function initHeroMotion() {
  const video = $('.hero-motion');
  let visible = false;
  function update() {
    if (reducedMotion.matches || document.hidden || !visible) {
      video.pause();
      return;
    }
    if (!video.hasAttribute('src')) video.src = new URL(video.dataset.src, document.baseURI).href;
    video.play().catch(() => {});
  }
  reducedMotion.addEventListener('change', update);
  document.addEventListener('visibilitychange', update);
  new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    update();
  }).observe($('.hero'));
}

export function initCarousel() {
  const carousel = $('.carousel');
  const track = $('#carousel-track');
  const slides = [...document.querySelectorAll('.carousel-slide')];
  const videos = slides.map(slide => slide.querySelector('video'));
  const dots = [...document.querySelectorAll('.carousel-dot')];
  let currentIndex = 0;
  let visible = false;

  function updatePlayback() {
    videos.forEach((video, index) => {
      video.controls = reducedMotion.matches && index === currentIndex;
      if (index !== currentIndex || !visible || document.hidden) {
        video.pause();
        return;
      }
      if (!video.hasAttribute('src')) video.src = new URL(video.dataset.src, document.baseURI).href;
      if (reducedMotion.matches) video.pause();
      else video.play().catch(() => {});
    });
  }

  function showSlide(index) {
    currentIndex = (index + slides.length) % slides.length;
    track.style.transform = `translateX(-${currentIndex * 100}%)`;
    slides.forEach((slide, slideIndex) => {
      slide.inert = slideIndex !== currentIndex;
      slide.setAttribute('aria-hidden', slideIndex !== currentIndex);
    });
    dots.forEach((dot, dotIndex) => {
      const active = dotIndex === currentIndex;
      dot.classList.toggle('active', active);
      if (active) dot.setAttribute('aria-current', 'true');
      else dot.removeAttribute('aria-current');
    });
    if (videos[currentIndex].readyState) videos[currentIndex].currentTime = 0;
    updatePlayback();
  }

  videos.forEach((video, index) => video.addEventListener('ended', () => {
    if (index === currentIndex && !reducedMotion.matches) showSlide(currentIndex + 1);
  }));
  $('#carousel-prev').addEventListener('click', () => showSlide(currentIndex - 1));
  $('#carousel-next').addEventListener('click', () => showSlide(currentIndex + 1));
  dots.forEach((dot, index) => dot.addEventListener('click', () => showSlide(index)));
  carousel.addEventListener('keydown', event => {
    if (event.target.tagName === 'VIDEO') return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      showSlide(currentIndex + (event.key === 'ArrowLeft' ? -1 : 1));
    }
  });

  let touchStartX = 0;
  track.addEventListener('touchstart', event => {
    touchStartX = event.changedTouches[0].screenX;
  }, { passive: true });
  track.addEventListener('touchend', event => {
    const distance = event.changedTouches[0].screenX - touchStartX;
    if (Math.abs(distance) > 40) showSlide(currentIndex + (distance > 0 ? -1 : 1));
  }, { passive: true });

  new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    updatePlayback();
  }, { threshold: 0.2 }).observe(carousel);
  document.addEventListener('visibilitychange', updatePlayback);
  reducedMotion.addEventListener('change', updatePlayback);
  showSlide(0);
}
