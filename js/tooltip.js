// Shared tooltip helper for every chart.

(function () {
  const el = document.getElementById("tooltip");
  if (!el) return;

  function show(html, event) {
    el.innerHTML = html;
    el.style.display = "block";
    move(event);
  }

  function move(event) {
    if (!event) return;
    const offset = 14;
    const w = el.offsetWidth || 200;
    const h = el.offsetHeight || 60;

    let x = event.clientX + offset;
    let y = event.clientY + offset;

    // Keep on screen
    if (x + w + 8 > window.innerWidth) {
      x = event.clientX - w - offset;
    }
    if (y + h + 8 > window.innerHeight) {
      y = event.clientY - h - offset;
    }

    el.style.left = x + "px";
    el.style.top = y + "px";
  }

  function hide() {
    el.style.display = "none";
  }

  window.tooltip = { show, move, hide };
})();
