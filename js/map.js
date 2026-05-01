// The Long Wave — scrollytelling map (Figure 2)
// Loads US map + state data, paints the map by year, swaps year on scroll.

// ---- The eight scroll steps ----
// Each step: a year, a headline, two paragraphs of prose, and 1-2 states to highlight.

const steps = [
  {
    year: 1999,
    headline: "Before the wave.",
    body: [
      "No state reports a rate above 11 per 100,000. Nationwide, fewer than 8,100 people die from opioid overdoses. The crisis is still local — concentrated in a handful of Western and Appalachian states."
    ]
  },
  {
    year: 2004,
    headline: "Appalachia ignites first.",
    body: [
      "West Virginia crosses 14 per 100,000, the highest rate in the country. Prescription opioids — OxyContin, Vicodin, oxycodone — are widely dispensed. Deaths follow the pills."
    ]
  },
  {
    year: 2010,
    headline: "The pills give way to heroin.",
    body: [
      "Reformulations of OxyContin and pill-mill crackdowns close off the legal supply. Many people who became dependent on prescription opioids move to heroin, which is cheaper and more available."
    ]
  },
  {
    year: 2015,
    headline: "Fentanyl enters the supply.",
    body: [
      "Illicitly manufactured fentanyl appears in the heroin supply, especially in the Northeast. New Hampshire's rate jumps to 31 per 100,000 — the steepest single-year rise in any state to that point."
    ]
  },
  {
    year: 2019,
    headline: "The pre-pandemic baseline.",
    body: [
      "Sixteen states are above 20 per 100,000. Six are above 30. Delaware leads at 43, narrowly ahead of West Virginia. This is the year the country will spend the next five trying to return to."
    ]
  },
  {
    year: 2022,
    headline: "The peak.",
    body: [
      "More than 81,800 Americans die of an opioid overdose — the highest figure ever recorded. Twenty states report rates above 30 per 100,000. West Virginia reaches 70."
    ]
  },
  {
    year: 2023,
    headline: "The first signs of decline.",
    body: [
      "Opioid deaths begin to fall — about 3 percent nationally. Several Eastern states post double-digit declines. The reversal does not yet reach the West, where Alaska, Oregon, and Washington still rise."
    ]
  },
  {
    year: 2024,
    headline: "The decline becomes a drop.",
    body: [
      "The national total falls to 54,045 — a 32 percent decline in opioid deaths in a single year. West Virginia's rate drops from 70 to 38. But Alaska, at 37 per 100,000, has barely moved."
    ]
  }
];

// FIPS code -> 2-letter postal code. Needed to match TopoJSON state IDs to the CSV.
const fipsToCode = {
  "01":"AL","02":"AK","04":"AZ","05":"AR","06":"CA","08":"CO","09":"CT","10":"DE",
  "11":"DC","12":"FL","13":"GA","15":"HI","16":"ID","17":"IL","18":"IN","19":"IA",
  "20":"KS","21":"KY","22":"LA","23":"ME","24":"MD","25":"MA","26":"MI","27":"MN",
  "28":"MS","29":"MO","30":"MT","31":"NE","32":"NV","33":"NH","34":"NJ","35":"NM",
  "36":"NY","37":"NC","38":"ND","39":"OH","40":"OK","41":"OR","42":"PA","44":"RI",
  "45":"SC","46":"SD","47":"TN","48":"TX","49":"UT","50":"VT","51":"VA","53":"WA",
  "54":"WV","55":"WI","56":"WY"
};

// Color bins for the choropleth. Same bins for every year so colors mean the same thing.
const colorBins = [5, 10, 20, 35, 50];
const colorRamp = ["#a8c79a", "#d9e09a", "#f3d57a", "#e89456", "#c95a2e", "#7a1a1a"];
const noDataColor = "#e8e8e0";

function fillForRate(rate) {
  if (rate == null || isNaN(rate)) return noDataColor;
  for (let i = 0; i < colorBins.length; i++) {
    if (rate < colorBins[i]) return colorRamp[i];
  }
  return colorRamp[colorRamp.length - 1];
}

// Bubble radius from total deaths. Uses square root so doubling deaths doesn't double area.
function bubbleRadius(deaths) {
  if (!deaths || deaths < 1) return 0;
  return Math.sqrt(deaths) * 0.30;
}

// Tracked outside buildMap so the tooltip handler can read it.
let currentYear = 1999;


// ---- Build the map ----

async function buildMap() {

  // Load the US shapes and the data in parallel.
  const [topology, csvText] = await Promise.all([
    fetch("data/us-states.topojson").then(r => r.json()),
    fetch("data/02_state_map.csv").then(r => r.text())
  ]);

  // Parse the CSV manually. Five columns: state, state_name, year, rate, deaths.
  const rows = csvText.trim().split("\n").slice(1).map(line => {
    const [state, name, year, rate, deaths] = line.split(",");
    return {
      state: state,
      name: name,
      year: Number(year),
      rate: rate === "" ? null : Number(rate),
      deaths: deaths === "" ? null : Number(deaths)
    };
  });

  // Index by "state_year" for fast lookup when painting.
  const data = new Map();
  rows.forEach(r => data.set(r.state + "_" + r.year, r));

  // Convert TopoJSON to GeoJSON features.
  const features = topojson.feature(topology, topology.objects.states).features;

  // Albers USA projection. Scale 1100 keeps Alaska's inset fully inside the 975x610 viewBox.
  // The Albers USA projection places AK in the bottom-left as an inset; at higher scales
  // it bleeds off the lower edge of the SVG. 1100 is the largest value where AK fits cleanly.
  const projection = d3.geoAlbersUsa().scale(1100).translate([487.5, 290]);
  const path = d3.geoPath(projection);

  // Pre-compute the centroid of each state. We'll place bubbles and callouts here.
  const centroids = new Map();
  features.forEach(f => {
    const code = fipsToCode[String(f.id).padStart(2, "0")];
    if (!code) return;
    const c = path.centroid(f);
    if (Number.isFinite(c[0]) && Number.isFinite(c[1])) {
      centroids.set(code, c);
    }
  });

  const svg = d3.select("#map");

  // Layer 1: state shapes.
  svg.append("g").selectAll("path")
    .data(features)
    .join("path")
    .attr("class", "state")
    .attr("d", path)
    .attr("fill", noDataColor)
    .attr("data-state", f => fipsToCode[String(f.id).padStart(2, "0")] || "")
    .attr("data-name", f => f.properties.name)
    .on("mousemove", function (event, f) {
      const code = fipsToCode[String(f.id).padStart(2, "0")];
      if (!code) return;
      const year = currentYear;
      const row = data.get(code + "_" + year);
      const tip = document.getElementById("tooltip");
      if (!tip) { console.warn("tooltip element missing"); return; }
      const rate = row && row.rate != null ? row.rate.toFixed(1) : "—";
      const deaths = row && row.deaths != null ? row.deaths.toLocaleString() : "—";
      tip.innerHTML = `
        <div class="tip-name">${f.properties.name}</div>
        <div class="tip-year">${year}</div>
        <div class="tip-row"><span>Rate per 100k</span><span class="tip-val">${rate}</span></div>
        <div class="tip-row"><span>Total deaths</span><span class="tip-val">${deaths}</span></div>
      `;
      tip.style.cssText = `
        position: fixed;
        display: block;
        pointer-events: none;
        background: #1a1612;
        color: #fff;
        padding: 10px 12px;
        font-size: 12px;
        line-height: 1.4;
        z-index: 9999;
        min-width: 160px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        left: ${event.clientX + 14}px;
        top: ${event.clientY + 14}px;
      `;
    })
    .on("mouseleave", function () {
      const tip = document.getElementById("tooltip");
      if (tip) tip.style.display = "none";
    });

  // Layer 2: bubbles for raw deaths.
  const bubbleData = [];
  centroids.forEach((c, code) => bubbleData.push({ state: code, cx: c[0], cy: c[1] }));

  svg.append("g").selectAll("circle")
    .data(bubbleData)
    .join("circle")
    .attr("class", "state-bubble")
    .attr("data-state", d => d.state)
    .attr("cx", d => d.cx)
    .attr("cy", d => d.cy)
    .attr("r", 0)
    .attr("opacity", 0);

  // Layer 3: callout labels. Drawn on each step change, into this group.
  const calloutGroup = svg.append("g").attr("class", "callouts");

  // Paint the map for one step.
  function showStep(stepIndex) {
    const step = steps[stepIndex];
    const year = step.year;
    currentYear = year;

    document.getElementById("map-year").textContent = year;

    // Recolor states.
    svg.selectAll("path.state").attr("fill", function () {
      const code = this.getAttribute("data-state");
      const row = data.get(code + "_" + year);
      return fillForRate(row ? row.rate : null);
    });

    // Resize bubbles.
    svg.selectAll("circle.state-bubble")
      .transition().duration(700)
      .attr("r", function () {
        const code = this.getAttribute("data-state");
        const row = data.get(code + "_" + year);
        return bubbleRadius(row ? row.deaths : 0);
      })
      .attr("opacity", 0.92);

    // Redraw callouts.
    calloutGroup.selectAll("*").remove();

    // ---- DATA-DRIVEN ANNOTATIONS ----
    // For each year, compute two notable states from the data itself:
    //   1. The state with the highest rate per 100,000 that year
    //   2. The state with the highest total deaths that year
    // If the same state holds both, one combined annotation; otherwise two.
    const yearRows = rows.filter(r => r.year === year && r.rate != null && r.deaths != null);
    if (yearRows.length === 0) return;

    const topByRate   = yearRows.reduce((a, b) => (a.rate   >= b.rate   ? a : b));
    const topByDeaths = yearRows.reduce((a, b) => (a.deaths >= b.deaths ? a : b));

    const annotations = [];
    if (topByRate.state === topByDeaths.state) {
      // Same state holds both records — one callout, two stat lines.
      annotations.push({
        state: topByRate.state,
        name:  topByRate.name,
        lines: [
          `Highest rate · ${topByRate.rate}/100k`,
          `Highest deaths · ${topByDeaths.deaths.toLocaleString()}`
        ]
      });
    } else {
      annotations.push({
        state: topByRate.state,
        name:  topByRate.name,
        lines: [`Highest rate · ${topByRate.rate}/100k`]
      });
      annotations.push({
        state: topByDeaths.state,
        name:  topByDeaths.name,
        lines: [`Highest deaths · ${topByDeaths.deaths.toLocaleString()}`]
      });
    }

    annotations.forEach((h, i) => {
      const c = centroids.get(h.state);
      if (!c) return;

      // Place the label up and to the right or left, alternating when there are two.
      const offsetX = (i === 1) ? 90 : -90;
      const offsetY = (i === 1) ? -50 : -70;
      const labelX = c[0] + offsetX;
      const labelY = c[1] + offsetY;

      const g = calloutGroup.append("g").style("opacity", 0);

      g.append("path")
        .attr("class", "callout-leader")
        .attr("d", `M ${c[0]} ${c[1]} L ${labelX} ${labelY + 6}`);

      g.append("circle")
        .attr("cx", c[0]).attr("cy", c[1]).attr("r", 3)
        .attr("fill", "#7a1a1a");

      // State name (bold)
      g.append("text")
        .attr("class", "callout-text")
        .attr("x", labelX).attr("y", labelY)
        .attr("text-anchor", offsetX > 0 ? "start" : "end")
        .text(h.name);

      // Stat lines (one or two, stacked below)
      h.lines.forEach((line, j) => {
        g.append("text")
          .attr("class", "callout-rate")
          .attr("x", labelX).attr("y", labelY + 14 + j * 13)
          .attr("text-anchor", offsetX > 0 ? "start" : "end")
          .text(line);
      });

      g.transition().duration(450).delay(150).style("opacity", 1);
    });
  }

  // Initial paint: first step.
  showStep(0);

  return showStep;
}


// ---- Build the prose steps ----

function buildSteps() {
  const container = document.getElementById("steps");
  steps.forEach((step, i) => {
    const el = document.createElement("div");
    el.className = "step";
    el.dataset.index = i;
    el.innerHTML = `
      <div class="step-card">
        <p class="step-year">${step.year}</p>
        <h3 class="step-headline">${step.headline}</h3>
        <div class="step-body">
          ${step.body.map(p => `<p>${p}</p>`).join("")}
        </div>
      </div>
    `;
    container.appendChild(el);
  });
}


// ---- Wire up scrollama ----

function wireScroll(showStep) {
  const scroller = scrollama();

  scroller.setup({
    step: ".step",
    offset: 0.6
  })
  .onStepEnter(({ element, index }) => {
    document.querySelectorAll(".step").forEach(s => s.classList.remove("is-active"));
    element.classList.add("is-active");
    showStep(index);
  });

  window.addEventListener("resize", scroller.resize);
}


// ---- Boot ----

async function main() {
  buildSteps();
  const showStep = await buildMap();
  wireScroll(showStep);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", main);
} else {
  main();
}
