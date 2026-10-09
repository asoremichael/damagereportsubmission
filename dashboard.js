import { supabase, supabaseConfigured } from "./supabase-client.js";

const loginPanel = document.querySelector("#login-panel");
const dashboardPanel = document.querySelector("#dashboard-panel");
const loginForm = document.querySelector("#login-form");
const loginMessage = document.querySelector("#login-message");
const dashboardMessage = document.querySelector("#dashboard-message");
const logoutButton = document.querySelector("#logout-button");
const reportList = document.querySelector("#report-list");
const searchInput = document.querySelector("#search-input");
const statusFilter = document.querySelector("#status-filter");
const dateFrom = document.querySelector("#date-from");
const dateTo = document.querySelector("#date-to");

let reports = [];

function showMessage(element, text, type = "") {
  element.textContent = text;
  element.className = `message ${type}`.trim();
}
function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}
function formatDate(value) {
  if (!value) return "—";
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
    year: "numeric", month: "short", day: "numeric"
  });
}
function setSignedInView(isSignedIn) {
  loginPanel.classList.toggle("hidden", isSignedIn);
  dashboardPanel.classList.toggle("hidden", !isSignedIn);
  logoutButton.classList.toggle("hidden", !isSignedIn);
}

async function checkSession() {
  if (!supabaseConfigured) {
    showMessage(loginMessage, "Setup is not complete. Add your Supabase Project URL and publishable key in supabase-client.js.", "error");
    return;
  }
  const { data: { session } } = await supabase.auth.getSession();
  setSignedInView(Boolean(session));
  if (session) await loadReports();
}
loginForm.addEventListener("submit", async event => {
  event.preventDefault();
  showMessage(loginMessage, "");
  if (!supabaseConfigured) return showMessage(loginMessage, "Configure Supabase first.", "error");
  const button = document.querySelector("#login-button");
  button.disabled = true;
  button.textContent = "Signing in…";
  const { error } = await supabase.auth.signInWithPassword({
    email: document.querySelector("#login-email").value.trim(),
    password: document.querySelector("#login-password").value
  });
  button.disabled = false;
  button.innerHTML = 'Sign in securely <span aria-hidden="true">→</span>';
  if (error) {
    showMessage(loginMessage, "Sign-in failed. Check the management email and password.", "error");
    return;
  }
  setSignedInView(true);
  await loadReports();
});
logoutButton.addEventListener("click", async () => {
  await supabase.auth.signOut();
  reports = [];
  reportList.innerHTML = "";
  setSignedInView(false);
});

async function loadReports() {
  showMessage(dashboardMessage, "Loading reports…", "info");
  const { data, error } = await supabase
    .from("damage_reports")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    showMessage(dashboardMessage, `Could not load reports: ${error.message}`, "error");
    return;
  }
  reports = data || [];
  document.querySelector("#total-count").textContent = reports.length;
  document.querySelector("#pending-count").textContent = reports.filter(r => !r.acknowledged).length;
  document.querySelector("#acknowledged-count").textContent = reports.filter(r => r.acknowledged).length;
  showMessage(dashboardMessage, reports.length ? "Reports loaded." : "No reports have been submitted yet.", reports.length ? "success" : "info");
  await renderReports();
}

function getFilteredReports() {
  const query = searchInput.value.trim().toLowerCase();
  return reports.filter(report => {
    const haystack = [
      report.engineer_name, report.site, report.item_name, report.serial_number,
      report.description, report.id
    ].filter(Boolean).join(" ").toLowerCase();
    const matchesQuery = !query || haystack.includes(query);
    const matchesStatus = statusFilter.value === "all" ||
      (statusFilter.value === "pending" && !report.acknowledged) ||
      (statusFilter.value === "acknowledged" && report.acknowledged);
    const matchesFrom = !dateFrom.value || report.report_date >= dateFrom.value;
    const matchesTo = !dateTo.value || report.report_date <= dateTo.value;
    return matchesQuery && matchesStatus && matchesFrom && matchesTo;
  });
}

async function renderReports() {
  const filtered = getFilteredReports();
  if (!filtered.length) {
    reportList.innerHTML = '<div class="panel empty-state"><strong>No matching reports</strong><p>Try changing your search or filters.</p></div>';
    return;
  }

  reportList.innerHTML = "";
  for (const report of filtered) {
    const card = document.createElement("article");
    card.className = "panel report-card";
    const statusClass = report.acknowledged ? "status-done" : "status-pending";
    const statusText = report.acknowledged ? "Acknowledged" : "Awaiting acknowledgement";
    const imagePaths = Array.isArray(report.image_paths) ? report.image_paths : [];
    let imageHtml = "";
    if (imagePaths.length) {
      const urls = await Promise.all(imagePaths.map(async path => {
        const { data, error } = await supabase.storage.from("damage-photos").createSignedUrl(path, 60 * 10);
        return error ? null : data.signedUrl;
      }));
      imageHtml = `<div class="photo-grid">${urls.filter(Boolean).map((url, index) =>
        `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" aria-label="Open item photo ${index + 1}">
          <img src="${escapeHtml(url)}" alt="Photo ${index + 1} of ${escapeHtml(report.item_name)}" loading="lazy">
        </a>`
      ).join("")}</div>`;
    }

    const acknowledgement = report.acknowledged
      ? `<div class="acknowledgement-box"><strong>✓ Acknowledged by ${escapeHtml(report.acknowledged_by)}</strong><span>Date: ${formatDate(report.acknowledged_date)}</span></div>`
      : `<form class="ack-form" data-report-id="${escapeHtml(report.id)}">
          <h4>Management acknowledgement</h4>
          <div class="ack-fields">
            <label class="field"><span>Manager's full name *</span><input name="acknowledged_by" required maxlength="120" placeholder="Enter your full name"></label>
            <label class="field"><span>Acknowledgement date *</span><input name="acknowledged_date" type="date" required value="${new Date().toLocaleDateString("en-CA")}"></label>
          </div>
          <button class="button button-primary" type="submit">Acknowledge report</button>
        </form>`;

    card.innerHTML = `
      <div class="report-topline">
        <div><p class="eyebrow">REPORT #${escapeHtml(String(report.id).slice(0, 8))}</p><h3>${escapeHtml(report.item_name)}</h3></div>
        <span class="status-pill ${statusClass}">${statusText}</span>
      </div>
      <div class="report-details">
        <p><span>Engineer</span><strong>${escapeHtml(report.engineer_name)}</strong></p>
        <p><span>Site / location</span><strong>${escapeHtml(report.site)}</strong></p>
        <p><span>Report date</span><strong>${formatDate(report.report_date)}</strong></p>
        <p><span>Quantity</span><strong>${escapeHtml(report.quantity)}</strong></p>
        <p><span>Serial number</span><strong>${escapeHtml(report.serial_number || "Not provided")}</strong></p>
        <p class="detail-full"><span>Description</span><strong class="description-text">${escapeHtml(report.description)}</strong></p>
      </div>
      ${imageHtml}
      ${acknowledgement}
    `;
    reportList.appendChild(card);
  }

  reportList.querySelectorAll(".ack-form").forEach(form => {
    form.addEventListener("submit", async event => {
      event.preventDefault();
      const submit = form.querySelector("button[type='submit']");
      submit.disabled = true;
      submit.textContent = "Saving acknowledgement…";
      const formData = new FormData(form);
      const acknowledgedBy = String(formData.get("acknowledged_by") || "").trim();
      const acknowledgedDate = String(formData.get("acknowledged_date") || "");
      const reportId = form.dataset.reportId;
      const { error } = await supabase.from("damage_reports").update({
        acknowledged_by: acknowledgedBy,
        acknowledged_date: acknowledgedDate,
        acknowledged: true
      }).eq("id", reportId);
      if (error) {
        showMessage(dashboardMessage, `Could not save acknowledgement: ${error.message}`, "error");
        submit.disabled = false;
        submit.textContent = "Acknowledge report";
        return;
      }
      await loadReports();
    });
  });
}

[searchInput, statusFilter, dateFrom, dateTo].forEach(element => {
  element.addEventListener("input", renderReports);
  element.addEventListener("change", renderReports);
});
document.querySelector("#refresh-button").addEventListener("click", loadReports);
document.querySelector("#clear-filters").addEventListener("click", () => {
  searchInput.value = "";
  statusFilter.value = "all";
  dateFrom.value = "";
  dateTo.value = "";
  renderReports();
});
document.querySelector("#export-button").addEventListener("click", () => {
  const filtered = getFilteredReports();
  const columns = ["id", "created_at", "engineer_name", "site", "report_date", "item_name", "quantity", "serial_number", "description", "acknowledged", "acknowledged_by", "acknowledged_date"];
  const csvCell = value => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const csv = [columns.join(","), ...filtered.map(row => columns.map(column => csvCell(row[column])).join(","))].join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `damage-reports-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
});

supabase.auth.onAuthStateChange((_event, session) => {
  setSignedInView(Boolean(session));
});
checkSession();
