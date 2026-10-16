// Linkly — shared front-end behavior

const API_BASE = "http://127.0.0.1:8000";

(function () {
  // ---------- Theme toggle ----------
  const root = document.documentElement;
  const themeBtn = document.getElementById("themeToggle");

  function applyTheme(theme) {
    if (theme === "dark") {
      root.setAttribute("data-theme", "dark");
    } else {
      root.removeAttribute("data-theme");
    }
  }

  const savedTheme = localStorage.getItem("linkly-theme");
  if (savedTheme) applyTheme(savedTheme);

  if (themeBtn) {
    themeBtn.addEventListener("click", function () {
      const isDark = root.getAttribute("data-theme") === "dark";
      const next = isDark ? "light" : "dark";
      applyTheme(next);
      localStorage.setItem("linkly-theme", next);
    });
  }

  // ---------- Home: scan form ----------
  const scanForm = document.getElementById("scanForm");

  if (scanForm) {
    scanForm.addEventListener("submit", async function (e) {
      e.preventDefault();

      const urlInput = document.getElementById("urlInput");
      const url = urlInput.value.trim();
      if (!url) return;

      try {
        const response = await fetch(`${API_BASE}/api/scan`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });

        if (!response.ok) {
          throw new Error(`Server responded with ${response.status}`);
        }

        const result = await response.json();
        console.log("Scan result:", result); // helpful while debugging

        renderScanResult(result);

        // Refresh the Home page's live sections now that a new scan happened
        loadRecentScans();
        loadStats();
      } catch (err) {
        console.error("Scan failed:", err);
      }
    });
  }

  // ---------- Renders the API response into the Scan Result card ----------
  function renderScanResult(result) {
    const isSafe = result.status === "safe";

    // Reveal the card now that we have a real result
    const resultCard = document.getElementById("scanResultCard");
    if (resultCard) {
      resultCard.style.display = "block";
    }

    // ---- Banner ----
    const banner = document.querySelector(".result-banner");
    if (banner) {
      banner.classList.remove("safe", "risk");
      banner.classList.add(isSafe ? "safe" : "risk");

      banner.innerHTML = `
        <span class="badge-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg>
        </span>
        <div>
          <h3>${isSafe ? "This Link Looks Safe!" : "This Link Looks Suspicious!"}</h3>
          <p>${isSafe
            ? "No suspicious activity detected. This URL appears to be legitimate."
            : "Multiple red flags were detected. Proceed with caution."}</p>
        </div>
      `;
    }

    // ---- Details (URL / Domain / Risk Level / Reason) ----
    const details = document.querySelector(".result-details");
    if (details) {
      const reasonItems = result.reasons
        .map(
          (reason) => `
          <li>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg>
            ${reason.text}
          </li>`
        )
        .join("");

      details.innerHTML = `
        <div class="detail-row">
          <span class="label">URL</span>
          <span class="value"><a href="${result.url}" target="_blank" rel="noopener">${result.url} ↗</a></span>
        </div>
        <div class="detail-row">
          <span class="label">Domain</span>
          <span class="value">${result.domain}</span>
        </div>
        <div class="detail-row">
          <span class="label">Risk Level</span>
          <span class="value">
            <span class="pill ${result.riskLevel}">
              ${result.riskLevel.charAt(0).toUpperCase() + result.riskLevel.slice(1)}
            </span>
          </span>
        </div>
        <div class="detail-row">
          <span class="label">Reason</span>
          <span class="value">
            <ul class="reason-list ${isSafe ? "" : "bad"}">
              ${reasonItems || "<li>No specific flags detected.</li>"}
            </ul>
          </span>
        </div>
      `;
    }

    // ---- Footer strip ----
    const footer = document.querySelector(".result-footer");
    if (footer) {
      footer.classList.remove("safe", "risk");
      footer.classList.add(isSafe ? "safe" : "risk");

      footer.innerHTML = `
        <span class="dash">-----</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg>
        ${isSafe ? "Safe to Visit" : "Risky — Avoid"}
        <span class="dash">-----</span>
      `;
    }
  }

  // ---------- Scan History page: search + filter chips ----------
  const historyTable = document.getElementById("historyTable");
  const searchInput = document.getElementById("historySearch");
  const chips = document.querySelectorAll(".chip[data-filter]");
  let activeFilter = "all";

  function applyRowFilters() {
    if (!historyTable) return;
    const rows = historyTable.querySelectorAll("tbody tr");
    const query = (searchInput && searchInput.value.trim().toLowerCase()) || "";

    rows.forEach(function (row) {
      const status = row.getAttribute("data-status");
      const urlCell = row.querySelector(".url-cell");
      const url = urlCell ? urlCell.textContent.toLowerCase() : "";

      const matchesFilter = activeFilter === "all" || status === activeFilter;
      const matchesSearch = url.includes(query);

      row.style.display = matchesFilter && matchesSearch ? "" : "none";
    });
  }

  if (historyTable) {
    chips.forEach(function (chip) {
      chip.addEventListener("click", function () {
        chips.forEach(function (c) {
          c.classList.remove("active", "all", "safe", "risk");
        });
        activeFilter = chip.getAttribute("data-filter");
        chip.classList.add("active", activeFilter);
        applyRowFilters();
      });
    });

    if (searchInput) {
      searchInput.addEventListener("input", applyRowFilters);
    }
  }

  // Expose applyRowFilters so loadHistoryTable (defined below) can call it
  window.__applyRowFilters = applyRowFilters;
})();

// ---------- Helper: turn a timestamp into "2 hours ago" ----------
function timeAgo(isoString) {
  const diffMs = new Date() - new Date(isoString);
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min${mins === 1 ? "" : "s"} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

// ---------- Home: Recent Scans list ----------
async function loadRecentScans() {
  const list = document.querySelector(".scan-list");
  if (!list) return;

  try {
    const res = await fetch(`${API_BASE}/api/history`);
    const history = await res.json();

    list.innerHTML = history.slice(0, 5).map(item => `
      <div class="scan-list-item">
        <span class="link-icon">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 007.07 0l1.93-1.93a5 5 0 00-7.07-7.07L10.5 5.5"/><path d="M14 11a5 5 0 00-7.07 0L5 12.93a5 5 0 007.07 7.07L13.5 18.5"/></svg>
        </span>
        <div class="scan-info">
          <span class="scan-url">${item.url}</span>
          <span class="badge ${item.status}">${item.status === "safe" ? "Safe" : "Phishing"}</span>
        </div>
        <span class="scan-time">${timeAgo(item.scannedAt)}</span>
      </div>
    `).join("") || "<p style='color:var(--text-muted);font-size:13px;'>No scans yet.</p>";
  } catch (err) {
    console.error("Failed to load recent scans:", err);
  }
}

// ---------- Home: Quick Stats ----------
async function loadStats() {
  const statsRow = document.querySelector(".stats-row");
  if (!statsRow) return;

  try {
    const res = await fetch(`${API_BASE}/api/stats`);
    const stats = await res.json();

    const totalEl = statsRow.querySelector(".stat-box.total .stat-value");
    const safeEl = statsRow.querySelector(".stat-box.safe .stat-value");
    const riskEl = statsRow.querySelector(".stat-box.risk .stat-value");

    if (totalEl) totalEl.textContent = stats.total;
    if (safeEl) safeEl.textContent = stats.safe;
    if (riskEl) riskEl.textContent = stats.risk;
  } catch (err) {
    console.error("Failed to load stats:", err);
  }
}

// ---------- Scan History page: load real data into the table ----------
async function loadHistoryTable() {
  const historyTable = document.getElementById("historyTable");
  if (!historyTable) return;

  try {
    const res = await fetch(`${API_BASE}/api/history`);
    const history = await res.json();
    const tbody = historyTable.querySelector("tbody");

    tbody.innerHTML = history.map(item => `
      <tr data-status="${item.status}">
        <td><span class="url-cell">
          <span class="link-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 007.07 0l1.93-1.93a5 5 0 00-7.07-7.07L10.5 5.5"/><path d="M14 11a5 5 0 00-7.07 0L5 12.93a5 5 0 007.07 7.07L13.5 18.5"/></svg>
          </span>${item.url}
        </span></td>
        <td><span class="badge ${item.status}">${item.status === "safe" ? "Safe" : "Phishing"}</span></td>
        <td><span class="risk-dot ${item.riskLevel}">${item.riskLevel.charAt(0).toUpperCase() + item.riskLevel.slice(1)}</span></td>
        <td>${timeAgo(item.scannedAt)}</td>
        <td><a href="#" class="row-action">View
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
        </a></td>
      </tr>
    `).join("") || `<tr><td colspan="5" style="color:var(--text-muted)">No scans yet.</td></tr>`;

    if (window.__applyRowFilters) window.__applyRowFilters();
  } catch (err) {
    console.error("Failed to load history:", err);
  }
}

// Run on every page load (each function checks if its element exists first)
loadRecentScans();
loadStats();
loadHistoryTable();