let xmlDoc = null;
let pointIdCounter = 1;
let decimalPlaces = 4;
let originalXML = '';

document.getElementById("xmlFile").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    originalXML = event.target.result;
    const parser = new DOMParser();
    xmlDoc = parser.parseFromString(originalXML, "text/xml");
    alert("XML uploaded successfully!");
  };
  reader.readAsText(file);
});

document.getElementById("queryBtn").addEventListener("click", () => {
  if (!xmlDoc) return alert("Please upload an XML file first!");

  const x = parseFloat(document.getElementById("easting").value);
  const y = parseFloat(document.getElementById("northing").value);
  decimalPlaces = parseInt(document.getElementById("decimalSelect").value);
  if (isNaN(x) || isNaN(y)) return alert("Please enter valid Easting and Northing!");

  const points = Array.from(xmlDoc.getElementsByTagName("P")).map(p => {
    const [yStr, xStr, zStr] = p.textContent.trim().split(" ");
    return { x: parseFloat(xStr), y: parseFloat(yStr), z: parseFloat(zStr) };
  });

  const triangles = Array.from(xmlDoc.getElementsByTagName("F")).map(f => {
    const [a, b, c] = f.textContent.trim().split(" ").map(Number);
    return [points[a - 1], points[b - 1], points[c - 1]];
  });

  for (const tri of triangles) {
    const z = interpolateZ(tri, x, y);
    if (z !== null) {
      const entry = {
        id: pointIdCounter++,
        e: x.toFixed(decimalPlaces),
        n: y.toFixed(decimalPlaces),
        z: z.toFixed(decimalPlaces),
      };
      addToLog(entry);
      return;
    }
  }

  document.getElementById("result").textContent = "⚠️ Point is outside of surface area.";
});

function interpolateZ([p1, p2, p3], x, y) {
  const det = (p2.y - p3.y) * (p1.x - p3.x) + (p3.x - p2.x) * (p1.y - p3.y);
  const a = ((p2.y - p3.y) * (x - p3.x) + (p3.x - p2.x) * (y - p3.y)) / det;
  const b = ((p3.y - p1.y) * (x - p3.x) + (p1.x - p3.x) * (y - p3.y)) / det;
  const c = 1 - a - b;

  if (a >= 0 && b >= 0 && c >= 0) {
    return a * p1.z + b * p2.z + c * p3.z;
  }
  return null;
}

function addToLog(entry) {
  const table = document.querySelector("#history-table tbody");
  const tr = document.createElement("tr");
  tr.innerHTML = `<td>${entry.id}</td><td>${entry.e}</td><td>${entry.n}</td><td>${entry.z}</td>`;
  table.appendChild(tr);

  const logs = JSON.parse(localStorage.getItem("elevationLogs") || "[]");
  logs.push(entry);
  localStorage.setItem("elevationLogs", JSON.stringify(logs));

  document.getElementById("result").textContent = `◼ Elevation = ${entry.z} m`;
}

function loadLog() {
  const logs = JSON.parse(localStorage.getItem("elevationLogs") || "[]");
  logs.forEach(entry => {
    addToLog(entry);
    if (entry.id >= pointIdCounter) pointIdCounter = entry.id + 1;
  });
}

function clearLog() {
  localStorage.removeItem("elevationLogs");
  document.querySelector("#history-table tbody").innerHTML = "";
  pointIdCounter = 1;
}

document.getElementById("clearLog").addEventListener("click", clearLog);
document.getElementById("downloadXmlBtn").addEventListener("click", () => {
  if (!originalXML) return alert("Please upload an XML first.");
  const blob = new Blob([originalXML], { type: "application/xml" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "saved_landxml.xml";
  link.click();
});

window.onload = loadLog;
