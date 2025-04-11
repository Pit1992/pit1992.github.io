document.addEventListener("DOMContentLoaded", () => {
  const tabs = document.querySelectorAll(".tab-btn");
  const contents = document.querySelectorAll(".tab-content");
  tabs.forEach(btn => {
    btn.addEventListener("click", () => {
      tabs.forEach(b => b.classList.remove("active"));
      contents.forEach(c => c.style.display = "none");
      btn.classList.add("active");
      document.getElementById(btn.dataset.tab).style.display = "block";
    });
  });
});

let xmlDoc = null;

function findElevation() {
  const fileInput = document.getElementById("xmlFile");
  if (!fileInput.files[0]) return alert("Please upload a LandXML file.");
  const reader = new FileReader();
  reader.onload = () => {
    const parser = new DOMParser();
    xmlDoc = parser.parseFromString(reader.result, "text/xml");
    const e = parseFloat(document.getElementById("easting").value);
    const n = parseFloat(document.getElementById("northing").value);
    const decimalPlaces = parseInt(document.getElementById("decimalSelect").value);
    if (isNaN(e) || isNaN(n)) return alert("Please enter valid E/N.");
    const points = Array.from(xmlDoc.getElementsByTagName("P")).map(p => {
      const [y, x, z] = p.textContent.trim().split(" ").map(parseFloat);
      return { x, y, z };
    });
    const triangles = Array.from(xmlDoc.getElementsByTagName("F")).map(f => {
      const [a, b, c] = f.textContent.trim().split(" ").map(i => points[parseInt(i) - 1]);
      return [a, b, c];
    });

    for (const tri of triangles) {
      const z = interpolateZ(tri, e, n);
      if (z !== null) {
        document.getElementById("result").textContent = "Elevation: " + z.toFixed(decimalPlaces);
        addToTable(e, n, z.toFixed(decimalPlaces));
        return;
      }
    }
    alert("Point not in range.");
  };
  reader.readAsText(fileInput.files[0]);
}

function interpolateZ([p1, p2, p3], x, y) {
  const detT = (p2.y - p3.y) * (p1.x - p3.x) + (p3.x - p2.x) * (p1.y - p3.y);
  const a = ((p2.y - p3.y) * (x - p3.x) + (p3.x - p2.x) * (y - p3.y)) / detT;
  const b = ((p3.y - p1.y) * (x - p3.x) + (p1.x - p3.x) * (y - p3.y)) / detT;
  const c = 1 - a - b;
  if (a >= 0 && b >= 0 && c >= 0) return a * p1.z + b * p2.z + c * p3.z;
  return null;
}

function addToTable(e, n, z) {
  const table = document.getElementById("history-table");
  const row = table.insertRow();
  row.insertCell().textContent = table.rows.length - 1;
  row.insertCell().textContent = e;
  row.insertCell().textContent = n;
  row.insertCell().textContent = z;
}

function clearHistory() {
  const table = document.getElementById("history-table");
  while (table.rows.length > 1) table.deleteRow(1);
}

function processCSV() {
  const xmlFile = document.getElementById("xmlFileBatch").files[0];
  const csvFile = document.getElementById("csvFile").files[0];
  if (!xmlFile || !csvFile) return alert("Please upload both files.");

  const reader1 = new FileReader();
  const reader2 = new FileReader();

  reader1.onload = () => {
    const parser = new DOMParser();
    const xml = parser.parseFromString(reader1.result, "text/xml");
    const points = Array.from(xml.getElementsByTagName("P")).map(p => {
      const [y, x, z] = p.textContent.trim().split(" ").map(parseFloat);
      return { x, y, z };
    });
    const triangles = Array.from(xml.getElementsByTagName("F")).map(f => {
      const [a, b, c] = f.textContent.trim().split(" ").map(i => points[parseInt(i) - 1]);
      return [a, b, c];
    });

    reader2.onload = () => {
      const tbody = document.querySelector("#batch-table tbody");
      tbody.innerHTML = "";
      const lines = reader2.result.trim().split("\n");

      lines.forEach((line, index) => {
        const [id, e, n, originalZ] = line.split(",").map(x => x.trim());
        if (index === 0 && isNaN(parseFloat(e))) return;
        if (!id || !e || !n || !originalZ) return;
        const x = parseFloat(e);
        const y = parseFloat(n);
        const z = parseFloat(originalZ);
        for (const tri of triangles) {
          const interpZ = interpolateZ(tri, x, y);
          if (interpZ !== null) {
            const diff = z - interpZ;
            const row = tbody.insertRow();
            row.insertCell().textContent = id;
            row.insertCell().textContent = x;
            row.insertCell().textContent = y;
            row.insertCell().textContent = z.toFixed(4);
            row.insertCell().textContent = interpZ.toFixed(4);
            row.insertCell().textContent = diff.toFixed(4);
            return;
          }
        }
      });
    };
    reader2.readAsText(csvFile);
  };
  reader1.readAsText(xmlFile);
}

function copyBatchTable() {
  const table = document.getElementById("batch-table");
  let text = "";
  for (let row of table.rows) {
    const cells = Array.from(row.cells).map(cell => cell.textContent);
    text += cells.join("\t") + "\n";
  }
  navigator.clipboard.writeText(text).then(() => alert("Copied to clipboard!"));
}
