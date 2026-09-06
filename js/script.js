/* InternLog — single shared JS file (vanilla JS, backend-ready data layer). */
(function () {
  "use strict";

  var USERS_KEY = "internlog_users";
  var APPS_KEY = "internlog_applications";
  var SESSION_KEY = "internlog_session";
  var SEEDED_KEY = "internlog_seeded_v1";

  var STATUSES = ["Applied", "Shortlisted", "Interview", "Selected", "Rejected"];

  /* ---------- Future REST API map (Java backend) ----------
     POST /api/auth/login | POST /api/auth/register
     GET/POST /api/applications | GET/PUT/DELETE /api/applications/{id}
     GET/PUT/DELETE /api/users, /api/users/{id} | GET /api/admin/dashboard
     The functions below intentionally mirror those endpoints so they can
     later be swapped for fetch() calls without touching UI code. */

  function readJSON(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) { return fallback; }
  }
  function writeJSON(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function fmtDate(iso) {
    if (!iso) return "—";
    var d = new Date(iso + "T00:00:00");
    if (isNaN(d.getTime())) return esc(iso);
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  }

  /* ---------------- Seed data (small, realistic, consistent) ---------------- */
  function seedIfNeeded() {
    if (localStorage.getItem(SEEDED_KEY)) return;
    var users = [
      { id: 101, name: "Ananya Nair", email: "ananya.nair@example.com", password: "password123", college: "College of Engineering Trivandrum", course: "B.Tech Computer Science", gradYear: "2027", registeredDate: "2026-07-02", status: "Active" },
      { id: 102, name: "Adithya Menon", email: "adithya.menon@example.com", password: "password123", college: "CUSAT, Kochi", course: "B.Tech Information Technology", gradYear: "2026", registeredDate: "2026-07-14", status: "Active" },
      { id: 103, name: "Sneha Pillai", email: "sneha.pillai@example.com", password: "password123", college: "MG University, Kottayam", course: "BCA", gradYear: "2026", registeredDate: "2026-08-05", status: "Active" }
    ];
    var applications = [
      { id: 1, userId: 101, company: "Infosys", role: "Software Development Intern", location: "Kochi", appliedDate: "2026-08-10", deadline: "2026-09-10", internshipType: "Hybrid", stipend: "12000", url: "https://www.infosys.com/careers/", status: "Applied", notes: "Applied through company careers page. Awaiting screening." },
      { id: 2, userId: 101, company: "TCS", role: "Web Development Intern", location: "Thiruvananthapuram", appliedDate: "2026-07-28", deadline: "2026-08-28", internshipType: "On-site", stipend: "10000", url: "https://www.tcs.com/careers", status: "Shortlisted", notes: "Online assessment cleared. HR round pending." },
      { id: 3, userId: 101, company: "UST", role: "Java Development Intern", location: "Thiruvananthapuram", appliedDate: "2026-08-01", deadline: "2026-09-05", internshipType: "On-site", stipend: "15000", url: "https://www.ust.com/careers", status: "Interview", interviewDate: "2026-09-10", notes: "Technical interview scheduled. Revise Java collections and SQL." },
      { id: 4, userId: 101, company: "Wipro", role: "UI/UX Design Intern", location: "Kochi", appliedDate: "2026-06-15", deadline: "2026-07-15", internshipType: "Remote", stipend: "8000", url: "", status: "Rejected", notes: "Portfolio round not cleared. Reapply next quarter." },
      { id: 5, userId: 102, company: "Zoho", role: "Software Development Intern", location: "Chennai", appliedDate: "2026-07-20", deadline: "2026-08-30", internshipType: "On-site", stipend: "20000", url: "https://www.zoho.com/careers/", status: "Selected", notes: "Offer received. Joining formalities in progress." },
      { id: 6, userId: 102, company: "Tech Mahindra", role: "Quality Assurance Intern", location: "Hyderabad", appliedDate: "2026-08-12", deadline: "2026-09-12", internshipType: "Hybrid", stipend: "9000", url: "", status: "Applied", notes: "Referral through senior. Waiting for test link." },
      { id: 7, userId: 102, company: "IBM", role: "Data Analytics Intern", location: "Bengaluru", appliedDate: "2026-08-02", deadline: "2026-09-02", internshipType: "Remote", stipend: "18000", url: "https://www.ibm.com/careers", status: "Interview", interviewDate: "2026-09-09", notes: "Case-study round on campus placement data." },
      { id: 8, userId: 103, company: "L&T Technology Services", role: "Embedded Systems Intern", location: "Chennai", appliedDate: "2026-08-18", deadline: "2026-09-18", internshipType: "On-site", stipend: "11000", url: "", status: "Applied", notes: "Applied via campus placement cell." }
    ];
    writeJSON(USERS_KEY, users);
    writeJSON(APPS_KEY, applications);
    localStorage.setItem(SEEDED_KEY, "1");
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
    var record = Object.assign({ id: nextId }, application);
    apps.push(record);
    writeJSON(APPS_KEY, apps);
    return record;
  }
  async function updateApplication(id, patch) {
    var apps = await getApplications();
    var i = apps.findIndex(function (a) { return String(a.id) === String(id); });
    if (i < 0) throw new Error("Application not found.");
    apps[i] = Object.assign({}, apps[i], patch);
    writeJSON(APPS_KEY, apps);
    return apps[i];
  }
  async function deleteApplication(id) {
    writeJSON(APPS_KEY, (await getApplications()).filter(function (a) { return String(a.id) !== String(id); }));
  }

  async function loginUser(credentials) {
    // Demo admin account (backend will own real auth later)
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
  function clearSession() { localStorage.removeItem(SESSION_KEY); }

  function computeStats(apps) {
    var s = { total: apps.length, Applied: 0, Shortlisted: 0, Interview: 0, Selected: 0, Rejected: 0 };
    apps.forEach(function (a) { if (s[a.status] != null) s[a.status]++; });
    return s;
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
    setTimeout(function () { el.remove(); }, 3400);
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
    var here = window.location.pathname;
    var inUser = here.indexOf("/user/") !== -1 || here.endsWith("user/dashboard.html");
    var inAdmin = here.indexOf("/admin/") !== -1;
    if (!s) {
      if (inAdmin) window.location.href = "login.html";
      else if (inUser) window.location.href = "login.html";
      return null;
    }
    if (role && s.role !== role) {
      window.location.href = s.role === "admin" ? "../admin/dashboard.html" : "../user/dashboard.html";
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
        sidebar.classList.remove("open"); backdrop.classList.remove("show");
      });
    }
    var file = (window.location.pathname.split("/").pop() || "index.html").split("?")[0];
    document.querySelectorAll(".sidebar nav a").forEach(function (a) {
      var href = (a.getAttribute("href") || "").split("?")[0];
      if (href === file) a.classList.add("active");
    });
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
    document.querySelectorAll("[data-password-toggle]").forEach(function (btnEl) {
      btnEl.addEventListener("click", function () {
        var input = document.getElementById(btnEl.getAttribute("data-password-toggle"));
        if (!input) return;
        input.type = input.type === "password" ? "text" : "password";
        btnEl.textContent = input.type === "password" ? "Show" : "Hide";
      });
    });
    // Fill user chips
    var s = getSession();
    document.querySelectorAll("[data-user-name]").forEach(function (el) {
      if (s) el.textContent = s.name || "Account";
    });
    document.querySelectorAll("[data-user-email]").forEach(function (el) {
      if (s) el.textContent = s.email || "";
    });
    document.querySelectorAll("[data-avatar]").forEach(function (el) {
      if (s && s.name) el.textContent = s.name.trim().charAt(0).toUpperCase();
    });
  }

  function setFieldError(input, msg) {
    if (!input) return;
    input.setAttribute("aria-invalid", msg ? "true" : "false");
    var err = document.getElementById(input.id + "-error");
    if (err) { err.textContent = msg || ""; err.classList.toggle("visible", !!msg); }
  }
  function isEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }
  function passwordStrength(pw) {
    if (pw.length < 8) return "Password must be at least 8 characters.";
    if (!/[A-Za-z]/.test(pw) || !/[0-9]/.test(pw)) return "Password must include both letters and numbers.";
    return "";
  }
  function validURL(v) {
    if (!v) return true;
    try { var u = new URL(v); return u.protocol === "http:" || u.protocol === "https:"; }
    catch (e) { return false; }
  }

  /* ---------------- Page initializers ---------------- */
  async function initUserLogin() {
    var form = document.getElementById("loginForm");
    if (!form) return;
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
        if (session.role === "admin") {
          showNotification("Admin account detected — redirecting to admin login.", "warning");
          setTimeout(function () { window.location.href = "../admin/login.html"; }, 700);
          return;
        }
        session.remember = !!(remember && remember.checked);
        setSession(session);
        showNotification("Welcome back, " + session.name.split(" ")[0] + "!", "success");
        setTimeout(function () { window.location.href = "dashboard.html"; }, 500);
      } catch (err) {
        var alert = document.getElementById("formAlert");
        if (alert) { alert.textContent = err.message || "Invalid email or password"; alert.style.display = "block"; }
        showNotification(err.message || "Invalid email or password", "error");
      }
    });
  }

  async function initAdminLogin() {
    var form = document.getElementById("adminLoginForm");
    if (!form) return;
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
        setSession(session);
        showNotification("Welcome, Admin!", "success");
        setTimeout(function () { window.location.href = "dashboard.html"; }, 500);
      } catch (err) {
        var alert = document.getElementById("formAlert");
        if (alert) { alert.textContent = err.message; alert.style.display = "block"; }
        showNotification(err.message, "error");
      }
      var hint = document.getElementById("demoHint");
      if (hint) hint.style.display = "block";
    });
  }

  async function initRegister() {
    var form = document.getElementById("registerForm");
    if (!form) return;
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
      } catch (err) { showNotification(err.message, "error"); }
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
      return '<div class="status-bar-row"><span>' + esc(st) + '</span>' +
        '<div class="status-track"><div class="status-fill" style="width:' + pct + '%"></div></div>' +
        "<strong>" + n + "</strong></div>";
    }).join("");
  }

  function appRow(a, usersById, showStudent) {
    var student = usersById ? (usersById[a.userId] || null) : null;
    return "<tr>" +
      (showStudent ? "<td>#" + esc(a.id) + "<br><span class='muted'>" + esc(student ? student.name : ("User " + a.userId)) + "</span></td>" + (showStudent === "full" ? "" : "") : "") +
      (showStudent === "full" ? "<td>" + esc(student ? student.name : ("User " + a.userId)) + "</td>" : "") +
      "<td><strong>" + esc(a.company) + "</strong></td>" +
      "<td>" + esc(a.role) + "</td>" +
      (showStudent ? "" : "<td>" + esc(a.location || "—") + "</td>") +
      "<td>" + fmtDate(a.appliedDate) + "</td>" +
      (showStudent ? "" : "<td>" + fmtDate(a.deadline) + "</td>") +
      "<td>" + statusBadge(a.status) + "</td>" +
      '<td><div class="actions">' +
      '<button class="link-btn" data-view="' + a.id + '">View</button>' +
      (showStudent === "admin" || showStudent === "full" ? "" : '<a class="link-btn" href="edit-application.html?id=' + a.id + '">Edit</a>') +
      (showStudent ? '<button class="link-btn danger" data-delete="' + a.id + '">Delete</button>'
                   : '<button class="link-btn danger" data-delete="' + a.id + '">Delete</button>') +
      "</div></td></tr>";
  }

  function wireTableActions(container, onChange) {
    if (!container) return;
    container.addEventListener("click", async function (e) {
      var v = e.target.getAttribute && e.target.getAttribute("data-view");
      var d = e.target.getAttribute && e.target.getAttribute("data-delete");
      if (v) openAppModal(Number(v));
      else if (d) {
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
    body.innerHTML = "<h3>" + esc(a.company) + " — " + esc(a.role) + "</h3>" +
      "<dl>" +
      (owner ? "<dt>Student</dt><dd>" + esc(owner.name) + " (" + esc(owner.email) + ")</dd>" : "") +
      "<dt>Location</dt><dd>" + esc(a.location || "—") + "</dd>" +
      "<dt>Internship Type</dt><dd>" + esc(a.internshipType || "—") + "</dd>" +
      "<dt>Applied Date</dt><dd>" + fmtDate(a.appliedDate) + "</dd>" +
      "<dt>Deadline</dt><dd>" + fmtDate(a.deadline) + "</dd>" +
      (a.interviewDate ? "<dt>Interview Date</dt><dd>" + fmtDate(a.interviewDate) + "</dd>" : "") +
      "<dt>Stipend</dt><dd>" + (a.stipend ? "₹" + esc(Number(a.stipend).toLocaleString("en-IN")) + " / month" : "—") + "</dd>" +
      (a.url ? "<dt>Posting URL</dt><dd><a href='" + esc(a.url) + "' target='_blank' rel='noopener'>Open posting</a></dd>" : "") +
      "<dt>Status</dt><dd>" + statusBadge(a.status) + "</dd>" +
      "<dt>Notes</dt><dd>" + esc(a.notes || "—") + "</dd>" +
      "</dl>";
    backdrop.classList.add("open");
    var close = document.getElementById("modalClose");
    if (close) close.onclick = function () { backdrop.classList.remove("open"); };
    backdrop.onclick = function (ev) { if (ev.target === backdrop) backdrop.classList.remove("open"); };
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
    var upcoming = apps.filter(function (a) { return a.status === "Interview"; })
      .sort(function (a, b) { return String(a.interviewDate || a.deadline).localeCompare(String(b.interviewDate || b.deadline)); });
    var upEl = document.getElementById("upcomingList");
    if (upEl) {
      upEl.innerHTML = upcoming.length ? upcoming.map(function (a) {
        return '<div class="mini-row"><span><strong>' + esc(a.company) + "</strong> — " + esc(a.role) + "</span><span>" + fmtDate(a.interviewDate || a.deadline) + "</span></div>";
      }).join("") : '<p class="muted">No upcoming interviews. Interviews you track will appear here.</p>';
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

    async function render() {
      var apps = await getApplicationsByUser(s.userId);
      var q = (search.value || "").toLowerCase().trim();
      var st = statusFilter.value || "All";
      var filtered = apps.filter(function (a) {
        var matchQ = !q || a.company.toLowerCase().indexOf(q) !== -1 || a.role.toLowerCase().indexOf(q) !== -1;
        var matchS = st === "All" || a.status === st;
        return matchQ && matchS;
      }).sort(function (a, b) { return String(b.appliedDate).localeCompare(String(a.appliedDate)); });
      if (count) count.textContent = filtered.length + " of " + apps.length + " applications";
      var hasAny = apps.length > 0;
      if (empty) empty.style.display = (!filtered.length && !q && st === "All" && !hasAny) ? "block" : "none";
      if (tableWrap) tableWrap.style.display = filtered.length ? "" : "none";
      var noResults = document.getElementById("noResults");
      if (noResults) noResults.style.display = (!filtered.length && hasAny) ? "block" : "none";
      tbody.innerHTML = filtered.map(function (a) { return appRow(a, null, false); }).join("");
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
    if (d.stipend && (!/^\d+$/.test(d.stipend) || Number(d.stipend) < 0)) errors.stipend = "Stipend must be a valid non-negative number.";
    if (d.url && !validURL(d.url)) errors.url = "Enter a valid URL starting with http(s)://.";
    if (!STATUSES.includes(d.status)) errors.status = "Select a valid status.";
    return errors;
  }
  function paintErrors(errors) {
    ["company", "role", "location", "appliedDate", "deadline", "stipend", "url", "status"].forEach(function (id) {
      setFieldError(document.getElementById(id), errors[id] || "");
    });
    return Object.keys(errors).length === 0;
  }

  async function initAddApplication() {
    var form = document.getElementById("addForm");
    if (!form) return;
    var s = requireAuth("user");
    if (!s) return;
    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      var d = collectApplicationForm();
      if (!paintErrors(validateApplication(d))) { showNotification("Please fix the highlighted fields.", "error"); return; }
      await addApplication(Object.assign({ userId: s.userId }, d));
      showNotification("Application added successfully", "success");
      setTimeout(function () { window.location.href = "applications.html"; }, 500);
    });
  }

  async function initEditApplication() {
    var form = document.getElementById("editForm");
    if (!form) return;
    var s = requireAuth("user");
    if (!s) return;
    var id = new URLSearchParams(window.location.search).get("id");
    if (!id) { showNotification("No application selected.", "error"); window.location.href = "applications.html"; return; }
    var app = await getApplicationById(id);
    if (!app || String(app.userId) !== String(s.userId)) {
      showNotification("Application not found.", "error");
      window.location.href = "applications.html"; return;
    }
    ["company", "role", "location", "appliedDate", "deadline", "internshipType", "stipend", "url", "status", "interviewDate", "notes"].forEach(function (k) {
      var el = document.getElementById(k);
      if (el && app[k] != null) el.value = app[k];
    });
    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      var d = collectApplicationForm();
      if (!paintErrors(validateApplication(d))) { showNotification("Please fix the highlighted fields.", "error"); return; }
      await updateApplication(app.id, d);
      showNotification("Changes saved successfully", "success");
      setTimeout(function () { window.location.href = "applications.html"; }, 500);
    });
    var del = document.getElementById("deleteBtn");
    if (del) del.addEventListener("click", async function () {
      if (!confirm("Delete this application?")) return;
      await deleteApplication(app.id);
      showNotification("Application deleted", "success");
      setTimeout(function () { window.location.href = "applications.html"; }, 400);
    });
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
    renderStatGrid(document.getElementById("profileStats"), { total: stats.total, Interview: stats.Interview, Selected: stats.Selected, Rejected: stats.Rejected }, ["total", "Interview", "Selected", "Rejected"]);
    var form = document.getElementById("profileForm");
    ["fullName", "college", "course", "gradYear"].forEach(function () {});
    document.getElementById("fullName").value = user.name;
    document.getElementById("college").value = user.college;
    document.getElementById("course").value = user.course;
    document.getElementById("gradYear").value = user.gradYear;
    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      var patch = {
        name: document.getElementById("fullName").value.trim(),
        college: document.getElementById("college").value.trim(),
        course: document.getElementById("course").value.trim(),
        gradYear: document.getElementById("gradYear").value
      };
      if (patch.name.length < 3) { showNotification("Enter a valid name.", "error"); return; }
      var updated = await updateUser(user.id, patch);
      setSession({ role: "user", userId: updated.id, name: updated.name, email: updated.email });
      showNotification("Profile updated successfully", "success");
      setTimeout(function () { window.location.reload(); }, 500);
    });
    var pwForm = document.getElementById("passwordForm");
    if (pwForm) pwForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      var cur = document.getElementById("currentPassword").value;
      var nw = document.getElementById("newPassword").value;
      if (cur !== user.password) { showNotification("Current password is incorrect.", "error"); return; }
      var err = passwordStrength(nw);
      if (err) { showNotification(err, "error"); return; }
      await updateUser(user.id, { password: nw });
      showNotification("Password changed successfully", "success");
      pwForm.reset();
    });
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
      '<div class="stat"><div class="label">Total Users</div><div class="value">' + users.length + "</div></div>" +
      '<div class="stat"><div class="label">Total Applications</div><div class="value">' + stats.total + "</div></div>" +
      '<div class="stat"><div class="label">Applied</div><div class="value">' + stats.Applied + "</div></div>" +
      '<div class="stat"><div class="label">Shortlisted</div><div class="value">' + stats.Shortlisted + "</div></div>" +
      '<div class="stat"><div class="label">Interviews</div><div class="value">' + stats.Interview + "</div></div>" +
      '<div class="stat"><div class="label">Selected</div><div class="value">' + stats.Selected + "</div></div>";
    renderStatusOverview(document.getElementById("adminOverview"), stats);
    var usersById = {};
    users.forEach(function (u) { usersById[u.id] = u; });
    var recentUsers = users.slice().sort(function (a, b) { return String(b.registeredDate).localeCompare(String(a.registeredDate)); }).slice(0, 3);
    var recentApps = apps.slice().sort(function (a, b) { return String(b.appliedDate).localeCompare(String(a.appliedDate)); }).slice(0, 4);
    var act = document.getElementById("recentActivity");
    if (act) {
      act.innerHTML =
        recentUsers.map(function (u) { return '<div class="mini-row"><span><strong>' + esc(u.name) + "</strong> registered</span><span>" + fmtDate(u.registeredDate) + "</span></div>"; }).join("") +
        recentApps.map(function (a) {
          var owner = usersById[a.userId];
          return '<div class="mini-row"><span><strong>' + esc(owner ? owner.name : "Student") + "</strong> applied to " + esc(a.company) + " (" + esc(a.status) + ")</span><span>" + fmtDate(a.appliedDate) + "</span></div>";
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
        var matchQ = !q || u.name.toLowerCase().indexOf(q) !== -1 || u.email.toLowerCase().indexOf(q) !== -1 || (u.college || "").toLowerCase().indexOf(q) !== -1;
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
        await updateUser(t, { status: u.status === "Active" ? "Disabled" : "Active" });
        showNotification("User " + (u.status === "Active" ? "disabled" : "enabled"), "success");
        render();
      } else if (d) {
        if (!confirm("Delete this user and all their applications?")) return;
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
    async function render() {
      var users = await getUsers();
      var usersById = {};
      users.forEach(function (u) { usersById[u.id] = u; });
      var apps = await getApplications();
      var q = (search.value || "").toLowerCase().trim();
      var st = statusFilter.value || "All";
      var filtered = apps.filter(function (a) {
        var owner = usersById[a.userId];
        var hay = (a.company + " " + a.role + " " + (owner ? owner.name : "")).toLowerCase();
        return (!q || hay.indexOf(q) !== -1) && (st === "All" || a.status === st);
      }).sort(function (a, b) { return String(b.appliedDate).localeCompare(String(a.appliedDate)); });
      tbody.innerHTML = filtered.length ? filtered.map(function (a) {
        var owner = usersById[a.userId];
        return "<tr><td>#" + esc(a.id) + "</td><td>" + esc(owner ? owner.name : ("User " + a.userId)) + "</td>" +
          "<td><strong>" + esc(a.company) + "</strong></td><td>" + esc(a.role) + "</td><td>" + fmtDate(a.appliedDate) + "</td>" +
          "<td>" + statusBadge(a.status) + "</td>" +
          '<td><div class="actions"><button class="link-btn" data-view="' + a.id + '">View</button>' +
          '<select data-status-for="' + a.id + '" aria-label="Update status">' +
          STATUSES.map(function (x) { return '<option value="' + x + '"' + (x === a.status ? " selected" : "") + ">" + x + "</option>"; }).join("") +
          "</select><button class='link-btn danger' data-delete='" + a.id + "'>Delete</button></div></td></tr>";
      }).join("") : '<tr><td colspan="7" class="muted">No applications match your search.</td></tr>';
    }
    search.addEventListener("input", render);
    statusFilter.addEventListener("change", render);
    tbody.addEventListener("click", async function (e) {
      var v = e.target.getAttribute && e.target.getAttribute("data-view");
      var d = e.target.getAttribute && e.target.getAttribute("data-delete");
      if (v) openAppModal(Number(v));
      else if (d) {
        if (!confirm("Delete this application?")) return;
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

  document.addEventListener("DOMContentLoaded", function () {
    seedIfNeeded();
    initNavigation();
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
    getApplications: getApplications, addApplication: addApplication,
    updateApplication: updateApplication, deleteApplication: deleteApplication,
    loginUser: loginUser, registerUser: registerUser, showNotification: showNotification
  };
})();
