(function () {
  "use strict";
  function esc(value) { return String(value == null ? "" : value).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  document.addEventListener("DOMContentLoaded", async function () {
    if (!await window.InternLog.ready) return;
    var api = window.InternLog, session = api.getSession();
    if (!session || session.role !== "company") { window.location.href = "login.html"; return; }
    var company = await api.getCompanyById(session.userId);
    document.getElementById("companyName").textContent = company.name;
    document.getElementById("companyEmail").textContent = company.email;
    document.getElementById("avatar").textContent = (company.name || "C").charAt(0).toUpperCase();
    var rows = [], statuses = ["Applied", "Shortlisted", "Interview", "Selected", "Rejected"];
    var modal = document.getElementById("appModal");
    async function load() {
      rows = (await api.getApplications()).filter(function (app) { return String(app.companyId) === String(company.id); });
      render();
    }
    function render() {
      var query = document.getElementById("search").value.toLowerCase().trim();
      var status = document.getElementById("status").value;
      var visible = rows.filter(function (app) {
        return (status === "all" || app.status === status) && (!query || [app.studentName, app.studentEmail, app.studentCollege, app.role].join(" ").toLowerCase().indexOf(query) !== -1);
      });
      document.getElementById("body").innerHTML = visible.length ? visible.map(function (app) {
        return '<tr><td><strong>' + esc(app.studentName || "Student") + '</strong><br><span class="muted">' + esc(app.studentEmail) + '</span></td><td>' + esc(app.role) + '</td><td>' + esc(app.studentCollege || "—") + '</td><td>' + esc(app.appliedDate) + '</td><td><span class="badge badge-' + esc((app.status || "Applied").toLowerCase()) + '">' + esc(app.status) + '</span></td><td><button class="btn btn-secondary btn-sm" data-view="' + esc(app.id) + '">Review</button></td></tr>';
      }).join("") : '<tr><td colspan="6" class="muted">No matching applicants.</td></tr>';
    }
    document.getElementById("body").addEventListener("click", function (event) {
      var button = event.target.closest("[data-view]");
      if (!button) return;
      var app = rows.find(function (row) { return String(row.id) === button.getAttribute("data-view"); });
      if (!app) return;
      document.getElementById("modalTitle").textContent = app.studentName || "Applicant";
      document.getElementById("modalBody").innerHTML = '<dl><dt>Email</dt><dd>' + esc(app.studentEmail) + '</dd><dt>College</dt><dd>' + esc(app.studentCollege || "—") + '</dd><dt>Course</dt><dd>' + esc(app.studentCourse || "—") + '</dd><dt>Opportunity</dt><dd>' + esc(app.role) + '</dd><dt>Applied</dt><dd>' + esc(app.appliedDate) + '</dd></dl><label for="newStatus">Application status</label><select id="newStatus">' + statuses.map(function (status) { return '<option' + (status === app.status ? ' selected' : '') + '>' + status + '</option>'; }).join("") + '</select><div class="modal-footer"><button class="btn btn-sm" id="saveStatus">Save status</button></div>';
      modal.classList.add("open");
      document.getElementById("saveStatus").onclick = async function () {
        var save = this; save.disabled = true;
        try {
          await api.setApplicationStatus(app.id, document.getElementById("newStatus").value);
          await load();
          modal.classList.remove("open");
          api.showNotification("Applicant status updated.", "success");
        } catch (error) { api.showNotification(error.message, "error"); }
        finally { save.disabled = false; }
      };
    });
    document.getElementById("search").addEventListener("input", render);
    document.getElementById("status").addEventListener("change", render);
    document.getElementById("close").onclick = function () { modal.classList.remove("open"); };
    modal.addEventListener("click", function (event) { if (event.target === modal) modal.classList.remove("open"); });
    await load();
  });
})();
