// WebExpo deck — navigation + minute-based progress
(() => {
  const TOTAL_SLIDES = 27;
  const TOTAL_MINUTES = 40;
  const TALK_END_MINUTE = 37;

  const slides = Array.from(document.querySelectorAll('.slide'));
  const sections = Array.from(document.querySelectorAll('.section'));
  const fill = document.querySelector('.progress__fill');
  const labelInner = document.querySelector('.progress__label-inner');
  const labelName = document.querySelector('.progress__label-name');
  const labelMeta = document.querySelector('.progress__label-meta');

  let current = slides.findIndex(s => s.classList.contains('is-active'));
  if (current < 0) current = 0;

  function show(idx) {
    if (idx < 0 || idx >= slides.length) return;
    if (idx === current) return;

    const prev = slides[current];
    const next = slides[idx];

    prev.classList.remove('is-active');
    prev.classList.add('is-prev');

    void next.offsetWidth; // force reflow → restart entrance animations

    next.classList.remove('is-prev');
    next.classList.add('is-active');

    setTimeout(() => prev.classList.remove('is-prev'), 500);

    current = idx;
    updateProgress();
    positionLeakOverlays(next);
  }

  // Position MCS leak frame + label to match the highlighted row geometry
  function positionLeakOverlays(slide) {
    const wrap = slide.querySelector('.mcs-slide__table-wrap');
    if (!wrap) return;
    const row = wrap.querySelector('.row--leak');
    const frame = wrap.querySelector('.mcs-leak-frame');
    const label = wrap.querySelector('.mcs-leak-label');
    if (!row || !frame) return;

    requestAnimationFrame(() => {
      const wrapRect = wrap.getBoundingClientRect();
      const rowRect = row.getBoundingClientRect();
      const top = rowRect.top - wrapRect.top;
      const left = rowRect.left - wrapRect.left;
      const w = rowRect.width;
      const h = rowRect.height;

      frame.style.top    = (top - 4) + 'px';
      frame.style.left   = (left - 4) + 'px';
      frame.style.width  = (w + 8) + 'px';
      frame.style.height = (h + 8) + 'px';

      if (label) {
        label.style.top  = (top + h / 2 - label.offsetHeight / 2) + 'px';
        label.style.left = (left + w + 14) + 'px';
      }
    });
  }

  function jumpToSlide(num) {
    const idx = slides.findIndex(s => parseInt(s.dataset.slide, 10) === num);
    if (idx >= 0) show(idx);
    else {
      // Closest match (some slides may not be in DOM yet during dev)
      let closest = 0;
      let diff = Infinity;
      slides.forEach((s, i) => {
        const d = Math.abs(parseInt(s.dataset.slide, 10) - num);
        if (d < diff) { diff = d; closest = i; }
      });
      show(closest);
    }
  }

  function updateProgress() {
    const slide = slides[current];
    const slideNum = parseInt(slide.dataset.slide, 10);
    const sectionNum = parseInt(slide.dataset.section, 10);
    const sectionName = slide.dataset.sectionName;
    const minute = parseFloat(slide.dataset.minute);

    // Section dots state (relative to current slide's section)
    sections.forEach(s => {
      const sNum = parseInt(s.dataset.section, 10);
      s.classList.toggle('is-done', sNum < sectionNum);
      s.classList.toggle('is-current', sNum === sectionNum);
    });

    // Fill width: minute / TALK_END_MINUTE × 100% — fill reaches 100% at end of content
    const pct = Math.min(100, (minute / TALK_END_MINUTE) * 100);
    fill.style.width = pct + '%';

    // Label position follows current section's dot — smart anchor to avoid edge overflow
    const currentSection = sections.find(s => parseInt(s.dataset.section, 10) === sectionNum);
    if (currentSection) {
      const posStr = currentSection.style.getPropertyValue('--at');
      const posNum = parseFloat(posStr);
      labelInner.style.setProperty('left', posStr);
      labelInner.classList.remove('is-left', 'is-right');
      if (posNum <= 12)      labelInner.classList.add('is-left');
      else if (posNum >= 88) labelInner.classList.add('is-right');
    }

    labelName.textContent = `section ${sectionNum} · ${sectionName}`;
    const minuteDisplay = Number.isInteger(minute) ? minute : minute.toFixed(1);
    labelMeta.textContent = `slide ${slideNum} of ${TOTAL_SLIDES} · minute ${minuteDisplay} of ${TOTAL_MINUTES}`;
  }

  // Keyboard navigation
  document.addEventListener('keydown', (e) => {
    switch (e.key) {
      case 'ArrowRight':
      case ' ':
      case 'PageDown':
        e.preventDefault();
        show(current + 1);
        break;
      case 'ArrowLeft':
      case 'PageUp':
        e.preventDefault();
        show(current - 1);
        break;
      case 'Home':
        e.preventDefault();
        show(0);
        break;
      case 'End':
        e.preventDefault();
        show(slides.length - 1);
        break;
      case 'f':
      case 'F':
        if (document.fullscreenElement) document.exitFullscreen();
        else document.documentElement.requestFullscreen();
        break;
    }
  });

  // Click on slide stage — left half = prev, right half = next
  document.querySelector('.stage').addEventListener('click', (e) => {
    if (e.target.closest('a, button')) return;
    const x = e.clientX / window.innerWidth;
    if (x > 0.5) show(current + 1);
    else show(current - 1);
  });

  // Click on section dot → jump to first slide of that section
  sections.forEach(s => {
    s.addEventListener('click', (e) => {
      e.stopPropagation();
      const target = parseInt(s.dataset.jump, 10);
      jumpToSlide(target);
    });
  });

  updateProgress();
  positionLeakOverlays(slides[current]);
  window.addEventListener('resize', () => positionLeakOverlays(slides[current]));
})();
