const $ = selector => document.querySelector(selector);

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

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
