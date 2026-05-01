// Chart 4 — State recovery, toggleable comparison

(function () {
  const W = 960, H = 485;
  const M = { top: 85, right: 24, bottom: 56, left: 50 };
  const innerW = W - M.left - M.right;
  const innerH = H - M.top - M.bottom;

  const ABOVE = "#a8312a";   // oxblood — still above baseline
  const BELOW = "#6b8e23";   // sage green — recovered below baseline

  // Full state name lookup for tooltip
  const STATE_NAMES = {
    AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
    CO: "Colorado", CT: "Connecticut", DE: "Delaware", DC: "District of Columbia",
    FL: "Florida", GA: "Georgia", HI: "Hawaii", ID: "Idaho", IL: "Illinois",
    IN: "Indiana", IA: "Iowa", KS: "Kansas", KY: "Kentucky", LA: "Louisiana",
    ME: "Maine", MD: "Maryland", MA: "Massachusetts", MI: "Michigan", MN: "Minnesota",
    MS: "Mississippi", MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada",
    NH: "New Hampshire", NJ: "New Jersey", NM: "New Mexico", NY: "New York",
    NC: "North Carolina", ND: "North Dakota", OH: "Ohio", OK: "Oklahoma", OR: "Oregon",
    PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota",
    TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia",
    WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming"
  };

  // Per-view U.S. average
  const US_AVG = {
    v19: { value: 28, label: "U.S. average: +28%" },
    v23: { value: -33, label: "U.S. average: -33%" }
  };

  const TITLE = "Every state's opioid death rate fell in 2024 — but over half remain above pre-pandemic levels";
  const COPY = {
    v19: {
      deck: "Percent change in opioid overdose death rate per 100,000 people, 2019 to 2024"
    },
    v23: {
      deck: "Percent change in opioid overdose death rate per 100,000 people, 2023 to 2024"
    }
  };

  let allData = [];
  let currentView = "v23";

  fetch("data/04_state_recovery.csv")
    .then(r => r.text())
    .then(csv => {
      allData = csv.trim().split(/\r?\n/).slice(1).map(line => {
        const f = line.split(",");
        return {
          state: f[0],
          r19: Number(f[1]),
          r23: Number(f[2]),
          r24: Number(f[3]),
          pct19_24: Number(f[4]),
          pct23_24: Number(f[5])
        };
      });
      render(currentView);
      bindToggle();
    });

  function render(view) {
    const titleEl = document.getElementById("chart4-title");
    const deckEl = document.getElementById("chart4-deck");

    if (titleEl) titleEl.textContent = TITLE;
    if (deckEl) deckEl.textContent = COPY[view].deck;

    const svg = d3.select("#chart4")
      .attr("width", W)
      .attr("height", H);

    svg.selectAll("*").remove();

    const g = svg.append("g")
      .attr("transform", `translate(${M.left},${M.top})`);

    const pctField = view === "v19" ? "pct19_24" : "pct23_24";

    const data = allData
      .map(d => ({ ...d, pct: d[pctField] }))
      .sort((a, b) => b.pct - a.pct);

    const x = d3.scaleBand()
      .domain(data.map(d => d.state))
      .range([0, innerW])
      .padding(0.18);

    const yMaxPos = Math.max(0, d3.max(data, d => d.pct));
    const yMaxNeg = Math.abs(Math.min(0, d3.min(data, d => d.pct)));

    const y = d3.scaleLinear()
      .domain([-yMaxNeg, yMaxPos])
      .range([innerH, 0])
      .nice();

    // Gridlines
    const yTicks = y.ticks(6);

    g.append("g")
      .attr("class", "grid")
      .selectAll("line")
      .data(yTicks)
      .enter()
      .append("line")
      .attr("x1", 0)
      .attr("x2", innerW)
      .attr("y1", d => y(d))
      .attr("y2", d => y(d))
      .attr("stroke", d => d === 0 ? "#1a1612" : "#e8e8e6")
      .attr("stroke-width", d => d === 0 ? 1 : 0.8)
      .attr("stroke-dasharray", d => d === 0 ? null : "2 3");

    // Y-axis labels
    g.append("g")
      .attr("class", "axis")
      .selectAll("text")
      .data(yTicks)
      .enter()
      .append("text")
      .attr("x", -8)
      .attr("y", d => y(d))
      .attr("dy", "0.32em")
      .attr("text-anchor", "end")
      .attr("font-size", 11)
      .attr("fill", "#888")
      .text(d => (d > 0 ? "+" : "") + d + "%");

    // Bars
    g.selectAll(".state-bar")
      .data(data)
      .enter()
      .append("rect")
      .attr("class", "state-bar")
      .attr("x", d => x(d.state))
      .attr("y", d => d.pct >= 0 ? y(d.pct) : y(0))
      .attr("width", x.bandwidth())
      .attr("height", d => Math.abs(y(d.pct) - y(0)))
      .attr("fill", d => d.pct >= 0 ? ABOVE : BELOW)
      .attr("cursor", "pointer")
      .on("mouseover", function (event, d) {
        d3.select(this).attr("opacity", 0.78);

        const fullName = STATE_NAMES[d.state] || d.state;
        const fmt = n => (n >= 0 ? "+" : "") + n + "%";

        const html =
          `<div class="tip-name">${fullName}</div>` +
          `<div class="tip-row"><span>2019 rate</span><span class="tip-val">${d.r19.toFixed(1)} / 100k</span></div>` +
          `<div class="tip-row"><span>2023 rate</span><span class="tip-val">${d.r23.toFixed(1)} / 100k</span></div>` +
          `<div class="tip-row"><span>2024 rate</span><span class="tip-val">${d.r24.toFixed(1)} / 100k</span></div>` +
          `<div class="tip-divider"></div>` +
          `<div class="tip-row"><span>2019 → 2024</span><span class="tip-val">${fmt(d.pct19_24)}</span></div>` +
          `<div class="tip-row"><span>2023 → 2024</span><span class="tip-val">${fmt(d.pct23_24)}</span></div>`;

        if (window.tooltip) window.tooltip.show(html, event);
      })
      .on("mousemove", e => window.tooltip && window.tooltip.move(e))
      .on("mouseout", function () {
        d3.select(this).attr("opacity", 1);
        if (window.tooltip) window.tooltip.hide();
      });

    // State labels
    g.selectAll(".state-label")
      .data(data)
      .enter()
      .append("text")
      .attr("class", "state-label")
      .attr("x", d => x(d.state) + x.bandwidth() / 2)
      .attr("y", d => d.pct >= 0 ? y(0) + 14 : y(0) - 10)
      .attr("text-anchor", "middle")
      .attr("font-size", 9)
      .attr("font-weight", 500)
      .attr("fill", "#666")
      .text(d => d.state);

    // U.S. average annotation
    const avg = US_AVG[view];

    if (avg && avg.value >= y.domain()[0] && avg.value <= y.domain()[1]) {
      g.append("line")
        .attr("class", "avg-line")
        .attr("x1", 0)
        .attr("x2", innerW)
        .attr("y1", y(avg.value))
        .attr("y2", y(avg.value))
        .attr("stroke", "#1a1612")
        .attr("stroke-width", 1)
        .attr("stroke-dasharray", "4 4")
        .attr("opacity", 0.5);

      const labelX = view === "v19" ? innerW * 0.5 : innerW * 0.22;
      const labelY = view === "v19" ? y(avg.value) - 14 : y(avg.value) + 22;

      const labelText = avg.label;
      const charW = 6.2;
      const labelW = labelText.length * charW + 20;
      const labelH = 18;

      const labelG = g.append("g")
        .attr("transform", `translate(${labelX}, ${labelY})`);

      labelG.append("rect")
        .attr("x", -labelW / 2)
        .attr("y", -labelH / 2)
        .attr("width", labelW)
        .attr("height", labelH)
        .attr("fill", "#fafafa")
        .attr("stroke", "#cfcfcc")
        .attr("stroke-width", 1)
        .attr("rx", 2);

      labelG.append("text")
        .attr("x", 0)
        .attr("y", 0)
        .attr("dy", "0.35em")
        .attr("text-anchor", "middle")
        .attr("font-size", 11)
        .attr("font-weight", 600)
        .attr("fill", "#1a1612")
        .text(labelText);
    }

    // Section headers — Above / Below
    const baselineLabel = view === "v19" ? "2019" : "2023";
    const sectionTitleY = -58;
    const sectionDeckY = -40;

    g.append("text")
      .attr("x", 0)
      .attr("y", sectionTitleY)
      .attr("text-anchor", "start")
      .attr("font-size", 12)
      .attr("font-weight", 600)
      .attr("fill", ABOVE)
      .text(`Above ${baselineLabel}`);

    g.append("text")
      .attr("x", 0)
      .attr("y", sectionDeckY)
      .attr("text-anchor", "start")
      .attr("font-size", 11)
      .attr("fill", "#666")
      .text(view === "v19" ? "States with rates higher than before the pandemic" : "States that worsened from 2023");

    g.append("text")
      .attr("x", innerW)
      .attr("y", sectionTitleY)
      .attr("text-anchor", "end")
      .attr("font-size", 12)
      .attr("font-weight", 600)
      .attr("fill", BELOW)
      .text(`Below ${baselineLabel}`);

    g.append("text")
      .attr("x", innerW)
      .attr("y", sectionDeckY)
      .attr("text-anchor", "end")
      .attr("font-size", 11)
      .attr("fill", "#666")
      .text(view === "v19" ? "States that have returned to pre-pandemic levels" : "States that improved from 2023");
  }

  function bindToggle() {
    document.querySelectorAll("#chart-4 .chart-toggle .toggle-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const view = btn.dataset.view;
        if (view === currentView) return;

        currentView = view;

        document.querySelectorAll("#chart-4 .chart-toggle .toggle-btn").forEach(b => {
          b.classList.toggle("is-active", b === btn);
          b.setAttribute("aria-selected", b === btn ? "true" : "false");
        });

        render(view);
      });
    });
  }
})();