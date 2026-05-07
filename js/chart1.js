// Chart 1 — National trend

(function () {
  const W = 960, H = 460;
  const M = { top: 32, right: 170, bottom: 48, left: 60 };
  const innerW = W - M.left - M.right;
  const innerH = H - M.top - M.bottom;

  const DRUG = "#8a6f4a";
  const OPIOID = "#a8312a";

  // Load and parse the CSV 
  d3.csv("data/01_national_trend.csv", d => ({
    year: +d.year,
    opioid: +d.opioid_deaths,
    total: +d.all_drug_deaths
  })).then(rows => {
    draw(rows.filter(d => d.year >= 1999));
  });

  function draw(data) {
    const svg = d3.select("#chart1")
      .attr("width", W).attr("height", H);

    const g = svg.append("g")
      .attr("transform", `translate(${M.left},${M.top})`);

    const x = d3.scaleLinear()
      .domain([1999, 2024])
      .range([0, innerW]);

    const yMax = d3.max(data, d => d.total);
    const y = d3.scaleLinear()
      .domain([0, yMax]).nice()
      .range([innerH, 0]);

    // Horizontal gridlines
    g.append("g").attr("class", "grid")
      .call(d3.axisLeft(y).tickSize(-innerW).tickFormat("").ticks(6));

    // X axis
    g.append("g").attr("class", "axis")
      .attr("transform", `translate(0,${innerH})`)
      .call(d3.axisBottom(x)
        .tickFormat(d3.format("d"))
        .tickValues([1999, 2004, 2009, 2014, 2019, 2024]));

    // Y axis
    g.append("g").attr("class", "axis")
      .call(d3.axisLeft(y).ticks(6)
        .tickFormat(d => d === 0 ? "0" : (d / 1000) + "K"));

    // Lines
    const lineTotal = d3.line()
      .x(d => x(d.year)).y(d => y(d.total))
      .curve(d3.curveMonotoneX);
    const lineOpioid = d3.line()
      .x(d => x(d.year)).y(d => y(d.opioid))
      .curve(d3.curveMonotoneX);

    g.append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", DRUG)
      .attr("stroke-width", 3)
      .attr("stroke-linejoin", "round")
      .attr("stroke-linecap", "round")
      .attr("d", lineTotal);

    g.append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", OPIOID)
      .attr("stroke-width", 3)
      .attr("stroke-linejoin", "round")
      .attr("stroke-linecap", "round")
      .attr("d", lineOpioid);

    // End-of-line labels
    const last = data[data.length - 1];

    g.append("text")
      .attr("x", x(last.year) + 12)
      .attr("y", y(last.total))
      .attr("dy", "0.32em")
      .attr("fill", DRUG)
      .attr("font-size", 14)
      .attr("font-weight", 600)
      .text("Total drug");

    g.append("text")
      .attr("x", x(last.year) + 12)
      .attr("y", y(last.total) + 16)
      .attr("dy", "0.32em")
      .attr("fill", "#888")
      .attr("font-size", 12)
      .attr("font-weight", 500)
      .text("overdose deaths");

    g.append("text")
      .attr("x", x(last.year) + 12)
      .attr("y", y(last.opioid))
      .attr("dy", "0.32em")
      .attr("fill", OPIOID)
      .attr("font-size", 14)
      .attr("font-weight", 600)
      .text("Opioid-involved");

    g.append("text")
      .attr("x", x(last.year) + 12)
      .attr("y", y(last.opioid) + 16)
      .attr("dy", "0.32em")
      .attr("fill", "#888")
      .attr("font-size", 12)
      .attr("font-weight", 500)
      .text("overdose deaths");


    // Hover layer
    const focus = g.append("g").style("display", "none");
    focus.append("line")
      .attr("y1", 0).attr("y2", innerH)
      .attr("stroke", "#888").attr("stroke-width", 1);
    const dotTotal = focus.append("circle")
      .attr("r", 5).attr("fill", DRUG)
      .attr("stroke", "#fff").attr("stroke-width", 2);
    const dotOpioid = focus.append("circle")
      .attr("r", 5).attr("fill", OPIOID)
      .attr("stroke", "#fff").attr("stroke-width", 2);

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

        focus.select("line")
          .attr("x1", x(d.year)).attr("x2", x(d.year));
        dotTotal.attr("cx", x(d.year)).attr("cy", y(d.total));
        dotOpioid.attr("cx", x(d.year)).attr("cy", y(d.opioid));

        const html =
          `<div class="tip-name">${d.year}</div>` +
          `<div class="tip-row"><span>Total drug</span><span class="tip-val">${d.total.toLocaleString()}</span></div>` +
          `<div class="tip-row"><span>All opioids</span><span class="tip-val">${d.opioid.toLocaleString()}</span></div>`;
        if (window.tooltip) window.tooltip.show(html, event);
      });
  }
})();
