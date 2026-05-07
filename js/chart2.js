// Chart 2 — Three waves of an American epidemic

(function () {
  const W = 960, H = 480;
  const M = { top: 60, right: 170, bottom: 48, left: 60 };
  const innerW = W - M.left - M.right;
  const innerH = H - M.top - M.bottom;

  // same palette used everywhere on the page
  const FENTANYL = "#a8312a";   // oxblood
  const RX = "#8a6f4a";   //  brown
  const HEROIN = "#6b8e23";   // green
  const BAND_BG = "#f0eee8";   // cream

  fetch("data/01_national_trend.csv")
    .then(r => r.text())
    .then(csv => {
      const rows = csv.trim().split(/\r?\n/).slice(1).map(line => {
        const f = line.split(",");
        return {
          year: Number(f[0]),
          rx: Number(f[5]),
          fentanyl: Number(f[6]),
          heroin: Number(f[7])
        };
      });
      draw(rows.filter(d => d.year >= 1999));
    });

  function draw(data) {
    const svg = d3.select("#chart2")
      .attr("width", W).attr("height", H);

    const g = svg.append("g")
      .attr("transform", `translate(${M.left},${M.top})`);

    const x = d3.scaleLinear().domain([1999, 2024]).range([0, innerW]);
    const yMax = d3.max(data, d => Math.max(d.rx, d.fentanyl, d.heroin));
    const y = d3.scaleLinear().domain([0, yMax]).nice().range([innerH, 0]);

    // ---- Wave bands ----
    const waves = [
      { from: 1999, to: 2010, label: "Wave 1", sub: "Prescription opioids", color: RX },
      { from: 2010, to: 2013, label: "Wave 2", sub: "Heroin", color: HEROIN },
      { from: 2013, to: 2024, label: "Wave 3", sub: "Fentanyl", color: FENTANYL }
    ];

    // Shaded background bands
    waves.forEach((w, i) => {
      g.append("rect")
        .attr("x", x(w.from))
        .attr("width", x(w.to) - x(w.from))
        .attr("y", 0).attr("height", innerH)
        .attr("fill", i % 2 === 0 ? BAND_BG : "#f7f5ef")
        .attr("opacity", 0.6);
    });

    // Wave labels at top
    waves.forEach(w => {
      const cx = x(w.from) + (x(w.to) - x(w.from)) / 2;
      g.append("text")
        .attr("x", cx).attr("y", -36)
        .attr("text-anchor", "middle")
        .attr("font-size", 11)
        .attr("font-weight", 700)
        .attr("letter-spacing", "0.08em")
        .attr("fill", w.color)
        .text(w.label.toUpperCase());
      g.append("text")
        .attr("x", cx).attr("y", -22)
        .attr("text-anchor", "middle")
        .attr("font-size", 12)
        .attr("font-weight", 500)
        .attr("fill", "#1a1612")
        .text(w.sub);
      // Date range
      g.append("text")
        .attr("x", cx).attr("y", -8)
        .attr("text-anchor", "middle")
        .attr("font-size", 10)
        .attr("fill", "#888")
        .text(`${w.from}–${w.to === 2024 ? "present" : w.to}`);
    });

    // Wave separators
    [2010, 2013].forEach(yr => {
      g.append("line")
        .attr("x1", x(yr)).attr("x2", x(yr))
        .attr("y1", -42).attr("y2", innerH)
        .attr("stroke", "#cfcfcc")
        .attr("stroke-width", 1)
        .attr("stroke-dasharray", "3 3");
    });

    // ---- Gridlines ----
    g.append("g").attr("class", "grid")
      .call(d3.axisLeft(y).tickSize(-innerW).tickFormat("").ticks(6));

    // ---- Axes ----
    g.append("g").attr("class", "axis")
      .attr("transform", `translate(0,${innerH})`)
      .call(d3.axisBottom(x)
        .tickFormat(d3.format("d"))
        .tickValues([1999, 2004, 2009, 2014, 2019, 2024]));

    g.append("g").attr("class", "axis")
      .call(d3.axisLeft(y).ticks(6)
        .tickFormat(d => d === 0 ? "0" : (d / 1000) + "K"));

    // ---- Lines ----
    const lineRx = d3.line().x(d => x(d.year)).y(d => y(d.rx)).curve(d3.curveMonotoneX);
    const lineHeroin = d3.line().x(d => x(d.year)).y(d => y(d.heroin)).curve(d3.curveMonotoneX);
    const lineFen = d3.line().x(d => x(d.year)).y(d => y(d.fentanyl)).curve(d3.curveMonotoneX);

    g.append("path").datum(data)
      .attr("fill", "none").attr("stroke", RX)
      .attr("stroke-width", 2.5)
      .attr("stroke-linejoin", "round").attr("stroke-linecap", "round")
      .attr("d", lineRx);

    g.append("path").datum(data)
      .attr("fill", "none").attr("stroke", HEROIN)
      .attr("stroke-width", 2.5)
      .attr("stroke-linejoin", "round").attr("stroke-linecap", "round")
      .attr("d", lineHeroin);

    g.append("path").datum(data)
      .attr("fill", "none").attr("stroke", FENTANYL)
      .attr("stroke-width", 3.2)
      .attr("stroke-linejoin", "round").attr("stroke-linecap", "round")
      .attr("d", lineFen);

    // ---- End-of-line labels ----
    const last = data[data.length - 1];

    // Labels for the three lines
    g.append("text")
      .attr("x", x(last.year) + 12).attr("y", y(last.fentanyl))
      .attr("dy", "0.32em")
      .attr("fill", FENTANYL).attr("font-size", 14).attr("font-weight", 600)
      .text("Fentanyl");

    g.append("text")
      .attr("x", x(last.year) + 12).attr("y", y(last.fentanyl) + 16)
      .attr("dy", "0.32em")
      .attr("fill", "#888").attr("font-size", 11).attr("font-weight", 500)
      .text("& other synthetics");

    g.append("text")
      .attr("x", x(last.year) + 12).attr("y", y(last.rx))
      .attr("dy", "0.32em")
      .attr("fill", RX).attr("font-size", 14).attr("font-weight", 600)
      .text("Prescription");

    g.append("text")
      .attr("x", x(last.year) + 12).attr("y", y(last.heroin))
      .attr("dy", "0.32em")
      .attr("fill", HEROIN).attr("font-size", 14).attr("font-weight", 600)
      .text("Heroin");

    // ---- Hover ----
    const focus = g.append("g").style("display", "none");
    focus.append("line")
      .attr("y1", 0).attr("y2", innerH)
      .attr("stroke", "#888").attr("stroke-width", 1);
    const dotFen = focus.append("circle").attr("r", 5).attr("fill", FENTANYL).attr("stroke", "#fff").attr("stroke-width", 2);
    const dotRx = focus.append("circle").attr("r", 5).attr("fill", RX).attr("stroke", "#fff").attr("stroke-width", 2);
    const dotHer = focus.append("circle").attr("r", 5).attr("fill", HEROIN).attr("stroke", "#fff").attr("stroke-width", 2);

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

        focus.select("line").attr("x1", x(d.year)).attr("x2", x(d.year));
        dotFen.attr("cx", x(d.year)).attr("cy", y(d.fentanyl));
        dotRx.attr("cx", x(d.year)).attr("cy", y(d.rx));
        dotHer.attr("cx", x(d.year)).attr("cy", y(d.heroin));

        const html =
          `<div class="tip-name">${d.year}</div>` +
          `<div class="tip-row"><span>Fentanyl &amp; other synthetics</span><span class="tip-val">${d.fentanyl.toLocaleString()}</span></div>` +
          `<div class="tip-row"><span>Prescription</span><span class="tip-val">${d.rx.toLocaleString()}</span></div>` +
          `<div class="tip-row"><span>Heroin</span><span class="tip-val">${d.heroin.toLocaleString()}</span></div>`;
        if (window.tooltip) window.tooltip.show(html, event);
      });
  }
})();
