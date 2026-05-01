// Hero scroll behavior
//
// Sets a single CSS custom property `--hero-scroll` (0 to 1) based on
// how far the user has scrolled into the hero. The CSS uses this value
// to drive:
//   - color of the green "fell faster than ever" → red
//   - subtle parallax lift on the image
//
// All entrance animations are CSS-driven on load. Scroll only progresses
// once the user actually scrolls.

(function () {
  const hero = document.getElementById("hero");
  const cue  = document.querySelector(".hero-scroll-cue");
  if (!hero) return;

  function update() {
    const heroH = hero.offsetHeight;
    const scrolled = window.scrollY;

    // Scroll progress within the hero, 0 to 1
    const progress = Math.max(0, Math.min(1, scrolled / heroH));
    hero.style.setProperty("--hero-scroll", progress.toFixed(3));

    // Fade the cue once the user has clearly engaged with scroll
    if (cue) {
      if (scrolled > 60) cue.classList.add("faded");
      else cue.classList.remove("faded");
    }
  }

  let ticking = false;
  window.addEventListener("scroll", () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        update();
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });

  update();
})();
