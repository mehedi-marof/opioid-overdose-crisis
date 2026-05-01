// Combined trend chart — two views via toggle.
//
// View 1 ("overall"): Total drug overdose deaths, all opioid deaths, non-opioid deaths.
// View 2 ("bytype"):  Fentanyl/synthetics, prescription opioids, heroin.
//
// Range: 1999–2024. Heavy 3px line strokes. Opioid and fentanyl lines in oxblood red.

(function () {
  const W = 760, H = 460;
  const M = { top: 32, right: 150, bottom: 48, left: 56 };
  const innerW = W - M.left - M.right;
  const innerH = H - M.top - M.bottom;

  // Headlines and decks for each view
  const COPY = {
    overall: {
      title: "In 2024, opioid overdose deaths fell sharply, nearing pre-pandemic levels but remaining above 2019.",
      deck:  "U.S. drug overdose deaths, opioid-involved deaths, and non-opioid deaths, 1999–2024."
    },
    bytype: {
      title: "Three waves of an American epidemic.",
      deck:  "U.S. opioid overdose deaths by drug type, 1999–2024. A single death may involve more than one drug."
    }
  };

  // Series definitions per view
  // Color tokens: navy = total/structural, red = opioid/fentanyl (the deadly story),
  // orange = ancillary (non-opioids, prescription).
  const NAVY = "#0a2c4e";
  const RED  = "#a8312a";   // oxblood red for the headline opioid line
  const ORANGE = "#c66024";
  const TEAL = "#3aa48a";

  let data = [];
  let currentView = "overall";

  fetch("data/01_national_trend.csv")
    .then(r => r.text())
    .then(csv => {
      data = csv.trim().split(/\r?\n/).slice(1).map(line => {
        const f = line.split(",");
        const opioid = Number(f[1]);
        const total  = Number(f[2]);
        return {
          year: Number(f[0]),
          total: total,
          opioid: opioid,
          nonopioid: total - opioid,
          rx: Number(f[5]),
          fentanyl: Number(f[6]),
          heroin: Number(f[7])
        };
      });
      // FULL RANGE — 1999 onward
      data = data.filter(d => d.year >= 1999);

      render(currentView);
      bindToggle();
    });

  function render(view) {
    const svg = d3.select("#chart-trend-svg")
      .attr("width", W).attr("height", H);

    // Clear and redraw
    svg.selectAll("*").remove();

    const g = svg.append("g")
      .attr("transform", `translate(${M.left},${M.top})`);

    // Update title and deck
    const titleEl = document.getElementById("trend-title");
    const deckEl  = document.getElementById("trend-deck");
    if (titleEl) titleEl.textContent = COPY[view].title;
    if (deckEl)  deckEl.textContent  = COPY[view].deck;

    // --- Series for this view ---
    let series;
    if (view === "overall") {
      series = [
        { key: "total",     label: "Total drug overdose deaths", short: "Total drug",     color: NAVY,   stroke: 3 },
        { key: "opioid",    label: "All opioid deaths",          short: "All opioids",    color: RED,    stroke: 3 },
        { key: "nonopioid", label: "Non-opioid deaths",          short: "Non-opioids",    color: ORANGE, stroke: 3 }
      ];
    } else {
      series = [
        { key: "fentanyl", label: "Fentanyl / synthetics", short: "Fentanyl",     color: RED,    stroke: 3 },
        { key: "rx",       label: "Prescription opioids",  short: "Prescription", color: ORANGE, stroke: 3 },
        { key: "heroin",   label: "Heroin",                short: "Heroin",       color: TEAL,   stroke: 3 }
      ];
    }

    // Scales
    const x = d3.scaleLinear()
      .domain([1999, 2024])
      .range([0, innerW]);

    const yMax = d3.max(data, d => d3.max(series, s => d[s.key]));
    const y = d3.scaleLinear()
      .domain([0, yMax])
      .nice()
      .range([innerH, 0]);

    // Gridlines
    g.append("g").attr("class", "grid")
      .call(d3.axisLeft(y).tickSize(-innerW).tickFormat("").ticks(6));

    // Axes
    g.append("g").attr("class", "axis")
      .attr("transform", `translate(0,${innerH})`)
      .call(d3.axisBottom(x)
        .tickFormat(d3.format("d"))
        .tickValues([1999, 2004, 2009, 2014, 2019, 2024]));

    g.append("g").attr("class", "axis")
      .call(d3.axisLeft(y).ticks(6)
        .tickFormat(d => d === 0 ? "0" : (d / 1000) + "K"));

    // Lines
    series.forEach(s => {
      const ln = d3.line()
        .x(d => x(d.year))
        .y(d => y(d[s.key]));

      g.append("path")
        .datum(data)
        .attr("fill", "none")
        .attr("stroke", s.color)
        .attr("stroke-width", s.stroke)
        .attr("stroke-linejoin", "round")
        .attr("stroke-linecap", "round")
        .attr("d", ln);
    });

    // End-of-line labels
    const last = data[data.length - 1];
    series.forEach(s => {
      g.append("text")
        .attr("x", x(last.year) + 10)
        .attr("y", y(last[s.key]))
        .attr("dy", "0.32em")
        .attr("fill", s.color)
        .attr("font-size", 13)
        .attr("font-weight", 600)
        .text(s.short);
    });

    // ---- Annotations ----
    if (view === "overall") {
      // Peak (2022 total)
      const peak = data.find(d => d.year === 2022);
      annotate(g, x(peak.year), y(peak.total), "Peak in 2022", peak.total.toLocaleString(), "above", NAVY);

      // 2019 baseline (opioid)
      const y19 = data.find(d => d.year === 2019);
      annotate(g, x(y19.year), y(y19.opioid), "Pre-pandemic", y19.opioid.toLocaleString() + " opioid", "below", RED);

      // 2024 inflection (opioid)
      const cur = data.find(d => d.year === 2024);
      annotate(g, x(cur.year), y(cur.opioid), "2024", cur.opioid.toLocaleString(), "left", RED);

    } else {
      // 2017 Rx peak
      const rxPeak = data.find(d => d.year === 2017);
      annotate(g, x(rxPeak.year), y(rxPeak.rx), "Prescription peak", rxPeak.rx.toLocaleString(), "above", ORANGE);

      // 2016 fentanyl crossover (where fentanyl overtook heroin)
      const cross = data.find(d => d.year === 2016);
      annotate(g, x(cross.year), y(cross.fentanyl), "Fentanyl overtakes heroin", "2016", "above", RED);

      // 2022 fentanyl peak
      const fenPeak = data.find(d => d.year === 2022);
      annotate(g, x(fenPeak.year), y(fenPeak.fentanyl), "Fentanyl peak", fenPeak.fentanyl.toLocaleString(), "above", RED);
    }

    // ---- Hover layer ----
    const focus = g.append("g").style("display", "none");
    focus.append("line")
      .attr("class", "hover-line")
      .attr("y1", 0).attr("y2", innerH)
      .attr("stroke", "#888")
      .attr("stroke-width", 1);

    // One dot per series
    const focusDots = series.map(s =>
      focus.append("circle")
        .attr("class", "hover-dot-" + s.key)
        .attr("r", 5)
        .attr("fill", s.color)
        .attr("stroke", "#fff")
        .attr("stroke-width", 2)
    );

    const bisect = d3.bisector(d => d.year).left;

    svg.append("rect")
      .attr("x", M.left).attr("y", M.top)
      .attr("width", innerW).attr("height", innerH)
      .attr("fill", "none").attr("pointer-events", "all")
      .on("mouseover", () => focus.style("display", null))
      .on("mouseout", () => {
        focus.style("display", "none");
        if (window.tooltip) window.tooltip.hide();
      })
      .on("mousemove", function (event) {
        const [mx] = d3.pointer(event, this);
        const xVal = x.invert(mx - M.left);
        const i = bisect(data, xVal, 1);
        const a = data[i - 1] || data[0];
        const b = data[i] || a;
        const d = (xVal - a.year) > (b.year - xVal) ? b : a;

        focus.select(".hover-line")
          .attr("x1", x(d.year)).attr("x2", x(d.year));

        series.forEach((s, idx) => {
          focusDots[idx]
            .attr("cx", x(d.year))
            .attr("cy", y(d[s.key]));
        });

        const rows = series.map(s =>
          `<div class="tip-row"><span>${s.short}</span><span class="tip-val">${d[s.key].toLocaleString()}</span></div>`
        ).join("");
        const html = `<div class="tip-name">${d.year}</div>${rows}`;
        if (window.tooltip) window.tooltip.show(html, event);
      });
  }

  // ---- Annotation helper ----
  // Places a small text label and dot at (cx, cy), with positioning hint
  function annotate(g, cx, cy, line1, line2, position, color) {
    let dx = 0, dy = 0, anchor = "middle";

    if (position === "above") { dy = -16; }
    else if (position === "below") { dy = 22; }
    else if (position === "left") { dx = -10; dy = 4; anchor = "end"; }
    else if (position === "right") { dx = 10; dy = 4; anchor = "start"; }

    // Dot
    g.append("circle")
      .attr("cx", cx).attr("cy", cy)
      .attr("r", 4)
      .attr("fill", color)
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5);

    // Label (two-line)
    const t = g.append("text")
      .attr("x", cx + dx).attr("y", cy + dy)
      .attr("text-anchor", anchor)
      .attr("font-size", 11)
      .attr("fill", "#1a1612");

    t.append("tspan")
      .attr("x", cx + dx)
      .attr("font-weight", 600)
      .text(line1);

    if (line2) {
      t.append("tspan")
        .attr("x", cx + dx)
        .attr("dy", "1.15em")
        .attr("fill", "#666")
        .text(line2);
    }
  }

  function bindToggle() {
    document.querySelectorAll(".chart-toggle .toggle-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const view = btn.dataset.view;
        if (view === currentView) return;
        currentView = view;

        // Update active class
        document.querySelectorAll(".chart-toggle .toggle-btn").forEach(b => {
          b.classList.toggle("is-active", b === btn);
          b.setAttribute("aria-selected", b === btn ? "true" : "false");
        });

        render(view);
      });
    });
  }
})();
