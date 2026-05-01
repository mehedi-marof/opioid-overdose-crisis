// Chart 4 — State recovery
// Vertical bars: % change in opioid death rate, 2019 to 2024.
// Sorted ascending by % change: worst (largest INCREASE) on the LEFT, best (largest DECLINE) on the RIGHT.
// Above 2019 (still elevated): oxblood. Below 2019 (recovered): stone gray.

(function () {
  const W = 960, H = 460;
  const M = { top: 60, right: 24, bottom: 56, left: 50 };
  const innerW = W - M.left - M.right;
  const innerH = H - M.top - M.bottom;

  const ABOVE = "#a8312a";   // oxblood — still above 2019
  const BELOW = "#9a958d";   // stone gray — below 2019

  fetch("data/04_state_recovery.csv")
    .then(r => r.text())
    .then(csv => {
      const rows = csv.trim().split(/\r?\n/).slice(1).map(line => {
        const f = line.split(",");
        return {
          state: f[0],
          r19: Number(f[1]),
          r24: Number(f[2]),
          pct: Number(f[3])
        };
      });
      // Sort ASCENDING by pct: most negative (best recovery) first... actually we want
      // largest INCREASE on the LEFT and largest DECLINE on the RIGHT, so sort DESCENDING.
      rows.sort((a, b) => b.pct - a.pct);
      draw(rows);
    });

  function draw(data) {
    const svg = d3.select("#chart4")
      .attr("width", W).attr("height", H);

    const g = svg.append("g")
      .attr("transform", `translate(${M.left},${M.top})`);

    // X — categorical states
    const x = d3.scaleBand()
      .domain(data.map(d => d.state))
      .range([0, innerW])
      .padding(0.18);

    // Y — symmetric. Domain extends from largest negative to largest positive.
    const yMaxPos = d3.max(data, d => Math.max(0, d.pct));
    const yMaxNeg = Math.abs(d3.min(data, d => Math.min(0, d.pct)));
    const y = d3.scaleLinear()
      .domain([-yMaxNeg, yMaxPos])
      .range([innerH, 0])
      .nice();

    // Gridlines + zero baseline
    const yTicks = y.ticks(6);
    g.append("g").attr("class", "grid")
      .selectAll("line").data(yTicks).enter()
      .append("line")
      .attr("x1", 0).attr("x2", innerW)
      .attr("y1", d => y(d)).attr("y2", d => y(d))
      .attr("stroke", d => d === 0 ? "#1a1612" : "#e8e8e6")
      .attr("stroke-width", d => d === 0 ? 1 : 0.8)
      .attr("stroke-dasharray", d => d === 0 ? null : "2 3");

    // Y axis labels (left)
    g.append("g").attr("class", "axis")
      .selectAll("text").data(yTicks).enter()
      .append("text")
      .attr("x", -8)
      .attr("y", d => y(d))
      .attr("dy", "0.32em")
      .attr("text-anchor", "end")
      .attr("font-size", 11)
      .attr("fill", "#888")
      .text(d => (d > 0 ? "+" : "") + d + "%");

    // BARS — vertical, hanging from zero
    g.selectAll(".state-bar")
      .data(data).enter()
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
        const html =
          `<div class="tip-name">${d.state}</div>` +
          `<div class="tip-row"><span>2019 rate</span><span class="tip-val">${d.r19.toFixed(1)} / 100k</span></div>` +
          `<div class="tip-row"><span>2024 rate</span><span class="tip-val">${d.r24.toFixed(1)} / 100k</span></div>` +
          `<div class="tip-row"><span>Change</span><span class="tip-val">${(d.pct >= 0 ? "+" : "") + d.pct + "%"}</span></div>`;
        if (window.tooltip) window.tooltip.show(html, event);
      })
      .on("mousemove", e => window.tooltip && window.tooltip.move(e))
      .on("mouseout", function () {
        d3.select(this).attr("opacity", 1);
        if (window.tooltip) window.tooltip.hide();
      });

    // STATE LABELS — under bars (or above zero line, depending on bar direction)
    // For positive bars: label below the zero line. For negative bars: label above the zero line.
    g.selectAll(".state-label")
      .data(data).enter()
      .append("text")
      .attr("class", "state-label")
      .attr("x", d => x(d.state) + x.bandwidth() / 2)
      .attr("y", d => d.pct >= 0 ? y(0) + 14 : y(0) - 6)
      .attr("text-anchor", "middle")
      .attr("font-size", 9)
      .attr("font-weight", 500)
      .attr("fill", "#666")
      .text(d => d.state);

    // Section headers above the chart — "Above 2019" on left, "Below 2019" on right
    g.append("text")
      .attr("x", 0).attr("y", -32)
      .attr("text-anchor", "start")
      .attr("font-size", 12).attr("font-weight", 600)
      .attr("fill", ABOVE)
      .text("Above 2019");
    g.append("text")
      .attr("x", 0).attr("y", -16)
      .attr("text-anchor", "start")
      .attr("font-size", 11)
      .attr("fill", "#666")
      .text("States with rates higher than before the pandemic");

    g.append("text")
      .attr("x", innerW).attr("y", -32)
      .attr("text-anchor", "end")
      .attr("font-size", 12).attr("font-weight", 600)
      .attr("fill", BELOW)
      .text("Below 2019");
    g.append("text")
      .attr("x", innerW).attr("y", -16)
      .attr("text-anchor", "end")
      .attr("font-size", 11)
      .attr("fill", "#666")
      .text("States that have returned to pre-pandemic levels");
  }
})();
