// Hero scroll behavior.
//
// As the user scrolls down past the hero:
//   - The banner image (pill bottle → poppy) fades from 0.85 → 0
//   - The green emphasis on the headline shifts to red
//   - The "Scroll to read" cue fades

(function () {
  const heroSection = document.querySelector(".hero-dark");
  const heroBanner = document.getElementById("hero-banner");
  const scrollCue = document.querySelector(".hero-scroll-cue");
  const heroEmph = document.querySelector(".hero-emph");

  if (!heroSection) return;

  function update() {
    const rect = heroSection.getBoundingClientRect();
    const heroHeight = heroSection.offsetHeight;
    const scrolled = -rect.top;

    // Banner image fades over the first half of the hero scroll
    if (heroBanner) {
      const fadeProgress = Math.max(0, Math.min(1, scrolled / (heroHeight * 0.5)));
      heroBanner.style.opacity = 1 - fadeProgress;
    }

    // Color shift triggers a third of the way through the hero
    if (heroEmph) {
      if (scrolled > heroHeight * 0.33) {
        heroEmph.classList.add("shifted");
      } else {
        heroEmph.classList.remove("shifted");
      }
    }

    // Scroll cue fades after a tiny scroll
    if (scrollCue) {
      if (scrolled > 80) {
        scrollCue.classList.add("faded");
      } else {
        scrollCue.classList.remove("faded");
      }
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
