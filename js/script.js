/* InternLog UI helpers. All persistent data and authentication are managed by Java. */
/* React Bits adaptations: StaggeredMenu and Stepper.
 * Upstream: https://github.com/DavidHDev/react-bits
 * MIT + Commons Clause License Condition v1.0
 * Copyright (c) 2026 David Haz
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, and distribute the Software as part of an
 * application, website, or product, subject to the following conditions:
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * Commons Clause Restriction: You may use this Software, including for any
 * commercial purpose, so long as you do not sell, sublicense, or redistribute
 * the components themselves-whether alone, in a bundle, or as a ported version.
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
(function () {
  "use strict";

  var STATUSES = ["Applied", "Shortlisted", "Interview", "Selected", "Rejected"];

  /* Guests follow the OS; signed-in theme preferences come from the backend. */
  function preferredTheme() {
    try {
      if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) return "dark";
    } catch (e) {}
    return "light";
  }
  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
  }
  applyTheme(preferredTheme());

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function fmtDate(iso) {
    if (!iso) return "—";
    var clean = String(iso).split("T")[0];
    var parts = clean.split("-");
    if (parts.length === 3) {
      var d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
      }
    }
    return esc(clean);
  }

  /* ---------------- Dynamic Favicon Injection ---------------- */
  function injectFavicon() {
    var existingIcon = document.querySelector("link[rel~='icon']");
    if (existingIcon && (existingIcon.getAttribute("href") || "").startsWith("data:image/svg+xml,")) existingIcon.setAttribute("href", existingIcon.getAttribute("href").replace("%2342613c", "%232563eb").replace("%231a56d5", "%232563eb"));
    if (!document.querySelector("link[rel~='icon']")) {
      var link = document.createElement("link");
      link.rel = "icon";
      link.type = "image/svg+xml";
      link.href = "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='8' fill='%232563eb'/><text x='16' y='22' font-family='system-ui,sans-serif' font-weight='800' font-size='16' fill='white' text-anchor='middle'>IL</text></svg>";
      document.head.appendChild(link);
    }
  }

  /* ---------------- Thoughtful student helpers: follow-ups + job alerts ----
     Follow-ups: gentle nudges derived live (no extra backend yet).
     Saved searches: per-student alerts matched against Published internships.
     Future Java backend: GET /api/applications?needsFollowup=true,
     GET/POST/DELETE /api/alerts, GET /api/internships/matches?alert={id} */
  function daysSince(dateStr) {
    if (!dateStr) return 999;
    var clean = String(dateStr).split("T")[0];
    var parts = clean.split("-");
    if (parts.length !== 3) return 999;
    var then = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    if (isNaN(then.getTime())) return 999;
    var now = new Date();
    now.setHours(0, 0, 0, 0);
    then.setHours(0, 0, 0, 0);
    return Math.floor((now.getTime() - then.getTime()) / 86400000);
  }

  function lastActivityISO(app) {
    var candidates = [app.updatedAt, app.companyUpdatedAt, app.appliedDate].filter(Boolean).map(function (v) { return String(v).split("T")[0]; });
    candidates.sort();
    return candidates.length ? candidates[candidates.length - 1] : "";
  }

  function getSnoozeMap() { return window.InternLog.getPreference("followupSnooze", {}); }

  function isSnoozed(appId) {
    var map = getSnoozeMap();
    var until = map[String(appId)];
    if (!until) return false;
    return String(todayISO()) <= String(until);
  }

  async function snoozeFollowup(appId, days) {
    var map = Object.assign({}, getSnoozeMap());
    var d = new Date();
    d.setDate(d.getDate() + (days || 7));
    var iso = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    map[String(appId)] = iso;
    await window.InternLog.setPreference("followupSnooze", map);
  }

  function getFollowups(apps) {
    var out = [];
    (apps || []).forEach(function (a) {
      if (!a || a.status === "Selected" || a.status === "Rejected") return;
      if (isSnoozed(a.id)) return;
      var last = lastActivityISO(a);
      var idle = daysSince(last || a.appliedDate);
      if (a.status === "Applied" && idle >= 7) {
        out.push({ app: a, idleDays: idle, kind: "followup", title: "Send a polite follow-up", detail: "No reply in " + idle + " days. A short check-in often revives stalled applications." });
      } else if (a.status === "Shortlisted" && idle >= 5) {
        out.push({ app: a, idleDays: idle, kind: "nudge", title: "Shortlisted — stay warm", detail: "Shortlisted " + idle + " days ago. Share an update or ask about next steps." });
      } else if (a.status === "Interview" && a.interviewDate) {
        var diff = Math.round((new Date(a.interviewDate).getTime() - new Date(todayISO()).getTime()) / 86400000);
        if (diff >= 0 && diff <= 3) {
          out.push({ app: a, idleDays: idle, kind: "prep", title: diff === 0 ? "Interview today — good luck" : "Interview in " + diff + " day" + (diff === 1 ? "" : "s"), detail: "Review notes, prep 2 questions, confirm time and link." });
        } else if (diff < 0 && idle >= 3) {
          out.push({ app: a, idleDays: idle, kind: "thanks", title: "Send a thank-you note", detail: "Interview was " + Math.abs(diff) + " days ago. A thank-you keeps you memorable." });
        }
      }
    });
    out.sort(function (x, y) { return y.idleDays - x.idleDays; });
    return out;
  }

  function matchesSearch(job, search) {
    if (!job || job.status !== "Published") return false;
    var q = String(search.query || "").toLowerCase().trim();
    if (q) {
      var hay = [job.title, job.company, job.location, job.description, (job.skills || []).join(" ")].join(" ").toLowerCase();
      if (hay.indexOf(q) === -1) return false;
    }
    var loc = String(search.location || "").toLowerCase().trim();
    if (loc && String(job.location || "").toLowerCase().indexOf(loc) === -1) return false;
    if (search.type && job.internshipType && search.type !== "Any" && job.internshipType !== search.type) return false;
    if (search.minStipend && Number(job.stipend || 0) < Number(search.minStipend)) return false;
    return true;
  }

  function getSeenIds(userId) {
    return window.InternLog.getPreference("seenInternships", []);
  }

  async function markInternshipsSeen(userId, ids) {
    var seen = {};
    getSeenIds(userId).forEach(function (id) { seen[String(id)] = true; });
    (ids || []).forEach(function (id) { seen[String(id)] = true; });
    await window.InternLog.setPreference("seenInternships", Object.keys(seen));
  }

  async function getMatchedAlerts(userId, jobs) {
    var searches = await window.InternLog.getSavedSearches(userId);
    var seen = {};
    getSeenIds(userId).forEach(function (id) { seen[String(id)] = true; });
    return searches.map(function (s) {
      var matched = (jobs || []).filter(function (j) { return matchesSearch(j, s); });
      var fresh = matched.filter(function (j) { return !seen[String(j.id)]; });
      return { search: s, total: matched.length, fresh: fresh, freshCount: fresh.length, sample: matched.slice(0, 3) };
    });
  }

  /* ---------------- Company / opportunity moderation ----------------
     Companies need admin verification before using the
     company workspace, and every newly submitted/editied opportunity goes
     through admin review before becoming public. Expired opportunities are
     hidden automatically. */
  function todayISO() {
    var d = new Date();
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, "0");
    var day = String(d.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + day;
  }

  function companyIsApproved(company) {
    return !!company && company.verified === true && company.status === "Active";
  }

  function companyStatusLabel(company) {
    if (!company) return "Unknown";
    if (company.status === "Suspended") return "Suspended";
    if (company.status === "Rejected") return "Rejected";
    if (company.verified === true && company.status === "Active") return "Active";
    return "Pending Verification";
  }

  function guardCompanyPage() {
    var path = window.location.pathname.replace(/\\/g, "/");
    if (path.indexOf("/company/") === -1) return;
    var file = (path.split("/").pop() || "").toLowerCase().split("?")[0];
    if (file === "login.html" || file === "register.html") return;
    var session = getSession();
    if (!session || session.role !== "company") window.location.href = "login.html";
  }

  function initCompanyRegisterGuard() {
    var form = document.getElementById("companyRegisterForm");
    if (!form) return;
    initAuthStepper(form, {
      validateStep: function (n) {
        if (n !== 1) return true;
        var name = document.getElementById("companyName");
        var email = document.getElementById("email");
        var password = document.getElementById("password");
        var confirm = document.getElementById("confirmPassword");
        var ok = true;
        if (!name || name.value.trim().length < 2) { setFieldError(name, "Enter the company name."); ok = false; } else setFieldError(name, "");
        if (!email || !isEmail(email.value.trim())) { setFieldError(email, "Enter a valid work email."); ok = false; } else setFieldError(email, "");
        var pwErr = password ? passwordStrength(password.value) : "Enter a password.";
        if (pwErr) { setFieldError(password, pwErr); ok = false; } else setFieldError(password, "");
        if (!confirm || !password || confirm.value !== password.value) { setFieldError(confirm, "Passwords do not match."); ok = false; } else setFieldError(confirm, "");
        if (!ok) showNotification("Please fix the highlighted fields to continue.", "error");
        return ok;
      }
    });
    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      e.stopImmediatePropagation();

      var name = document.getElementById("companyName");
      var email = document.getElementById("email");
      var password = document.getElementById("password");
      var confirm = document.getElementById("confirmPassword");
      var website = document.getElementById("website");
      var location = document.getElementById("location");
      var industry = document.getElementById("industry");
      var terms = document.getElementById("terms");
      var alertEl = document.getElementById("formAlert");
      var ok = true;
      var errs = [];

      ok = flagError(errs, name, !name || name.value.trim().length < 2 ? "Enter the company name." : "") && ok;
      ok = flagError(errs, email, !email || !isEmail(email.value.trim()) ? "Enter a valid work email." : "") && ok;
      var pwErr = password ? passwordStrength(password.value) : "Enter a password.";
      ok = flagError(errs, password, pwErr) && ok;
      ok = flagError(errs, confirm, !confirm || !password || confirm.value !== password.value ? "Passwords do not match." : "") && ok;
      ok = flagError(errs, website, website && website.value.trim() && !validURL(website.value.trim()) ? "Use a valid http(s) website URL." : "") && ok;
      ok = flagError(errs, location, !location || !location.value.trim() ? "Enter the company's main location." : "") && ok;
      if (!terms || !terms.checked) { errs.push({ id: "terms", message: "Please confirm the company profile terms." }); showNotification("Please confirm the company profile terms.", "warning"); ok = false; }
      if (!ok) { showErrorSummary(form, errs); return; }
      hideErrorSummary(form);
      setBusy(form, true);

      try {
        var company = await window.InternLog.registerCompany({
          name: name.value, email: email.value, password: password.value,
          website: website ? website.value.trim() : "", location: location.value,
          industry: industry ? industry.value.trim() : ""
        });
        if (alertEl) {
          alertEl.className = "alert alert-success";
          alertEl.textContent = "Company account submitted. An admin must verify it before you can log in.";
          alertEl.style.display = "block";
        }
        showNotification("Company account submitted for admin verification.", "success");
        form.reset();
      } catch (err) {
        if (alertEl) {
          alertEl.className = "alert alert-error";
          alertEl.textContent = err.message || "Unable to create company account.";
          alertEl.style.display = "block";
        }
        showNotification(err.message || "Unable to create company account.", "error");
      } finally {
        setBusy(form, false);
      }
    }, true);
  }

  function initCompanyLoginGuard() {
    // Company login is fully owned by the inline handler in company/login.html
    // (validation + credential check + Suspended/Rejected/Pending messaging).
    // A previous capture-phase blocker here duplicated those rules and raced
    // with the inline handler via stopImmediatePropagation, so it is
    // intentionally a no-op to keep a single source of truth.
    return;
  }

  function readInternshipForm() {
    function val(id) { var el = document.getElementById(id); return el ? el.value.trim() : ""; }
    return {
      title: val("title"),
      location: val("location"),
      internshipType: (document.getElementById("type") || {}).value || "On-site",
      stipend: Number((document.getElementById("stipend") || {}).value) || 0,
      positions: Math.max(1, Number((document.getElementById("positions") || {}).value) || 1),
      deadline: val("deadline"),
      skills: val("skills").split(",").map(function (v) { return v.trim(); }).filter(Boolean),
      description: val("description"),
      education: val("education"),
      applyUrl: val("applyUrl"),
      publishRequested: !!(document.getElementById("published") && document.getElementById("published").checked)
    };
  }

  function initCompanyInternshipSubmitGuard() {
    var form = document.getElementById("internshipForm");
    if (!form) return;
    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      e.stopImmediatePropagation();
      var session = getSession();
      if (!session || session.role !== "company") { window.location.href = "login.html"; return; }
      var company;
      try { company = await window.InternLog.getCompanyById(session.userId); }
      catch (error) { showNotification(error.message, "error"); return; }
      var ctx = company ? { session: session, company: company } : null;
      if (!ctx) { window.location.href = "login.html"; return; }
      if (!companyIsApproved(ctx.company)) {
        clearSession();
        window.location.href = "login.html?pending=1";
        return;
      }

      var d = readInternshipForm();
      var ok = true;
      var errs = [];
      var titleEl = document.getElementById("title");
      var locEl = document.getElementById("location");
      var deadlineEl = document.getElementById("deadline");
      var descEl = document.getElementById("description");
      var urlEl = document.getElementById("applyUrl");
      ok = flagError(errs, titleEl, d.title.length < 3 ? "Enter an internship title." : "") && ok;
      ok = flagError(errs, locEl, !d.location ? "Enter a location or Remote." : "") && ok;
      ok = flagError(errs, deadlineEl, !d.deadline || d.deadline < todayISO() ? (d.deadline ? "Deadline cannot be in the past." : "Choose an application deadline.") : "") && ok;
      ok = flagError(errs, descEl, !d.description ? "Add a short role description." : "") && ok;
      ok = flagError(errs, urlEl, d.applyUrl && !validURL(d.applyUrl) ? "Use a valid http(s) URL." : "") && ok;
      if (!ok) { showErrorSummary(form, errs); return; }
      hideErrorSummary(form);
      setBusy(form, true);

      var jobs;
      try { jobs = await window.InternLog.getInternshipsByCompany(ctx.company.id); }
      catch (error) { setBusy(form, false); showNotification(error.message || "Could not load internships.", "error"); return; }
      var now = new Date().toISOString();
      var editId = new URLSearchParams(window.location.search).get("edit");
      var editingIndex = editId ? jobs.findIndex(function (j) { return String(j.id) === String(editId) && String(j.companyId) === String(ctx.company.id); }) : -1;
      if (editId && editingIndex < 0) { setBusy(form, false); showNotification("Internship not found.", "error"); return; }

      var existing = editingIndex >= 0 ? jobs[editingIndex] : null;
      var requestedStatus = d.publishRequested ? "Pending Review" : "Draft";
      var record = {
        companyId: ctx.company.id, company: ctx.company.name, title: d.title, location: d.location,
        internshipType: d.internshipType, stipend: d.stipend, positions: d.positions, deadline: d.deadline,
        skills: d.skills, description: d.description, education: d.education, applyUrl: d.applyUrl,
        status: requestedStatus, updatedAt: now
      };

      try {
        if (existing) await window.InternLog.updateInternship(existing.id, record);
        else await window.InternLog.addInternship(record);
      } catch (error) { setBusy(form, false); showNotification(error.message, "error"); return; }

      var success = document.getElementById("success");
      if (success) {
        success.className = "alert alert-success";
        success.textContent = requestedStatus === "Pending Review"
          ? "Internship submitted for admin review. It will appear publicly after approval."
          : (existing ? "Internship draft updated." : "Internship draft saved.");
        success.style.display = "block";
      }
      showNotification(requestedStatus === "Pending Review" ? "Internship sent for admin review." : "Internship draft saved.", "success");
      if (existing) { setTimeout(function () { window.location.href = "internships.html"; }, 500); }
      else { setBusy(form, false); form.reset(); var pub = document.getElementById("published"); if (pub) pub.checked = true; }
    }, true);
  }

  function initCompanyModerationControls() {
    var companiesBody = document.getElementById("companiesBody");
    var jobsBody = document.getElementById("companyJobsBody");
    if (!companiesBody && !jobsBody) return;

    {
      [companiesBody, jobsBody].filter(Boolean).forEach(function (body) {
        body.addEventListener("click", async function (event) {
          var button = event.target.closest("button");
          if (!button) return;
          var companyId = button.getAttribute("data-verify-company") || button.getAttribute("data-reject-company") || button.getAttribute("data-toggle-company") || button.getAttribute("data-delete-company");
          var jobId = button.getAttribute("data-approve-job") || button.getAttribute("data-reject-job") || button.getAttribute("data-archive-job") || button.getAttribute("data-delete-job");
          if (!companyId && !jobId) return;
          event.preventDefault();
          button.disabled = true;
          try {
            if (companyId) {
              if (button.hasAttribute("data-delete-company")) {
                if (!confirm("Delete this company, its internships and applications?")) return;
                await window.InternLog.deleteCompany(companyId);
              } else {
                var company = await window.InternLog.getCompanyById(companyId);
                var status = button.hasAttribute("data-verify-company") ? "Active" : button.hasAttribute("data-reject-company") ? "Rejected" : company.status === "Suspended" ? "Active" : "Suspended";
                await window.InternLog.setCompanyStatus(companyId, status);
              }
            } else if (button.hasAttribute("data-delete-job")) {
              if (!confirm("Delete this internship and its applications?")) return;
              await window.InternLog.deleteInternship(jobId);
            } else {
              await window.InternLog.setInternshipStatus(jobId, button.hasAttribute("data-approve-job") ? "Published" : button.hasAttribute("data-reject-job") ? "Rejected" : "Archived");
            }
            showNotification("Moderation updated.", "success");
            if (window.__internlogRerenderModeration) await window.__internlogRerenderModeration();
          } catch (error) { showNotification(error.message, "error"); }
          finally { button.disabled = false; }
        });
      });
      return;
    }

  }

  function getSession() {
    return window.InternLog.getSession();
  }
  function setSession(s) {
    window.InternLog.setSession(s);
  }
  function clearSession() {
    return window.InternLog.clearSession();
  }

  function computeStats(apps) {
    var s = { total: apps.length, Applied: 0, Shortlisted: 0, Interview: 0, Selected: 0, Rejected: 0 };
    apps.forEach(function (a) { if (s[a.status] != null) s[a.status]++; });
    return s;
  }

  /* ---------------- CSV Export Utility ---------------- */
  function exportApplicationsToCSV(apps, filename, usersById) {
    if (!apps || !apps.length) {
      showNotification("No applications available to export.", "warning");
      return;
    }
    var headers = ["ID", "Student Name", "Student Email", "Company", "Role", "Location", "Internship Type", "Applied Date", "Deadline", "Interview Date", "Stipend (INR/mo)", "Status", "Posting URL", "Notes"];
    var rows = apps.map(function (a) {
      var student = usersById ? (usersById[a.userId] || null) : null;
      return [
        a.id,
        student ? student.name : ("User " + a.userId),
        student ? student.email : "",
        a.company || "",
        a.role || "",
        a.location || "",
        a.internshipType || "On-site",
        a.appliedDate || "",
        a.deadline || "",
        a.interviewDate || "",
        a.stipend || "0",
        a.status || "Applied",
        a.url || "",
        (a.notes || "").replace(/[\r\n]+/g, " ")
      ].map(function (val) {
        var str = String(val == null ? "" : val);
        if (/^[=+@\-\t\r]/.test(str)) str = "'" + str;
        if (/[",\n]/.test(str)) {
          str = '"' + str.replace(/"/g, '""') + '"';
        }
        return str;
      }).join(",");
    });

    var csvContent = "\uFEFF" + [headers.join(",")].concat(rows).join("\r\n");
    var blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    var link = document.createElement("a");
    var url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename || ("internlog_applications_" + new Date().toISOString().slice(0, 10) + ".csv"));
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showNotification("Exported " + apps.length + " applications to CSV.", "success");
  }

  /* ---------------- UI primitives ---------------- */
  /* Toast icons (OpenSourceUI Toast Notification adaptation, MIT): filled dot
     + glyph per kind. Message stays textContent-assigned (XSS-safe). */
  var TOAST_ICONS = {
    success: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 8.5 6.5 11.5 12.5 4.5"/></svg>',
    error: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M4 4l8 8M12 4l-8 8"/></svg>',
    warning: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M8 4v5"/><circle cx="8" cy="12" r=".5" fill="currentColor"/></svg>',
    info: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M8 7.5V12"/><circle cx="8" cy="4.5" r=".5" fill="currentColor"/></svg>'
  };
  function dismissToast(el) {
    if (!el || el.getAttribute("data-closing")) return;
    el.setAttribute("data-closing", "true");
    try { el.className += " toast-exit"; } catch (e) {}
    setTimeout(function () {
      try { el.remove(); } catch (e) { if (el.parentNode) el.parentNode.removeChild(el); }
    }, 260);
  }
  function showNotification(message, type) {
    type = type || "info";
    var container = document.getElementById("toast-container");
    if (!container) {
      container = document.createElement("div");
      container.id = "toast-container";
      container.setAttribute("aria-live", "polite");
      document.body.appendChild(container);
    }
    var el = document.createElement("div");
    el.className = "toast toast-" + type;
    var icon = document.createElement("span");
    icon.className = "toast-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.innerHTML = TOAST_ICONS[type] || TOAST_ICONS.info;
    var text = document.createElement("span");
    text.className = "toast-text";
    text.textContent = message;
    var close = document.createElement("button");
    close.className = "toast-close";
    close.type = "button";
    close.setAttribute("aria-label", "Dismiss notification");
    close.innerHTML = '<span aria-hidden="true">×</span>';
    close.onclick = function () { dismissToast(el); };
    el.appendChild(icon);
    el.appendChild(text);
    el.appendChild(close);
    container.appendChild(el);
    setTimeout(function () { dismissToast(el); }, 3400);
  }

  function statusBadge(status) {
    var cls = "badge-applied";
    if (status === "Shortlisted") cls = "badge-shortlisted";
    else if (status === "Interview") cls = "badge-interview";
    else if (status === "Selected") cls = "badge-selected";
    else if (status === "Rejected") cls = "badge-rejected";
    return '<span class="badge ' + cls + '">' + esc(status) + "</span>";
  }

  function requireAuth(role) {
    var s = getSession();
    var here = window.location.pathname.replace(/\\/g, "/");
    var inUser = here.indexOf("/user/") !== -1 || here.endsWith("/user") || here.indexOf("user/dashboard") !== -1;
    var inAdmin = here.indexOf("/admin/") !== -1 || here.endsWith("/admin") || here.indexOf("admin/dashboard") !== -1;
    var inCompany = here.indexOf("/company/") !== -1;

    if (!s) {
      if (inAdmin) window.location.href = "login.html";
      else if (inUser) window.location.href = "login.html";
      else if (inCompany) window.location.href = "login.html";
      return null;
    }
    if (role && s.role !== role) {
      if (s.role === "admin") window.location.href = "../admin/dashboard.html";
      else if (s.role === "company") window.location.href = "../company/dashboard.html";
      else window.location.href = "../user/dashboard.html";
      return null;
    }
    return s;
  }

  /* ---------------- StaggeredMenu (React Bits adaptation, vanilla, no GSAP) ----------------
     Overlay menu with prelayers + staggered items + socials. Built from the
     page's own nav links (sidebar on workspaces, pills on landing); the static
     nav stays in markup as the no-JS fallback and hides via body.sm-nav.
     Toggle injected into .topbar (workspaces) or .nav-bar--pill (landing). */
  function initStaggeredMenu() {
    if (typeof document.querySelectorAll !== "function" || typeof document.createElement !== "function" || !document.body) return;
    if (document.body.getAttribute("data-navigation") === "pills") return;
    if (document.querySelector(".staggered-menu-wrapper")) return;
    var sidebar = document.querySelector(".sidebar");
    var isLanding = !sidebar;
    var links = [];
    if (isLanding) {
      var pills = document.querySelectorAll("[data-pill-nav] .pill");
      if (!pills || !pills.length) return;
      Array.prototype.forEach.call(pills, function (a) {
        var label = a.querySelector(".pill-label");
        links.push({
          href: a.getAttribute("href") || "#",
          text: label ? label.textContent : a.textContent,
          current: a.classList.contains("is-active"),
          logout: a.hasAttribute("data-logout"),
          account: a.hasAttribute("data-landing-account")
        });
      });
    } else {
      var anchors = document.querySelectorAll(".sidebar nav a");
      if (!anchors || !anchors.length) return;
      Array.prototype.forEach.call(anchors, function (a) {
        links.push({
          href: a.getAttribute("href") || "#",
          text: (a.textContent || "").trim(),
          current: a.classList.contains("active"),
          logout: a.hasAttribute("data-logout"),
          account: false
        });
      });
    }
    if (!links.length) return;

    var socials = [];
    if (isLanding) {
      var foot = document.querySelectorAll(".site-footer nav a");
      Array.prototype.forEach.call(foot, function (a, i) {
        if (i < 4) socials.push({ href: a.getAttribute("href") || "#", text: (a.textContent || "").trim() });
      });
    } else {
      var brand = document.querySelector(".sidebar .brand");
      socials.push({ href: brand ? (brand.getAttribute("href") || "../index.html") : "../index.html", text: "Back to Home" });
    }

    var wrapper = document.createElement("div");
    wrapper.className = "staggered-menu-wrapper";
    wrapper.setAttribute("data-position", "right");
    var layers = document.createElement("div");
    layers.className = "sm-prelayers";
    layers.setAttribute("aria-hidden", "true");
    for (var li = 0; li < 3; li++) {
      var layer = document.createElement("div");
      layer.className = "sm-prelayer";
      layers.appendChild(layer);
    }
    var panel = document.createElement("aside");
    panel.className = "sm-panel";
    panel.setAttribute("aria-hidden", "true");
    panel.setAttribute("aria-label", "Menu");
    panel.id = "staggeredMenu";
    panel.inert = true;
    var inner = document.createElement("div");
    inner.className = "sm-panel-inner";
    var list = document.createElement("ul");
    list.className = "sm-panel-list";
    list.setAttribute("role", "list");
    list.setAttribute("data-numbering", "true");
    var items = [];
    links.forEach(function (link, idx) {
      var wrap = document.createElement("li");
      wrap.className = "sm-panel-itemWrap" + (link.logout ? " has-separator" : "");
      var a = document.createElement("a");
      a.className = "sm-panel-item" + (link.current ? " is-active" : "") + (link.logout ? " is-danger" : "");
      a.setAttribute("href", link.href);
      a.setAttribute("data-index", String(idx + 1));
      if (link.current) a.setAttribute("aria-current", "page");
      if (link.logout) a.setAttribute("data-logout", "");
      if (link.account) a.setAttribute("data-landing-account", "");
      var label = document.createElement("span");
      label.className = "sm-panel-itemLabel";
      label.textContent = link.text;
      a.appendChild(label);
      wrap.appendChild(a);
      list.appendChild(wrap);
      items.push(a);
    });
    inner.appendChild(list);
    var socialEls = [];
    if (socials.length) {
      var soc = document.createElement("div");
      soc.className = "sm-socials";
      soc.setAttribute("aria-label", "Secondary links");
      var title = document.createElement("h3");
      title.className = "sm-socials-title";
      title.textContent = isLanding ? "Explore" : "Navigate";
      soc.appendChild(title);
      var socList = document.createElement("ul");
      socList.className = "sm-socials-list";
      socList.setAttribute("role", "list");
      socials.forEach(function (s) {
        var sli = document.createElement("li");
        var sa = document.createElement("a");
        sa.className = "sm-socials-link";
        sa.setAttribute("href", s.href);
        sa.textContent = s.text;
        sli.appendChild(sa);
        socList.appendChild(sli);
        socialEls.push(sa);
      });
      soc.appendChild(socList);
      inner.appendChild(soc);
    }
    panel.appendChild(inner);
    wrapper.appendChild(layers);
    wrapper.appendChild(panel);
    document.body.appendChild(wrapper);

    var toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "sm-toggle";
    toggle.setAttribute("aria-label", "Open menu");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-controls", panel.id);
    toggle.innerHTML = '<span class="sm-toggle-text" aria-hidden="true"><span class="sm-toggle-textInner"><span class="sm-toggle-line">Menu</span><span class="sm-toggle-line">Close</span></span></span><span class="sm-icon" aria-hidden="true"><span class="sm-icon-h"></span><span class="sm-icon-v"></span></span>';
    var host = null;
    if (isLanding) host = document.querySelector(".nav-bar--pill");
    else host = document.querySelector(".topbar");
    if (!host) { wrapper.remove(); return; }
    if (isLanding) host.appendChild(toggle);
    else host.insertBefore(toggle, host.firstChild);
    document.body.classList.add("sm-nav");

    var open = false, previousOverflow = "", backgroundState = [];
    function lockBackground() {
      var branch = toggle;
      while (branch && branch !== document.body) {
        Array.prototype.forEach.call(branch.parentElement.children, function (element) {
          if (element === branch || element === wrapper || /^(SCRIPT|STYLE|LINK|DIALOG)$/.test(element.tagName)) return;
          backgroundState.push({ element: element, inert: element.inert });
          element.inert = true;
        });
        branch = branch.parentElement;
      }
    }
    function paintDelays(opening) {
      items.forEach(function (a, i) {
        try { a.style.transitionDelay = opening ? (260 + i * 70) + "ms" : "0ms"; } catch (e) {}
      });
      socialEls.forEach(function (a) {
        try { a.style.transitionDelay = opening ? "620ms" : "0ms"; } catch (e) {}
      });
      try {
        var soc = panel.querySelector(".sm-socials");
        if (soc) soc.style.transitionDelay = opening ? "560ms" : "0ms";
      } catch (e) {}
    }
    function setOpen(next, focusToggle) {
      if (open === next) return;
      open = next;
      paintDelays(open);
      if (open) {
        document.body.setAttribute("data-sm-open", "true");
        panel.setAttribute("aria-hidden", "false");
        panel.inert = false;
        toggle.setAttribute("aria-expanded", "true");
        toggle.setAttribute("aria-label", "Close menu");
        previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        lockBackground();
        if (items[0]) { try { items[0].focus(); } catch (e) {} }
      } else {
        document.body.removeAttribute("data-sm-open");
        panel.setAttribute("aria-hidden", "true");
        panel.inert = true;
        toggle.setAttribute("aria-expanded", "false");
        toggle.setAttribute("aria-label", "Open menu");
        document.body.style.overflow = previousOverflow;
        backgroundState.forEach(function (state) { state.element.inert = state.inert; });
        backgroundState = [];
        if (focusToggle !== false) { try { toggle.focus(); } catch (e) {} }
      }
    }
    toggle.addEventListener("click", function (e) {
      e.stopPropagation();
      setOpen(!open);
    });
    panel.addEventListener("click", function (e) {
      var a = e.target.closest ? e.target.closest("a[href]") : null;
      if (a) setOpen(false);
    });
    document.addEventListener("click", function (e) {
      if (!open) return;
      var t = e.target;
      var inside = false;
      try { inside = !!(t && t.closest && (t.closest(".sm-panel") || t.closest(".sm-toggle"))); } catch (err) {}
      if (!inside) setOpen(false);
    });
    document.addEventListener("keydown", function (e) {
      if (!open || document.querySelector("dialog[open], .modal-backdrop.open")) return;
      if (e.key === "Escape" && open) {
        e.preventDefault();
        e.stopPropagation();
        setOpen(false);
      }
      if (e.key === "Tab") {
        var controls = [toggle].concat(items, socialEls);
        var index = controls.indexOf(document.activeElement);
        if (index < 0 || (e.shiftKey && index === 0) || (!e.shiftKey && index === controls.length - 1)) {
          e.preventDefault();
          controls[e.shiftKey ? controls.length - 1 : 0].focus();
        }
      }
    });
  }

  function initNavigation() {
    initStaggeredMenu();
    var sidebar = document.getElementById("sidebar");
    var btn = document.getElementById("menuBtn");
    var backdrop = document.getElementById("sidebarBackdrop");
    if (btn && sidebar) {
      btn.addEventListener("click", function () {
        sidebar.classList.toggle("open");
        if (backdrop) backdrop.classList.toggle("show", sidebar.classList.contains("open"));
      });
    }
    if (backdrop && sidebar) {
      backdrop.addEventListener("click", function () {
        sidebar.classList.remove("open");
        backdrop.classList.remove("show");
      });
    }

    // Pill nav mobile popover (landing header; Pill Nav adaptation, see ui-components + style.css)
    var pillBtn = document.getElementById("pillMenuBtn");
    var pillPopover = document.getElementById("pillMenuPopover");
    if (pillBtn && pillPopover) {
      pillBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        var open = pillPopover.classList.toggle("open");
        pillBtn.setAttribute("aria-expanded", open ? "true" : "false");
      });
      pillPopover.querySelectorAll("a").forEach(function (a) {
        a.addEventListener("click", function () {
          pillPopover.classList.remove("open");
          pillBtn.setAttribute("aria-expanded", "false");
        });
      });
      document.addEventListener("click", function (e) {
        if (!pillPopover.classList.contains("open")) return;
        if (pillPopover.contains(e.target) || pillBtn.contains(e.target)) return;
        pillPopover.classList.remove("open");
        pillBtn.setAttribute("aria-expanded", "false");
      });
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && pillPopover.classList.contains("open")) {
          pillPopover.classList.remove("open");
          pillBtn.setAttribute("aria-expanded", "false");
          try { pillBtn.focus(); } catch (err) {}
        }
      });
    }

    // Active link (sidebar anchors + staggered panel items share hrefs)
    var normalizedPath = window.location.pathname.replace(/\\/g, "/");
    var file = (normalizedPath.split("/").pop() || "index.html").split("?")[0];
    document.querySelectorAll(".sidebar nav a, .sm-panel-item").forEach(function (a) {
      var href = (a.getAttribute("href") || "").replace(/\\/g, "/").split("?")[0];
      if (href === file) {
        if (a.classList.contains("sm-panel-item")) {
          a.classList.add("is-active");
          a.setAttribute("aria-current", "page");
        } else {
          a.classList.add("active");
        }
      }
    });

    // Logout handling
    document.querySelectorAll("[data-logout]").forEach(function (el) {
      el.addEventListener("click", async function (e) {
        if (!el.hasAttribute("data-logout")) return;
        e.preventDefault();
        try { await clearSession(); } catch (error) { showNotification(error.message, "error"); return; }
        showNotification("Logged out successfully", "success");
        setTimeout(function () {
          window.location.href = el.getAttribute("href") || "../index.html";
        }, 400);
      });
    });

    // Password reveal toggles (OpenSourceUI Password Field pattern: pressed state)
    document.querySelectorAll("[data-password-toggle]").forEach(function (btnEl) {
      btnEl.addEventListener("click", function () {
        var input = document.getElementById(btnEl.getAttribute("data-password-toggle"));
        if (!input) return;
        input.type = input.type === "password" ? "text" : "password";
        var showing = input.type !== "password";
        btnEl.textContent = showing ? "Hide" : "Show";
        btnEl.setAttribute("aria-pressed", showing ? "true" : "false");
      });
    });

    populateSessionUI();
    initSearchFields();
    initCountUp();

    // Global modal close on ESC key
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        var openModal = document.querySelector(".modal-backdrop.open");
        if (openModal) {
          openModal.classList.remove("open");
        }
      }
    });
  }

  function populateSessionUI() {
    var s = getSession();
    if (!s) return;
    document.querySelectorAll("[data-user-name]").forEach(function (el) { el.textContent = s.name || (s.role === "admin" ? "Admin" : "Student"); });
    document.querySelectorAll("[data-user-email]").forEach(function (el) { el.textContent = s.email || ""; });
    document.querySelectorAll("[data-avatar]").forEach(function (el) { if (s.name) el.textContent = s.name.trim().charAt(0).toUpperCase(); });
  }

  /* Search fields with leading icon + clear button (OpenSourceUI Search Input
     adaptation, MIT). Decorates plain toolbar searches in place; the landing
     spotlight bar is separate. No markup edits required. */
  var SEARCH_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>';
  function initSearchFields() {
    if (typeof document.querySelectorAll !== "function" || typeof document.createElement !== "function") return;
    var inputs = document.querySelectorAll("input.search-input");
    if (!inputs || typeof inputs.forEach !== "function") return;
    inputs.forEach(function (input) {
      if (!input || input.id === "landingSearch") return;
      try { if (input.closest && input.closest("[data-spotlight]")) return; } catch (e) {}
      try {
        if (input.parentNode && input.parentNode.classList && input.parentNode.classList.contains("search-field")) return;
      } catch (e) {}
      var wrap = document.createElement("div");
      wrap.className = "search-field";
      var icon = document.createElement("span");
      icon.className = "search-field-icon";
      icon.setAttribute("aria-hidden", "true");
      icon.innerHTML = SEARCH_ICON;
      var clear = document.createElement("button");
      clear.type = "button";
      clear.className = "search-clear";
      clear.setAttribute("aria-label", "Clear search");
      clear.innerHTML = '<span aria-hidden="true">×</span>';
      clear.addEventListener("click", function () {
        input.value = "";
        sync();
        try { input.focus(); } catch (e) {}
        try {
          if (typeof Event === "function") input.dispatchEvent(new Event("input", { bubbles: true }));
        } catch (e) {}
      });
      function sync() {
        var has = !!(input.value && String(input.value).length);
        try {
          if (wrap.classList) wrap.classList.toggle("has-value", has);
          else wrap.setAttribute("data-has-value", has ? "true" : "false");
        } catch (e) {}
      }
      input.addEventListener("input", sync);
      try { input.parentNode.insertBefore(wrap, input); } catch (e) { return; }
      wrap.appendChild(icon);
      wrap.appendChild(input);
      wrap.appendChild(clear);
      sync();
    });
  }

  /* Animated stat numbers (OpenSourceUI Counter adaptation, MIT). Counts
     `.stat .value` integers up once when visible; instant when reduced motion
     is preferred or animation APIs are unavailable. Late-rendered stats are
     picked up via MutationObserver. */
  function initCountUp() {
    if (typeof document.querySelectorAll !== "function") return;
    var reduce = false;
    try { reduce = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches); } catch (e) {}
    var raf = (typeof window.requestAnimationFrame === "function") ? window.requestAnimationFrame.bind(window) : null;
    function animate(el) {
      if (!el || el.getAttribute("data-counted")) return;
      var target = parseInt(String(el.textContent || "").replace(/[^0-9]/g, ""), 10);
      if (!isFinite(target)) return;
      el.setAttribute("data-counted", "true");
      if (reduce || !raf || target <= 0) { el.textContent = String(target); return; }
      var start = null, dur = 700;
      function step(ts) {
        if (start === null) start = ts;
        var p = Math.min(1, (ts - start) / dur);
        el.textContent = String(Math.round(target * (1 - Math.pow(1 - p, 3))));
        if (p < 1) raf(step); else el.textContent = String(target);
      }
      raf(step);
    }
    function scan(root) {
      var nodes = null;
      try { nodes = (root || document).querySelectorAll(".stat .value"); } catch (e) { return; }
      if (!nodes || typeof nodes.forEach !== "function") return;
      nodes.forEach(function (el) {
        if (!reduce && typeof window.IntersectionObserver === "function") {
          var io = new window.IntersectionObserver(function (entries, obs) {
            entries.forEach(function (en) {
              if (en.isIntersecting) { try { obs.unobserve(en.target); } catch (e) {} animate(en.target); }
            });
          }, { threshold: 0.4 });
          try { io.observe(el); } catch (e) { animate(el); }
        } else animate(el);
      });
    }
    scan(document);
    if (typeof window.MutationObserver === "function" && document.body) {
      try {
        new window.MutationObserver(function (records) {
          records.forEach(function (rec) {
            var added = rec.addedNodes || [];
            for (var i = 0; i < added.length; i++) {
              var node = added[i];
              if (!node || node.nodeType !== 1) continue;
              if (node.matches && node.matches(".stat .value")) animate(node);
              else if (node.querySelectorAll) scan(node);
            }
          });
        }).observe(document.body, { childList: true, subtree: true });
      } catch (e) {}
    }
  }

  function setFieldError(input, msg) {
    if (!input) return;
    input.setAttribute("aria-invalid", msg ? "true" : "false");
    var err = document.getElementById(input.id + "-error");
    if (err) {
      err.textContent = msg || "";
      err.classList.toggle("visible", !!msg);
      var descriptions = (input.getAttribute("aria-describedby") || "").split(/\s+/).filter(function (id) { return id && id !== err.id; });
      if (msg) descriptions.push(err.id);
      if (descriptions.length) input.setAttribute("aria-describedby", descriptions.join(" "));
      else input.removeAttribute("aria-describedby");
    }
  }

  /* Field error that also feeds the submit-time error summary. Always paints
     the inline slot; returns false when a message was set. */
  function flagError(list, input, msg) {
    setFieldError(input, msg || "");
    if (msg && input && input.id) list.push({ id: input.id, message: msg });
    return !msg;
  }

  /* Focusable, linked error summary kept alongside inline field errors. */
  function showErrorSummary(form, items) {
    if (!form || !items || !items.length) return;
    var box = null;
    try { box = form.querySelector(".form-error-summary"); } catch (e) {}
    if (!box) {
      box = document.createElement("div");
      box.className = "alert alert-error form-error-summary";
      box.setAttribute("role", "alert");
      box.tabIndex = -1;
      form.insertBefore(box, form.firstChild);
    }
    box.textContent = "";
    var head = document.createElement("strong");
    head.textContent = items.length === 1 ? "Please fix 1 field below." : "Please fix " + items.length + " fields below.";
    box.appendChild(head);
    var ul = document.createElement("ul");
    items.forEach(function (it) {
      var li = document.createElement("li");
      var a = document.createElement("a");
      a.setAttribute("href", "#" + it.id);
      a.textContent = it.message;
      a.addEventListener("click", function (e) {
        e.preventDefault();
        var target = document.getElementById(it.id);
        if (form._internlogStepper) form._internlogStepper.reveal(target);
        if (target) { try { target.focus(); } catch (err) {} }
      });
      li.appendChild(a);
      ul.appendChild(li);
    });
    box.appendChild(ul);
    box.style.display = "block";
    if (form._internlogStepper) form._internlogStepper.reveal(document.getElementById(items[0].id));
    try { box.focus(); } catch (e) {}
  }
  function hideErrorSummary(form) {
    if (!form) return;
    var box = null;
    try { box = form.querySelector(".form-error-summary"); } catch (e) {}
    if (box) box.style.display = "none";
  }

  /* Busy submit buttons: disabled + spinner while an async submit runs. */
  function setBusy(form, on) {
    if (!form) return null;
    var btn = null;
    try { btn = form.querySelector('button[type="submit"], button:not([type]), input[type="submit"]'); } catch (e) {}
    if (!btn) return null;
    if (on) {
      btn.disabled = true;
      try { btn.classList.add("is-loading"); } catch (e) {}
      btn.setAttribute("aria-busy", "true");
    } else {
      btn.disabled = false;
      try { btn.classList.remove("is-loading"); } catch (e) {}
      btn.removeAttribute("aria-busy");
    }
    return btn;
  }

  function isEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }
  function passwordStrength(pw) {
    if (!pw || pw.length < 8) return "Password must be at least 8 characters.";
    if (!/[A-Za-z]/.test(pw) || !/[0-9]/.test(pw)) return "Password must include both letters and numbers.";
    return "";
  }
  function validURL(v) {
    if (!v) return true;
    try {
      var u = new URL(v);
      return u.protocol === "http:" || u.protocol === "https:";
    } catch (e) {
      return false;
    }
  }

  /* ---------------- Auth stepper (React Bits Stepper adaptation, vanilla) ----------------
     Frameless multi-step flow for auth forms. Panes are `.stepper-pane` sections
     carrying `data-step-title`; the numbered track, gliding pill, badges and the
     Back/Continue footer are built here. `validateStep(n)` (1-based) gates forward
     moves; the form's own submit handler keeps full validation as final authority.
     Only stub-safe DOM APIs are used. */
  var STEP_CHECK_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
  function initAuthStepper(form, cfg) {
    if (!form || !cfg) return null;
    if (form._internlogStepper) return form._internlogStepper;
    if (typeof document.querySelectorAll !== "function" || typeof document.createElement !== "function") return null;
    var panes = null;
    try { panes = form.querySelectorAll(".stepper-pane"); } catch (e) { return null; }
    if (!panes || panes.length < 2) return null;
    var list = Array.prototype.slice.call(panes);
    var total = list.length;
    var current = 1, reached = 1, direction = 1;
    var reduceMotion = false;
    try { reduceMotion = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches); } catch (e) {}

    var track = document.createElement("div");
    track.className = "stepper-track";
    track.setAttribute("role", "group");
    track.setAttribute("aria-label", "Progress");
    var glider = document.createElement("span");
    glider.className = "stepper-glider";
    glider.setAttribute("aria-hidden", "true");
    track.appendChild(glider);
    var segs = list.map(function (pane, i) {
      var n = i + 1;
      var b = document.createElement("button");
      b.type = "button";
      b.className = "stepper-seg";
      var title = pane.getAttribute("data-step-title") || ("Step " + n);
      b.setAttribute("aria-label", "Step " + n + ": " + title);
      var badge = document.createElement("span");
      badge.className = "stepper-badge";
      badge.setAttribute("aria-hidden", "true");
      badge.textContent = String(n);
      var label = document.createElement("span");
      label.className = "stepper-seg-title";
      label.textContent = title;
      b.appendChild(badge);
      b.appendChild(label);
      b.addEventListener("click", function () { if (n <= reached && n !== current) go(n); });
      track.appendChild(b);
      return b;
    });
    form.insertBefore(track, list[0]);

    var foot = document.createElement("div");
    foot.className = "stepper-foot";
    var back = document.createElement("button");
    back.type = "button";
    back.className = "btn btn-secondary btn-sm stepper-back";
    back.textContent = "Back";
    var next = document.createElement("button");
    next.type = "button";
    next.className = "btn btn-sm stepper-next";
    next.textContent = "Continue";
    back.addEventListener("click", function () { go(current - 1); });
    next.addEventListener("click", function () { go(current + 1); });
    foot.appendChild(back);
    foot.appendChild(next);
    form.appendChild(foot);

    function placeGlider() {
      var seg = segs[current - 1];
      if (!seg) return;
      var left = 0, width = 0;
      try { left = seg.offsetLeft; width = seg.offsetWidth; } catch (e) { return; }
      if (!width) return;
      try {
        glider.style.transform = "translateX(" + left + "px)";
        glider.style.width = width + "px";
        glider.classList.add("is-placed");
      } catch (e) {}
    }

    function paint() {
      segs.forEach(function (b, i) {
        var n = i + 1;
        var status = n < current ? "complete" : (n === current ? "active" : "upcoming");
        b.setAttribute("data-status", status);
        if (n === current) b.setAttribute("aria-current", "step");
        else b.removeAttribute("aria-current");
        var badge = b.firstChild;
        if (badge) {
          if (status === "complete") badge.innerHTML = STEP_CHECK_SVG;
          else badge.textContent = String(n);
        }
        b.disabled = !(n <= reached);
      });
      list.forEach(function (pane, i) {
        var on = (i + 1) === current;
        if (on) {
          pane.hidden = false;
          try {
            pane.classList.remove("is-active", "is-back");
            void pane.offsetWidth;
            if (direction < 0) pane.classList.add("is-back");
            pane.classList.add("is-active");
          } catch (e) {}
        } else {
          pane.hidden = true;
          try { pane.classList.remove("is-active", "is-back"); } catch (e) {}
        }
      });
      back.hidden = current <= 1;
      next.hidden = current >= total;
      placeGlider();
    }

    function go(n) {
      n = Math.max(1, Math.min(total, Math.round(n) || 1));
      if (n === current) return true;
      if (n > current) {
        for (var s = current; s < n; s++) {
          var gate = true;
          try { gate = cfg.validateStep ? cfg.validateStep(s) !== false : true; }
          catch (e) { gate = false; }
          if (!gate) return false;
        }
        direction = 1;
      } else {
        direction = -1;
      }
      current = n;
      if (n > reached) reached = n;
      paint();
      var focusTarget = list[current - 1].querySelector("input, select, textarea, button");
      if (focusTarget) focusTarget.focus();
      return true;
    }

    try {
      if (typeof window.addEventListener === "function") {
        window.addEventListener("resize", function () { placeGlider(); });
      }
    } catch (e) {}
    paint();
    // Enter on an earlier pane advances through validation, never submits
    // credentials or hidden required fields prematurely.
    form.addEventListener("submit", function (event) {
      if (current >= total) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      go(current + 1);
    }, true);
    if (!reduceMotion) {
      try {
        setTimeout(function () { placeGlider(); }, 120);
      } catch (e) {}
    }
    form._internlogStepper = { go: go, reveal: function (field) {
      var index = list.findIndex(function (pane) { return field && pane.contains(field); });
      if (index < 0 || index + 1 === current) return;
      direction = index + 1 < current ? -1 : 1;
      current = index + 1;
      reached = Math.max(reached, current);
      paint();
    } };
    return form._internlogStepper;
  }

  /* ---------------- Page initializers ---------------- */
  async function initUserLogin() {
    var form = document.getElementById("loginForm");
    if (!form) return;

    var s = getSession();
    if (s && s.role === "user") {
      window.location.href = "dashboard.html";
      return;
    }

    var forgotLink = document.getElementById("forgotPasswordLink");
    if (forgotLink) {
      forgotLink.addEventListener("click", function (e) {
        e.preventDefault();
        showNotification("Password reset: Please contact your college placement cell for assistance.", "info");
      });
    }

    initAuthStepper(form, {
      validateStep: function (n) {
        if (n !== 1) return true;
        var email = document.getElementById("email");
        if (!email || !isEmail(email.value.trim())) {
          setFieldError(email, "Enter a valid email address.");
          showNotification("Please fix the highlighted fields to continue.", "error");
          return false;
        }
        setFieldError(email, "");
        return true;
      }
    });

    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      var email = document.getElementById("email");
      var password = document.getElementById("password");
      var ok = true;
      var errs = [];

      ok = flagError(errs, email, !isEmail(email.value.trim()) ? "Enter a valid email address." : "") && ok;
      ok = flagError(errs, password, !password.value ? "Enter your password." : "") && ok;

      if (!ok) { showErrorSummary(form, errs); return; }
      hideErrorSummary(form);
      setBusy(form, true);
      try {
        var session = await window.InternLog.loginUser({ email: email.value.trim(), password: password.value });
        if (session.role !== "user") {
          throw new Error("Invalid email or password");
        }
        setSession(session);
        showNotification("Welcome back, " + session.name.split(" ")[0] + "!", "success");
        setTimeout(function () { window.location.href = "dashboard.html"; }, 500);
      } catch (err) {
        setBusy(form, false);
        var alertEl = document.getElementById("formAlert");
        if (alertEl) {
          alertEl.textContent = err.message || "Invalid email or password";
          alertEl.style.display = "block";
        }
        showNotification(err.message || "Invalid email or password", "error");
      }
    });
  }

  async function initAdminLogin() {
    var form = document.getElementById("adminLoginForm");
    if (!form) return;

    var s = getSession();
    if (s && s.role === "admin") {
      window.location.href = "dashboard.html";
      return;
    }

    initAuthStepper(form, {
      validateStep: function (n) {
        if (n !== 1) return true;
        var email = document.getElementById("email");
        if (!email || !email.value.trim()) {
          setFieldError(email, "Enter your admin email.");
          showNotification("Please fix the highlighted fields to continue.", "error");
          return false;
        }
        setFieldError(email, "");
        return true;
      }
    });

    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      var email = document.getElementById("email");
      var password = document.getElementById("password");
      var ok = true;
      var errs = [];
      ok = flagError(errs, email, !email.value.trim() ? "Enter your admin email." : "") && ok;
      ok = flagError(errs, password, !password.value ? "Enter your password." : "") && ok;
      if (!ok) { showErrorSummary(form, errs); return; }
      hideErrorSummary(form);
      setBusy(form, true);

      try {
        var session = await window.InternLog.loginAdmin({ email: email.value.trim(), password: password.value });
        setSession(session);
        showNotification("Welcome, Admin!", "success");
        setTimeout(function () { window.location.href = "dashboard.html"; }, 500);
      } catch (err) {
        setBusy(form, false);
        var alertEl = document.getElementById("formAlert");
        if (alertEl) { alertEl.textContent = err.message; alertEl.style.display = "block"; }
        showNotification(err.message, "error");
      }
    });
  }

  async function initRegister() {
    var form = document.getElementById("registerForm");
    if (!form) return;

    var termsLink = document.getElementById("termsLink");
    var termsModal = document.getElementById("termsModal");
    var termsClose = document.getElementById("termsClose");
    if (termsLink && termsModal) {
      termsLink.addEventListener("click", function (e) {
        e.preventDefault();
        termsModal.classList.add("open");
      });
      if (termsClose) {
        termsClose.addEventListener("click", function () {
          termsModal.classList.remove("open");
        });
      }
      termsModal.addEventListener("click", function (e) {
        if (e.target === termsModal) termsModal.classList.remove("open");
      });
    }

    initAuthStepper(form, {
      validateStep: function (n) {
        if (n !== 1) return true;
        var name = document.getElementById("fullName");
        var email = document.getElementById("email");
        var password = document.getElementById("password");
        var confirm = document.getElementById("confirmPassword");
        var ok = true;
        if (!name || name.value.trim().length < 3) { setFieldError(name, "Enter your full name."); ok = false; } else setFieldError(name, "");
        if (!email || !isEmail(email.value.trim())) { setFieldError(email, "Enter a valid email address."); ok = false; } else setFieldError(email, "");
        var pwErr = password ? passwordStrength(password.value) : "Enter a password.";
        if (pwErr) { setFieldError(password, pwErr); ok = false; } else setFieldError(password, "");
        if (!confirm || !password || confirm.value !== password.value) { setFieldError(confirm, "Passwords do not match."); ok = false; } else setFieldError(confirm, "");
        if (!ok) showNotification("Please fix the highlighted fields to continue.", "error");
        return ok;
      }
    });

    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      var name = document.getElementById("fullName");
      var email = document.getElementById("email");
      var password = document.getElementById("password");
      var confirm = document.getElementById("confirmPassword");
      var college = document.getElementById("college");
      var course = document.getElementById("course");
      var gradYear = document.getElementById("gradYear");
      var terms = document.getElementById("terms");
      var ok = true;
      var errs = [];

      ok = flagError(errs, name, name.value.trim().length < 3 ? "Enter your full name." : "") && ok;
      ok = flagError(errs, email, !isEmail(email.value.trim()) ? "Enter a valid email address." : "") && ok;
      var pwErr = passwordStrength(password.value);
      ok = flagError(errs, password, pwErr) && ok;
      ok = flagError(errs, confirm, confirm.value !== password.value ? "Passwords do not match." : "") && ok;
      ok = flagError(errs, college, !college.value.trim() ? "Enter your college or university." : "") && ok;
      ok = flagError(errs, course, !course.value.trim() ? "Enter your course." : "") && ok;
      ok = flagError(errs, gradYear, !gradYear.value ? "Select your graduation year." : "") && ok;
      if (!terms.checked) { errs.push({ id: "terms", message: "Please accept the terms and conditions." }); showNotification("Please accept the terms and conditions.", "warning"); ok = false; }
      if (!ok) { showErrorSummary(form, errs); return; }
      hideErrorSummary(form);
      setBusy(form, true);

      try {
        var user = await window.InternLog.registerUser({
          name: name.value.trim(), email: email.value.trim(), password: password.value,
          college: college.value.trim(), course: course.value.trim(), gradYear: gradYear.value
        });
        setSession(await window.InternLog.loginUser({ email: email.value.trim(), password: password.value }));
        showNotification("Account created successfully!", "success");
        setTimeout(function () { window.location.href = "dashboard.html"; }, 600);
      } catch (err) {
        setBusy(form, false);
        showNotification(err.message, "error");
      }
    });
  }

  function renderStatGrid(el, stats, keys) {
    if (!el) return;
    el.innerHTML = keys.map(function (k) {
      var label = k === "total" ? "Total Applications" : (k === "Interview" ? "Interviews" : k);
      return '<div class="stat"><div class="label">' + esc(label) + '</div><div class="value">' + (stats[k === "total" ? "total" : k] || 0) + "</div></div>";
    }).join("");
  }

  function renderStatusOverview(el, stats) {
    if (!el) return;
    var max = Math.max(stats.total, 1);
    el.innerHTML = STATUSES.map(function (st) {
      var n = stats[st] || 0;
      var pct = Math.round((n / max) * 100);
      var fillClass = "status-fill-" + st.toLowerCase();
      return '<div class="status-bar-row"><span>' + esc(st) + '</span>' +
        '<div class="status-track"><div class="status-fill ' + fillClass + '" style="width:' + pct + '%"></div></div>' +
        "<strong>" + n + "</strong></div>";
    }).join("");
  }

  function appRow(a, usersById, showStudent) {
    var student = usersById ? (usersById[a.userId] || null) : null;
    return "<tr>" +
      (showStudent ? "<td>#" + esc(a.id) + "</td><td>" + esc(student ? student.name : ("User " + a.userId)) + "</td>" : "") +
      "<td><strong>" + esc(a.company) + "</strong></td>" +
      "<td>" + esc(a.role) + "</td>" +
      (showStudent ? "" : "<td>" + esc(a.location || "—") + "</td>") +
      "<td>" + fmtDate(a.appliedDate) + "</td>" +
      (showStudent ? "" : "<td>" + fmtDate(a.deadline) + "</td>") +
      "<td>" + statusBadge(a.status) + "</td>" +
      '<td><div class="actions">' +
      '<button class="link-btn" data-view="' + a.id + '">View</button>' +
      (showStudent ? "" : '<a class="link-btn" href="edit-application.html?id=' + a.id + '">Edit</a>') +
      '<button class="link-btn danger" data-delete="' + a.id + '">Delete</button>' +
      "</div></td></tr>";
  }

  function wireTableActions(container, onChange) {
    if (!container) return;
    container.addEventListener("click", async function (e) {
      var viewBtn = e.target.closest && e.target.closest("[data-view]");
      var delBtn = e.target.closest && e.target.closest("[data-delete]");
      if (viewBtn) {
        var v = viewBtn.getAttribute("data-view");
        if (v) openAppModal(Number(v));
      } else if (delBtn) {
        var d = delBtn.getAttribute("data-delete");
        if (!confirm("Delete this internship application? This cannot be undone.")) return;
        await window.InternLog.deleteApplication(Number(d));
        showNotification("Application deleted", "success");
        if (onChange) onChange();
      }
    });
  }

  async function openAppModal(id) {
    var a = await window.InternLog.getApplicationById(id);
    if (!a) { showNotification("Application not found", "error"); return; }
    var owner = await window.InternLog.getUserById(a.userId);
    var backdrop = document.getElementById("modalBackdrop");
    var body = document.getElementById("modalBody");
    if (!backdrop || !body) return;

    body.innerHTML =
      '<div class="modal-header">' +
        "<h3>" + esc(a.company) + " — " + esc(a.role) + "</h3>" +
        '<button class="modal-close-icon" id="modalCloseIcon" aria-label="Close dialog"><span aria-hidden="true">&times;</span></button>' +
      "</div>" +
      "<dl>" +
      (owner ? "<dt>Student</dt><dd><strong>" + esc(owner.name) + "</strong> (" + esc(owner.email) + ")<br><span class='muted'>" + esc(owner.college) + "</span></dd>" : "") +
      "<dt>Location</dt><dd>" + esc(a.location || "—") + "</dd>" +
      "<dt>Internship Type</dt><dd>" + esc(a.internshipType || "—") + "</dd>" +
      "<dt>Applied Date</dt><dd>" + fmtDate(a.appliedDate) + "</dd>" +
      "<dt>Deadline</dt><dd>" + fmtDate(a.deadline) + "</dd>" +
      (a.interviewDate ? "<dt>Interview Date</dt><dd><strong>" + fmtDate(a.interviewDate) + "</strong></dd>" : "") +
      "<dt>Stipend</dt><dd>" + (a.stipend && Number(a.stipend) > 0 ? "₹" + Number(a.stipend).toLocaleString("en-IN") + " / month" : "Unpaid / Not specified") + "</dd>" +
      (a.url && validURL(a.url) ? "<dt>Posting URL</dt><dd><a href='" + esc(a.url) + "' target='_blank' rel='noopener'>Open posting <span aria-hidden='true'>↗</span></a></dd>" : "") +
      "<dt>Status</dt><dd>" + statusBadge(a.status) + "</dd>" +
      "<dt>Notes</dt><dd>" + (a.notes ? esc(a.notes).replace(/\n/g, "<br>") : "<span class='muted'>No notes added.</span>") + "</dd>" +
      "</dl>" +
      '<div class="modal-footer">' +
        '<button class="btn btn-secondary btn-sm" id="modalCloseBtn">Close</button>' +
      '</div>';

    backdrop.classList.add("open");

    var closeHandler = function () { backdrop.classList.remove("open"); };
    var closeIcon = document.getElementById("modalCloseIcon");
    var closeBtn = document.getElementById("modalCloseBtn");
    if (closeIcon) closeIcon.onclick = closeHandler;
    if (closeBtn) closeBtn.onclick = closeHandler;
    backdrop.onclick = function (ev) { if (ev.target === backdrop) closeHandler(); };
  }

  /* ----- user dashboard ----- */
  async function initUserDashboard() {
    if (!document.getElementById("userStats")) return;
    var s = requireAuth("user");
    if (!s) return;

    var apps = await window.InternLog.getApplicationsByUser(s.userId);
    var stats = computeStats(apps);
    renderStatGrid(document.getElementById("userStats"), stats, ["total", "Applied", "Shortlisted", "Interview", "Selected", "Rejected"]);
    renderStatusOverview(document.getElementById("statusOverview"), stats);

    var recent = apps.slice().sort(function (a, b) { return String(b.appliedDate).localeCompare(String(a.appliedDate)); }).slice(0, 5);
    var tbody = document.getElementById("recentBody");
    if (tbody) {
      tbody.innerHTML = recent.length ? recent.map(function (a) {
        return "<tr><td><strong>" + esc(a.company) + "</strong></td><td>" + esc(a.role) + "</td><td>" + fmtDate(a.appliedDate) + "</td><td>" + statusBadge(a.status) + "</td>" +
          '<td><div class="actions"><button class="link-btn" data-view="' + a.id + '">View</button><a class="link-btn" href="edit-application.html?id=' + a.id + '">Edit</a></div></td></tr>';
      }).join("") : '<tr><td colspan="5" class="muted">No internship applications yet. <a href="add-application.html">Add your first internship</a>.</td></tr>';
    }

    var upcoming = apps.filter(function (a) { return a.status === "Interview" || (a.interviewDate && a.interviewDate >= new Date().toISOString().slice(0, 10)); })
      .sort(function (a, b) { return String(a.interviewDate || a.deadline).localeCompare(String(b.interviewDate || b.deadline)); });

    var upEl = document.getElementById("upcomingList");
    if (upEl) {
      upEl.innerHTML = upcoming.length ? upcoming.map(function (a) {
        return '<div class="mini-row"><span><strong>' + esc(a.company) + "</strong> — " + esc(a.role) + "</span><span>" + fmtDate(a.interviewDate || a.deadline) + "</span></div>";
      }).join("") : '<p class="muted">No upcoming interviews. Interviews you track will appear here.</p>';
    }

    // Gentle follow-up nudges: Applied 7+ days, Shortlisted 5+ days, interview prep/thanks.
    var followEl = document.getElementById("followupList");
    if (followEl) {
      var nudges = getFollowups(apps);
      if (!nudges.length) {
        var encouragement = "";
        if (apps.length >= 12) {
          var replied = apps.filter(function (a) { return a.status !== "Applied"; }).length;
          if (replied === 0) encouragement = " You have applied to a lot — consider tailoring each application and asking a mentor for feedback.";
        }
        followEl.innerHTML = '<p class="muted">All caught up. No follow-ups needed right now.' + esc(encouragement) + "</p>";
      } else {
        followEl.innerHTML = nudges.slice(0, 5).map(function (n) {
          return '<div class="mini-row"><span><strong>' + esc(n.app.company) + "</strong> — " + esc(n.app.role) +
            '<br><span class="muted">' + esc(n.title) + ": " + esc(n.detail) + "</span></span>" +
            '<span class="actions"><a class="link-btn" href="edit-application.html?id=' + n.app.id + '">Open</a>' +
            '<button class="link-btn" data-snooze="' + n.app.id + '">Snooze</button></span></div>';
        }).join("");
        Array.prototype.slice.call(followEl.querySelectorAll("[data-snooze]")).forEach(function (btn) {
          btn.addEventListener("click", async function () {
            await snoozeFollowup(btn.getAttribute("data-snooze"), 7);
            showNotification("Snoozed for 7 days.", "info");
            initUserDashboard();
          });
        });
      }
      var followCount = document.getElementById("followupCount");
      if (followCount) {
        var nlen = getFollowups(apps).length;
        followCount.textContent = nlen ? nlen + " need" + (nlen === 1 ? "s" : "") + " attention" : "All clear";
      }
    }

    // Job alerts: saved searches matched against Published internships.
    var alertsEl = document.getElementById("jobAlertsList");
    if (alertsEl) {
      var pubJobs = await window.InternLog.getPublicInternships();
      var alerts = await window.InternLog.getMatchedAlerts(s.userId, pubJobs);
      if (!alerts.length) {
        alertsEl.innerHTML = '<p class="muted">Save a search on the <a href="internships.html">opportunity board</a> (e.g. “React, Remote”) and new matches will appear here.</p>';
      } else {
        alertsEl.innerHTML = alerts.map(function (al) {
          var label = (al.search.query || al.search.location || al.search.type || "All internships");
          var fresh = al.freshCount ? ' <span class="badge badge-selected">' + al.freshCount + " new</span>" : "";
          var sample = al.sample.length ? '<br><span class="muted">' + al.sample.map(function (j) { return esc(j.title) + " @ " + esc(j.company); }).join(" · ") + "</span>" : '<br><span class="muted">No matches yet — we will flag new posts here.</span>';
          return '<div class="mini-row"><span><strong>' + esc(label) + "</strong>" + fresh + sample + "</span>" +
            '<span class="actions"><a class="link-btn" href="internships.html">View</a>' +
            '<button class="link-btn danger" data-unsave-search="' + al.search.id + '">Remove</button></span></div>';
        }).join("");
        Array.prototype.slice.call(alertsEl.querySelectorAll("[data-unsave-search]")).forEach(function (btn) {
          btn.addEventListener("click", async function () {
            await window.InternLog.deleteSavedSearch(btn.getAttribute("data-unsave-search"), s.userId);
            showNotification("Alert removed", "success");
            initUserDashboard();
          });
        });
      }
    }

    wireTableActions(document.getElementById("recentTable") || document.body, initUserDashboard);
  }

  /* ----- user applications list ----- */
  async function initUserApplications() {
    var tbody = document.getElementById("appsBody");
    if (!tbody) return;
    var s = requireAuth("user");
    if (!s) return;

    var search = document.getElementById("searchInput");
    var statusFilter = document.getElementById("statusFilter");
    var empty = document.getElementById("emptyState");
    var tableWrap = document.getElementById("appsTableWrap");
    var count = document.getElementById("resultCount");
    var exportBtn = document.getElementById("exportCsvBtn");

    var currentFilteredApps = [];

    async function render() {
      var apps = await window.InternLog.getApplicationsByUser(s.userId);
      var q = (search.value || "").toLowerCase().trim();
      var st = statusFilter.value || "All";
      var followIds = {};
      if (st === "FollowUp") {
        getFollowups(apps).forEach(function (n) { followIds[String(n.app.id)] = true; });
      }

      var filtered = apps.filter(function (a) {
        var hay = (a.company + " " + a.role + " " + (a.location || "") + " " + (a.internshipType || "") + " " + (a.notes || "")).toLowerCase();
        var matchQ = !q || hay.indexOf(q) !== -1;
        var matchS = st === "All" ? true : st === "FollowUp" ? !!followIds[String(a.id)] : a.status === st;
        return matchQ && matchS;
      }).sort(function (a, b) { return String(b.appliedDate).localeCompare(String(a.appliedDate)); });

      currentFilteredApps = filtered;

      if (count) {
        var needN = getFollowups(apps).length;
        count.textContent = filtered.length + " of " + apps.length + " applications" + (needN ? " • " + needN + " need follow-up" : "");
      }
      var hasAny = apps.length > 0;
      if (empty) empty.style.display = (!filtered.length && !q && st === "All" && !hasAny) ? "block" : "none";
      if (tableWrap) tableWrap.style.display = filtered.length ? "" : "none";
      var noResults = document.getElementById("noResults");
      if (noResults) noResults.style.display = (!filtered.length && hasAny) ? "block" : "none";
      var needMap = {};
      getFollowups(apps).forEach(function (n) { needMap[String(n.app.id)] = n; });
      tbody.innerHTML = filtered.map(function (a) {
        var row = appRow(a, null, false);
        if (needMap[String(a.id)]) {
          row = row.replace(statusBadge(a.status), statusBadge(a.status) + ' <span class="badge badge-shortlisted">Follow up</span>');
        }
        return row;
      }).join("");
    }

    if (exportBtn) {
      exportBtn.addEventListener("click", function () {
        exportApplicationsToCSV(currentFilteredApps, "my_internships_" + new Date().toISOString().slice(0, 10) + ".csv");
      });
    }

    search.addEventListener("input", render);
    statusFilter.addEventListener("change", render);
    wireTableActions(tbody, render);
    await render();
  }

  function collectApplicationForm() {
    function val(id) { var el = document.getElementById(id); return el ? el.value.trim() : ""; }
    return {
      company: val("company"), role: val("role"), location: val("location"),
      appliedDate: val("appliedDate"), deadline: val("deadline"),
      internshipType: val("internshipType") || "On-site", stipend: val("stipend"),
      url: val("url"), status: val("status") || "Applied",
      interviewDate: val("interviewDate"), notes: val("notes")
    };
  }

  function validateApplication(d) {
    var errors = {};
    if (!d.company) errors.company = "Company name is required.";
    if (!d.role) errors.role = "Internship role is required.";
    if (!d.location) errors.location = "Location is required.";
    if (!d.appliedDate) errors.appliedDate = "Application date is required.";
    if (!d.deadline) errors.deadline = "Application deadline is required.";
    if (d.appliedDate && d.deadline && d.deadline < d.appliedDate) errors.deadline = "Deadline cannot be before the application date.";
    if (d.appliedDate && d.interviewDate && d.interviewDate < d.appliedDate) errors.interviewDate = "Interview date cannot be before the application date.";
    if (d.stipend && (!/^\d+$/.test(d.stipend) || Number(d.stipend) < 0)) errors.stipend = "Stipend must be a valid non-negative number.";
    if (d.url && !validURL(d.url)) errors.url = "Enter a valid URL starting with http(s)://.";
    if (!STATUSES.includes(d.status)) errors.status = "Select a valid status.";
    return errors;
  }

  function paintErrors(errors) {
    ["company", "role", "location", "appliedDate", "deadline", "interviewDate", "stipend", "url", "status"].forEach(function (id) {
      setFieldError(document.getElementById(id), errors[id] || "");
    });
    return Object.keys(errors).length === 0;
  }

  async function initAddApplication() {
    var form = document.getElementById("addForm");
    if (!form) return;
    var s = requireAuth("user");
    if (!s) return;

    // Set today as default applied date if empty
    var appliedInput = document.getElementById("appliedDate");
    if (appliedInput && !appliedInput.value) {
      appliedInput.value = new Date().toISOString().slice(0, 10);
    }

    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      var d = collectApplicationForm();
      var errors = validateApplication(d);
      if (!paintErrors(errors)) {
        showErrorSummary(form, Object.keys(errors).map(function (k) { return { id: k, message: errors[k] }; }));
        showNotification("Please fix the highlighted fields.", "error");
        return;
      }
      hideErrorSummary(form);
      setBusy(form, true);
      try { await window.InternLog.addApplication(Object.assign({ userId: s.userId }, d)); }
      catch (error) { setBusy(form, false); showNotification(error.message || "Could not save application.", "error"); return; }
      showNotification("Application added successfully!", "success");
      setTimeout(function () { window.location.href = "applications.html"; }, 500);
    });
  }

  async function initEditApplication() {
    var form = document.getElementById("editForm");
    if (!form) return;
    var s = requireAuth("user");
    if (!s) return;

    var id = new URLSearchParams(window.location.search).get("id");
    if (!id) {
      showNotification("No application selected.", "error");
      window.location.href = "applications.html";
      return;
    }
    var app = await window.InternLog.getApplicationById(id);
    if (!app || String(app.userId) !== String(s.userId)) {
      showNotification("Application not found.", "error");
      window.location.href = "applications.html";
      return;
    }

    ["company", "role", "location", "appliedDate", "deadline", "internshipType", "stipend", "url", "status", "interviewDate", "notes"].forEach(function (k) {
      var el = document.getElementById(k);
      if (el && app[k] != null) el.value = app[k];
    });

    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      var d = collectApplicationForm();
      var errors = validateApplication(d);
      if (!paintErrors(errors)) {
        showErrorSummary(form, Object.keys(errors).map(function (k) { return { id: k, message: errors[k] }; }));
        showNotification("Please fix the highlighted fields.", "error");
        return;
      }
      hideErrorSummary(form);
      setBusy(form, true);
      try { await window.InternLog.updateApplication(app.id, d); }
      catch (error) { setBusy(form, false); showNotification(error.message || "Could not save changes.", "error"); return; }
      showNotification("Changes saved successfully", "success");
      setTimeout(function () { window.location.href = "applications.html"; }, 500);
    });

    var del = document.getElementById("deleteBtn");
    if (del) {
      del.addEventListener("click", async function () {
        if (!confirm("Delete this application? This cannot be undone.")) return;
        await window.InternLog.deleteApplication(app.id);
        showNotification("Application deleted", "success");
        setTimeout(function () { window.location.href = "applications.html"; }, 400);
      });
    }
  }

  async function initUserProfile() {
    var wrap = document.getElementById("profileWrap");
    if (!wrap || wrap.getAttribute("data-kind") !== "user") return;
    var s = requireAuth("user");
    if (!s) return;

    var user = await window.InternLog.getUserById(s.userId);
    if (!user) { clearSession(); window.location.href = "login.html"; return; }

    var apps = await window.InternLog.getApplicationsByUser(s.userId);
    var stats = computeStats(apps);

    document.getElementById("profileName").textContent = user.name;
    document.getElementById("profileEmail").textContent = user.email;
    document.getElementById("profileMeta").textContent = user.college + " • " + user.course + " • Class of " + user.gradYear;
    document.getElementById("avatarBig").textContent = user.name.trim().charAt(0).toUpperCase();

    renderStatGrid(document.getElementById("profileStats"), {
      total: stats.total, Interview: stats.Interview, Selected: stats.Selected, Rejected: stats.Rejected
    }, ["total", "Interview", "Selected", "Rejected"]);

    var form = document.getElementById("profileForm");
    document.getElementById("fullName").value = user.name;
    document.getElementById("college").value = user.college;
    document.getElementById("course").value = user.course;
    document.getElementById("gradYear").value = user.gradYear;

    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      var nameVal = document.getElementById("fullName").value.trim();
      var collegeVal = document.getElementById("college").value.trim();
      var courseVal = document.getElementById("course").value.trim();
      var gradVal = document.getElementById("gradYear").value;

      if (nameVal.length < 3) { showNotification("Enter a valid name (at least 3 characters).", "error"); return; }
      if (!collegeVal) { showNotification("College name is required.", "error"); return; }
      if (!courseVal) { showNotification("Course is required.", "error"); return; }

      var patch = { name: nameVal, college: collegeVal, course: courseVal, gradYear: gradVal };
      var updated = await window.InternLog.updateUser(user.id, patch);
      setSession({ role: "user", userId: updated.id, name: updated.name, email: updated.email });
      showNotification("Profile updated successfully", "success");
      setTimeout(function () { window.location.reload(); }, 500);
    });

    var pwForm = document.getElementById("passwordForm");
    if (pwForm) {
      pwForm.addEventListener("submit", async function (e) {
        e.preventDefault();
        var cur = document.getElementById("currentPassword").value;
        var nw = document.getElementById("newPassword").value;
        var conf = document.getElementById("confirmNewPassword") ? document.getElementById("confirmNewPassword").value : nw;

        if (nw !== conf) { showNotification("New passwords do not match.", "error"); return; }
        var err = passwordStrength(nw);
        if (err) { showNotification(err, "error"); return; }

        try { await window.InternLog.changeUserPassword(user.id, cur, nw); }
        catch (pwErr) { showNotification(pwErr.message || "Could not change password.", "error"); return; }
        showNotification("Password changed successfully", "success");
        pwForm.reset();
      });
    }
  }

  /* ----- admin ----- */
  async function initAdminDashboard() {
    if (!document.getElementById("adminStats")) return;
    var s = requireAuth("admin");
    if (!s) return;

    var users = await window.InternLog.getUsers();
    var apps = await window.InternLog.getApplications();
    var stats = computeStats(apps);
    var grid = document.getElementById("adminStats");

    grid.innerHTML =
      '<div class="stat"><div class="label">Total Students</div><div class="value">' + users.length + "</div></div>" +
      '<div class="stat"><div class="label">Total Applications</div><div class="value">' + stats.total + "</div></div>" +
      '<div class="stat"><div class="label">Applied</div><div class="value">' + stats.Applied + "</div></div>" +
      '<div class="stat"><div class="label">Shortlisted</div><div class="value">' + stats.Shortlisted + "</div></div>" +
      '<div class="stat"><div class="label">Interviews</div><div class="value">' + stats.Interview + "</div></div>" +
      '<div class="stat"><div class="label">Selected (Offers)</div><div class="value">' + stats.Selected + "</div></div>";

    renderStatusOverview(document.getElementById("adminOverview"), stats);

    var usersById = {};
    users.forEach(function (u) { usersById[u.id] = u; });
    var recentUsers = users.slice().sort(function (a, b) { return String(b.registeredDate).localeCompare(String(a.registeredDate)); }).slice(0, 3);
    var recentApps = apps.slice().sort(function (a, b) { return String(b.appliedDate).localeCompare(String(a.appliedDate)); }).slice(0, 4);

    var act = document.getElementById("recentActivity");
    if (act) {
      act.innerHTML =
        recentUsers.map(function (u) {
          return '<div class="mini-row"><span><strong>' + esc(u.name) + "</strong> registered from " + esc(u.college) + "</span><span>" + fmtDate(u.registeredDate) + "</span></div>";
        }).join("") +
        recentApps.map(function (a) {
          var owner = usersById[a.userId];
          return '<div class="mini-row"><span><strong>' + esc(owner ? owner.name : "Student") + "</strong> applied to <strong>" + esc(a.company) + "</strong></span><span>" + statusBadge(a.status) + "</span></div>";
        }).join("");
    }
  }

  async function initAdminUsers() {
    var tbody = document.getElementById("usersBody");
    if (!tbody) return;
    var s = requireAuth("admin");
    if (!s) return;

    var search = document.getElementById("userSearch");
    var statusFilter = document.getElementById("userStatusFilter");

    async function render() {
      var users = await window.InternLog.getUsers();
      var apps = await window.InternLog.getApplications();
      var counts = {};
      apps.forEach(function (a) { counts[a.userId] = (counts[a.userId] || 0) + 1; });
      var q = (search.value || "").toLowerCase().trim();
      var f = statusFilter.value || "All";

      var filtered = users.filter(function (u) {
        var hay = (u.name + " " + u.email + " " + (u.college || "") + " " + (u.course || "")).toLowerCase();
        var matchQ = !q || hay.indexOf(q) !== -1;
        var matchS = f === "All" || u.status === f;
        return matchQ && matchS;
      });

      tbody.innerHTML = filtered.length ? filtered.map(function (u) {
        return "<tr><td>#" + esc(u.id) + "</td><td><strong>" + esc(u.name) + "</strong></td><td>" + esc(u.email) + "</td>" +
          "<td>" + esc(u.college) + "</td><td>" + esc(u.course) + "</td><td>" + fmtDate(u.registeredDate) + "</td>" +
          "<td>" + (counts[u.id] || 0) + "</td>" +
          '<td><span class="badge ' + (u.status === "Active" ? "badge-active" : "badge-disabled") + '">' + esc(u.status) + "</span></td>" +
          '<td><div class="actions"><button class="link-btn" data-toggle-user="' + u.id + '">' + (u.status === "Active" ? "Disable" : "Enable") + "</button>" +
          '<button class="link-btn danger" data-del-user="' + u.id + '">Delete</button></div></td></tr>';
      }).join("") : '<tr><td colspan="9" class="muted">No users match your search.</td></tr>';
    }

    search.addEventListener("input", render);
    statusFilter.addEventListener("change", render);

    tbody.addEventListener("click", async function (e) {
      var t = e.target.getAttribute && e.target.getAttribute("data-toggle-user");
      var d = e.target.getAttribute && e.target.getAttribute("data-del-user");
      if (t) {
        var u = await window.InternLog.getUserById(t);
        if (!u) { showNotification("User not found", "error"); return; }
        await window.InternLog.updateUser(t, { status: u.status === "Active" ? "Disabled" : "Active" });
        showNotification("User " + (u.status === "Active" ? "disabled" : "enabled"), "success");
        render();
      } else if (d) {
        if (!confirm("Delete this user and all their applications? This cannot be undone.")) return;
        await window.InternLog.deleteUser(d);
        showNotification("User deleted", "success");
        render();
      }
    });

    await render();
  }

  async function initAdminApplications() {
    var tbody = document.getElementById("adminAppsBody");
    if (!tbody) return;
    var s = requireAuth("admin");
    if (!s) return;

    var search = document.getElementById("adminSearch");
    var statusFilter = document.getElementById("adminStatusFilter");
    var exportBtn = document.getElementById("exportAdminCsvBtn");

    var currentFilteredApps = [];
    var usersMap = {};

    async function render() {
      var users = await window.InternLog.getUsers();
      usersMap = {};
      users.forEach(function (u) { usersMap[u.id] = u; });

      var apps = await window.InternLog.getApplications();
      var q = (search.value || "").toLowerCase().trim();
      var st = statusFilter.value || "All";

      var filtered = apps.filter(function (a) {
        var owner = usersMap[a.userId];
        var hay = (a.company + " " + a.role + " " + (a.location || "") + " " + (owner ? (owner.name + " " + owner.email) : "")).toLowerCase();
        return (!q || hay.indexOf(q) !== -1) && (st === "All" || a.status === st);
      }).sort(function (a, b) { return String(b.appliedDate).localeCompare(String(a.appliedDate)); });

      currentFilteredApps = filtered;

      tbody.innerHTML = filtered.length ? filtered.map(function (a) {
        var owner = usersMap[a.userId];
        return "<tr><td>#" + esc(a.id) + "</td><td><strong>" + esc(owner ? owner.name : ("User " + a.userId)) + "</strong><br><span class='muted' style='font-size:12px'>" + esc(owner ? owner.email : "") + "</span></td>" +
          "<td><strong>" + esc(a.company) + "</strong></td><td>" + esc(a.role) + "</td><td>" + fmtDate(a.appliedDate) + "</td>" +
          "<td>" + statusBadge(a.status) + "</td>" +
          '<td><div class="actions"><button class="link-btn" data-view="' + a.id + '">View</button>' +
          '<select data-status-for="' + a.id + '" aria-label="Update status" class="row-select">' +
          STATUSES.map(function (x) { return '<option value="' + x + '"' + (x === a.status ? " selected" : "") + ">" + x + "</option>"; }).join("") +
          "</select><button class='link-btn danger' data-delete='" + a.id + "'>Delete</button></div></td></tr>";
      }).join("") : '<tr><td colspan="7" class="muted">No applications match your search.</td></tr>';
    }

    if (exportBtn) {
      exportBtn.addEventListener("click", function () {
        exportApplicationsToCSV(currentFilteredApps, "all_student_applications_" + new Date().toISOString().slice(0, 10) + ".csv", usersMap);
      });
    }

    search.addEventListener("input", render);
    statusFilter.addEventListener("change", render);

    tbody.addEventListener("click", async function (e) {
      var viewBtn = e.target.closest && e.target.closest("[data-view]");
      var delBtn = e.target.closest && e.target.closest("[data-delete]");
      if (viewBtn) {
        var v = viewBtn.getAttribute("data-view");
        if (v) openAppModal(Number(v));
      } else if (delBtn) {
        var d = delBtn.getAttribute("data-delete");
        if (!confirm("Delete this application? This cannot be undone.")) return;
        await window.InternLog.deleteApplication(Number(d));
        showNotification("Application deleted", "success");
        render();
      }
    });

    tbody.addEventListener("change", async function (e) {
      var id = e.target.getAttribute && e.target.getAttribute("data-status-for");
      if (id) {
        await window.InternLog.updateApplication(Number(id), { status: e.target.value });
        showNotification("Status updated to " + e.target.value, "success");
        render();
      }
    });

    await render();
  }

  async function initAdminProfile() {
    var wrap = document.getElementById("profileWrap");
    if (!wrap || wrap.getAttribute("data-kind") !== "admin") return;
    var s = requireAuth("admin");
    if (!s) return;

    var form = document.getElementById("adminProfileForm");
    document.getElementById("adminName").value = s.name || "InternLog Admin";
    document.getElementById("adminEmail").value = s.email || "admin@internlog.com";

    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      var name = document.getElementById("adminName").value.trim();
      if (name.length < 3) { showNotification("Enter a valid name.", "error"); return; }
      await window.InternLog.setPreference("adminName", name);
      setSession(Object.assign({}, s, { name: name }));
      showNotification("Admin profile updated", "success");
      setTimeout(function () { window.location.reload(); }, 500);
    });
  }

  /* Moon/sun toggle injected into the page header (or floating on
     pages without one), so every page gets the switch with no markup. */
  var ICON_MOON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';
  var ICON_SUN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';

  function paintThemeToggle(btn) {
    var dark = document.documentElement.getAttribute("data-theme") === "dark";
    btn.innerHTML = dark ? ICON_SUN : ICON_MOON;
    btn.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
    btn.setAttribute("title", dark ? "Switch to light mode" : "Switch to dark mode");
  }

  function initThemeToggle() {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "theme-toggle";
    paintThemeToggle(btn);
    btn.addEventListener("click", async function () {
      var next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
      if (getSession()) await window.InternLog.setPreference("theme", next);
      applyTheme(next);
      paintThemeToggle(btn);
      showNotification(next === "dark" ? "Dark mode on" : "Light mode on", "info");
    });
    var navLinks = document.querySelector(".site-header .nav-links");
    var pillBar = document.querySelector(".site-header .nav-bar--pill");
    var topbar = document.querySelector(".topbar");
    if (navLinks) navLinks.appendChild(btn);
    else if (pillBar) pillBar.appendChild(btn);
    else if (topbar) topbar.appendChild(btn);
    else {
      btn.classList.add("theme-toggle-floating");
      document.body.appendChild(btn);
    }
  }

  /* ---------------- Pill Nav active state ----------------
     Hover animation is CSS-only (see style.css). JS only sets
     aria-current / .is-active and never touches transforms —
     that split is what fixes the Register flicker. */
  function initPillNav() {
    var containers = document.querySelectorAll("[data-pill-nav]");
    if (!containers.length) return;
    // Active pill follows current page (hash links keep hardcoded Home active).
    try {
      var file = (window.location.pathname.replace(/\\/g, "/").split("/").pop() || "index.html").split("?")[0] || "index.html";
      document.querySelectorAll("[data-pill-nav] .pill").forEach(function (a) {
        var href = (a.getAttribute("href") || "").split("?")[0];
        if (!href || href.charAt(0) === "#") return;
        var hrefFile = href.replace(/\\/g, "/").split("/").pop() || "index.html";
        if (hrefFile === file && file !== "index.html") {
          document.querySelectorAll("[data-pill-nav] .pill.is-active, .sm-panel-item.is-active").forEach(function (el) {
            el.classList.remove("is-active");
            el.removeAttribute("aria-current");
          });
          a.classList.add("is-active");
          a.setAttribute("aria-current", "page");
        }
      });
    } catch (e) {}
    // Scrollspy (landing only): move the dot as sections pass under the header.
    // Without this the dot sat on Home forever since hash pills were skipped above.
    try {
      var spyLinks = {};
      document.querySelectorAll("[data-pill-nav] .pill").forEach(function (a) {
        var href = a.getAttribute("href") || "";
        if (href.charAt(0) === "#") spyLinks[href] = a;
      });
      var spyIds = ["#about", "#internships", "#features", "#how", "#faq", "#get-started"];
      var spyTargets = spyIds.map(function (sel) {
        try { return document.querySelector(sel); } catch (err) { return null; }
      }).filter(Boolean);
      var homePill = document.querySelector('[data-pill-nav] .pill[href="index.html"]');
      if (spyTargets.length && homePill && "IntersectionObserver" in window) {
        var spyCurrent = null;
        var reduceSpy = false;
        try { reduceSpy = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (err) {}
        function setActivePill(pill) {
          if (spyCurrent === pill) return;
          spyCurrent = pill;
          document.querySelectorAll("[data-pill-nav] .pill.is-active, .sm-panel-item.is-active").forEach(function (el) {
            el.classList.remove("is-active");
            el.removeAttribute("aria-current");
          });
          document.querySelectorAll(".mobile-menu-link[aria-current]").forEach(function (el) {
            el.removeAttribute("aria-current");
          });
          if (pill) {
            pill.classList.add("is-active");
            pill.setAttribute("aria-current", "page");
            var href = pill.getAttribute("href");
            document.querySelectorAll('.mobile-menu-link[href="' + href + '"], .sm-panel-item[href="' + href + '"]').forEach(function (m) {
              if (m.classList.contains("sm-panel-item")) m.classList.add("is-active");
              m.setAttribute("aria-current", "page");
            });
          }
        }
        var spy = new IntersectionObserver(function (entries) {
          entries.forEach(function (en) {
            if (en.isIntersecting) {
              var link = spyLinks["#" + en.target.id];
              if (link) setActivePill(link);
            }
          });
        }, { rootMargin: "-40% 0px -55% 0px" });
        spyTargets.forEach(function (t) { spy.observe(t); });
        var spyT = null;
        window.addEventListener("scroll", function () {
          if (spyT) return;
          spyT = setTimeout(function () {
            spyT = null;
            if (window.scrollY < 160) setActivePill(homePill);
          }, 120);
        }, { passive: true });
        if (!reduceSpy && window.scrollY < 160) setActivePill(homePill);
      }
    } catch (e) {}
  }

  /* ---------------- Magic bento spotlight (landing features) ----------------
     Tracks the cursor per card and feeds --glow-x/--glow-y/--glow-intensity
     to the border-glow layer. Skipped with prefers-reduced-motion.
     Pure decoration — no storage, no network, no backend contact. */
  function initMagicBento() {
    var cards = document.querySelectorAll(".bento .magic-bento-card--border-glow");
    if (!cards.length) return;
    var reduceMotion = false;
    try {
      reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch (e) {}
    if (reduceMotion) return;
    if (window.matchMedia && !window.matchMedia("(hover: hover)").matches) return;
    Array.prototype.forEach.call(cards, function (card) {
      card.addEventListener("mousemove", function (e) {
        var r = card.getBoundingClientRect();
        card.style.setProperty("--glow-x", ((e.clientX - r.left) / Math.max(1, r.width) * 100).toFixed(1) + "%");
        card.style.setProperty("--glow-y", ((e.clientY - r.top) / Math.max(1, r.height) * 100).toFixed(1) + "%");
        card.style.setProperty("--glow-intensity", "1");
      });
      card.addEventListener("mouseleave", function () {
        card.style.setProperty("--glow-intensity", "0");
      });
      card.addEventListener("focusin", function () {
        card.style.setProperty("--glow-intensity", "0.6");
      });
      card.addEventListener("focusout", function () {
        card.style.setProperty("--glow-intensity", "0");
      });
    });
  }

  /* ---------------- Galaxy backdrop for auth panels ----------------
     Injects <div class="galaxy-container"><canvas></canvas></div> as the
     first child of each .auth-panel (login/register, all roles).
     Lightweight canvas starfield: twinkle + slow drift + pointer parallax.
     Pauses off-screen; single static frame with prefers-reduced-motion.
     Pure decoration — no storage, no network, no backend contact. */
  function initGalaxy() {
    var panels = document.querySelectorAll(".auth-panel");
    if (!panels.length) return;
    var reduceMotion = false;
    try {
      reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch (e) {}
    Array.prototype.forEach.call(panels, function (panel) {
      if (panel.querySelector(".galaxy-container")) return;
      var box = document.createElement("div");
      box.className = "galaxy-container";
      box.setAttribute("aria-hidden", "true");
      var canvas = document.createElement("canvas");
      box.appendChild(canvas);
      panel.insertBefore(box, panel.firstChild);
      var ctx = null;
      try { ctx = canvas.getContext("2d"); } catch (e) {}
      if (!ctx) return;

      var W = 0, H = 0, dpr = 1, stars = [], t = 0;
      var mx = 0, my = 0, tmx = 0, tmy = 0, visible = true;

      function seed() {
        var n = Math.round(Math.min(220, Math.max(70, (W * H) / 9000)));
        stars = [];
        for (var i = 0; i < n; i++) {
          stars.push({
            x: Math.random() * W,
            y: Math.random() * H,
            r: Math.random() * 1.3 + 0.3,
            p: Math.random() * Math.PI * 2,
            s: 0.4 + Math.random() * 1.2,
            d: 0.15 + Math.random() * 0.5
          });
        }
      }

      function resize() {
        var r = box.getBoundingClientRect();
        if (r.width < 2 || r.height < 2) return;
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        W = r.width;
        H = r.height;
        canvas.width = Math.round(W * dpr);
        canvas.height = Math.round(H * dpr);
        seed();
      }

      function draw() {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, W, H);
        mx += (tmx - mx) * 0.045;
        my += (tmy - my) * 0.045;
        for (var i = 0; i < stars.length; i++) {
          var s = stars[i];
          var tw = 0.3 + 0.7 * Math.abs(Math.sin(t * s.s + s.p));
          var x = (s.x + mx * 22 * s.d + t * 2 * s.d) % W;
          if (x < 0) x += W;
          var y = s.y + my * 22 * s.d;
          if (y < -4 || y > H + 4) continue;
          ctx.globalAlpha = tw;
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.arc(x, y, s.r, 0, Math.PI * 2);
          ctx.fill();
          if (s.r > 1.25) {
            ctx.globalAlpha = tw * 0.35;
            ctx.fillRect(x - s.r * 4, y - 0.5, s.r * 8, 1);
            ctx.fillRect(x - 0.5, y - s.r * 4, 1, s.r * 8);
          }
        }
        ctx.globalAlpha = 1;
      }

      if (reduceMotion) {
        resize();
        draw();
        var rt = null;
        window.addEventListener("resize", function () {
          if (rt) clearTimeout(rt);
          rt = setTimeout(function () { resize(); draw(); }, 200);
        });
        return;
      }

      if ("IntersectionObserver" in window) {
        try {
          new IntersectionObserver(function (entries) {
            visible = entries[0].isIntersecting;
          }, { threshold: 0 }).observe(panel);
        } catch (e) {}
      }

      if (window.matchMedia && window.matchMedia("(pointer: fine)").matches) {
        panel.addEventListener("mousemove", function (e) {
          var r = panel.getBoundingClientRect();
          tmx = (e.clientX - r.left) / Math.max(1, r.width) - 0.5;
          tmy = (e.clientY - r.top) / Math.max(1, r.height) - 0.5;
        });
        panel.addEventListener("mouseleave", function () { tmx = 0; tmy = 0; });
      }

      var rT = null;
      window.addEventListener("resize", function () {
        if (rT) clearTimeout(rT);
        rT = setTimeout(resize, 200);
      });

      resize();
      (function tick() {
        t += 1 / 60;
        if (visible && !document.hidden && W > 0) draw();
        requestAnimationFrame(tick);
      })();
    });
  }

  /* ---------------- Curved Loop (responsive SVG text-on-path marquee) ----------------
     Reusable: drop anywhere with
       <div class="curved-loop-jacket" data-curved-loop
            data-text="YOUR WORDS ✦ " data-speed="0.8">…svg…</div>
     - data-text: phrase repeated to fill the wave (default: existing textPath).
     - data-speed: px per 60fps frame (default 0.8, ~48px/s). Negative reverses.
     Responsive + accessible: pauses off-screen, on hover, and with
     prefers-reduced-motion; static text remains if JS is off. */
  function initCurvedLoop() {
    var jackets = document.querySelectorAll("[data-curved-loop]");
    if (!jackets.length) return;
    var reduceMotion = false;
    try {
      reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch (e) {}
    Array.prototype.forEach.call(jackets, function (jacket, idx) {
      var svg = jacket.querySelector("svg.curved-loop-svg");
      if (!svg) return;
      var textPath = svg.querySelector("textPath");
      var path = svg.querySelector("path");
      if (!textPath || !path) return;

      // Unique path id per instance (markup may be copy-pasted).
      var pathId = path.getAttribute("id") || ("curved-loop-path-" + idx);
      path.setAttribute("id", pathId + "-js-" + idx);
      var newId = path.getAttribute("id");
      try { textPath.setAttribute("href", "#" + newId); } catch (e) {}
      try { textPath.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", "#" + newId); } catch (e) {}

      var baseText = jacket.getAttribute("data-text") || textPath.textContent || "TRACK ✦ APPLY ✦ GROW ✦ ";
      if (!/\s$/.test(baseText)) baseText += " ";
      var repeats = 0;
      var repeated = "";
      while (repeated.length < 260) { repeated += baseText; repeats++; }
      if (repeats < 4) { while (repeats < 6) { repeated += baseText; repeats++; } }
      textPath.textContent = repeated;

      if (reduceMotion) return; // leave static curved text

      var speed = parseFloat(jacket.getAttribute("data-speed"));
      if (isNaN(speed)) speed = 0.8;
      var offset = 0;
      var unit = 0; // length of ONE baseText unit -> seamless wrap point
      var visible = true;
      var hoverPaused = false;

      function measure() {
        try {
          var total = textPath.getComputedTextLength ? textPath.getComputedTextLength() : 0;
          if (total > 0 && repeats > 0) unit = total / repeats;
          else {
            var pl = path.getTotalLength ? path.getTotalLength() : 1600;
            unit = pl / 2;
          }
        } catch (e) {
          unit = 800;
        }
      }
      measure();
      if (document.fonts && document.fonts.ready) {
        try { document.fonts.ready.then(function () { measure(); }); } catch (e) {}
      }
      var resizeT = null;
      window.addEventListener("resize", function () {
        if (resizeT) clearTimeout(resizeT);
        resizeT = setTimeout(measure, 200);
      });

      jacket.addEventListener("mouseenter", function () { hoverPaused = true; });
      jacket.addEventListener("mouseleave", function () { hoverPaused = false; });
      jacket.addEventListener("focusin", function () { hoverPaused = true; });
      jacket.addEventListener("focusout", function () { hoverPaused = false; });

      if ("IntersectionObserver" in window) {
        try {
          var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (en) { visible = en.isIntersecting; });
          }, { threshold: 0 });
          io.observe(jacket);
        } catch (e) {}
      }

      var last = null;
      function tick(ts) {
        if (last == null) last = ts;
        var dt = ts - last;
        last = ts;
        if (dt < 0) dt = 0;
        if (dt > 50) dt = 50;
        if (visible && !hoverPaused && !document.hidden && unit > 0) {
          offset -= (speed * dt) / 16.666;
          // Wrap in [-unit, 0) so the repeat is seamless.
          if (unit > 0) {
            while (offset <= -unit) offset += unit;
            while (offset > 0) offset -= unit;
          }
          try { textPath.setAttribute("startOffset", offset); } catch (e) {}
        }
        requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    });
  }

  document.addEventListener("DOMContentLoaded", async function () {
    injectFavicon();
    if (!window.InternLog) return;
    // Public navigation, effects and account forms do not wait for Java.
    initCompanyRegisterGuard();
    initCompanyLoginGuard();
    initNavigation();
    initPillNav();
    initMagicBento();
    initThemeToggle();
    if (window.InternLogAccessibility) window.InternLogAccessibility.init();
    initGalaxy();
    initCurvedLoop();
    initUserLogin();
    initAdminLogin();
    initRegister();
    var connected = await window.InternLog.ready;
    if (!connected) {
      var parts = window.location.pathname.split("/").filter(Boolean);
      var role = parts[parts.length - 2], file = parts[parts.length - 1];
      if (["user", "company", "admin"].includes(role) && !["login.html", "register.html"].includes(file) && !(role === "user" && file === "internships.html")) window.location.href = "login.html";
      return;
    }
    applyTheme(window.InternLog.getPreference("theme", preferredTheme()));
    var toggle = document.querySelector(".theme-toggle");
    if (toggle) paintThemeToggle(toggle);
    populateSessionUI();
    var identity = getSession();
    var path = window.location.pathname.replace(/\\/g, "/");
    if (identity && path.endsWith("/" + identity.role + "/login.html")) {
      window.location.href = "dashboard.html";
      return;
    }
    guardCompanyPage();
    initCompanyInternshipSubmitGuard();
    initCompanyModerationControls();
    initUserDashboard();
    initUserApplications();
    initAddApplication();
    initEditApplication();
    initUserProfile();
    initAdminDashboard();
    initAdminUsers();
    initAdminApplications();
    initAdminProfile();
  });

  window.InternLog = {
    companyIsApproved: companyIsApproved,
    companyStatusLabel: companyStatusLabel,
    initAuthStepper: initAuthStepper,
    showErrorSummary: showErrorSummary,
    hideErrorSummary: hideErrorSummary,
    setBusy: setBusy,
    exportApplicationsToCSV: exportApplicationsToCSV,
    getFollowups: getFollowups,
    snoozeFollowup: snoozeFollowup,
    matchesSearch: matchesSearch,
    getMatchedAlerts: getMatchedAlerts,
    getSeenIds: getSeenIds,
    markInternshipsSeen: markInternshipsSeen,
    showNotification: showNotification
  };
})();
