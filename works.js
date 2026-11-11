const carousel = document.querySelector('.work-carousel');
const viewer = document.querySelector('.work-viewer');
const videoDialog = document.querySelector('.video-dialog');

if (carousel) {
  const track = carousel.querySelector('.work-track');
  const cards = Array.from(track.children);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const pause = carousel.querySelector('[data-pause]');
  const count = carousel.querySelector('[data-work-count]');
  const progress = carousel.querySelector('[data-work-progress]');
  let paused = reducedMotion.matches;
  let settleTimer;
  let animationInProgress = false;
  let current = 0;

  if (cards.length > 1) {
    const clones = Math.min(3, cards.length);
    function cloneCard(card) {
      const copy = card.cloneNode(true);
      copy.setAttribute('aria-hidden', 'true');
      copy.querySelector('a').tabIndex = -1;
      return copy;
    }
    track.prepend(...cards.slice(-clones).map(cloneCard));
    track.append(...cards.slice(0, clones).map(cloneCard));

    const beginning = () => cards[0].offsetLeft;
    const span = () => track.children[clones + cards.length].offsetLeft - beginning();
    const cardWidth = () => cards[1].offsetLeft - beginning();
    function updateProgress() {
      const position = Math.round((track.scrollLeft - beginning()) / cardWidth());
      current = ((position % cards.length) + cards.length) % cards.length;
      count.textContent = String(current + 1).padStart(2, '0') + ' / ' + String(cards.length).padStart(2, '0');
      progress.style.width = ((current + 1) / cards.length * 100) + '%';
    }
    function normalize() {
      const position = track.scrollLeft;
      if (position >= beginning() + span() - 2) {
        track.scrollLeft = position - span();
      } else if (position < beginning() - 2) {
        track.scrollLeft = position + span();
      }
      updateProgress();
      animationInProgress = false;
    }
    function step(direction) {
      if (animationInProgress) return;
      const index = Math.round((track.scrollLeft - beginning()) / cardWidth());
      const next = ((index + direction) % cards.length + cards.length) % cards.length;
      const wraps = index + direction !== next;
      animationInProgress = true;
      track.scrollTo({
        left: cards[next].offsetLeft,
        behavior: wraps || reducedMotion.matches ? 'instant' : 'smooth',
      });
      clearTimeout(settleTimer);
      settleTimer = setTimeout(normalize, 450);
    }
    function showPauseState() {
      const label = paused ? 'Reanudar avance automático' : 'Pausar avance automático';
      pause.textContent = paused ? '▶' : 'Ⅱ';
      pause.setAttribute('aria-label', label);
      pause.title = label;
    }
    carousel.classList.add('enhanced');
    track.scrollLeft = beginning();
    showPauseState();
    updateProgress();
    track.addEventListener('scroll', () => {
      clearTimeout(settleTimer);
      settleTimer = setTimeout(normalize, 130);
    }, { passive: true });
    carousel.querySelector('[data-prev]').addEventListener('click', () => step(-1));
    carousel.querySelector('[data-next]').addEventListener('click', () => step(1));
    pause.addEventListener('click', () => {
      paused = !paused;
      showPauseState();
    });
    reducedMotion.addEventListener('change', () => {
      paused = reducedMotion.matches;
      showPauseState();
    });
    window.addEventListener('resize', () => { track.scrollLeft = cards[current].offsetLeft; });
    setInterval(() => {
      if (!paused && !document.hidden && !carousel.matches(':hover,:focus-within') && !viewer?.open && !videoDialog?.open) step(1);
    }, 4800);
  }
}

if (viewer && typeof viewer.showModal === 'function') {
  const image = viewer.querySelector('img');
  const caption = viewer.querySelector('p');
  document.addEventListener('click', event => {
    const link = event.target.closest('[data-photo]');
    if (!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    image.src = link.href;
    image.alt = link.querySelector('img').alt;
    caption.textContent = image.alt;
    viewer.showModal();
  });
  viewer.addEventListener('click', event => {
    if (event.target === viewer) viewer.close();
  });
  viewer.addEventListener('close', () => { image.removeAttribute('src'); });
}

if (videoDialog && typeof videoDialog.showModal === 'function') {
  const video = videoDialog.querySelector('video');
  const title = videoDialog.querySelector('h2');
  const feedback = videoDialog.querySelector('.video-feedback');
  const timeline = videoDialog.querySelector('[data-video-seek]');
  const time = videoDialog.querySelector('[data-video-time]');
  const mute = videoDialog.querySelector('[data-video-mute]');
  const fullscreen = videoDialog.querySelector('[data-video-full]');
  const playButtons = videoDialog.querySelectorAll('[data-video-toggle]');
  let openedFrom;

  video.removeAttribute('controls');
  videoDialog.classList.add('custom-player');
  fullscreen.hidden = !videoDialog.requestFullscreen && !video.webkitEnterFullscreen;

  function formatTime(seconds) {
    const value = Number.isFinite(seconds) ? Math.floor(seconds) : 0;
    return Math.floor(value / 60) + ':' + String(value % 60).padStart(2, '0');
  }

  function showTime() {
    const hasDuration = Number.isFinite(video.duration) && video.duration > 0;
    timeline.disabled = !hasDuration;
    timeline.max = hasDuration ? video.duration : 1;
    timeline.value = hasDuration ? video.currentTime : 0;
    timeline.setAttribute('aria-valuetext', formatTime(video.currentTime));
    time.textContent = formatTime(video.currentTime) + ' / ' + formatTime(video.duration);
  }

  function showPlayState() {
    const playing = !video.paused && !video.ended;
    videoDialog.classList.toggle('is-playing', playing);
    playButtons.forEach(button => {
      button.textContent = playing ? 'Ⅱ' : '▶';
      button.setAttribute('aria-label', playing ? 'Pausar video' : 'Reproducir video');
    });
  }

  function togglePlay() {
    if (!video.paused) {
      video.pause();
    } else {
      video.play().catch(showPlayState);
    }
  }

  document.addEventListener('click', event => {
    const link = event.target.closest('[data-video]');
    if (!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    openedFrom = link;
    title.textContent = link.dataset.title;
    feedback.hidden = true;
    video.src = link.href;
    showTime();
    videoDialog.showModal();
    video.play().catch(showPlayState);
  });
  playButtons.forEach(button => button.addEventListener('click', togglePlay));
  video.addEventListener('click', togglePlay);
  for (const event of ['play', 'pause', 'ended']) video.addEventListener(event, showPlayState);
  for (const event of ['loadedmetadata', 'durationchange', 'timeupdate']) video.addEventListener(event, showTime);
  video.addEventListener('error', () => {
    if (!videoDialog.open) return;
    feedback.textContent = 'El video no pudo reproducirse.';
    feedback.hidden = false;
    showPlayState();
  });
  timeline.addEventListener('input', () => {
    if (!timeline.disabled) video.currentTime = Number(timeline.value);
  });
  mute.addEventListener('click', () => {
    video.muted = !video.muted;
    mute.textContent = video.muted ? 'Activar sonido' : 'Silenciar';
    mute.setAttribute('aria-pressed', String(video.muted));
  });
  fullscreen.addEventListener('click', async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (videoDialog.requestFullscreen) await videoDialog.requestFullscreen();
      else if (video.webkitEnterFullscreen) video.webkitEnterFullscreen();
    } catch {
      if (video.webkitEnterFullscreen) video.webkitEnterFullscreen();
    }
  });
  videoDialog.querySelector('[data-video-close]').addEventListener('click', () => videoDialog.close());
  videoDialog.addEventListener('click', event => {
    if (event.target === videoDialog) {
      const bounds = videoDialog.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) {
        videoDialog.close();
      }
    }
  });
  videoDialog.addEventListener('close', () => {
    video.pause();
    video.removeAttribute('src');
    video.load();
    if (document.fullscreenElement === videoDialog) document.exitFullscreen().catch(() => {});
    openedFrom?.focus();
  });
}
