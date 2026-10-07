/* InternLog — backend adapter (loads AFTER js/script.js).
   When a backend is reachable, window.InternLog methods are replaced with
   fetch() versions using the SAME signatures, so no page logic changes.
   When the backend is down/unconfigured, the localStorage versions stay.

   Config (stored in localStorage):
     internlog_use_api  "1" (default) = backend primary, fallback to local
                        "0" = localStorage only
     internlog_api_base default "http://localhost:8080" (local Spring Boot)
                        hosted e.g. "https://internlog-api.onrender.com"
     internlog_api_token JWT from login (auto-managed)

   Coverage: all window.InternLog CRUD + auth + moderation + alerts.
   Board inline writers (user/internships.html apply/save, applicants
   status) additionally fire-and-forget to the backend — see bottom. */
(function () {
  "use strict";

  var USE_KEY = "internlog_use_api";
  var BASE_KEY = "internlog_api_base";
  var TOKEN_KEY = "internlog_api_token";
  var DEFAULT_BASE = "http://localhost:8080";

  function useApi() {
    try {
      var v = localStorage.getItem(USE_KEY);
      return v === null ? true : v !== "0";
    } catch (e) { return true; }
  }

  function base() {
    try {
      return (localStorage.getItem(BASE_KEY) || DEFAULT_BASE).replace(/\/+$/, "");
    } catch (e) { return DEFAULT_BASE; }
  }

  function token() {
    try { return localStorage.getItem(TOKEN_KEY) || ""; } catch (e) { return ""; }
  }

  function setToken(t) {
    try {
      if (t) localStorage.setItem(TOKEN_KEY, t);
      else localStorage.removeItem(TOKEN_KEY);
    } catch (e) {}
  }

  async function req(path, options) {
    options = options || {};
    var headers = { "Content-Type": "application/json" };
    var tok = token();
    if (tok) headers.Authorization = "Bearer " + tok;
    var res = await fetch(base() + path, {
      method: options.method || "GET",
      headers: headers,
      body: options.body ? JSON.stringify(options.body) : undefined
    });
    var text = await res.text();
    var data = null;
    try { data = text ? JSON.parse(text) : null; } catch (e) { data = null; }
    if (!res.ok) {
      var msg = (data && data.message) || ("Request failed (" + res.status + ")");
      throw new Error(msg);
    }
    return data;
  }

  function toInternshipRequest(job) {
    var skills = job.skills;
    if (typeof skills === "string") {
      skills = skills.split(",").map(function (s) { return s.trim(); }).filter(Boolean);
    }
    return {
      companyId: job.companyId != null ? Number(job.companyId) : null,
      title: job.title,
      location: job.location,
      internshipType: job.internshipType || job.type || "On-site",
      stipend: job.stipend != null ? Number(job.stipend) : 0,
      positions: job.positions != null ? Number(job.positions) : 1,
      deadline: job.deadline || null,
      skills: skills || [],
      description: job.description,
      education: job.education,
      applyUrl: job.applyUrl,
      publishRequested: job.status ? (job.status === "Published" || job.status === "Pending Review" || job.status === "Pending_Review") : true
    };
  }

  function toApplicationRequest(app) {
    return {
      userId: app.userId != null ? Number(app.userId) : null,
      internshipId: app.internshipId != null ? Number(app.internshipId) : null,
      company: app.company,
      role: app.role,
      location: app.location,
      internshipType: app.internshipType || app.type,
      appliedDate: app.appliedDate || null,
      deadline: app.deadline || null,
      interviewDate: app.interviewDate || null,
      stipend: app.stipend != null && app.stipend !== "" ? Number(app.stipend) : 0,
      status: app.status || "Applied",
      url: app.url,
      notes: app.notes
    };
  }

  async function ping() {
    try {
      var ctrl = new AbortController();
      var timer = setTimeout(function () { ctrl.abort(); }, 2500);
      var res = await fetch(base() + "/api/internships/board", { signal: ctrl.signal });
      clearTimeout(timer);
      return res.ok;
    } catch (e) { return false; }
  }

  function install() {
    if (install._done) return;
    if (!window.InternLog || !useApi()) return;
    install._done = true;
    var local = {};
    Object.keys(window.InternLog).forEach(function (k) { local[k] = window.InternLog[k]; });

    function withFallback(asyncFn, fallbackFn) {
      return async function () {
        var args = arguments;
        if (!useApi()) return fallbackFn.apply(null, args);
        try {
          return await asyncFn.apply(null, args);
        } catch (e) {
          // Backend down/misconfigured → fall back to localStorage so the demo never breaks.
          if (window.InternLog && window.InternLog.showNotification && String(e.message).indexOf("Failed to fetch") !== -1) {
            return fallbackFn.apply(null, args);
          }
          throw e;
        }
      };
    }

    window.InternLog.getUsers = withFallback(function () {
      return req("/api/users");
    }, local.getUsers);

    function mapUser(u) {
      if (!u) return null;
      return {
        id: u.id, name: u.name, email: u.email, college: u.college,
        course: u.course, gradYear: u.gradYear,
        registeredDate: u.registeredDate, status: u.status
      };
    }

    window.InternLog.getUserById = withFallback(function (id) {
      return req("/api/users/" + encodeURIComponent(id)).then(mapUser);
    }, local.getUserById);

    window.InternLog.updateUser = withFallback(function (id, patch) {
      return req("/api/users/" + encodeURIComponent(id), { method: "PUT", body: patch }).then(mapUser);
    }, local.updateUser);

    window.InternLog.deleteUser = withFallback(function (id) {
      return req("/api/users/" + encodeURIComponent(id), { method: "DELETE" });
    }, local.deleteUser);

    async function localChangePassword(kind, id, currentPassword, newPassword) {
      var list = kind === "company" ? await local.getCompanies() : await local.getUsers();
      var rec = list.find(function (r) { return String(r.id) === String(id); });
      if (!rec) throw new Error(kind === "company" ? "Company not found." : "User not found.");
      if (rec.password !== currentPassword) throw new Error("Current password is incorrect.");
      if (kind === "company") return local.updateCompany(id, { password: newPassword });
      return local.updateUser(id, { password: newPassword });
    }

    window.InternLog.changeUserPassword = async function (id, currentPassword, newPassword) {
      if (!useApi()) return localChangePassword("user", id, currentPassword, newPassword);
      try {
        return await req("/api/users/" + encodeURIComponent(id) + "/password",
          { method: "POST", body: { currentPassword: currentPassword, newPassword: newPassword } });
      } catch (e) {
        if (String(e.message).indexOf("Failed to fetch") !== -1) {
          return localChangePassword("user", id, currentPassword, newPassword);
        }
        throw e;
      }
    };

    window.InternLog.changeCompanyPassword = async function (id, currentPassword, newPassword) {
      if (!useApi()) return localChangePassword("company", id, currentPassword, newPassword);
      try {
        return await req("/api/companies/" + encodeURIComponent(id) + "/password",
          { method: "POST", body: { currentPassword: currentPassword, newPassword: newPassword } });
      } catch (e) {
        if (String(e.message).indexOf("Failed to fetch") !== -1) {
          return localChangePassword("company", id, currentPassword, newPassword);
        }
        throw e;
      }
    };

    window.InternLog.registerUser = withFallback(function (user) {
      return req("/api/auth/register", { method: "POST", body: user });
    }, local.registerUser);

    window.InternLog.loginUser = withFallback(async function (credentials) {
      var res = await req("/api/auth/login", { method: "POST", body: credentials });
      if (res && res.token) setToken(res.token);
      return { role: res.role, userId: res.userId, name: res.name, email: res.email };
    }, local.loginUser);

    window.InternLog.getCompanies = withFallback(function () {
      return req("/api/companies");
    }, local.getCompanies);

    window.InternLog.getCompanyById = withFallback(function (id) {
      return req("/api/companies/" + encodeURIComponent(id));
    }, local.getCompanyById);

    window.InternLog.registerCompany = withFallback(function (company) {
      return req("/api/companies/register", { method: "POST", body: company });
    }, local.registerCompany);

    window.InternLog.loginCompany = withFallback(async function (credentials) {
      var res = await req("/api/companies/login", { method: "POST", body: credentials });
      if (res && res.token) setToken(res.token);
      return { role: res.role, userId: res.userId, name: res.name, email: res.email };
    }, local.loginCompany);

    window.InternLog.updateCompany = withFallback(function (id, patch) {
      return req("/api/companies/" + encodeURIComponent(id), { method: "PUT", body: patch });
    }, local.updateCompany);

    window.InternLog.deleteCompany = withFallback(function (id) {
      return req("/api/companies/" + encodeURIComponent(id), { method: "DELETE" });
    }, local.deleteCompany);

    window.InternLog.setCompanyStatus = function (id, status) {
      return req("/api/companies/" + encodeURIComponent(id) + "/status", { method: "PATCH", body: { status: status } });
    };

    window.InternLog.getInternships = withFallback(function () {
      return req("/api/internships");
    }, local.getInternships);

    window.InternLog.getInternshipsByCompany = withFallback(function (companyId) {
      return req("/api/internships?companyId=" + encodeURIComponent(companyId));
    }, local.getInternshipsByCompany);

    window.InternLog.getInternshipById = withFallback(function (id) {
      return req("/api/internships/" + encodeURIComponent(id));
    }, local.getInternshipById);

    window.InternLog.addInternship = withFallback(function (internship) {
      return req("/api/internships", { method: "POST", body: toInternshipRequest(internship) });
    }, local.addInternship);

    window.InternLog.updateInternship = withFallback(async function (id, patch) {
      var body = toInternshipRequest(Object.assign({ companyId: patch.companyId }, patch));
      // Preserve companyId for PUT (backend requires it); fetch current if missing.
      if (!body.companyId) {
        try {
          var current = await req("/api/internships/" + encodeURIComponent(id));
          body.companyId = current.companyId;
        } catch (e) {}
      }
      var updated = await req("/api/internships/" + encodeURIComponent(id), { method: "PUT", body: body });
      if (patch && patch.status && patch.status !== updated.status) {
        updated = await req("/api/internships/" + encodeURIComponent(id) + "/status",
          { method: "PATCH", body: { status: patch.status } });
      }
      return updated;
    }, local.updateInternship);

    window.InternLog.setInternshipStatus = function (id, status) {
      return req("/api/internships/" + encodeURIComponent(id) + "/status", { method: "PATCH", body: { status: status } });
    };

    window.InternLog.deleteInternship = withFallback(function (id) {
      return req("/api/internships/" + encodeURIComponent(id), { method: "DELETE" });
    }, local.deleteInternship);

    window.InternLog.getPublicInternships = withFallback(function () {
      return req("/api/internships/board");
    }, local.getPublicInternships);

    window.InternLog.getApplications = withFallback(function () {
      return req("/api/applications");
    }, local.getApplications);

    window.InternLog.getApplicationsByUser = withFallback(function (userId) {
      return req("/api/applications?userId=" + encodeURIComponent(userId));
    }, local.getApplicationsByUser);

    function mapApplication(a) {
      if (!a) return null;
      return {
        id: a.id, userId: a.userId, internshipId: a.internshipId, companyId: a.companyId,
        company: a.company, role: a.role, location: a.location,
        internshipType: a.internshipType, appliedDate: a.appliedDate, deadline: a.deadline,
        interviewDate: a.interviewDate, stipend: a.stipend, status: a.status,
        url: a.url, notes: a.notes, studentName: a.studentName, studentEmail: a.studentEmail
      };
    }

    window.InternLog.getApplicationById = withFallback(function (id) {
      return req("/api/applications/" + encodeURIComponent(id)).then(mapApplication);
    }, local.getApplicationById);

    window.InternLog.addApplication = withFallback(function (application) {
      return req("/api/applications", { method: "POST", body: toApplicationRequest(application) });
    }, local.addApplication);

    window.InternLog.applyToInternship = function (userId, internshipId) {
      return req("/api/internships/" + encodeURIComponent(internshipId) + "/apply?userId=" + encodeURIComponent(userId),
        { method: "POST" });
    };

    window.InternLog.updateApplication = withFallback(async function (id, patch) {
      var updated = await req("/api/applications/" + encodeURIComponent(id), { method: "PUT", body: toApplicationRequest(patch) });
      if (patch && patch.status && patch.status !== updated.status) {
        updated = await req("/api/applications/" + encodeURIComponent(id) + "/status",
          { method: "PATCH", body: { status: patch.status } });
      }
      return updated;
    }, local.updateApplication);

    window.InternLog.setApplicationStatus = function (id, status) {
      return req("/api/applications/" + encodeURIComponent(id) + "/status", { method: "PATCH", body: { status: status } });
    };

    window.InternLog.deleteApplication = withFallback(function (id) {
      return req("/api/applications/" + encodeURIComponent(id), { method: "DELETE" });
    }, local.deleteApplication);

    window.InternLog.getFollowups = withFallback(function (userId) {
      return req("/api/applications/needs-followup?userId=" + encodeURIComponent(userId));
    }, function () { return []; });

    window.InternLog.getSavedSearches = withFallback(function (userId) {
      return req("/api/alerts?userId=" + encodeURIComponent(userId));
    }, local.getSavedSearches || function () { return []; });

    // Board inline writers: mirror localStorage writes to the backend (fire-and-forget).
    window.InternLog._mirrorApply = function (userId, internshipId) {
      if (!useApi()) return;
      req("/api/internships/" + encodeURIComponent(internshipId) + "/apply?userId=" + encodeURIComponent(userId),
        { method: "POST" }).catch(function () {});
    };
    window.InternLog._mirrorApplicationStatus = function (id, status) {
      if (!useApi()) return;
      req("/api/applications/" + encodeURIComponent(id) + "/status",
        { method: "PATCH", body: { status: status } }).catch(function () {});
    };

    window.InternLogConfig = {
      base: base,
      setBase: function (url) {
        try { localStorage.setItem(BASE_KEY, String(url).replace(/\/+$/, "")); } catch (e) {}
      },
      isEnabled: useApi,
      setEnabled: function (on) {
        try { localStorage.setItem(USE_KEY, on ? "1" : "0"); } catch (e) {}
      },
      clearToken: function () { setToken(""); },
      ping: ping
    };
  }

  // Install immediately (both scripts are deferred, so window.InternLog already
  // exists): page inits on DOMContentLoaded then see the wrapped versions on
  // first paint. Retries below are harmless no-ops thanks to the done-guard.
  try { install(); } catch (e) {}
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", install);
  } else {
    install();
  }
  // Re-attempt after full load (script.js defines window.InternLog on DOMContentLoaded;
  // api.js with defer runs before that in some orders — retry once).
  window.addEventListener("load", function () {
    if (window.InternLog && !window.InternLogConfig) install();
  });
})();
