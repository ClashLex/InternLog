/* InternLog — single shared JS file (vanilla JS, backend-ready data layer). */
(function () {
  "use strict";

  var USERS_KEY = "internlog_users";
  var APPS_KEY = "internlog_applications";
  var SESSION_KEY = "internlog_session";
  var SEEDED_KEY = "internlog_seeded_v3";

  var COMPANY_KEY = "internlog_companies";
  var INTERNSHIPS_KEY = "internlog_internships";

  var SEARCHES_KEY = "internlog_saved_searches";
  var SNOOZE_KEY = "internlog_followup_snooze";
  var SEEN_KEY_PREFIX = "internlog_seen_internships_";


  var STATUSES = ["Applied", "Shortlisted", "Interview", "Selected", "Rejected"];

  /* ---------------- Theme (light / dark) ----------------
     Choice persists in localStorage; with no saved choice the OS
     preference is followed. Applied immediately (not on
     DOMContentLoaded) so the first paint already uses it. */
  var THEME_KEY = "internlog_theme";
  function preferredTheme() {
    try {
      var saved = localStorage.getItem(THEME_KEY);
      if (saved === "light" || saved === "dark") return saved;
    } catch (e) {}
    try {
      if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) return "dark";
    } catch (e) {}
    return "light";
  }
  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    try { localStorage.setItem(THEME_KEY, theme); } catch (e) {}
  }
  applyTheme(preferredTheme());

  /* ---------- Future REST API map (Java backend) ----------
     POST /api/auth/login | POST /api/auth/register
     GET/POST /api/applications | GET/PUT/DELETE /api/applications/{id}
     GET/PUT/DELETE /api/users, /api/users/{id} | GET /api/admin/dashboard
     The functions below intentionally mirror those endpoints so they can
     later be swapped for fetch() calls without touching UI code. */

  function readJSON(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      if (!raw) return fallback;
      var parsed = JSON.parse(raw);
      return parsed != null ? parsed : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function writeJSON(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
  }

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
    if (!document.querySelector("link[rel~='icon']")) {
      var link = document.createElement("link");
      link.rel = "icon";
      link.type = "image/svg+xml";
      link.href = "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='8' fill='%232563eb'/><text x='16' y='22' font-family='system-ui,sans-serif' font-weight='800' font-size='16' fill='white' text-anchor='middle'>IL</text></svg>";
      document.head.appendChild(link);
    }
  }

  /* ---------------- Storage init (no prebuilt profiles or demo data) ----------------
     Fresh installs start completely empty. On upgrade from earlier versions,
     any previously seeded demo users/applications are removed while
     preserving accounts and records created by real users. */
  function seedIfNeeded() {
    var existingUsers = readJSON(USERS_KEY, null);
    var existingApps = readJSON(APPS_KEY, null);
    if (!Array.isArray(existingUsers)) { existingUsers = []; writeJSON(USERS_KEY, existingUsers); }
    if (!Array.isArray(existingApps)) { existingApps = []; writeJSON(APPS_KEY, existingApps); }
    var existingCompanies = readJSON(COMPANY_KEY, null);
    var existingInternships = readJSON(INTERNSHIPS_KEY, null);
    if (!Array.isArray(existingCompanies)) writeJSON(COMPANY_KEY, []);
    if (!Array.isArray(existingInternships)) writeJSON(INTERNSHIPS_KEY, []);

    if (localStorage.getItem(SEEDED_KEY) !== "3") {
      var seedEmails = ["ananya.nair@example.com", "adithya.menon@example.com", "sneha.pillai@example.com"];
      var keptUsers = existingUsers.filter(function (u) {
        var email = String(u.email || "").toLowerCase();
        if (seedEmails.indexOf(email) !== -1) return false;
        if (u.id === 101 || u.id === 102 || u.id === 103) return false;
        return true;
      });
      var seedCompanies = ["Infosys", "TCS", "UST", "Wipro", "Zoho", "Tech Mahindra", "IBM", "L&T Technology Services"];
      var keptApps = existingApps.filter(function (a) {
        if (a.id >= 1 && a.id <= 8 && seedCompanies.indexOf(a.company) !== -1) return false;
        return true;
      });
      writeJSON(USERS_KEY, keptUsers);
      writeJSON(APPS_KEY, keptApps);
      try { localStorage.setItem(SEEDED_KEY, "3"); } catch (e) {}
    }
  }

  /* ---------------- Backend-ready data layer ---------------- */
  async function getUsers() { return readJSON(USERS_KEY, []); }
  async function getUserById(id) {
    var users = await getUsers();
    return users.find(function (u) { return String(u.id) === String(id); }) || null;
  }
  async function registerUser(user) {
    var users = await getUsers();
    var exists = users.some(function (u) { return u.email.toLowerCase() === user.email.toLowerCase(); });
    if (exists) throw new Error("An account with this email already exists.");
    var nextId = users.reduce(function (m, u) { return Math.max(m, u.id || 0); }, 100) + 1;
    var record = {
      id: nextId, name: user.name, email: user.email, password: user.password,
      college: user.college, course: user.course, gradYear: user.gradYear,
      registeredDate: new Date().toISOString().slice(0, 10), status: "Active"
    };
    users.push(record);
    writeJSON(USERS_KEY, users);
    return record;
  }
  async function updateUser(id, patch) {
    var users = await getUsers();
    var i = users.findIndex(function (u) { return String(u.id) === String(id); });
    if (i < 0) throw new Error("User not found.");
    users[i] = Object.assign({}, users[i], patch);
    writeJSON(USERS_KEY, users);
    return users[i];
  }
  async function deleteUser(id) {
    writeJSON(USERS_KEY, (await getUsers()).filter(function (u) { return String(u.id) !== String(id); }));
    writeJSON(APPS_KEY, (await getApplications()).filter(function (a) { return String(a.userId) !== String(id); }));
  }

  async function getApplications() { return readJSON(APPS_KEY, []); }
  async function getApplicationsByUser(userId) {
    return (await getApplications()).filter(function (a) { return String(a.userId) === String(userId); });
  }
  async function getApplicationById(id) {
    return (await getApplications()).find(function (a) { return String(a.id) === String(id); }) || null;
  }
  async function addApplication(application) {
    var apps = await getApplications();
    var nextId = apps.reduce(function (m, a) { return Math.max(m, a.id || 0); }, 0) + 1;
    var now = new Date().toISOString();
    var record = Object.assign({ id: nextId, updatedAt: now }, application);
    apps.push(record);
    writeJSON(APPS_KEY, apps);
    return record;
  }
  async function updateApplication(id, patch) {
    var apps = await getApplications();
    var i = apps.findIndex(function (a) { return String(a.id) === String(id); });
    if (i < 0) throw new Error("Application not found.");
    apps[i] = Object.assign({}, apps[i], patch, { updatedAt: new Date().toISOString() });
    writeJSON(APPS_KEY, apps);
    return apps[i];
  }
  async function deleteApplication(id) {
    writeJSON(APPS_KEY, (await getApplications()).filter(function (a) { return String(a.id) !== String(id); }));
  }

  async function getCompanies() { return readJSON(COMPANY_KEY, []); }
  async function getCompanyById(id) {
    return (await getCompanies()).find(function (c) { return String(c.id) === String(id); }) || null;
  }
  async function updateCompany(id, patch) {
    var companies = await getCompanies();
    var i = companies.findIndex(function (c) { return String(c.id) === String(id); });
    if (i < 0) throw new Error("Company not found.");
    companies[i] = Object.assign({}, companies[i], patch);
    writeJSON(COMPANY_KEY, companies);
    return companies[i];
  }
  async function deleteCompany(id) {
    writeJSON(COMPANY_KEY, (await getCompanies()).filter(function (c) { return String(c.id) !== String(id); }));
    writeJSON(INTERNSHIPS_KEY, (await getInternships()).filter(function (j) { return String(j.companyId) !== String(id); }));
    writeJSON(APPS_KEY, (await getApplications()).filter(function (a) { return String(a.companyId) !== String(id); }));
  }
  async function getInternships() { return readJSON(INTERNSHIPS_KEY, []); }
  async function getInternshipsByCompany(companyId) {
    return (await getInternships()).filter(function (j) { return String(j.companyId) === String(companyId); });
  }
  async function getInternshipById(id) {
    return (await getInternships()).find(function (j) { return String(j.id) === String(id); }) || null;
  }
  async function addInternship(internship) {
    var jobs = await getInternships();
    var nextId = jobs.reduce(function (m, j) { return Math.max(m, Number(j.id) || 0); }, 0) + 1;
    var record = Object.assign({ id: nextId, createdAt: new Date().toISOString() }, internship);
    var company = await getCompanyById(record.companyId);
    if (record.status === "Published" && !companyIsApproved(company)) record.status = "Pending Review";
    if (record.deadline && String(record.deadline) < todayISO()) record.status = "Expired";
    jobs.push(record); writeJSON(INTERNSHIPS_KEY, jobs); return record;
  }
  async function updateInternship(id, patch) {
    var jobs = await getInternships();
    var i = jobs.findIndex(function (j) { return String(j.id) === String(id); });
    if (i < 0) throw new Error("Internship not found.");
    var next = Object.assign({}, jobs[i], patch, { updatedAt: new Date().toISOString() });
    var company = await getCompanyById(next.companyId);
    if (next.status === "Published" && !companyIsApproved(company)) next.status = "Pending Review";
    if (next.status === "Published" && next.deadline && String(next.deadline) < todayISO()) next.status = "Expired";
    jobs[i] = next;
    writeJSON(INTERNSHIPS_KEY, jobs); return jobs[i];
  }
  async function deleteInternship(id) {
    writeJSON(INTERNSHIPS_KEY, (await getInternships()).filter(function (j) { return String(j.id) !== String(id); }));
    writeJSON(APPS_KEY, (await getApplications()).filter(function (a) { return String(a.internshipId) !== String(id); }));
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

  function getSnoozeMap() { return readJSON(SNOOZE_KEY, {}); }

  function isSnoozed(appId) {
    var map = getSnoozeMap();
    var until = map[String(appId)];
    if (!until) return false;
    return String(todayISO()) <= String(until);
  }

  function snoozeFollowup(appId, days) {
    var map = getSnoozeMap();
    var d = new Date();
    d.setDate(d.getDate() + (days || 7));
    var iso = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    map[String(appId)] = iso;
    writeJSON(SNOOZE_KEY, map);
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

  function getSavedSearches(userId) {
    return readJSON(SEARCHES_KEY, []).filter(function (s) { return String(s.userId) === String(userId); });
  }

  function saveSearch(userId, search) {
    var all = readJSON(SEARCHES_KEY, []);
    var nextId = all.reduce(function (m, s) { return Math.max(m, Number(s.id) || 0); }, 0) + 1;
    var record = {
      id: nextId, userId: userId,
      query: String(search.query || "").trim(),
      location: String(search.location || "").trim(),
      type: String(search.type || "").trim(),
      minStipend: Number(search.minStipend) || 0,
      createdAt: new Date().toISOString()
    };
    all.push(record);
    writeJSON(SEARCHES_KEY, all);
    return record;
  }

  function deleteSavedSearch(id, userId) {
    writeJSON(SEARCHES_KEY, readJSON(SEARCHES_KEY, []).filter(function (s) {
      return !(String(s.id) === String(id) && String(s.userId) === String(userId));
    }));
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
    return readJSON(SEEN_KEY_PREFIX + String(userId), []);
  }

  function markInternshipsSeen(userId, ids) {
    var seen = {};
    getSeenIds(userId).forEach(function (id) { seen[String(id)] = true; });
    (ids || []).forEach(function (id) { seen[String(id)] = true; });
    writeJSON(SEEN_KEY_PREFIX + String(userId), Object.keys(seen));
  }

  function getMatchedAlerts(userId, jobs) {
    var searches = getSavedSearches(userId);
    var seen = {};
    getSeenIds(userId).forEach(function (id) { seen[String(id)] = true; });
    return searches.map(function (s) {
      var matched = (jobs || []).filter(function (j) { return matchesSearch(j, s); });
      var fresh = matched.filter(function (j) { return !seen[String(j.id)]; });
      return { search: s, total: matched.length, fresh: fresh, freshCount: fresh.length, sample: matched.slice(0, 3) };
    });
  }

  /* ---------------- Company / opportunity moderation ----------------
     Prototype rules: companies need admin verification before using the
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

  function normalizeOpportunityStates() {
    var companies = readJSON(COMPANY_KEY, []);
    var jobs = readJSON(INTERNSHIPS_KEY, []);
    if (!Array.isArray(companies) || !Array.isArray(jobs)) return;
    var companyMap = {};
    companies.forEach(function (c) { companyMap[String(c.id)] = c; });
    var today = todayISO();
    var changed = false;

    jobs.forEach(function (j) {
      var company = companyMap[String(j.companyId)];
      if (j.status === "Published") {
        if (!companyIsApproved(company)) {
          j.status = company && company.status === "Suspended" ? "Suspended" : "Pending Review";
          j.moderatedAt = new Date().toISOString();
          changed = true;
        } else if (j.deadline && String(j.deadline) < today) {
          j.status = "Expired";
          j.expiredAt = new Date().toISOString();
          changed = true;
        }
      }
    });

    if (changed) writeJSON(INTERNSHIPS_KEY, jobs);
  }

  function setCompanySession(company) {
    setSession({ role: "company", userId: company.id, name: company.name, email: company.email });
  }

  async function registerCompany(company) {
    var companies = await getCompanies();
    var email = String(company.email || "").trim().toLowerCase();
    if (companies.some(function (c) { return String(c.email || "").toLowerCase() === email; })) {
      throw new Error("A company account with this email already exists.");
    }
    var nextId = companies.reduce(function (m, c) { return Math.max(m, Number(c.id) || 0); }, 0) + 1;
    var record = {
      id: nextId,
      name: String(company.name || "").trim(),
      email: email,
      password: company.password || "",
      website: company.website || "",
      location: company.location || "",
      industry: company.industry || "",
      description: company.description || "",
      status: "Pending",
      verified: false,
      approvalStatus: "Pending",
      registeredDate: todayISO()
    };
    companies.push(record);
    writeJSON(COMPANY_KEY, companies);
    return record;
  }

  async function loginCompany(credentials) {
    var companies = await getCompanies();
    var email = String(credentials.email || "").trim().toLowerCase();
    var company = companies.find(function (c) { return String(c.email || "").toLowerCase() === email; });
    if (!company || company.password !== credentials.password) throw new Error("Invalid company email or password.");
    if (company.status === "Suspended") throw new Error("This company account is suspended.");
    if (company.status === "Rejected" || company.approvalStatus === "Rejected") throw new Error("This company account was rejected by the administrator.");
    if (!companyIsApproved(company)) throw new Error("Your company account is awaiting admin verification.");
    return { role: "company", userId: company.id, name: company.name, email: company.email };
  }

  function companySessionContext() {
    var s = getSession();
    if (!s || s.role !== "company") return null;
    var companies = readJSON(COMPANY_KEY, []);
    var company = companies.find(function (c) { return String(c.id) === String(s.userId); }) || null;
    return company ? { session: s, company: company } : null;
  }

  function guardCompanyPage() {
    var path = window.location.pathname.replace(/\\/g, "/");
    if (path.indexOf("/company/") === -1) return;
    var file = (path.split("/").pop() || "").toLowerCase().split("?")[0];
    if (file === "login.html" || file === "register.html") return;
    // Public opportunity board: company/internships.html supports publicMode()
    // for students and visitors, so it must not force a company login here.
    // Company-only actions inside that page still require a company session.
    if (file === "internships.html") return;
    var ctx = companySessionContext();
    if (!ctx) { window.location.href = "login.html"; return; }
    if (!companyIsApproved(ctx.company)) {
      clearSession();
      window.location.href = "login.html?pending=1";
    }
  }

  function initCompanyRegisterGuard() {
    var form = document.getElementById("companyRegisterForm");
    if (!form) return;
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

      if (!name || name.value.trim().length < 2) { setFieldError(name, "Enter the company name."); ok = false; } else setFieldError(name, "");
      if (!email || !isEmail(email.value.trim())) { setFieldError(email, "Enter a valid work email."); ok = false; } else setFieldError(email, "");
      var pwErr = password ? passwordStrength(password.value) : "Enter a password.";
      if (pwErr) { setFieldError(password, pwErr); ok = false; } else setFieldError(password, "");
      if (!confirm || confirm.value !== password.value) { setFieldError(confirm, "Passwords do not match."); ok = false; } else setFieldError(confirm, "");
      if (website && website.value.trim() && !validURL(website.value.trim())) { setFieldError(website, "Use a valid http(s) website URL."); ok = false; } else setFieldError(website, "");
      if (!location || !location.value.trim()) { setFieldError(location, "Enter the company's main location."); ok = false; } else setFieldError(location, "");
      if (!terms || !terms.checked) { showNotification("Please confirm the company profile terms.", "warning"); ok = false; }
      if (!ok) return;

      try {
        var company = await registerCompany({
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
      var ctx = companySessionContext();
      if (!ctx) { window.location.href = "login.html"; return; }
      if (!companyIsApproved(ctx.company)) {
        clearSession();
        window.location.href = "login.html?pending=1";
        return;
      }

      var d = readInternshipForm();
      var ok = true;
      var titleEl = document.getElementById("title");
      var locEl = document.getElementById("location");
      var deadlineEl = document.getElementById("deadline");
      var descEl = document.getElementById("description");
      var urlEl = document.getElementById("applyUrl");
      if (d.title.length < 3) { setFieldError(titleEl, "Enter an internship title."); ok = false; } else setFieldError(titleEl, "");
      if (!d.location) { setFieldError(locEl, "Enter a location or Remote."); ok = false; } else setFieldError(locEl, "");
      if (!d.deadline || d.deadline < todayISO()) { setFieldError(deadlineEl, d.deadline ? "Deadline cannot be in the past." : "Choose an application deadline."); ok = false; } else setFieldError(deadlineEl, "");
      if (!d.description) { setFieldError(descEl, "Add a short role description."); ok = false; } else setFieldError(descEl, "");
      if (d.applyUrl && !validURL(d.applyUrl)) { setFieldError(urlEl, "Use a valid http(s) URL."); ok = false; } else setFieldError(urlEl, "");
      if (!ok) return;

      var jobs = await getInternships();
      var now = new Date().toISOString();
      var editId = new URLSearchParams(window.location.search).get("edit");
      var editingIndex = editId ? jobs.findIndex(function (j) { return String(j.id) === String(editId) && String(j.companyId) === String(ctx.company.id); }) : -1;
      if (editId && editingIndex < 0) { showNotification("Internship not found.", "error"); return; }

      var existing = editingIndex >= 0 ? jobs[editingIndex] : null;
      var requestedStatus = d.publishRequested ? "Pending Review" : "Draft";
      var record = {
        companyId: ctx.company.id, company: ctx.company.name, title: d.title, location: d.location,
        internshipType: d.internshipType, stipend: d.stipend, positions: d.positions, deadline: d.deadline,
        skills: d.skills, description: d.description, education: d.education, applyUrl: d.applyUrl,
        status: requestedStatus, updatedAt: now
      };

      if (existing) {
        jobs[editingIndex] = Object.assign({}, existing, record);
        if (requestedStatus === "Pending Review") jobs[editingIndex].moderationNote = "Updated by company; requires admin review before publication.";
      } else {
        record.id = jobs.reduce(function (m, j) { return Math.max(m, Number(j.id) || 0); }, 0) + 1;
        record.createdAt = now;
        jobs.push(record);
      }
      writeJSON(INTERNSHIPS_KEY, jobs);

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
      else { form.reset(); var pub = document.getElementById("published"); if (pub) pub.checked = true; }
    }, true);
  }

  function initCompanyModerationControls() {
    var companiesBody = document.getElementById("companiesBody");
    var jobsBody = document.getElementById("companyJobsBody");
    if (!companiesBody && !jobsBody) return;

    function refreshCompanyRows() {
      if (!companiesBody) return;
      var companies = readJSON(COMPANY_KEY, []);
      var jobs = readJSON(INTERNSHIPS_KEY, []);
      Array.prototype.slice.call(companiesBody.querySelectorAll("tr")).forEach(function (row) {
        var first = row.querySelector("[data-toggle-company], [data-delete-company]");
        if (!first) {
          var companyName = row.cells[0] ? row.cells[0].textContent.trim() : "";
          var company = companies.find(function (c) { return c.name === companyName; });
          if (!company) return;
          first = { getAttribute: function () { return String(company.id); } };
        }
        var id = first.getAttribute("data-toggle-company") || first.getAttribute("data-delete-company") || first.getAttribute("data-verify-company") || first.getAttribute("data-reject-company");
        var company = companies.find(function (c) { return String(c.id) === String(id); });
        if (!company || !row.cells || row.cells.length < 8) return;
        var count = jobs.filter(function (j) { return String(j.companyId) === String(company.id); }).length;
        if (row.cells[5]) row.cells[5].textContent = String(count);
        if (row.cells[6]) row.cells[6].innerHTML = '<span class="badge ' + (companyIsApproved(company) ? 'badge-selected' : (company.status === 'Suspended' ? 'badge-disabled' : 'badge-shortlisted')) + '">' + esc(companyStatusLabel(company)) + '</span>';
        if (row.cells[7]) {
          var actions = '<div class="actions">';
          if (companyIsApproved(company)) {
            actions += '<button class="link-btn" data-toggle-company="' + esc(company.id) + '">Suspend</button>';
          } else if (company.status === "Suspended" && company.verified === true) {
            actions += '<button class="link-btn" data-toggle-company="' + esc(company.id) + '">Restore</button>';
          } else {
            actions += '<button class="link-btn" data-verify-company="' + esc(company.id) + '">Verify</button>';
            if (company.status !== "Rejected") actions += '<button class="link-btn danger" data-reject-company="' + esc(company.id) + '">Reject</button>';
          }
          actions += '<button class="link-btn danger" data-delete-company="' + esc(company.id) + '">Delete</button></div>';
          row.cells[7].innerHTML = actions;
        }
      });
    }

    function refreshJobRows() {
      if (!jobsBody) return;
      var companies = readJSON(COMPANY_KEY, []);
      var jobs = readJSON(INTERNSHIPS_KEY, []);
      Array.prototype.slice.call(jobsBody.querySelectorAll("tr")).forEach(function (row) {
        var title = row.cells[0] ? row.cells[0].textContent.trim() : "";
        var companyName = row.cells[1] ? row.cells[1].textContent.trim() : "";
        var job = jobs.find(function (j) { return j.title === title && j.company === companyName; });
        if (!job || !row.cells || row.cells.length < 6) return;
        var company = companies.find(function (c) { return String(c.id) === String(job.companyId); });
        if (row.cells[4]) {
          var cls = job.status === "Published" ? "badge-selected" : (job.status === "Pending Review" ? "badge-shortlisted" : (job.status === "Rejected" || job.status === "Suspended" || job.status === "Expired" || job.status === "Archived" ? "badge-disabled" : "badge-applied"));
          row.cells[4].innerHTML = '<span class="badge ' + cls + '">' + esc(job.status || "Draft") + '</span>';
        }
        if (row.cells[5]) {
          var actions = '<div class="actions">';
          if (job.status === "Pending Review" && companyIsApproved(company)) {
            actions += '<button class="link-btn" data-approve-job="' + esc(job.id) + '">Approve</button><button class="link-btn danger" data-reject-job="' + esc(job.id) + '">Reject</button>';
          } else if (job.status === "Published") {
            actions += '<button class="link-btn" data-archive-job="' + esc(job.id) + '">Archive</button>';
          } else if (job.status === "Rejected") {
            actions += '<button class="link-btn" data-approve-job="' + esc(job.id) + '">Approve</button>';
          } else if (job.status === "Draft") {
            actions += companyIsApproved(company) ? '<button class="link-btn" data-approve-job="' + esc(job.id) + '">Approve</button>' : '';
            actions += '<button class="link-btn danger" data-reject-job="' + esc(job.id) + '">Reject</button>';
          } else if (job.status === "Suspended") {
            actions += companyIsApproved(company) ? '<button class="link-btn" data-approve-job="' + esc(job.id) + '">Review / Publish</button>' : '';
          } else if (job.status === "Expired") {
            actions += '<button class="link-btn" data-archive-job="' + esc(job.id) + '">Archive</button>';
          } else if (job.status === "Archived") {
            actions += companyIsApproved(company) ? '<button class="link-btn" data-approve-job="' + esc(job.id) + '">Approve</button>' : '';
          }
          // Admin always has full control: every opportunity can be permanently removed.
          actions += '<button class="link-btn danger" data-delete-job="' + esc(job.id) + '">Delete</button>';
          actions += '</div>';
          row.cells[5].innerHTML = actions;
        }
      });
    }

    setTimeout(function () { refreshCompanyRows(); refreshJobRows(); }, 0);

    if (companiesBody) {
      companiesBody.addEventListener("click", async function (e) {
        var verify = e.target.closest && e.target.closest("[data-verify-company]");
        var reject = e.target.closest && e.target.closest("[data-reject-company]");
        var toggle = e.target.closest && e.target.closest("[data-toggle-company]");
        var del = e.target.closest && e.target.closest("[data-delete-company]");
        if (!verify && !reject && !toggle && !del) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        var target = verify || reject || toggle || del;
        var id = target.getAttribute(verify ? "data-verify-company" : reject ? "data-reject-company" : toggle ? "data-toggle-company" : "data-delete-company");
        if (del) {
          if (!confirm("Delete this company and all its internships and applications? This cannot be undone.")) return;
          await deleteCompany(id);
          showNotification("Company deleted", "success");
          // Re-render inline tables if present (admin/users.html owns row HTML).
          if (typeof window !== "undefined" && window.__internlogRerenderModeration) {
            try { window.__internlogRerenderModeration(); } catch (err) {}
          } else {
            window.location.reload();
          }
          return;
        }
        var companies = readJSON(COMPANY_KEY, []);
        var i = companies.findIndex(function (c) { return String(c.id) === String(id); });
        if (i < 0) return;
        var company = companies[i];
        var jobs = readJSON(INTERNSHIPS_KEY, []);

        if (verify) {
          company.status = "Active";
          company.verified = true;
          company.approvalStatus = "Approved";
          company.approvedAt = new Date().toISOString();
          showNotification(company.name + " verified.", "success");
        } else if (reject) {
          company.status = "Rejected";
          company.verified = false;
          company.approvalStatus = "Rejected";
          company.rejectedAt = new Date().toISOString();
          jobs.forEach(function (j) { if (String(j.companyId) === String(company.id) && j.status === "Published") j.status = "Pending Review"; });
          showNotification(company.name + " rejected.", "warning");
        } else {
          if (company.status === "Suspended") {
            company.status = company.verified === true ? "Active" : "Pending";
            if (company.status === "Active") {
              company.approvalStatus = "Approved";
              jobs.forEach(function (j) { if (String(j.companyId) === String(company.id) && j.status === "Suspended") j.status = "Pending Review"; });
            }
          } else {
            company.status = "Suspended";
            jobs.forEach(function (j) { if (String(j.companyId) === String(company.id) && j.status === "Published") j.status = "Suspended"; });
          }
          showNotification(company.name + " is now " + companyStatusLabel(company).toLowerCase() + ".", "success");
        }
        companies[i] = company;
        writeJSON(COMPANY_KEY, companies);
        writeJSON(INTERNSHIPS_KEY, jobs);
        refreshCompanyRows();
        refreshJobRows();
      }, true);
    }

    if (jobsBody) {
      jobsBody.addEventListener("click", async function (e) {
        var approve = e.target.closest && e.target.closest("[data-approve-job]");
        var reject = e.target.closest && e.target.closest("[data-reject-job]");
        var archive = e.target.closest && e.target.closest("[data-archive-job]");
        var delJob = e.target.closest && e.target.closest("[data-delete-job]");
        var legacy = e.target.closest && e.target.closest("[data-publish-job], [data-unpublish-job]");
        if (!approve && !reject && !archive && !legacy && !delJob) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        if (delJob) {
          var delId = delJob.getAttribute("data-delete-job");
          if (!confirm("Delete this internship and all its applications? This cannot be undone.")) return;
          await deleteInternship(delId);
          showNotification("Internship deleted", "success");
          if (typeof window !== "undefined" && window.__internlogRerenderModeration) {
            try { window.__internlogRerenderModeration(); } catch (err) {}
          }
          refreshCompanyRows();
          refreshJobRows();
          return;
        }
        var el = approve || reject || archive || legacy;
        var id = el.getAttribute(approve ? "data-approve-job" : reject ? "data-reject-job" : archive ? "data-archive-job" : (el.getAttribute("data-publish-job") ? "data-publish-job" : "data-unpublish-job"));
        var jobs = readJSON(INTERNSHIPS_KEY, []);
        var i = jobs.findIndex(function (j) { return String(j.id) === String(id); });
        if (i < 0) return;
        var job = jobs[i];
        var company = readJSON(COMPANY_KEY, []).find(function (c) { return String(c.id) === String(job.companyId); });

        if (approve || (legacy && el.getAttribute("data-publish-job"))) {
          if (!companyIsApproved(company)) { showNotification("Verify the company before publishing this internship.", "warning"); return; }
          if (job.deadline && String(job.deadline) < todayISO()) {
            job.status = "Expired";
            writeJSON(INTERNSHIPS_KEY, jobs);
            showNotification("This internship deadline has already passed.", "warning");
          } else {
            job.status = "Published";
            job.moderatedAt = new Date().toISOString();
            job.moderationNote = "Approved by admin.";
            writeJSON(INTERNSHIPS_KEY, jobs);
            showNotification("Internship approved and published.", "success");
          }
        } else if (reject) {
          job.status = "Rejected";
          job.moderatedAt = new Date().toISOString();
          job.moderationNote = "Rejected by admin.";
          writeJSON(INTERNSHIPS_KEY, jobs);
          showNotification("Internship rejected.", "warning");
        } else {
          job.status = "Archived";
          job.moderatedAt = new Date().toISOString();
          writeJSON(INTERNSHIPS_KEY, jobs);
          showNotification("Internship archived.", "success");
        }
        refreshCompanyRows();
        refreshJobRows();
      }, true);
    }
  }

  async function loginUser(credentials) {
    if (credentials.email.toLowerCase() === "admin@internlog.com" && credentials.password === "admin123") {
      return { role: "admin", userId: "admin", name: "InternLog Admin", email: "admin@internlog.com" };
    }
    var users = await getUsers();
    var user = users.find(function (u) { return u.email.toLowerCase() === credentials.email.toLowerCase(); });
    if (!user || user.password !== credentials.password) throw new Error("Invalid email or password");
    if (user.status === "Disabled") throw new Error("This account has been disabled. Contact support.");
    return { role: "user", userId: user.id, name: user.name, email: user.email };
  }
  async function loginAdmin(credentials) {
    if (credentials.email.toLowerCase() === "admin@internlog.com" && credentials.password === "admin123") {
      return { role: "admin", userId: "admin", name: "InternLog Admin", email: "admin@internlog.com" };
    }
    throw new Error("Invalid admin credentials");
  }

  function getSession() { return readJSON(SESSION_KEY, null); }
  function setSession(s) { writeJSON(SESSION_KEY, s); }
  function clearSession() { try { localStorage.removeItem(SESSION_KEY); } catch (e) {} }

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
    el.textContent = message;
    container.appendChild(el);
    setTimeout(function () {
      el.style.opacity = "0";
      el.style.transition = "opacity 0.3s ease";
      setTimeout(function () { el.remove(); }, 300);
    }, 3400);
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

  function initNavigation() {
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

    // Landing mobile navigation (legacy: landingMenuBtn/landingMobileNav)
    var landingMenuBtn = document.getElementById("landingMenuBtn");
    var landingMobileNav = document.getElementById("landingMobileNav");
    if (landingMenuBtn && landingMobileNav) {
      landingMenuBtn.addEventListener("click", function () {
        landingMobileNav.classList.toggle("open");
      });
      landingMobileNav.querySelectorAll("a").forEach(function (a) {
        a.addEventListener("click", function () {
          landingMobileNav.classList.remove("open");
        });
      });
    }

    // Pill nav mobile popover (current landing header)
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

    // Active sidebar link
    var normalizedPath = window.location.pathname.replace(/\\/g, "/");
    var file = (normalizedPath.split("/").pop() || "index.html").split("?")[0];
    document.querySelectorAll(".sidebar nav a").forEach(function (a) {
      var href = (a.getAttribute("href") || "").replace(/\\/g, "/").split("?")[0];
      if (href === file) {
        a.classList.add("active");
      }
    });

    // Logout handling
    document.querySelectorAll("[data-logout]").forEach(function (el) {
      el.addEventListener("click", function (e) {
        e.preventDefault();
        clearSession();
        showNotification("Logged out successfully", "success");
        setTimeout(function () {
          window.location.href = el.getAttribute("href") || "../index.html";
        }, 400);
      });
    });

    // Password reveal toggles
    document.querySelectorAll("[data-password-toggle]").forEach(function (btnEl) {
      btnEl.addEventListener("click", function () {
        var input = document.getElementById(btnEl.getAttribute("data-password-toggle"));
        if (!input) return;
        input.type = input.type === "password" ? "text" : "password";
        btnEl.textContent = input.type === "password" ? "Show" : "Hide";
      });
    });

    // Populate user chips across all authenticated pages
    var s = getSession();
    if (s) {
      document.querySelectorAll("[data-user-name]").forEach(function (el) {
        el.textContent = s.name || (s.role === "admin" ? "Admin" : "Student");
      });
      document.querySelectorAll("[data-user-email]").forEach(function (el) {
        el.textContent = s.email || "";
      });
      document.querySelectorAll("[data-avatar]").forEach(function (el) {
        if (s.name) el.textContent = s.name.trim().charAt(0).toUpperCase();
      });
    }

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

  function setFieldError(input, msg) {
    if (!input) return;
    input.setAttribute("aria-invalid", msg ? "true" : "false");
    var err = document.getElementById(input.id + "-error");
    if (err) {
      err.textContent = msg || "";
      err.classList.toggle("visible", !!msg);
    }
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

    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      var email = document.getElementById("email");
      var password = document.getElementById("password");
      var remember = document.getElementById("remember");
      var ok = true;

      if (!isEmail(email.value.trim())) { setFieldError(email, "Enter a valid email address."); ok = false; }
      else setFieldError(email, "");

      if (!password.value) { setFieldError(password, "Enter your password."); ok = false; }
      else setFieldError(password, "");

      if (!ok) return;
      try {
        var session = await loginUser({ email: email.value.trim(), password: password.value });
        if (session.role !== "user") {
          throw new Error("Invalid email or password");
        }
        session.remember = !!(remember && remember.checked);
        setSession(session);
        showNotification("Welcome back, " + session.name.split(" ")[0] + "!", "success");
        setTimeout(function () { window.location.href = "dashboard.html"; }, 500);
      } catch (err) {
        var alertEl = document.getElementById("formAlert");
        if (alertEl) {
          alertEl.textContent = err.message || "Invalid email or password";
          alertEl.style.display = "block";
        }
        showNotification(err.message || "Invalid email or password", "error");
      }
    });
  }

  /* Direct visits to the console login (typed address, bookmark, link)
     with no fresh tap-through pass see a plain not-found page instead.
     Signed-in console sessions are unaffected. */
  function initConsoleGate() {
    if (!document.getElementById("adminLoginForm")) return;
    var s = getSession();
    if (s && s.role === "admin") return;
    if (hasConsolePass()) return;
    document.title = "Page not found — InternLog";
    document.body.innerHTML =
      '<main style="min-height:100vh;display:flex;align-items:center;justify-content:center;' +
      'font-family:\'Helvetica Neue\',Helvetica,Arial,sans-serif;background:#f8fafc;color:#0f172a;' +
      'padding:24px;text-align:center;">' +
      '<div style="max-width:560px;">' +
      '<div style="font-family:Georgia,serif;font-style:italic;font-size:88px;line-height:1;">404</div>' +
      "<h1 style=\"font-family:Georgia,serif;font-weight:400;font-size:28px;margin:12px 0 8px;\">This page doesn't exist.</h1>" +
      '<p style="color:#64748b;font-size:15px;margin:0 0 24px;">The address may be mistyped, or the page may have moved.</p>' +
      '<p><a href="../index.html" style="display:inline-block;border-radius:8px;padding:10px 22px;' +
      'font-size:14px;font-weight:600;text-decoration:none;background:#1a56d5;color:#fff;">Back to home</a></p>' +
      "</div></main>";
  }

  async function initAdminLogin() {
    var form = document.getElementById("adminLoginForm");
    if (!form) return;

    var s = getSession();
    if (s && s.role === "admin") {
      window.location.href = "dashboard.html";
      return;
    }

    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      var email = document.getElementById("email");
      var password = document.getElementById("password");
      var ok = true;
      if (!email.value.trim()) { setFieldError(email, "Enter your admin email."); ok = false; }
      else setFieldError(email, "");
      if (!password.value) { setFieldError(password, "Enter your password."); ok = false; }
      else setFieldError(password, "");
      if (!ok) return;

      try {
        var session = await loginAdmin({ email: email.value.trim(), password: password.value });
        clearConsolePass();
        setSession(session);
        showNotification("Welcome, Admin!", "success");
        setTimeout(function () { window.location.href = "dashboard.html"; }, 500);
      } catch (err) {
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

      if (name.value.trim().length < 3) { setFieldError(name, "Enter your full name."); ok = false; } else setFieldError(name, "");
      if (!isEmail(email.value.trim())) { setFieldError(email, "Enter a valid email address."); ok = false; } else setFieldError(email, "");
      var pwErr = passwordStrength(password.value);
      if (pwErr) { setFieldError(password, pwErr); ok = false; } else setFieldError(password, "");
      if (confirm.value !== password.value) { setFieldError(confirm, "Passwords do not match."); ok = false; } else setFieldError(confirm, "");
      if (!college.value.trim()) { setFieldError(college, "Enter your college or university."); ok = false; } else setFieldError(college, "");
      if (!course.value.trim()) { setFieldError(course, "Enter your course."); ok = false; } else setFieldError(course, "");
      if (!gradYear.value) { setFieldError(gradYear, "Select your graduation year."); ok = false; } else setFieldError(gradYear, "");
      if (!terms.checked) { showNotification("Please accept the terms and conditions.", "warning"); ok = false; }
      if (!ok) return;

      try {
        var user = await registerUser({
          name: name.value.trim(), email: email.value.trim(), password: password.value,
          college: college.value.trim(), course: course.value.trim(), gradYear: gradYear.value
        });
        setSession({ role: "user", userId: user.id, name: user.name, email: user.email });
        showNotification("Account created successfully!", "success");
        setTimeout(function () { window.location.href = "dashboard.html"; }, 600);
      } catch (err) {
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
        await deleteApplication(Number(d));
        showNotification("Application deleted", "success");
        if (onChange) onChange();
      }
    });
  }

  async function openAppModal(id) {
    var a = await getApplicationById(id);
    if (!a) { showNotification("Application not found", "error"); return; }
    var users = await getUsers();
    var owner = users.find(function (u) { return String(u.id) === String(a.userId); });
    var backdrop = document.getElementById("modalBackdrop");
    var body = document.getElementById("modalBody");
    if (!backdrop || !body) return;

    body.innerHTML =
      '<div class="modal-header">' +
        "<h3>" + esc(a.company) + " — " + esc(a.role) + "</h3>" +
        '<button class="modal-close-icon" id="modalCloseIcon" aria-label="Close dialog">&times;</button>' +
      "</div>" +
      "<dl>" +
      (owner ? "<dt>Student</dt><dd><strong>" + esc(owner.name) + "</strong> (" + esc(owner.email) + ")<br><span class='muted'>" + esc(owner.college) + "</span></dd>" : "") +
      "<dt>Location</dt><dd>" + esc(a.location || "—") + "</dd>" +
      "<dt>Internship Type</dt><dd>" + esc(a.internshipType || "—") + "</dd>" +
      "<dt>Applied Date</dt><dd>" + fmtDate(a.appliedDate) + "</dd>" +
      "<dt>Deadline</dt><dd>" + fmtDate(a.deadline) + "</dd>" +
      (a.interviewDate ? "<dt>Interview Date</dt><dd><strong>" + fmtDate(a.interviewDate) + "</strong></dd>" : "") +
      "<dt>Stipend</dt><dd>" + (a.stipend && Number(a.stipend) > 0 ? "₹" + Number(a.stipend).toLocaleString("en-IN") + " / month" : "Unpaid / Not specified") + "</dd>" +
      (a.url ? "<dt>Posting URL</dt><dd><a href='" + esc(a.url) + "' target='_blank' rel='noopener'>Open posting ↗</a></dd>" : "") +
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

    var apps = await getApplicationsByUser(s.userId);
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
          else encouragement = " Steady progress — keep going at a sustainable pace.";
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
          btn.addEventListener("click", function () {
            snoozeFollowup(btn.getAttribute("data-snooze"), 7);
            showNotification("Snoozed for 7 days. You have got this.", "info");
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
      var allJobs = await getInternships();
      var pubJobs = allJobs.filter(function (j) { return j.status === "Published"; });
      var alerts = getMatchedAlerts(s.userId, pubJobs);
      if (!alerts.length) {
        alertsEl.innerHTML = '<p class="muted">Save a search on the <a href="../company/internships.html">opportunity board</a> (e.g. “React, Remote”) and new matches will appear here.</p>';
      } else {
        alertsEl.innerHTML = alerts.map(function (al) {
          var label = (al.search.query || al.search.location || al.search.type || "All internships");
          var fresh = al.freshCount ? ' <span class="badge badge-selected">' + al.freshCount + " new</span>" : "";
          var sample = al.sample.length ? '<br><span class="muted">' + al.sample.map(function (j) { return esc(j.title) + " @ " + esc(j.company); }).join(" · ") + "</span>" : '<br><span class="muted">No matches yet — we will flag new posts here.</span>';
          return '<div class="mini-row"><span><strong>' + esc(label) + "</strong>" + fresh + sample + "</span>" +
            '<span class="actions"><a class="link-btn" href="../company/internships.html">View</a>' +
            '<button class="link-btn danger" data-unsave-search="' + al.search.id + '">Remove</button></span></div>';
        }).join("");
        Array.prototype.slice.call(alertsEl.querySelectorAll("[data-unsave-search]")).forEach(function (btn) {
          btn.addEventListener("click", function () {
            deleteSavedSearch(btn.getAttribute("data-unsave-search"), s.userId);
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
      var apps = await getApplicationsByUser(s.userId);
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
      if (!paintErrors(validateApplication(d))) {
        showNotification("Please fix the highlighted fields.", "error");
        return;
      }
      await addApplication(Object.assign({ userId: s.userId }, d));
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
    var app = await getApplicationById(id);
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
      if (!paintErrors(validateApplication(d))) {
        showNotification("Please fix the highlighted fields.", "error");
        return;
      }
      await updateApplication(app.id, d);
      showNotification("Changes saved successfully", "success");
      setTimeout(function () { window.location.href = "applications.html"; }, 500);
    });

    var del = document.getElementById("deleteBtn");
    if (del) {
      del.addEventListener("click", async function () {
        if (!confirm("Delete this application? This cannot be undone.")) return;
        await deleteApplication(app.id);
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

    var user = await getUserById(s.userId);
    if (!user) { clearSession(); window.location.href = "login.html"; return; }

    var apps = await getApplicationsByUser(s.userId);
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
      var updated = await updateUser(user.id, patch);
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

        if (cur !== user.password) { showNotification("Current password is incorrect.", "error"); return; }
        if (nw !== conf) { showNotification("New passwords do not match.", "error"); return; }
        var err = passwordStrength(nw);
        if (err) { showNotification(err, "error"); return; }

        await updateUser(user.id, { password: nw });
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

    var users = await getUsers();
    var apps = await getApplications();
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
      var users = await getUsers();
      var apps = await getApplications();
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
        var u = await getUserById(t);
        if (!u) { showNotification("User not found", "error"); return; }
        await updateUser(t, { status: u.status === "Active" ? "Disabled" : "Active" });
        showNotification("User " + (u.status === "Active" ? "disabled" : "enabled"), "success");
        render();
      } else if (d) {
        if (!confirm("Delete this user and all their applications? This cannot be undone.")) return;
        await deleteUser(d);
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
      var users = await getUsers();
      usersMap = {};
      users.forEach(function (u) { usersMap[u.id] = u; });

      var apps = await getApplications();
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
        await deleteApplication(Number(d));
        showNotification("Application deleted", "success");
        render();
      }
    });

    tbody.addEventListener("change", async function (e) {
      var id = e.target.getAttribute && e.target.getAttribute("data-status-for");
      if (id) {
        await updateApplication(Number(id), { status: e.target.value });
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

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var name = document.getElementById("adminName").value.trim();
      if (name.length < 3) { showNotification("Enter a valid name.", "error"); return; }
      setSession({ role: "admin", userId: "admin", name: name, email: document.getElementById("adminEmail").value.trim() });
      showNotification("Admin profile updated", "success");
      setTimeout(function () { window.location.reload(); }, 500);
    });
  }

  /* ---------------- Secret console access ----------------
     Tapping the InternLog logo 5 times within 3 seconds opens the
     restricted console login. Tap timestamps are kept in sessionStorage
     so rapid taps still count even if a tap navigates between pages.
     A successful tap-through also stamps a short-lived pass (valid 10
     minutes). Without that pass — e.g. someone typing the console
     address manually — the login page disguises itself as a 404.
     There is intentionally no visible hint of this anywhere in the UI. */
  var CONSOLE_PASS_KEY = "internlog_console_pass";
  var CONSOLE_PASS_MS = 10 * 60 * 1000;

  function stampConsolePass() {
    try { sessionStorage.setItem(CONSOLE_PASS_KEY, String(Date.now())); } catch (e) {}
  }
  function hasConsolePass() {
    try {
      var t = Number(sessionStorage.getItem(CONSOLE_PASS_KEY) || 0);
      return Date.now() - t < CONSOLE_PASS_MS;
    } catch (e) { return false; }
  }
  function clearConsolePass() {
    try { sessionStorage.removeItem(CONSOLE_PASS_KEY); } catch (e) {}
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
    btn.addEventListener("click", function () {
      var next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
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
          document.querySelectorAll("[data-pill-nav] .pill.is-active").forEach(function (el) {
            el.classList.remove("is-active");
            el.removeAttribute("aria-current");
          });
          a.classList.add("is-active");
          a.setAttribute("aria-current", "page");
        }
      });
    } catch (e) {}
  }

  function initSecretConsoleAccess() {
    var REQUIRED_TAPS = 5;
    var WINDOW_MS = 3000;
    var STORE_KEY = "internlog_logo_taps";
    if (document.getElementById("adminLoginForm")) return; // already there

    function readTaps() {
      try { return JSON.parse(sessionStorage.getItem(STORE_KEY) || "[]"); }
      catch (e) { return []; }
    }
    function resolveConsoleLogin() {
      var here = window.location.pathname.replace(/\\/g, "/");
      if (here.indexOf("/admin/") !== -1) return "login.html";
      if (here.indexOf("/user/") !== -1) return "../admin/login.html";
      return "admin/login.html";
    }

    document.querySelectorAll(".brand").forEach(function (brand) {
      brand.addEventListener("click", function (e) {
        var now = Date.now();
        var taps = readTaps().filter(function (t) { return now - t < WINDOW_MS; });
        taps.push(now);
        try { sessionStorage.setItem(STORE_KEY, JSON.stringify(taps)); } catch (err) {}
        if (taps.length >= REQUIRED_TAPS) {
          e.preventDefault();
          try { sessionStorage.removeItem(STORE_KEY); } catch (err) {}
          stampConsolePass();
          window.location.href = resolveConsoleLogin();
        }
      });
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

  document.addEventListener("DOMContentLoaded", function () {
    injectFavicon();
    seedIfNeeded();
    normalizeOpportunityStates();
    guardCompanyPage();
    initCompanyRegisterGuard();
    initCompanyLoginGuard();
    initCompanyInternshipSubmitGuard();
    initCompanyModerationControls();
    initNavigation();
    initPillNav();
    initThemeToggle();
    initSecretConsoleAccess();
    initConsoleGate();
    initCurvedLoop();
    initUserLogin();
    initAdminLogin();
    initRegister();
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
    getApplications: getApplications,
    addApplication: addApplication,
    updateApplication: updateApplication,
    deleteApplication: deleteApplication,
    getUsers: getUsers,
    getCompanies: getCompanies,
    getCompanyById: getCompanyById,
    updateCompany: updateCompany,
    deleteCompany: deleteCompany,
    getInternships: getInternships,
    getInternshipsByCompany: getInternshipsByCompany,
    getInternshipById: getInternshipById,
    addInternship: addInternship,
    updateInternship: updateInternship,
    deleteInternship: deleteInternship,
    registerCompany: registerCompany,
    loginCompany: loginCompany,
    companyIsApproved: companyIsApproved,
    getPublicInternships: async function () {
      normalizeOpportunityStates();
      var jobs = await getInternships();
      var companies = await getCompanies();
      var map = {}; companies.forEach(function (c) { map[String(c.id)] = c; });
      var today = todayISO();
      return jobs.filter(function (j) {
        var c = map[String(j.companyId)];
        return j.status === "Published" && companyIsApproved(c) && (!j.deadline || String(j.deadline) >= today);
      });
    },
    loginUser: loginUser,
    registerUser: registerUser,
    exportApplicationsToCSV: exportApplicationsToCSV,
    getFollowups: getFollowups,
    snoozeFollowup: snoozeFollowup,
    getSavedSearches: getSavedSearches,
    saveSearch: saveSearch,
    deleteSavedSearch: deleteSavedSearch,
    matchesSearch: matchesSearch,
    getMatchedAlerts: getMatchedAlerts,
    getSeenIds: getSeenIds,
    markInternshipsSeen: markInternshipsSeen,
    showNotification: showNotification
  };
})();
