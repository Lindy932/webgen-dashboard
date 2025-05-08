import React, { useEffect, useState } from "react";
import "./Header.css";
import Chart from "chart.js/auto";

const tcgaMapping = {
  BLCA: "Bladder Carcinoma",
  BRCA: "Breast Carcinoma",
  CESC: "Cervical Squamous Cell Carcinoma and Endocervical Adenocarcinoma",
  COAD: "Colon Adenocarcinoma",
  KIRP: "Kidney Renal Papillary Cell Carcinoma",
  LIHC: "Liver Hepatocellular Carcinoma",
  LUAD: "Lung Adenocarcinoma",
  LUSC: "Lung Squamous Cell Carcinoma",
  OV: "Ovarian Serous Cystadenocarcinoma",
  PRAD: "Prostate Adenocarcinoma",
  READ: "Rectum Adenocarcinoma",
  SARC: "Sarcoma",
  STAD: "Stomach Adenocarcinoma",
  THCA: "Thyroid Carcinoma",
  UCEC: "Uterine Corpus Endometrial Carcinoma",
  ESCA: "Esophageal Carcinoma",
  KICH: "Kidney Chromophobe",
  KIRC: "Kidney Renal Clear Cell Carcinoma",
};

const modalityDictionary = {
  CR: "Computed Radiography",
  CT: "Computed Tomography",
  DX: "Digital Radiography",
  KO: "Unknown Modality",
  MG: "Mammography",
  MR: "Magnetic Resonance Imaging",
  NM: "Nuclear Medicine",
  OT: "Other Modality",
  PT: "Positron Emission Tomography",
  SR: "Structured Report",
  US: "Ultrasound",
};

let barChartInstance = null;
let lineChartInstance = null;
let radarChartInstance = null;
let bubbleChartInstance = null;

const Header = () => {
  const [collections, setCollections] = useState([]);
  const [selectedCollection, setSelectedCollection] = useState("");
  const [selectedChecklistCollections, setSelectedChecklistCollections] = useState([]);
  const [modalities, setModalities] = useState([]);
  const [selectedModality, setSelectedModality] = useState("");
  const [error, setError] = useState(null);
  const [isHeaderAnimated, setIsHeaderAnimated] = useState(false);
  const [isChecklistVisible, setIsChecklistVisible] = useState(false);

  const getDistinctColor = (collection) => {
    let hash = [...collection].reduce((acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0);
    const hue = Math.abs(hash % 360);
    const saturation = 80;
    const lightness = 50 + Math.abs(hash % 20);
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  };

  useEffect(() => {
    const fetchTCGACollections = async () => {
      try {
        const response = await fetch(
          "https://services.cancerimagingarchive.net/nbia-api/services/v1/getCollectionValues"
        );
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        const data = await response.json();

        const tcgaCollections = data.filter((item) => item.Collection && item.Collection.includes("TCGA"));
        const collectionDropdownData = tcgaCollections.map((collection) => ({
          value: collection.Collection,
          label: tcgaMapping[collection.Collection.replace("TCGA-", "")] || collection.Collection,
        }));
        setCollections(collectionDropdownData);
      } catch (error) {
        console.error("Error fetching TCGA collections:", error);
        setError("Failed to fetch TCGA collections.");
      }
    };

    fetchTCGACollections();
  }, []);

  const fetchAndDisplayBarChartData = async () => {
    try {
      const allSelectedCollections = [...new Set([selectedCollection, ...selectedChecklistCollections].filter(Boolean))];
      const responses = await Promise.all(
        allSelectedCollections.map((collection) =>
          fetch(`https://services.cancerimagingarchive.net/nbia-api/services/v1/getSeries?Collection=${collection}`)
        )
      );
      const datasets = await Promise.all(
        responses.map(async (response, index) => {
          if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
          const rawResponse = await response.text();
          const data = JSON.parse(rawResponse);

          const modalityCounts = {};
          data.forEach(
            (series) => (modalityCounts[series.Modality] = (modalityCounts[series.Modality] || 0) + 1)
          );
          return { collection: allSelectedCollections[index], counts: modalityCounts };
        })
      );

      const allModalities = Array.from(new Set(datasets.flatMap((dataset) => Object.keys(dataset.counts))));
      const chartDatasets = datasets.map(({ collection, counts }) => ({
        label: collection,
        data: allModalities.map((modality) => counts[modality] || 0),
        backgroundColor: getDistinctColor(collection),
      }));

      if (barChartInstance) barChartInstance.destroy();

      const ctx = document.getElementById("barChart").getContext("2d");
      barChartInstance = new Chart(ctx, {
        type: "bar",
        data: {
          labels: allModalities.map((modality) => modalityDictionary[modality] || "Unknown Modality"),
          datasets: chartDatasets,
        },
        options: { responsive: false, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } },
      });

      setModalities(allModalities);
    } catch (error) {
      console.error("Error fetching or displaying bar chart data:", error);
      setError("Failed to fetch modality data.");
    }
  };

  const fetchAndDisplayLineChartData = async () => {
    try {
      const allSelectedCollections = [...new Set([selectedCollection, ...selectedChecklistCollections].filter(Boolean))];
      const responses = await Promise.all(
        allSelectedCollections.map((collection) =>
          fetch(`https://services.cancerimagingarchive.net/nbia-api/services/v1/getSeries?Collection=${collection}`)
        )
      );
      const datasets = await Promise.all(
        responses.map(async (response, index) => {
          if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
          const rawResponse = await response.text();
          const data = JSON.parse(rawResponse);

          const yearCounts = {};
          data.forEach((series) => {
            if (series.SeriesDate && (!selectedModality || series.Modality === selectedModality)) {
              const year = series.SeriesDate.slice(0, 4);
              yearCounts[year] = (yearCounts[year] || 0) + 1;
            }
          });
          return { collection: allSelectedCollections[index], counts: yearCounts };
        })
      );

      const allYears = Array.from(new Set(datasets.flatMap((dataset) => Object.keys(dataset.counts)))).sort();
      const chartDatasets = datasets.map(({ collection, counts }) => ({
        label: collection,
        data: allYears.map((year) => counts[year] || 0),
        borderColor: getDistinctColor(collection),
        fill: false,
      }));

      if (lineChartInstance) lineChartInstance.destroy();

      const ctx = document.getElementById("lineChart").getContext("2d");
      lineChartInstance = new Chart(ctx, {
        type: "line",
        data: { labels: allYears, datasets: chartDatasets },
        options: { responsive: false, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } },
      });
    } catch (error) {
      console.error("Error fetching or displaying line chart data:", error);
      setError("Failed to fetch SeriesDate data.");
    }
  };

  const fetchAndDisplayRadarChartData = async () => {
    try {
      const allSelectedCollections = [...new Set([selectedCollection, ...selectedChecklistCollections].filter(Boolean))];
      const responses = await Promise.all(
        allSelectedCollections.map((collection) =>
          fetch(`https://services.cancerimagingarchive.net/nbia-api/services/v1/getSeries?Collection=${collection}`)
        )
      );
      const datasets = await Promise.all(
        responses.map(async (response, index) => {
          if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
          const rawResponse = await response.text();
          const data = JSON.parse(rawResponse);
  
          const radarCounts = {};
          data.forEach((series) => {
            radarCounts[series.Modality] = (radarCounts[series.Modality] || 0) + 1;
          });
          return { collection: allSelectedCollections[index], counts: radarCounts };
        })
      );
  
      // Dynamically determine all modalities from the fetched data
      const allModalities = Array.from(new Set(datasets.flatMap((dataset) => Object.keys(dataset.counts))));
  
      // Prepare radar datasets with dynamic modalities
      const radarDatasets = datasets.map(({ collection, counts }) => {
        const hslColor = getDistinctColor(collection); // Generate HSL color
        const hslaColor = hslColor.replace("hsl", "hsla").replace(")", ", 0.1)"); // Add transparency (10%)
  
        return {
          label: collection,
          data: allModalities.map((modality) => counts[modality] || 0.001), // Ensure all modalities are included dynamically
          backgroundColor: hslaColor,
          borderColor: hslColor,
          borderWidth: 2,
        };
      });
  
      if (radarChartInstance) radarChartInstance.destroy(); // Destroy previous chart instance
  
      const ctx = document.getElementById("radarChart").getContext("2d");
      radarChartInstance = new Chart(ctx, {
        type: "radar",
        data: {
          // Translate modality keys (e.g., "MR") into human-readable labels (e.g., "Magnetic Resonance Imaging")
          labels: allModalities.map((modality) => modalityDictionary[modality] || "Unknown Modality"),
          datasets: radarDatasets,
        },
        options: {
          responsive: false,
          maintainAspectRatio: false,
          scales: {
            r: {
              beginAtZero: true,
              min: 0, // Ensure scale starts at zero
              max: Math.max(...datasets.flatMap((dataset) => Object.values(dataset.counts))) || 0, // Adjust max dynamically
              grid: {
                circular: true, // Ensure circular grid
                lineWidth: 1,
              },
              ticks: {
                stepSize: 10, // Adjust step size
                font: {
                  size: 5, // Set the font size for scale numbers (ticks)
                },
                color: "gray", // Set tick color
              },
            },
          },
          plugins: {
            legend: {
              display: true, // Display legend
              position: "top", // Control legend positioning
            },
          },
        },
      });
    } catch (error) {
      console.error("Error fetching or displaying radar chart data:", error);
      setError("Failed to fetch radar chart data."); // Display error in UI
    }
  };

  const fetchAndDisplayBubbleChartData = async () => {
    try {
      const allSelectedCollections = [...new Set([selectedCollection, ...selectedChecklistCollections].filter(Boolean))];
  
      const responses = await Promise.all(
        allSelectedCollections.map((collection) =>
          fetch(`https://services.cancerimagingarchive.net/nbia-api/services/v1/getSeries?Collection=${collection}`)
        )
      );
  
      const datasets = await Promise.all(
        responses.map(async (response, index) => {
          if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
          const rawResponse = await response.text();
          const data = JSON.parse(rawResponse);
  
          const bubbleData = {};
          data.forEach((series) => {
            if (series.SeriesDate && series.Modality && series.Modality !== "Unknown") {
              const year = series.SeriesDate.slice(0, 4);
              const modality = series.Modality;
              const key = `${year}-${modality}`;
  
              bubbleData[key] = bubbleData[key] || { year, modality, count: 0 };
              bubbleData[key].count += 1;
            }
          });
  
          return { collection: allSelectedCollections[index], data: Object.values(bubbleData) };
        })
      );
  
      const allYears = Array.from(new Set(datasets.flatMap(({ data }) => data.map((d) => d.year)))).sort();
      const allModalities = Array.from(new Set(datasets.flatMap(({ data }) => data.map((d) => d.modality))));
  
      // Get the maximum scan count for scaling
      const maxCount = Math.max(...datasets.flatMap(({ data }) => data.map((d) => d.count)));
  
      // Define a scaling function to keep bubbles within the chart area
      const getScaledSize = (count) => Math.sqrt(count / maxCount) * 25; // Dynamically scale bubble size
  
      const chartDatasets = datasets.map(({ collection, data }) => ({
        label: collection,
        data: data.map(({ year, modality, count }) => ({
          x: allYears.indexOf(year) + 1,
          y: allModalities.indexOf(modality) + 1,
          r: getScaledSize(count), // Dynamically scaled bubbles
        })),
        backgroundColor: getDistinctColor(collection).replace("hsl", "hsla").replace(")", ", 0.7)"), // 70% opacity
      }));
  
      if (bubbleChartInstance) bubbleChartInstance.destroy();
  
      const ctx = document.getElementById("bubbleChart").getContext("2d");
      bubbleChartInstance = new Chart(ctx, {
        type: "bubble",
        data: { datasets: chartDatasets },
        options: {
          responsive: false,
          maintainAspectRatio: false,
          scales: {
            x: { ticks: { callback: (value) => allYears[value - 1] || "" }, title: { display: true, text: "Year" } },
            y: { ticks: { callback: (value) => modalityDictionary[allModalities[value - 1]] || "" }, title: { display: true, text: "Modality" } },
          },
          plugins: {
            legend: { display: true, position: "top" },
            tooltip: {
              callbacks: {
                label: (context) => {
                  const datasetLabel = context.dataset.label; // TCGA Collection Name
                  const bubbleSize = Math.round(context.raw.r); // Bubble size (number of scans)
                  const yearIndex = context.raw.x - 1;
                  const year = allYears[yearIndex]; // Exact year
  
                  return `Collection: ${datasetLabel}\nScans: ${bubbleSize}\nYear: ${year}`;
                },
              },
            },
          },
        },
      });
  
    } catch (error) {
      console.error("Error fetching or displaying bubble chart data:", error);
      setError("Failed to fetch bubble chart data.");
    }
  };
  
  
  useEffect(() => {
    if (selectedCollection || selectedChecklistCollections.length) {
      fetchAndDisplayBarChartData();
      fetchAndDisplayLineChartData();
      fetchAndDisplayRadarChartData();
      fetchAndDisplayBubbleChartData();
    }
  }, [selectedCollection, selectedChecklistCollections]);

  useEffect(() => {
    if (selectedModality) {
      fetchAndDisplayLineChartData();
    }
  }, [selectedModality]);

  const handleModalityChange = (event) => {
    const selectedValue = event.target.value;
    setSelectedModality(selectedValue);
  };

  const handleChecklistChange = (event) => {
    const collection = event.target.value;
    const isChecked = event.target.checked;
  
    setSelectedChecklistCollections((prev) => {
      if (isChecked) {
        // Add to the checklist
        return [...prev, collection];
      } else {
        // Remove from the checklist
        if (collection === selectedCollection) {
          setSelectedCollection(""); // Clear the dropdown selection if this was the selectedCollection
        }
        return prev.filter((item) => item !== collection);
      }
    });
  };
  
  

  const handleDeselectAll = () => {
    setSelectedChecklistCollections([]);
    document.querySelectorAll('.checklist-container input[type="checkbox"]').forEach((checkbox) => (checkbox.checked = false));
  };

  return (
    <header
      className={`${isHeaderAnimated ? "animate-header" : ""} ${
        isChecklistVisible ? "white-background" : ""
      }`}
    >
      <div className="banner">
        <h1>The TCGA Collection</h1>
      </div>
      <div className="section">
        <h4>To Get Started: Select a TCGA Cancer Collection</h4>
        {error && <p style={{ color: "red" }}>{error}</p>}
        <select
          id="cancerType"
          onChange={(event) => {
            const selectedValue = event.target.value;
  
            if (selectedValue) {
              setSelectedChecklistCollections((prev) =>
                !prev.includes(selectedValue) ? [...prev, selectedValue] : prev
              );
              setSelectedCollection(selectedValue);
            } else {
              setSelectedCollection("");
            }
  
            if (!isHeaderAnimated) {
              setIsHeaderAnimated(true);
              setTimeout(() => document.querySelector("header").classList.add("hidden"), 500);
            }
  
            setIsChecklistVisible(true);
          }}
          value={selectedCollection}
        >
          <option value="" hidden>
            Select a TCGA Collection
          </option>
          <option value="">--Select a TCGA Collection--</option>
          {collections.map((collection) => (
            <option key={collection.value} value={collection.value}>
              {collection.label}
            </option>
          ))}
        </select>
      </div>
      
      {isChecklistVisible && (
        <div className="checklist-container">
          <h4>Select Cancer Collections</h4>
          {collections.map((collection) => (
            <div key={collection.value}>
              <input
                type="checkbox"
                value={collection.value}
                checked={selectedChecklistCollections.includes(collection.value)}
                onChange={handleChecklistChange}
              />
              <label htmlFor={collection.value}>{collection.label}</label>
            </div>
          ))}
          <button className="deselect-button" onClick={handleDeselectAll}>
            Deselect All
          </button>
        </div>
      )}
  
      {isHeaderAnimated && (
        <div className="chart-background">
          <div className="banner1">
            <h2>Imaging Modalities</h2>
          </div>
          <div className="chart-container">
            {/* Bar Chart Canvas */}
            <canvas id="barChart" width="500" height="300"></canvas>
  
            <div className="linechart">
              {/* Line Chart Canvas */}
              <canvas id="lineChart" width="400" height="200"></canvas>
              <div className="dropdown-menu">
                <label htmlFor="modalityDropdown">Filter by Modality:</label>
                <select id="modalityDropdown" onChange={handleModalityChange}>
                  <option value="">All Modalities</option>
                  {modalities.map((modality) => (
                    <option key={modality} value={modality}>
                      {modalityDictionary[modality] || "Unknown Modality"}
                    </option>
                  ))}
                </select>
              </div>
            </div>
  
            <div className="radar-chart-section">
              {/* Radar Chart Canvas */}
              <canvas id="radarChart" width="500" height="300"></canvas>
            </div>
  
            <div className="bubble-chart-section">
              {/* Bubble Chart Canvas */}
              <canvas id="bubbleChart" width="500" height="300"></canvas>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};  
export default Header;
