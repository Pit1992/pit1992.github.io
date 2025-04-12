let xmlDoc = null;
let pointIdCounter = 1;
let decimalPlaces = 4;

// 單點 XML 載入
document.getElementById("xmlFile").addEventListener("change", function (event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function (e) {
    const parser = new DOMParser();
    xmlDoc = parser.parseFromString(e.target.result, "text/xml");
    alert("XML file loaded!");
  };
  reader.readAsText(file);
});

function findElevation() {
  if (!xmlDoc) {
    alert("Please upload a LandXML file first.");
    return;
  }

  const e = parseFloat(document.getElementById("easting").value);
  const n = parseFloat(document.getElementById("northing").value);
  decimalPlaces = parseInt(document.getElementById("decimalSelect").value);
  if (isNaN(e) || isNaN(n)) {
    alert("Please enter valid Easting and Northing.");
    return;
  }

  const points = Array.from(xmlDoc.getElementsByTagName("P")).map(p => {
    const [y, x, z] = p.textContent.trim().split(" ").map(parseFloat);
    return { id: p.getAttribute("id"), x, y, z };
  });

  const triangles = Array.from(xmlDoc.getElementsByTagName("F")).map(f => {
    const [a, b, c] = f.textContent.trim().split(" ").map(Number);
    return [points[a - 1], points[b - 1], points[c - 1]];
  });

  for (const tri of triangles) {
    const z = interpolateZ(tri, e, n);
    if (z !== null) {
      addToHistory(e, n, z);
      return;
    }
  }

  alert("Point is outside the surface.");
}

function interpolateZ([p1, p2, p3], x, y) {
  const detT = (p2.y - p3.y) * (p1.x - p3.x) + (p3.x - p2.x) * (p1.y - p3.y);
  const a = ((p2.y - p3.y) * (x - p3.x) + (p3.x - p2.x) * (y - p3.y)) / detT;
  const b = ((p3.y - p1.y) * (x - p3.x) + (p1.x - p3.x) * (y - p3.y)) / detT;
  const c = 1 - a - b;

  if (a >= 0 && b >= 0 && c >= 0) {
    return a * p1.z + b * p2.z + c * p3.z;
  }
  return null;
}

function addToHistory(e, n, z) {
  const table = document.getElementById("history-table");
  const row = table.insertRow();
  const id = pointIdCounter++;

  row.insertCell().textContent = id;
  row.insertCell().textContent = e.toFixed(decimalPlaces);
  row.insertCell().textContent = n.toFixed(decimalPlaces);
  row.insertCell().textContent = z.toFixed(decimalPlaces);
}

function clearHistory() {
  const table = document.getElementById("history-table");
  while (table.rows.length > 1) table.deleteRow(1);
  pointIdCounter = 1;
}

// 🔄 分頁切換功能
document.addEventListener("DOMContentLoaded", () => {
  const tabButtons = document.querySelectorAll(".tab-btn");
  const tabContents = document.querySelectorAll(".tab-content");

  tabButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      tabButtons.forEach(b => b.classList.remove("active"));
      tabContents.forEach(c => (c.style.display = "none"));

      btn.classList.add("active");
      const tab = btn.getAttribute("data-tab");
      document.getElementById(tab).style.display = "block";
    });
  });
});

// 🧮 批次比對：CSV 與 XML
function processCSV() {
  const xmlInput = document.getElementById("xmlFileBatch").files[0];
  const csvInput = document.getElementById("csvFile").files[0];

  if (!xmlInput || !csvInput) {
    alert("Please upload both XML and CSV files.");
    return;
  }

  const reader = new FileReader();
  reader.onload = function (e) {
    const parser = new DOMParser();
    xmlDoc = parser.parseFromString(e.target.result, "text/xml");

    const csvReader = new FileReader();
    csvReader.onload = function (e) {
      const lines = e.target.result.trim().split("\n");
      const outputTable = document.querySelector("#batch-table tbody");
      outputTable.innerHTML = ""; // 清除舊資料

      const points = Array.from(xmlDoc.getElementsByTagName("P")).map(p => {
        const [y, x, z] = p.textContent.trim().split(" ").map(parseFloat);
        return { id: p.getAttribute("id"), x, y, z };
      });

      const triangles = Array.from(xmlDoc.getElementsByTagName("F")).map(f => {
        const [a, b, c] = f.textContent.trim().split(" ").map(Number);
        return [points[a - 1], points[b - 1], points[c - 1]];
      });

      for (let i = 0; i < lines.length; i++) {
        const [id, e, n, z] = lines[i].split(",").map(val => val.trim());
        const eNum = parseFloat(e);
        const nNum = parseFloat(n);
        const origZ = parseFloat(z);
        let interpolatedZ = null;

        for (const tri of triangles) {
          const result = interpolateZ(tri, eNum, nNum);
          if (result !== null) {
            interpolatedZ = result;
            break;
          }
        }

        const row = outputTable.insertRow();
	row.insertCell().textContent = id;
	row.insertCell().textContent = e;
	row.insertCell().textContent = n;
	row.insertCell().textContent = origZ.toFixed(4);
	
	if (interpolatedZ !== null) {
	  row.insertCell().textContent = interpolatedZ.toFixed(4);
	  const dz = origZ - interpolatedZ;
	  row.insertCell().textContent = dz.toFixed(4);
	  row.insertCell().textContent = `${dz >= 0 ? "+" : ""}${Math.round(dz * 1000)}`;
	} else {
	  row.insertCell().textContent = "N/A";
	  row.insertCell().textContent = "N/A";
	  row.insertCell().textContent = "N/A";
	}

      }
    };
    csvReader.readAsText(csvInput);
  };
  reader.readAsText(xmlInput);
}

// 📋 複製表格
function copyBatchTable() {
  const table = document.querySelector("#batch-table");
  const rows = Array.from(table.rows);
  const text = rows.map(row => Array.from(row.cells).map(cell => cell.textContent).join("\t")).join("\n");

  navigator.clipboard.writeText(text).then(() => {
    alert("Copied to clipboard!");
  });
}
