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

map.addControl(new mapboxgl.AttributionControl({
  customAttribution:
    'Data: <a href="https://data.humdata.org/dataset/social-connectedness-index" target="_blank" rel="noopener">FB SCI on HDX</a> &middot; ' +
    'Map design adapted from <a href="https://www.deepmoire.com/" target="_blank" rel="noopener">DeepMoiré</a>',
}));
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
  "rgba(0, 0, 0, 0)", // No data transparent
  // "#CFCFCF", // No data
];

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

    geojson.features = geojson.features.map(function (d, index) {
      d.id = index + 1; // Assign a unique ID
      return d;
    });

    console.log(geojson);

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
          "fill-color": "#F7F7F7", // Default color
          //"fill-color": "#E5483C", // Default color

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
      document.getElementById("console").style.display = "block"; // Show the top 10 table
      document.getElementById("legend").style.display = "block";

      console.log(e.features[0]);

      var clickedISO = e.features[0].properties[labelGeo];
      var clickedAdmin = e.features[0].properties[nameGeo]; // Get country name

      console.log("Clicked ISO:", clickedISO);
      console.log("Clicked Admin:", clickedAdmin);

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

      // Apply the new **range-based** coloring dynamically
      map.setPaintProperty(layerName, "fill-color", [
        "case",
        ["has", "sci"],
        [
          "step",
          ["coalesce", ["get", "sci"], 0],
          colorSequence[8],
          0.1,
          colorSequence[0], // <1x (Very low)
          thresholds[0],
          colorSequence[1], // 1x - 2x (Low)
          thresholds[1],
          colorSequence[2], // 2x - 3x (Moderate Low)
          thresholds[2],
          colorSequence[3], // 3x - 5x (Mid)
          thresholds[3],
          colorSequence[4], // 5x - 10x (Moderate High)
          thresholds[4],
          colorSequence[5], // 10x - 25x (High)
          thresholds[5],
          colorSequence[6], // 25x - 100x (Very High)
          thresholds[6],
          colorSequence[7], // >100x (Extreme)
        ],
        colorSequence[8], // Default fallback color
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
      map.getCanvas().style.cursor = "pointer";

      if (e.features.length > 0) {
        if (hoveredStateId) {
          map.setFeatureState({ source: layerName, id: hoveredStateId }, { hover: false });
        }
        hoveredStateId = e.features[0].id;
        map.setFeatureState({ source: layerName, id: hoveredStateId }, { hover: true });
      }

      var callP = e.features[0].properties;
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
      map.setPaintProperty(activeId, "fill-color", "#F7F7F7");
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

  const buttons = document.querySelectorAll(".button-container button");
  buttons.forEach((button) => {
    button.addEventListener("click", function () {
      document.getElementById("console").style.display = "none";
      document.getElementById("legend").style.display = "none";

      buttons.forEach((btn) => btn.classList.remove("active"));
      this.classList.add("active");

      gSel = this.id;
      setActiveLayer(this.id);

      const view = LEVEL_VIEWS[this.id];
      if (view) {
        map.flyTo({ ...view, essential: true, duration: 1200 });
      }
    });
  });

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
    const LABELS = {
      level0: { title: "Top 10 Connected Countries", col: "Country" },
      level1: { title: "Top 10 Connected Regions",   col: "Region"  },
      level2: { title: "Top 10 Connected States",    col: "State"   },
    };
    const meta = LABELS[gSel] || LABELS.level0;
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

    sortedCountries.slice(0, 20).forEach((item, index) => {
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
