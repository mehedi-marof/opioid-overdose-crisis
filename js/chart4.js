// Chart 4 — State slope chart
//
// One row per state. Three points per row: 2019, 2023, 2024.
// Connected by a trajectory line so you can see the full shape — most states
// rose to a 2023 peak, then fell back. Sorted by 2024 rate descending so the
// most-affected states sit at the top.

(function () {
  const W = 960, H = 760;
  const M = { top: 70, right: 80, bottom: 36, left: 80 };
  const innerW = W - M.left - M.right;
  const innerH = H - M.top - M.bottom;

  const COLOR_2019 = "#9a958d";   // stone gray (baseline before pandemic)
  const COLOR_2023 = "#d6856e";   // muted red (peak)
  const COLOR_2024 = "#a8312a";   // oxblood (current)
  const TRAJECTORY = "#cfcfcc";   // soft connector

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

  fetch("data/04_state_recovery.csv")
    .then(r => r.text())
    .then(csv => {
      const rows = csv.trim().split(/\r?\n/).slice(1).map(line => {
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

      // Sort by 2024 rate descending — worst on top
      rows.sort((a, b) => b.r24 - a.r24);
      draw(rows);
    });

  function draw(data) {
    const svg = d3.select("#chart4")
      .attr("width", W).attr("height", H);

    const g = svg.append("g")
      .attr("transform", `translate(${M.left},${M.top})`);

    // X scale — opioid death rate per 100,000
    const xMax = d3.max(data, d => Math.max(d.r19, d.r23, d.r24)) * 1.05;
    const x = d3.scaleLinear().domain([0, xMax]).range([0, innerW]);

    // Y scale — one band per state
    const y = d3.scaleBand()
      .domain(data.map(d => d.state))
      .range([0, innerH])
      .padding(0.35);

    const rowH = y.bandwidth();

    // Vertical gridlines at axis ticks
    const xTicks = x.ticks(8);
    g.append("g").attr("class", "grid")
      .selectAll("line").data(xTicks).enter()
      .append("line")
      .attr("x1", d => x(d)).attr("x2", d => x(d))
      .attr("y1", 0).attr("y2", innerH)
      .attr("stroke", "#eaeae6")
      .attr("stroke-dasharray", "2 3");

    // Top X axis labels
    g.append("g").attr("class", "axis")
      .selectAll("text").data(xTicks).enter()
      .append("text")
      .attr("x", d => x(d)).attr("y", -10)
      .attr("text-anchor", "middle")
      .attr("font-size", 11)
      .attr("fill", "#888")
      .text(d => d);

    // X axis title
    g.append("text")
      .attr("x", innerW / 2).attr("y", -32)
      .attr("text-anchor", "middle")
      .attr("font-size", 11)
      .attr("fill", "#666")
      .text("Opioid overdose deaths per 100,000 people");

    // Legend at top — three dots
    const legend = g.append("g").attr("transform", "translate(0, -54)");
    const legendItems = [
      { label: "2019", color: COLOR_2019 },
      { label: "2023 (peak)", color: COLOR_2023 },
      { label: "2024", color: COLOR_2024 }
    ];
    let lx = 0;
    legendItems.forEach(item => {
      legend.append("circle").attr("cx", lx + 6).attr("cy", 0).attr("r", 5).attr("fill", item.color);
      const t = legend.append("text").attr("x", lx + 16).attr("y", 0).attr("dy", "0.32em")
        .attr("font-size", 12).attr("fill", "#1a1612")
        .text(item.label);
      lx += 16 + (item.label.length * 7) + 18;
    });

    // ---- One row per state ----
    data.forEach(d => {
      const cy = y(d.state) + rowH / 2;

      // State abbrev (left)
      g.append("text")
        .attr("x", -10).attr("y", cy).attr("dy", "0.32em")
        .attr("text-anchor", "end")
        .attr("font-size", 10)
        .attr("font-weight", 500)
        .attr("fill", "#444")
        .text(d.state);

      // Trajectory line through all three points
      g.append("path")
        .attr("d", `M ${x(d.r19)} ${cy} L ${x(d.r23)} ${cy} L ${x(d.r24)} ${cy}`)
        .attr("fill", "none")
        .attr("stroke", TRAJECTORY)
        .attr("stroke-width", 2);

      // 2019 dot
      g.append("circle")
        .attr("cx", x(d.r19)).attr("cy", cy).attr("r", 3.5)
        .attr("fill", COLOR_2019);

      // 2023 dot (the peak)
      g.append("circle")
        .attr("cx", x(d.r23)).attr("cy", cy).attr("r", 3.5)
        .attr("fill", COLOR_2023);

      // 2024 dot — slightly larger, the current state
      g.append("circle")
        .attr("cx", x(d.r24)).attr("cy", cy).attr("r", 4.5)
        .attr("fill", COLOR_2024);

      // Hover area — wide invisible rect across the row
      g.append("rect")
        .attr("x", -M.left + 4).attr("y", y(d.state))
        .attr("width", innerW + M.left + M.right - 8).attr("height", rowH)
        .attr("fill", "transparent")
        .attr("cursor", "pointer")
        .on("mouseover", function (event) {
          const fullName = STATE_NAMES[d.state] || d.state;
          const html =
            `<div class="tip-name">${fullName}</div>` +
            `<div class="tip-row"><span>2019 rate</span><span class="tip-val">${d.r19.toFixed(1)} / 100k</span></div>` +
            `<div class="tip-row"><span>2023 rate</span><span class="tip-val">${d.r23.toFixed(1)} / 100k</span></div>` +
            `<div class="tip-row"><span>2024 rate</span><span class="tip-val">${d.r24.toFixed(1)} / 100k</span></div>` +
            `<div class="tip-row"><span>2019 → 2024</span><span class="tip-val">${(d.pct19_24 >= 0 ? "+" : "") + d.pct19_24}%</span></div>` +
            `<div class="tip-row"><span>2023 → 2024</span><span class="tip-val">${(d.pct23_24 >= 0 ? "+" : "") + d.pct23_24}%</span></div>`;
          if (window.tooltip) window.tooltip.show(html, event);
        })
        .on("mousemove", e => window.tooltip && window.tooltip.move(e))
        .on("mouseout", function () {
          if (window.tooltip) window.tooltip.hide();
        });
    });

    // 2024 value labels for the top 5 states (those most-affected)
    data.slice(0, 5).forEach(d => {
      const cy = y(d.state) + rowH / 2;
      g.append("text")
        .attr("x", x(d.r24) + 8).attr("y", cy).attr("dy", "0.32em")
        .attr("font-size", 10)
        .attr("font-weight", 700)
        .attr("fill", COLOR_2024)
        .text(d.r24.toFixed(1));
    });
  }
})();
