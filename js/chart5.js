// Chart 5 — Demographics in three angles
//   Race & ethnicity  (5 groups)
//   Age              (4 groups)
//   Sex              (2 groups)
// Same dumbbell treatment for each: 2019 (gray dot) → 2024 (oxblood dot).
// Section headers separate the groups.

(function () {
  const W = 960, H = 720;
  const M = { top: 60, right: 60, bottom: 50, left: 240 };
  const innerW = W - M.left - M.right;

  const COLOR_2019 = "#9a958d";   // stone gray
  const COLOR_2024 = "#a8312a";   // oxblood
  const RULE = "#cfcfcc";

  // All three sections combined, in display order.
  // Each row is one demographic group with 2019 and 2024 rates per 100,000.
  const sections = [
    {
      heading: "Race & ethnicity",
      rows: [
        { group: "American Indian / Alaska Native", short: "AIAN",     r19: 17.7, r24: 35.5 },
        { group: "Black",                           short: "Black",    r19: 16.4, r24: 22.8 },
        { group: "White",                           short: "White",    r19: 18.9, r24: 17.5 },
        { group: "Hispanic",                        short: "Hispanic", r19:  9.0, r24: 11.8 },
        { group: "Asian / Pacific Islander",        short: "Asian",    r19:  1.5, r24:  2.4 }
      ]
    },
    {
      heading: "Age",
      rows: [
        { group: "Ages 26 to 44",  short: "26–44",  r19: 28.2, r24: 29.1 },
        { group: "Ages 45 to 64",  short: "45–64",  r19: 21.8, r24: 24.9 },
        { group: "Ages 18 to 25",  short: "18–25",  r19: 12.8, r24:  9.3 },
        { group: "Ages 65+",       short: "65+",    r19:  3.8, r24:  7.0 }
      ]
    },
    {
      heading: "Sex",
      rows: [
        { group: "Male",   short: "Male",   r19: 21.0, r24: 22.5 },
        { group: "Female", short: "Female", r19:  8.6, r24:  9.5 }
      ]
    }
  ];

  draw();

  function draw() {
    const svg = d3.select("#chart5")
      .attr("width", W).attr("height", H);

    const g = svg.append("g")
      .attr("transform", `translate(${M.left},${M.top})`);

    // Compute global x scale across all rows
    const allRows = sections.flatMap(s => s.rows);
    const xMax = d3.max(allRows, d => Math.max(d.r19, d.r24)) * 1.18;
    const x = d3.scaleLinear().domain([0, xMax]).range([0, innerW]);

    // Lay out rows top-to-bottom with extra space between sections
    const rowH = 38;
    const headerH = 32;
    let yPos = 0;

    // Top legend
    const legend = g.append("g").attr("transform", "translate(0, -36)");
    legend.append("circle").attr("cx", 0).attr("cy", 0).attr("r", 6).attr("fill", COLOR_2019);
    legend.append("text").attr("x", 11).attr("y", 0).attr("dy", "0.32em")
      .attr("font-size", 12).attr("fill", "#1a1612")
      .text("2019");
    legend.append("circle").attr("cx", 60).attr("cy", 0).attr("r", 7).attr("fill", COLOR_2024);
    legend.append("text").attr("x", 72).attr("y", 0).attr("dy", "0.32em")
      .attr("font-size", 12).attr("fill", "#1a1612")
      .text("2024");

    // Top axis (x ticks)
    const xAxisTicks = x.ticks(6);
    g.append("g").attr("class", "grid")
      .selectAll("line").data(xAxisTicks).enter()
      .append("line")
      .attr("x1", d => x(d)).attr("x2", d => x(d))
      .attr("y1", -8)
      .attr("y2", () => {
        // Approx total height (headers + row groups + gaps)
        let total = 0;
        sections.forEach((s, i) => {
          total += headerH;
          total += s.rows.length * rowH;
          if (i < sections.length - 1) total += 16;
        });
        return total;
      })
      .attr("stroke", "#e8e8e6")
      .attr("stroke-dasharray", "2 3");

    // Render each section
    sections.forEach((section, sidx) => {
      // Section header
      const header = g.append("g")
        .attr("transform", `translate(${-M.left + 16}, ${yPos + 18})`);
      header.append("text")
        .attr("x", 0).attr("y", 0)
        .attr("font-size", 12)
        .attr("font-weight", 700)
        .attr("letter-spacing", "0.08em")
        .attr("fill", "#1a1612")
        .text(section.heading.toUpperCase());

      // Section divider rule
      g.append("line")
        .attr("x1", -M.left + 16).attr("x2", innerW)
        .attr("y1", yPos + 26).attr("y2", yPos + 26)
        .attr("stroke", RULE)
        .attr("stroke-width", 1);

      yPos += headerH;

      // Rows for this section
      section.rows.forEach(row => {
        const cy = yPos + rowH / 2 - 4;

        // Group label (left)
        g.append("text")
          .attr("x", -16).attr("y", cy)
          .attr("dy", "0.32em")
          .attr("text-anchor", "end")
          .attr("font-size", 14)
          .attr("font-weight", 500)
          .attr("fill", "#1a1612")
          .text(row.group);

        // Connector line
        g.append("line")
          .attr("x1", x(Math.min(row.r19, row.r24)))
          .attr("x2", x(Math.max(row.r19, row.r24)))
          .attr("y1", cy).attr("y2", cy)
          .attr("stroke", RULE)
          .attr("stroke-width", 3);

        // Direction arrow at the 2024 end
        const goingUp = row.r24 >= row.r19;
        const dirSign = goingUp ? 1 : -1;
        g.append("path")
          .attr("d", `M ${x(row.r24) - 7 * dirSign} ${cy - 4} L ${x(row.r24)} ${cy} L ${x(row.r24) - 7 * dirSign} ${cy + 4} Z`)
          .attr("fill", COLOR_2024)
          .attr("opacity", 0.7);

        // 2019 dot
        g.append("circle")
          .attr("cx", x(row.r19)).attr("cy", cy).attr("r", 6)
          .attr("fill", COLOR_2019)
          .attr("cursor", "pointer")
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
          .attr("cx", x(row.r24)).attr("cy", cy).attr("r", 7)
          .attr("fill", COLOR_2024)
          .attr("cursor", "pointer")
          .on("mouseover", function (event) {
            d3.select(this).attr("r", 9);
            showTip(event, row);
          })
          .on("mousemove", e => window.tooltip && window.tooltip.move(e))
          .on("mouseout", function () {
            d3.select(this).attr("r", 7);
            if (window.tooltip) window.tooltip.hide();
          });

        // 2019 value label (on side opposite to 2024)
        g.append("text")
          .attr("x", x(row.r19) + (goingUp ? -11 : 11))
          .attr("y", cy).attr("dy", "0.32em")
          .attr("text-anchor", goingUp ? "end" : "start")
          .attr("font-size", 12)
          .attr("font-weight", 500)
          .attr("fill", COLOR_2019)
          .text(row.r19.toFixed(1));

        // 2024 value label (outboard)
        g.append("text")
          .attr("x", x(row.r24) + (goingUp ? 13 : -13))
          .attr("y", cy).attr("dy", "0.32em")
          .attr("text-anchor", goingUp ? "start" : "end")
          .attr("font-size", 13)
          .attr("font-weight", 700)
          .attr("fill", COLOR_2024)
          .text(row.r24.toFixed(1));

        yPos += rowH;
      });

      // Gap before next section
      if (sidx < sections.length - 1) yPos += 16;
    });

    // Bottom x-axis labels
    const axisG = g.append("g").attr("transform", `translate(0, ${yPos + 8})`);
    xAxisTicks.forEach(t => {
      axisG.append("text")
        .attr("x", x(t)).attr("y", 0)
        .attr("text-anchor", "middle")
        .attr("font-size", 11)
        .attr("fill", "#888")
        .text(t);
    });

    g.append("text")
      .attr("x", innerW / 2).attr("y", yPos + 32)
      .attr("text-anchor", "middle")
      .attr("font-size", 11)
      .attr("fill", "#666")
      .text("Opioid overdose deaths per 100,000 people");

    function showTip(event, d) {
      const change = ((d.r24 - d.r19) / d.r19 * 100).toFixed(0);
      const sign = change >= 0 ? "+" : "";
      const html =
        `<div class="tip-name">${d.group}</div>` +
        `<div class="tip-row"><span>2019 rate</span><span class="tip-val">${d.r19.toFixed(1)} / 100k</span></div>` +
        `<div class="tip-row"><span>2024 rate</span><span class="tip-val">${d.r24.toFixed(1)} / 100k</span></div>` +
        `<div class="tip-row"><span>Change</span><span class="tip-val">${sign}${change}%</span></div>`;
      if (window.tooltip) window.tooltip.show(html, event);
    }
  }
})();
