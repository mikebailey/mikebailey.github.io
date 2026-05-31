// PUBLIC Mapbox access token (safe to commit; client-side use is what it is for).
// Configure URL allowlist on the Mapbox account for michaelbailey.org.
mapboxgl.accessToken = "pk.eyJ1IjoibWlrZXRoZWNoYW1waW9uIiwiYSI6ImNtcHJycGVwMzEyNGUyc29lbDg3MjRubGUifQ.W5gn-AZzwLAc0W3Mhftx9Q";

// Default world view, US visible, nothing pre-highlighted.
const DEFAULT_CENTER = [-30, 28];
const DEFAULT_ZOOM = 1.6;

const map = new mapboxgl.Map({
  attributionControl: false,
  container: "map",
  style: "mapbox://styles/mapbox/light-v11",
  center: DEFAULT_CENTER,
  zoom: DEFAULT_ZOOM,
  maxZoom: 8,
});

var nav = new mapboxgl.NavigationControl();
map.addControl(nav, "top-right");

// Mapbox-required attribution only (compact); SCI + DeepMoiré attribution
// lives in the #credits panel.
map.addControl(new mapboxgl.AttributionControl({ compact: true }));
var hoveredStateId = null;

var popup = new mapboxgl.Popup({
  className: "popup",
  closeButton: false,
  closeOnClick: true,
  anchor: "bottom",
  offset: [0, 0],
});

async function loadTSV(url) {
  const response = await fetch(url);
  const text = await response.text();
  const rows = text.split("\n").map((row) => row.trim()); // Trim each row to remove trailing spaces

  // Extract headers and trim them
  const headers = rows
    .shift()
    .split("\t") // Change delimiter to TAB
    .map((h) => h.trim());

  return rows.map((row) => {
    const values = row.split("\t").map((v) => v.trim()); // Split by TAB and trim
    return headers.reduce((acc, header, index) => {
      acc[header] = values[index] || null; // Ensure no undefined values
      return acc;
    }, {});
  });
}

async function loadCSV(url) {
  const response = await fetch(url);
  const text = await response.text();
  const rows = text.split("\n").map((row) => row.trim()); // Trim each row to remove trailing spaces

  // Extract headers and trim them
  const headers = rows
    .shift()
    .split(",")
    .map((h) => h.trim());

  return rows.map((row) => {
    const values = row.split(",").map((v) => v.trim()); // Trim each value
    return headers.reduce((acc, header, index) => {
      acc[header] = values[index]; // Store with cleaned headers
      return acc;
    }, {});
  });
}

// Function to load the GeoJSON file
async function loadGeoJSON(url) {
  const response = await fetch(url);
  return await response.json();
}
// Level 0 — countries worldwide (~565 KB CSV, 2.2 MB boundaries).
const geojsonUrl0 = "data/WORLDCOUNTRIES.geojson";
const csvUrl0     = "data/country.csv";

// Level 1 — Europe NUTS2 (~1.6 MB simplified boundaries, ~1.8 MB CSV; 2026 HDX, NUTS 2024 codes).
const geojsonUrl1 = "data/nuts2_2024.geojson";
const csvUrl1     = "data/nuts2_2024.csv";

// Level 2 — US states (~270 KB simplified GADM USA L1 boundaries, ~680 KB CSV; user_region keyed USA.X_1).
const geojsonUrl2 = "data/us_states.geojson";
const csvUrl2     = "data/us_states.csv";

function getColor(value) {
  if (!value) return "#cccccc"; // Default gray if no data
  return `rgba(0, 128, 255, ${Math.min(value / 100, 1)})`; // Adjust opacity based on scaled_sci
}

const colorSequence = [
  "#F7FCFD", // <1x (Country 20th Percentile)
  "#E0F3DB", // 1x - 2x
  "#CCEBC5", // 2x - 3x
  "#A8DDB5", // 3x - 5x
  "#7BCCC4", // 5x - 10x
  "#43A2CA", // 10x - 25x
  "#0868AC", // 25x - 100x
  "#084081", // >= 100x
  "rgba(0, 0, 0, 0)", // No data transparent (kept for compatibility with the legend "NA" row)
];

// Default fill for an in-sample feature before any click highlights it.
// Distinct from the out-of-sample grey, which signals "this region exists in
// the boundary file but has no SCI data, so it cannot be clicked".
const DEFAULT_FILL = "#F7F7F7";
const NO_DATA_FILL = "#dedede";

map.on("load", async function () {
  function colorAllLevelA(layerName, geojson, csvData, labelGeo, nameGeo, topLeveled, userCol, frCol) {
    // Build a {user -> {friend -> scaled_sci}} lookup from the CSV. The
    // user/friend column names are passed in so the same function works for
    // the country layer (user_country / friend_country) and, in v2, for
    // region layers (user_region / friend_region).

    const csvDataMap = {};

    csvData.forEach((row) => {
      const userLoc = row[userCol] ? row[userCol].trim() : null;
      const frLoc = row[frCol] ? row[frCol].trim() : null;
      const scaledSci = row.scaled_sci ? parseFloat(row.scaled_sci.replace(/\r/g, "").trim()) : null;

      if (userLoc && frLoc) {
        // Ensure both keys exist
        if (!csvDataMap[userLoc]) {
          csvDataMap[userLoc] = {};
        }
        csvDataMap[userLoc][frLoc] = isNaN(scaledSci) ? null : scaledSci; // Avoid NaN issues
      }
    });

    if (layerName === "level0") {
      document.getElementById("loading-icon").style.display = "none";
    }

    // Tag each feature with has_data so:
    //   (a) the paint expression can render out-of-sample features in a
    //       distinct "not clickable" light grey rather than NaN-out the map,
    //   (b) the click handler can ignore clicks on out-of-sample regions
    //       (a click with no row in csvDataMap used to break the choropleth
    //       paint expression and turn the whole map white).
    geojson.features = geojson.features.map(function (d, index) {
      d.id = index + 1;
      const key = d.properties[labelGeo];
      d.properties.has_data = !!(key && csvDataMap[key]);
      return d;
    });

    // Add source to the map
    map.addSource(layerName, {
      type: "geojson",
      data: geojson,
    });

    // Add the fill layer
    map.addLayer(
      {
        id: layerName,
        type: "fill",
        source: layerName,
        layout: {
          visibility: "none",
        },
        paint: {
          "fill-color": [
            "case",
            ["==", ["get", "has_data"], false],
            NO_DATA_FILL,         // out-of-sample (e.g. Liechtenstein on NUTS map)
            DEFAULT_FILL,         // in-sample, not yet highlighted by a click
          ],
          "fill-opacity": ["case", ["boolean", ["feature-state", "hover"], false], 0.8, 0.9],
        },
      },
      "waterway-label"
    );

    map.addLayer(
      {
        id: layerName + "borders",
        type: "line",
        source: layerName,
        //minzoom: 5,
        // maxzoom: 12,
        layout: {
          visibility: "none",
          "line-join": "round",
          // "line-cap": "round",
        },
        paint: {
          "line-color": "#CCCCCC",
          "line-width": 0.3,
          "line-opacity": 1,
        },
      },
      "waterway-label"
    );

    if (layerName === "level0") {
      map.setLayoutProperty(layerName, "visibility", "visible");
      map.setLayoutProperty(layerName + "borders", "visibility", "visible");
    }

    map.on("click", layerName, function (e) {
      var clickedISO = e.features[0].properties[labelGeo];

      // Out-of-sample click — no SCI row to anchor the choropleth on.
      // Doing nothing here keeps the previous highlight on the map; without
      // this guard the percentile math produced NaN thresholds and the whole
      // map went white (the bug surfaced on UK NUTS clicks, since UK isn't
      // in NUTS-2024 / not in the SCI 2026 release).
      if (!csvDataMap[clickedISO]) {
        return;
      }

      document.getElementById("console").style.display = "block";
      document.getElementById("legend").style.display = "block";

      var clickedAdmin = e.features[0].properties[nameGeo];

      document.getElementById("title").innerText = clickedAdmin; // Update the country name

      // Reset all .sci properties before updating
      geojson.features.forEach((feature) => {
        feature.properties.sci = null;
      });

      let clickedSci = null;
      let countryList = [];

      // If clicked country has data, update geojson properties
      if (csvDataMap[clickedISO]) {
        geojson.features.forEach((feature) => {
          let iso = feature.properties[labelGeo];
          let adminName = feature.properties[nameGeo]; // Get country name
          if (csvDataMap[clickedISO][iso] !== undefined) {
            let sciValue = csvDataMap[clickedISO][iso];
            feature.properties.sci = sciValue;
            countryList.push({ admin: adminName, sci: sciValue });
          } else {
          }
          if (iso === clickedISO) {
            clickedSci = csvDataMap[clickedISO][iso];
          }
        });
      }
      console.log(geojson.features);

      // Sort countries by SCI in descending order
      let sortedCountries = countryList.sort((a, b) => b.sci - a.sci);

      // Get SCI values excluding the clicked country's own value for min/max calculation
      let sciValues = sortedCountries.map((c) => c.sci).filter((v) => v !== null && !isNaN(v) && v !== clickedSci);

      // Compute the 5th and 95th percentiles
      let minSci = getPercentile(sciValues, 0.05); // 5th percentile
      let maxSci = getPercentile(sciValues, 0.9); // 95th percentile

      // Handle edge cases where percentiles return undefined
      if (minSci === null || maxSci === null || minSci === maxSci) {
        minSci = Math.min(...sciValues);
        maxSci = Math.max(...sciValues);
      }

      // Compute the 20th percentile as the reference value
      let refSci = getPercentile(sciValues, 0.2); // 20th percentile

      // Define SCI threshold values based on ranges
      let thresholds = [
        refSci, // 1x (Reference value)
        2 * refSci, // 2x
        3 * refSci, // 3x
        5 * refSci, // 5x
        10 * refSci, // 10x
        25 * refSci, // 25x
        100 * refSci, // 100x
      ];

      // Handle cases where refSci is too low or undefined
      if (refSci === null || refSci === 0 || maxSci === null || minSci === maxSci) {
        refSci = Math.min(...sciValues);
        thresholds = [refSci, 2 * refSci, 3 * refSci, 5 * refSci, 10 * refSci, 25 * refSci, 100 * refSci, 500 * refSci];
      }

      console.log(`Reference SCI (20th percentile): ${refSci}`);
      console.log(`Thresholds: ${thresholds.map((x) => x.toLocaleString())}`);

      // Update the GeoJSON source
      map.getSource(layerName).setData(geojson);

      // Apply the new range-based colouring. Out-of-sample features are
      // checked first so they always stay light grey, regardless of click
      // state.
      map.setPaintProperty(layerName, "fill-color", [
        "case",
        ["==", ["get", "has_data"], false],
        NO_DATA_FILL,
        ["has", "sci"],
        [
          "step",
          ["coalesce", ["get", "sci"], 0],
          colorSequence[0],
          0.1,
          colorSequence[0],
          thresholds[0],
          colorSequence[1],
          thresholds[1],
          colorSequence[2],
          thresholds[2],
          colorSequence[3],
          thresholds[3],
          colorSequence[4],
          thresholds[4],
          colorSequence[5],
          thresholds[5],
          colorSequence[6],
          thresholds[6],
          colorSequence[7],
        ],
        DEFAULT_FILL,
      ]);

      // Update the legend dynamically
      updateLegend();

      // Update the top 10 table
      if (thresholds && thresholds.length >= 7) {
        //updateTop10Table(sortedCountries, thresholds);
        updateTop10Table(sortedCountries, refSci, topLeveled);
      } else {
        console.error("Error: Thresholds array is undefined or too short", thresholds);
      }
    });

    map.on("mousemove", layerName, function (e) {
      if (e.features.length === 0) return;
      const hovered = e.features[0];
      const clickable = hovered.properties.has_data !== false;
      map.getCanvas().style.cursor = clickable ? "pointer" : "not-allowed";

      // Only apply the hover-highlight feature state to clickable features.
      if (clickable) {
        if (hoveredStateId) {
          map.setFeatureState({ source: layerName, id: hoveredStateId }, { hover: false });
        }
        hoveredStateId = hovered.id;
        map.setFeatureState({ source: layerName, id: hoveredStateId }, { hover: true });
      } else if (hoveredStateId) {
        map.setFeatureState({ source: layerName, id: hoveredStateId }, { hover: false });
        hoveredStateId = null;
      }
    });

    map.on("mouseleave", layerName, function () {
      map.getCanvas().style.cursor = "";

      if (hoveredStateId) {
        map.setFeatureState({ source: layerName, id: hoveredStateId }, { hover: false });
      }
      hoveredStateId = null;
      popup.remove();
    });

    // (Removed: UAE auto-highlight, fly-to, and 60s inactivity reset. The
    // map now opens to a neutral world view and waits for the user to click
    // a country. The click handler above does all of the highlight work.)
  }

  // Level 0 — countries (visible by default; click handler wires up).
  const geojson0 = await loadGeoJSON(geojsonUrl0);
  const csvData0 = await loadCSV(csvUrl0);
  colorAllLevelA("level0", geojson0, csvData0, "ISO_A2", "ADMIN", 100, "user_country", "friend_country");

  // Level 1 — Europe NUTS2.
  const geojson1 = await loadGeoJSON(geojsonUrl1);
  const csvData1 = await loadCSV(csvUrl1);
  colorAllLevelA("level1", geojson1, csvData1, "NUTS_ID", "NUTS_NAME", 100, "user_region", "friend_region");

  // Level 2 — US states (GADM USA L1, codes USA.N_1).
  const geojson2 = await loadGeoJSON(geojsonUrl2);
  const csvData2 = await loadCSV(csvUrl2);
  colorAllLevelA("level2", geojson2, csvData2, "GID_1", "NAME_1", 100, "user_region", "friend_region");

  // Show only the active layer; reset its fills (clears any choropleth from
  // the previous layer). Skips layers that haven't been added yet so this is
  // safe to call before all loaders finish.
  function setActiveLayer(activeId) {
    ["level0", "level1", "level2"].forEach((id) => {
      if (!map.getLayer(id)) return;
      const vis = id === activeId ? "visible" : "none";
      map.setLayoutProperty(id, "visibility", vis);
      if (map.getLayer(id + "borders")) {
        map.setLayoutProperty(id + "borders", "visibility", vis);
      }
    });
    if (map.getLayer(activeId)) {
      // Reset to the has_data-aware default fill so out-of-sample regions
      // stay grey across level switches.
      map.setPaintProperty(activeId, "fill-color", [
        "case",
        ["==", ["get", "has_data"], false],
        NO_DATA_FILL,
        DEFAULT_FILL,
      ]);
      if (map.getLayer(activeId + "borders")) {
        map.setPaintProperty(activeId + "borders", "line-color", "#CCCCCC");
      }
    }
  }

  // Default camera for each level (used when the user switches layers).
  const LEVEL_VIEWS = {
    level0: { center: DEFAULT_CENTER, zoom: DEFAULT_ZOOM },
    level1: { center: [12, 52], zoom: 3.3 },   // Europe
    level2: { center: [-98, 39], zoom: 3.4 },  // continental US
  };

  // Per-level wording for the subtitle + top-10 table header.
  const LAYER_META = {
    level0: { unit: "country", title: "Top 10 Connected Countries", col: "Country" },
    level1: { unit: "region",  title: "Top 10 Connected Regions",   col: "Region"  },
    level2: { unit: "state",   title: "Top 10 Connected States",    col: "State"   },
  };

  function setLayerSubtitle(id) {
    const meta = LAYER_META[id] || LAYER_META.level0;
    const sub = document.getElementById("soc-sub");
    if (sub) sub.textContent = "Click any " + meta.unit;
  }
  setLayerSubtitle(gSel); // initial — matches default-active "Countries" button

  const buttons = document.querySelectorAll(".button-container button");
  buttons.forEach((button) => {
    button.addEventListener("click", function () {
      // Diagnostic — surfaces in DevTools console if a button does nothing.
      console.log("[SCI] level switch ->", this.id, {
        l0: !!map.getLayer("level0"),
        l1: !!map.getLayer("level1"),
        l2: !!map.getLayer("level2"),
      });

      const consoleEl = document.getElementById("console");
      if (consoleEl) consoleEl.style.display = "none";
      const legendEl = document.getElementById("legend");
      if (legendEl) legendEl.style.display = "none";

      buttons.forEach((btn) => btn.classList.remove("active"));
      this.classList.add("active");

      gSel = this.id;
      setActiveLayer(this.id);
      setLayerSubtitle(this.id);

      const view = LEVEL_VIEWS[this.id];
      if (view) {
        map.flyTo({ ...view, essential: true, duration: 1200 });
      }
    });
  });

  // "About this map" expandable panel.
  (function setupExplanationToggle() {
    const btn = document.getElementById("data-explanation-btn");
    const panel = document.getElementById("data-explanation");
    if (!btn || !panel) return;
    const open = () => { panel.removeAttribute("hidden"); btn.setAttribute("aria-expanded", "true"); };
    const shut = () => { panel.setAttribute("hidden", ""); btn.setAttribute("aria-expanded", "false"); };
    btn.addEventListener("click", () => panel.hasAttribute("hidden") ? open() : shut());
    const close = panel.querySelector(".close-btn");
    if (close) close.addEventListener("click", shut);
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") shut(); });
  })();

  ////////////////////////////////////////functions

  function updateLegend() {
    const legendScale = document.getElementById("legend-scale");
    legendScale.innerHTML = ""; // Clear previous legend

    // Define the fixed **range-based** labels
    const labels = [
      "< 1x", // Less than 1x (20th percentile)
      "1x - 2x", // 1x - 2x
      "2x - 3x", // 2x - 3x
      "3x - 5x", // 3x - 5x
      "5x - 10x", // 5x - 10x
      "10x - 25x", // 10x - 25x
      "25x - 100x", // 25x - 100x
      "> 100x", // Greater than 100x
      "NA", // No data
    ];

    // Define the corresponding color scale
    const colorScale = [
      { color: colorSequence[0], label: labels[0] }, // <1x
      { color: colorSequence[1], label: labels[1] }, // 1x - 2x
      { color: colorSequence[2], label: labels[2] }, // 2x - 3x
      { color: colorSequence[3], label: labels[3] }, // 3x - 5x
      { color: colorSequence[4], label: labels[4] }, // 5x - 10x
      { color: colorSequence[5], label: labels[5] }, // 10x - 25x
      { color: colorSequence[6], label: labels[6] }, // 25x - 100x
      { color: colorSequence[7], label: labels[7] }, // >100x
      { color: colorSequence[8], label: labels[8] }, // na
    ];

    // Populate the legend dynamically
    colorScale.forEach((item) => {
      const div = document.createElement("div");
      div.className = "legend-item";
      div.innerHTML = `<span class="legend-color" style="background-color: ${item.color};"></span> ${item.label}`;
      legendScale.appendChild(div);
    });
  }

  var gSel = "level0";

  function updateTop10Table(sortedCountries, refSci, top) {
    const meta = LAYER_META[gSel] || LAYER_META.level0;
    document.getElementById("table-title").innerHTML = meta.title;
    document.getElementById("tab-lab").innerHTML = meta.col;

    const tableBody = document.querySelector("#top-10-table tbody");
    tableBody.innerHTML = ""; // Clear previous rows

    // Function to calculate and round multiplier dynamically
    function getRoundedMultiplier(sci) {
      if (!refSci || refSci === 0) return "-"; // Prevent division by zero
      let multiplier = sci / refSci; // Compute multiplier

      // Apply different rounding rules based on the computed multiplier
      let roundingFactor;
      if (multiplier < 999) {
        return `${Math.round(multiplier / 5) * 5}`; // Round to nearest 5x
      } else if (multiplier > 99999) {
        roundingFactor = 5000;
      } else if (multiplier > 9999) {
        roundingFactor = 500;
      } else {
        roundingFactor = 50;
      }

      // Round to the nearest factor
      let roundedMultiplier = Math.round(multiplier / roundingFactor) * roundingFactor;

      return `${roundedMultiplier.toLocaleString()}`; // Format number with commas
    }

    sortedCountries.slice(0, 10).forEach((item, index) => {
      const row = document.createElement("tr");
      row.innerHTML = `
            <td><span class="rank-circle">${index + 1}</span></td> <!-- Add ranking circle -->
            <td>${item.admin}</td>
            <td>${getRoundedMultiplier(item.sci) + "x"}</td> <!-- Show formatted multiplier -->
        `;
      tableBody.appendChild(row);
    });
  }

  // Function to calculate percentile from an array of numbers
  function getPercentile(values, percentile) {
    if (values.length === 0) return null;
    let sorted = [...values].sort((a, b) => a - b);
    let index = Math.floor(percentile * sorted.length);
    return sorted[Math.min(index, sorted.length - 1)]; // Ensure within bounds
  }
});
