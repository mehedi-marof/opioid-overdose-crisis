// Scrollytelling map

const MIN_YEAR = 1999;
const MAX_YEAR = 2024;

// Narrative cards: the map updates every year, but only these years show text.

const steps = [
  {
    year: 1999,
    headline: "Before the wave",
    body: [
      "About 8,000 Americans die of an opioid overdose. No state has a rate above 10.2 per 100,000. The crisis is still concentrated in pockets of New Mexico and Appalachia, where prescription painkillers are circulating widely."
    ]
  },
  {
    year: 2007,
    headline: "Appalachia, first",
    body: [
      "West Virginia is now the country's rate leader, at 19 per 100,000. OxyContin, marketed since 1996 as a low-risk treatment for chronic pain, has been widely dispensed. The deaths follow the pills."
    ]
  },
  {
    year: 2012,
    headline: "Pills give way to heroin",
    body: [
      "OxyContin has been reformulated; pill mills have been shut down. Many people dependent on prescription opioids turn to heroin, which is cheaper and more available. Heroin deaths nearly double between 2010 and 2012."
    ]
  },
  {
    year: 2013,
    headline: "Fentanyl enters the supply",
    body: [
      "Illicitly manufactured fentanyl - fifty to a hundred times more potent than morphine - begins appearing in the American drug supply, often mixed into heroin without buyers knowing. The CDC will later mark this year as the start of the third wave."
    ]
  },
  {
    year: 2017,
    headline: "Fentanyl takes over",
    body: [
      "Synthetic opioids overtake every other category as the leading driver of overdose deaths. President Trump declares a public-health emergency. West Virginia's rate hits 49.6, the highest ever recorded by a state to that point."
    ]
  },
  {
    year: 2019,
    headline: "Pre-pandemic baseline",
    body: [
      "Sixteen states are above 20 per 100,000; six are above 30. After a small decline in 2018, public-health officials briefly hope the worst has passed. This is the baseline the country will spend the next five years trying to return to."
    ]
  },
  {
    year: 2020,
    headline: "The pandemic surge",
    body: [
      "The pandemic sharply worsens the crisis. Treatment is disrupted, isolation deepens and fentanyl becomes more entrenched in the illicit drug supply."
    ]
  },
  {
    year: 2022,
    headline: "Peak",
    body: [
      "Opioid-involved deaths reach 81,806 - the highest figure ever recorded. Thirty-four states are above 20 per 100,000; nineteen are above 30. The Covid-19 pandemic, which disrupted treatment and deepened isolation, accelerated everything."
    ]
  },
  {
    year: 2023,
    headline: "First signs of reversal",
    body: [
      "Opioid-involved deaths fall about 3 percent nationally - the largest annual drop in nearly a decade. The decline is uneven: several Eastern states post double-digit drops, while Alaska, Oregon and Washington record their highest rates yet."
    ]
  },
  {
    year: 2024,
    headline: "A sharp reversal",
    body: [
      "Opioid-involved deaths fall to 54,045 - about one-third lower than the year before. Every state and the District of Columbia records a lower opioid death rate than in 2023. West Virginia falls from 71.6 to 38.6 deaths per 100,000. Alaska, at 37, remains among the hardest-hit states."
    ]
  }
];

// FIPS code to match TopoJSON state IDs to the CSV.
const fipsToCode = {
  "01": "AL", "02": "AK", "04": "AZ", "05": "AR", "06": "CA", "08": "CO", "09": "CT", "10": "DE",
  "11": "DC", "12": "FL", "13": "GA", "15": "HI", "16": "ID", "17": "IL", "18": "IN", "19": "IA",
  "20": "KS", "21": "KY", "22": "LA", "23": "ME", "24": "MD", "25": "MA", "26": "MI", "27": "MN",
  "28": "MS", "29": "MO", "30": "MT", "31": "NE", "32": "NV", "33": "NH", "34": "NJ", "35": "NM",
  "36": "NY", "37": "NC", "38": "ND", "39": "OH", "40": "OK", "41": "OR", "42": "PA", "44": "RI",
  "45": "SC", "46": "SD", "47": "TN", "48": "TX", "49": "UT", "50": "VT", "51": "VA", "53": "WA",
  "54": "WV", "55": "WI", "56": "WY"
};

// Color bins for the choropleth.
const colorBins = [5, 10, 20, 35, 50];

const colorRamp = [
  "#a8c79a",
  "#d9e09a",
  "#f3d57a",
  "#e89456",
  "#c95a2e",
  "#7a1a1a"
];

const noDataColor = "#e8e8e0";

function fillForRate(rate) {
  if (rate == null || isNaN(rate)) return noDataColor;

  for (let i = 0; i < colorBins.length; i++) {
    if (rate < colorBins[i]) return colorRamp[i];
  }

  return colorRamp[colorRamp.length - 1];
}

function bubbleRadius(deaths) {
  if (!deaths || deaths < 1) return 0;
  return Math.sqrt(deaths) * 0.30;
}

let currentYear = MIN_YEAR;

// Build the map

async function buildMap() {
  const [topology, csvText] = await Promise.all([
    fetch("data/us-states.topojson").then(r => r.json()),
    fetch("data/02_state_map.csv").then(r => r.text())
  ]);

  // Parse the CSV.
  // Expected columns: state, state_name, year, rate, deaths.
  const rows = csvText.trim().split(/\r?\n/).slice(1).map(line => {
    const [state, name, year, rate, deaths] = line.split(",");

    return {
      state,
      name,
      year: Number(year),
      rate: rate === "" ? null : Number(rate),
      deaths: deaths === "" ? null : Number(deaths)
    };
  });

  // Index by state_year for fast lookup.
  const data = new Map();

  rows.forEach(r => {
    data.set(r.state + "_" + r.year, r);
  });

  // Convert TopoJSON to GeoJSON features.
  const features = topojson.feature(topology, topology.objects.states).features;

  const projection = d3.geoAlbersUsa()
    .scale(1100)
    .translate([487.5, 290]);

  const path = d3.geoPath(projection);

  // Pre-compute centroids for bubbles and callouts.
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

  // Clear the SVG if this file is ever reloaded.
  svg.selectAll("*").remove();

  // Layer 1: state shapes.
  svg.append("g")
    .selectAll("path")
    .data(features)
    .join("path")
    .attr("class", "state")
    .attr("d", path)
    .attr("fill", noDataColor)
    .attr("data-state", f => fipsToCode[String(f.id).padStart(2, "0")] || "")
    .attr("data-name", f => f.properties.name)
    .on("mousemove", function (event, f) {
      const code = fipsToCode[String(f.id).padStart(2, "0")];
      if (!code || !window.tooltip) return;

      const row = data.get(code + "_" + currentYear);
      const rate = row && row.rate != null ? row.rate.toFixed(1) : "—";
      const deaths = row && row.deaths != null ? row.deaths.toLocaleString() : "—";

      const html = `
        <div class="tip-name">${f.properties.name}</div>
        <div class="tip-year">${currentYear}</div>
        <div class="tip-row"><span>Rate per 100k</span><span class="tip-val">${rate}</span></div>
        <div class="tip-row"><span>Total deaths</span><span class="tip-val">${deaths}</span></div>
      `;

      window.tooltip.show(html, event);
    })
    .on("mouseleave", function () {
      if (window.tooltip) window.tooltip.hide();
    });

  // Layer 2: bubbles for raw deaths.
  const bubbleData = [];

  centroids.forEach((c, code) => {
    bubbleData.push({
      state: code,
      cx: c[0],
      cy: c[1]
    });
  });

  svg.append("g")
    .selectAll("circle")
    .data(bubbleData)
    .join("circle")
    .attr("class", "state-bubble")
    .attr("data-state", d => d.state)
    .attr("cx", d => d.cx)
    .attr("cy", d => d.cy)
    .attr("r", 0)
    .attr("opacity", 0);

  // Layer 3: callout labels.
  const calloutGroup = svg.append("g")
    .attr("class", "callouts");

  function paintYear(year) {
    year = Math.max(MIN_YEAR, Math.min(MAX_YEAR, Number(year)));
    currentYear = year;

    const yearLabel = document.getElementById("map-year");
    if (yearLabel) yearLabel.textContent = year;

    // Recolor states.
    svg.selectAll("path.state")
      .attr("fill", function () {
        const code = this.getAttribute("data-state");
        const row = data.get(code + "_" + year);
        return fillForRate(row ? row.rate : null);
      });

    // Resize bubbles.
    svg.selectAll("circle.state-bubble")
      .transition()
      .duration(700)
      .attr("r", function () {
        const code = this.getAttribute("data-state");
        const row = data.get(code + "_" + year);
        return bubbleRadius(row ? row.deaths : 0);
      })
      .attr("opacity", 0.92);

    // Redraw callouts.
    calloutGroup.selectAll("*").remove();

    const yearRows = rows.filter(r =>
      r.year === year &&
      r.rate != null &&
      r.deaths != null
    );

    if (yearRows.length === 0) return;

    const topByRate = yearRows.reduce((a, b) => a.rate >= b.rate ? a : b);
    const topByDeaths = yearRows.reduce((a, b) => a.deaths >= b.deaths ? a : b);

    const annotations = [];

    if (topByRate.state === topByDeaths.state) {
      annotations.push({
        state: topByRate.state,
        name: topByRate.name,
        lines: [
          `Highest rate · ${topByRate.rate.toFixed(1)}/100k`,
          `Highest deaths · ${topByDeaths.deaths.toLocaleString()}`
        ]
      });
    } else {
      annotations.push({
        state: topByRate.state,
        name: topByRate.name,
        lines: [`Highest rate · ${topByRate.rate.toFixed(1)}/100k`]
      });

      annotations.push({
        state: topByDeaths.state,
        name: topByDeaths.name,
        lines: [`Highest deaths · ${topByDeaths.deaths.toLocaleString()}`]
      });
    }

    annotations.forEach((h, i) => {
      const c = centroids.get(h.state);
      if (!c) return;

      const offsetX = i === 1 ? 90 : -90;
      const offsetY = i === 1 ? -50 : -70;
      const labelX = c[0] + offsetX;
      const labelY = c[1] + offsetY;

      const g = calloutGroup.append("g")
        .style("opacity", 0);

      g.append("path")
        .attr("class", "callout-leader")
        .attr("d", `M ${c[0]} ${c[1]} L ${labelX} ${labelY + 6}`);

      g.append("circle")
        .attr("cx", c[0])
        .attr("cy", c[1])
        .attr("r", 3)
        .attr("fill", "#7a1a1a");

      g.append("text")
        .attr("class", "callout-text")
        .attr("x", labelX)
        .attr("y", labelY)
        .attr("text-anchor", offsetX > 0 ? "start" : "end")
        .text(h.name);

      h.lines.forEach((line, j) => {
        g.append("text")
          .attr("class", "callout-rate")
          .attr("x", labelX)
          .attr("y", labelY + 14 + j * 13)
          .attr("text-anchor", offsetX > 0 ? "start" : "end")
          .text(line);
      });

      g.transition()
        .duration(450)
        .delay(150)
        .style("opacity", 1);
    });
  }

  // Initial paint.
  paintYear(MIN_YEAR);

  return { paintYear };
}

// Build one Scrollama step for each year

function buildSteps() {
  const container = document.getElementById("steps");
  if (!container) return;

  container.innerHTML = "";

  const narrativeByYear = new Map(
    steps.map(step => [step.year, step])
  );

  for (let year = MIN_YEAR; year <= MAX_YEAR; year++) {
    const storyStep = narrativeByYear.get(year);

    const el = document.createElement("div");
    el.className = storyStep ? "step has-card" : "step is-blank";
    el.dataset.year = year;

    if (storyStep) {
      el.innerHTML = `
        <div class="step-card" aria-hidden="true">
          <p class="step-year">${storyStep.year}</p>
          <h3 class="step-headline">${storyStep.headline}</h3>
          <div class="step-body">
            ${storyStep.body.map(p => `<p>${p}</p>`).join("")}
          </div>
        </div>
      `;
    }

    container.appendChild(el);
  }
}

// Card state

function setActiveYear(year) {
  document.querySelectorAll(".step").forEach(step => {
    const isActive = +step.dataset.year === year;
    step.classList.toggle("is-active", isActive);

    const card = step.querySelector(".step-card");
    if (card) {
      card.setAttribute("aria-hidden", isActive ? "false" : "true");
    }
  });
}

// Scrollama text per specific year

function wireScrollama(paintYear) {
  const stepEls = document.querySelectorAll(".step");
  if (!stepEls.length) return;

  if (typeof scrollama === "undefined") {
    console.error("Scrollama is not loaded. Check that lib/scrollama.min.js loads before js/map.js.");
    paintYear(MIN_YEAR);
    setActiveYear(MIN_YEAR);
    return;
  }

  let lastPaintedYear = null;

  function paintMaybe(year) {
    if (year === lastPaintedYear) return;

    lastPaintedYear = year;
    paintYear(year);
    setActiveYear(year);
  }

  const scroller = scrollama();

  scroller
    .setup({
      step: ".step",
      offset: 0.6,
      progress: false
    })
    .onStepEnter(response => {
      const year = +response.element.dataset.year;
      paintMaybe(year);
    });

  window.addEventListener("resize", () => {
    scroller.resize();
  });

  // Initial state.
  paintMaybe(MIN_YEAR);
}

// ---- Boot ----

async function main() {
  buildSteps();

  const { paintYear } = await buildMap();

  wireScrollama(paintYear);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", main);
} else {
  main();
}