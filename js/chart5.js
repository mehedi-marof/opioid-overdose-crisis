// Chart 5 — Demographic gaps in opioid overdose death rates
//

(function () {
  const W = 960;
  const H = 720;
  const M = { top: 60, right: 60, bottom: 50, left: 240 };

  const innerW = W - M.left - M.right;

  const COLOR_2019 = "#8a6f4a";
  const COLOR_2024 = "#a8312a";
  const RULE = "#cfcfcc";

  const LAYOUT = [
    {
      heading: "Race & ethnicity",
      groups: [
        "American Indian / Alaska Native",
        "Black",
        "White",
        "Hispanic",
        "Asian"
      ]
    },
    {
      heading: "Age",
      groups: [
        "Ages 26 to 44",
        "Ages 45 to 64",
        "Ages 18 to 25",
        "Ages 65+"
      ]
    },
    {
      heading: "Sex",
      groups: ["Male", "Female"]
    }
  ];

  d3.csv("data/05_demographics.csv", d => ({
    section: d.section,
    group: d.group,
    year: +d.year,
    rate: d.rate === "" ? null : +d.rate
  })).then(rows => {

    // collect r2019 and r2024 per (section, group)
    const lookup = new Map();
    rows.forEach(r => {
      const key = r.section + "|" + r.group;
      if (!lookup.has(key)) lookup.set(key, { section: r.section, group: r.group });
      const obj = lookup.get(key);
      if (r.year === 2019) obj.r2019 = r.rate;
      if (r.year === 2024) obj.r2024 = r.rate;
    });

    // Build sections
    const sections = LAYOUT.map(s => ({
      heading: s.heading,
      rows: s.groups
        .map(g => lookup.get(s.heading + "|" + g))
        .filter(r => r && r.r2019 != null && r.r2024 != null)
    })).filter(s => s.rows.length > 0);

    draw(sections);
  });

  function draw(sections) {
    const svg = d3.select("#chart5")
      .attr("width", W)
      .attr("height", H)
      .attr("viewBox", `0 0 ${W} ${H}`);

    svg.selectAll("*").remove();

    const g = svg.append("g")
      .attr("transform", `translate(${M.left},${M.top})`);

    const allRows = sections.flatMap(s => s.rows);
    const xMax = d3.max(allRows, d => Math.max(d.r2019, d.r2024)) * 1.18;
    const x = d3.scaleLinear().domain([0, xMax]).range([0, innerW]);

    const rowH = 38;
    const headerH = 32;
    let yPos = 0;

    drawLegend(g);
    drawGrid(g, x, sections, rowH, headerH);

    sections.forEach((section, sectionIndex) => {
      drawSectionHeader(g, section.heading, yPos);
      yPos += headerH;

      section.rows.forEach(row => {
        drawRow(g, row, x, yPos, rowH);
        yPos += rowH;
      });

      if (sectionIndex < sections.length - 1) yPos += 16;
    });

    drawAxisLabel(g, x, yPos);
  }

  function drawLegend(g) {
    const legend = g.append("g").attr("transform", "translate(0, -36)");

    legend.append("circle").attr("cx", 0).attr("cy", 0).attr("r", 6).attr("fill", COLOR_2019);
    legend.append("text").attr("x", 11).attr("y", 0).attr("dy", "0.32em")
      .attr("font-size", 12).attr("fill", "#1a1612").text("2019");

    legend.append("circle").attr("cx", 60).attr("cy", 0).attr("r", 7).attr("fill", COLOR_2024);
    legend.append("text").attr("x", 72).attr("y", 0).attr("dy", "0.32em")
      .attr("font-size", 12).attr("fill", "#1a1612").text("2024");
  }

  function drawGrid(g, x, sections, rowH, headerH) {
    let chartHeight = 0;
    sections.forEach((s, i) => {
      chartHeight += headerH + s.rows.length * rowH;
      if (i < sections.length - 1) chartHeight += 16;
    });

    g.append("g")
      .attr("class", "grid")
      .selectAll("line").data(x.ticks(6)).enter()
      .append("line")
      .attr("x1", d => x(d)).attr("x2", d => x(d))
      .attr("y1", -8).attr("y2", chartHeight)
      .attr("stroke", "#e8e8e6").attr("stroke-dasharray", "2 3");
  }

  function drawSectionHeader(g, heading, yPos) {
    g.append("text")
      .attr("x", -M.left + 16).attr("y", yPos + 18)
      .attr("font-size", 12).attr("font-weight", 700)
      .attr("letter-spacing", "0.08em").attr("fill", "#1a1612")
      .text(heading.toUpperCase());

    g.append("line")
      .attr("x1", -M.left + 16).attr("x2", innerW)
      .attr("y1", yPos + 26).attr("y2", yPos + 26)
      .attr("stroke", RULE).attr("stroke-width", 1);
  }

  function drawRow(g, row, x, yPos, rowH) {
    const cy = yPos + rowH / 2 - 4;
    const goingUp = row.r2024 >= row.r2019;
    const direction = goingUp ? 1 : -1;

    // Group label
    g.append("text")
      .attr("x", -16).attr("y", cy).attr("dy", "0.32em")
      .attr("text-anchor", "end")
      .attr("font-size", 14).attr("font-weight", 500).attr("fill", "#1a1612")
      .text(row.group);

    // Connecting line between 2019 and 2024
    g.append("line")
      .attr("x1", x(Math.min(row.r2019, row.r2024)))
      .attr("x2", x(Math.max(row.r2019, row.r2024)))
      .attr("y1", cy).attr("y2", cy)
      .attr("stroke", RULE).attr("stroke-width", 3);

    // Direction arrow at 2024 dot
    g.append("path")
      .attr("d", `M ${x(row.r2024) - 7 * direction} ${cy - 4}
                  L ${x(row.r2024)} ${cy}
                  L ${x(row.r2024) - 7 * direction} ${cy + 4} Z`)
      .attr("fill", COLOR_2024).attr("opacity", 0.7);

    // 2019 dot
    g.append("circle")
      .attr("cx", x(row.r2019)).attr("cy", cy).attr("r", 6)
      .attr("fill", COLOR_2019).attr("cursor", "pointer")
      .on("mouseover", function (event) {
        d3.select(this).attr("r", 8);
        showTip(event, row);
      })
      .on("mousemove", e => window.tooltip && window.tooltip.move(e))
      .on("mouseout", function () {
        d3.select(this).attr("r", 6);
        if (window.tooltip) window.tooltip.hide();
      });

    // 2024 dot
    g.append("circle")
      .attr("cx", x(row.r2024)).attr("cy", cy).attr("r", 7)
      .attr("fill", COLOR_2024).attr("cursor", "pointer")
      .on("mouseover", function (event) {
        d3.select(this).attr("r", 9);
        showTip(event, row);
      })
      .on("mousemove", e => window.tooltip && window.tooltip.move(e))
      .on("mouseout", function () {
        d3.select(this).attr("r", 7);
        if (window.tooltip) window.tooltip.hide();
      });

    // Value labels
    g.append("text")
      .attr("x", x(row.r2019) + (goingUp ? -11 : 11))
      .attr("y", cy).attr("dy", "0.32em")
      .attr("text-anchor", goingUp ? "end" : "start")
      .attr("font-size", 12).attr("font-weight", 500).attr("fill", COLOR_2019)
      .text(row.r2019.toFixed(1));

    g.append("text")
      .attr("x", x(row.r2024) + (goingUp ? 13 : -13))
      .attr("y", cy).attr("dy", "0.32em")
      .attr("text-anchor", goingUp ? "start" : "end")
      .attr("font-size", 13).attr("font-weight", 700).attr("fill", COLOR_2024)
      .text(row.r2024.toFixed(1));
  }

  function drawAxisLabel(g, x, yPos) {
    const axis = g.append("g").attr("transform", `translate(0, ${yPos + 8})`);

    x.ticks(6).forEach(tick => {
      axis.append("text")
        .attr("x", x(tick)).attr("y", 0)
        .attr("text-anchor", "middle")
        .attr("font-size", 11).attr("fill", "#888")
        .text(tick);
    });

    g.append("text")
      .attr("x", innerW / 2).attr("y", yPos + 32)
      .attr("text-anchor", "middle")
      .attr("font-size", 11).attr("fill", "#666")
      .text("Opioid overdose deaths per 100,000 people");
  }

  function fmtChange(r19, r24) {
    if (r19 == null || r24 == null) return "Not available";
    const diff = r24 - r19;
    const direction = diff >= 0 ? "higher" : "lower";
    return `${Math.abs(diff).toFixed(1)} per 100,000 ${direction} than 2019`;
  }

  function showTip(event, d) {
    const html =
      `<div class="tip-name">${d.group}</div>` +
      `<div class="tip-row"><span>2019</span><span class="tip-val">${d.r2019.toFixed(1)} per 100,000</span></div>` +
      `<div class="tip-row"><span>2024</span><span class="tip-val">${d.r2024.toFixed(1)} per 100,000</span></div>` +
      `<div class="tip-row"><span>Change</span><span class="tip-val">${fmtChange(d.r2019, d.r2024)}</span></div>`;
    if (window.tooltip) window.tooltip.show(html, event);
  }
})();
