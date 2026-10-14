/* Public pages stay interactive. Account/data operations still require Java. */
(function () {
  "use strict";
  var api = window.InternLog;
  var session = null, preferences = {}, csrf = null, available = false;
  var connecting = null;
  var apiBase = window.INTERNLOG_API_BASE || ((window.location.protocol === "file:" || window.location.port === "5500")
    ? "http://" + (window.location.hostname || "localhost") + ":8080" : window.location.origin);
  function base() { return apiBase.replace(/\/+$/, ""); }

  function backendGate(message) {
    if (!document.body) return;
    var gate = document.getElementById("backendGate");
    if (!gate) {
      gate = document.createElement("dialog");
      gate.id = "backendGate";
      gate.className = "backend-connection-dialog";
      gate.setAttribute("aria-labelledby", "backendGateTitle");
      gate.innerHTML = '<div class="modal-header"><h2 id="backendGateTitle">Java connection required</h2><button class="modal-close-icon" id="backendClose" type="button" aria-label="Close connection message">&times;</button></div><p id="backendGateMessage" role="status" aria-live="polite"></p><p class="muted">You can keep browsing. To create an account or sign in, start the Java backend and its database, then retry.</p><div class="modal-footer"><button class="btn btn-secondary" id="backendBrowse" type="button">Keep browsing</button><button class="btn" id="backendRetry" type="button">Retry connection</button></div>';
      document.body.appendChild(gate);
      document.getElementById("backendClose").onclick = function () { gate.close(); };
      document.getElementById("backendBrowse").onclick = function () { gate.close(); };
      document.getElementById("backendRetry").onclick = async function () {
        var button = this;
        button.disabled = true;
        document.getElementById("backendGateMessage").textContent = "Checking the Java connection…";
        try {
          if (await connect()) {
            gate.close();
            api.showNotification("Java connected. You can submit your account form again.", "success");
          } else document.getElementById("backendGateMessage").textContent = "Java is still unavailable. Start the backend and database, then retry.";
        } finally { button.disabled = false; }
      };
    }
    document.getElementById("backendGateMessage").textContent = message;
    if (!gate.open) gate.showModal();
  }

  function unavailableError() {
    var error = new Error("Java backend unavailable. Please start it and try again.");
    error.backendUnavailable = true;
    return error;
  }

  function forgetSession() { session = null; preferences = {}; }

  async function req(path, options) {
    options = options || {};
    var controller = new AbortController();
    var timer = setTimeout(function () { controller.abort(); }, options.timeout || 10000);
    var headers = {};
    if (options.body !== undefined) headers["Content-Type"] = "application/json";
    var method = options.method || "GET";
    if (!["GET", "HEAD", "OPTIONS"].includes(method) && csrf) headers[csrf.headerName] = csrf.token;
    try {
      var response = await fetch(base() + path, {
        method: method, headers: headers, signal: controller.signal, credentials: "include", cache: "no-store",
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined
      });
      var text = await response.text(), data = null;
      try { data = text ? JSON.parse(text) : null; } catch (e) {}
      if (!response.ok) {
        if (response.status === 401) forgetSession();
        if (response.status >= 500) {
          available = false;
        }
        var error = new Error((data && data.message) || "Request failed (" + response.status + ").");
        error.status = response.status;
        error.backendUnavailable = response.status >= 500;
        throw error;
      }
      return data;
    } catch (error) {
      if (error.name === "AbortError" || error instanceof TypeError) {
        available = false;
        throw unavailableError();
      }
      throw error;
    } finally { clearTimeout(timer); }
  }

  function route(name, remote, accountAction) {
    api[name] = async function () {
      try {
        await api.ready;
        if (!available && accountAction) await connect();
        if (!available) throw unavailableError();
        return await remote.apply(null, arguments);
      } catch (error) {
        if (accountAction && error.backendUnavailable) backendGate(error.message);
        throw error;
      }
    };
  }
  function id(value) { return encodeURIComponent(value); }
  function put(path, body) { return req(path, { method: "PUT", body: body }); }
  function post(path, body) { return req(path, { method: "POST", body: body }); }
  function status(path, value) { return req(path + "/status", { method: "PATCH", body: { status: value } }); }
  function remove(path) { return req(path, { method: "DELETE" }); }

  function internshipBody(job) {
    var body = Object.assign({}, job);
    delete body.id; delete body.company; delete body.status;
    if (job.companyId != null) body.companyId = Number(job.companyId);
    if (typeof job.skills === "string") body.skills = job.skills.split(",").map(function (s) { return s.trim(); }).filter(Boolean);
    if (job.status !== undefined) body.publishRequested = job.status === "Pending Review" || job.status === "Published";
    return body;
  }
  function applicationBody(app) {
    var body = Object.assign({}, app);
    if (app.userId != null) body.userId = Number(app.userId);
    if (app.internshipId != null) body.internshipId = Number(app.internshipId);
    if (app.stipend !== undefined) body.stipend = Number(app.stipend) || 0;
    return body;
  }
  async function login(path, credentials) {
    csrf = await req("/api/auth/csrf");
    var result = await post(path, credentials);
    session = { role: result.role, userId: result.userId, name: result.name, email: result.email };
    preferences = await req("/api/preferences");
    csrf = await req("/api/auth/csrf");
    return Object.assign({}, session);
  }

  route("registerUser", function (user) { return post("/api/auth/register", user); }, true);
  route("loginUser", function (credentials) { return login("/api/auth/login", credentials); }, true);
  route("loginAdmin", async function (credentials) {
    var result = await login("/api/auth/login", credentials);
    if (result.role !== "admin") { await api.clearSession(); throw new Error("An administrator account is required."); }
    return result;
  }, true);
  route("registerCompany", function (company) { return post("/api/companies/register", company); }, true);
  route("loginCompany", function (credentials) { return login("/api/companies/login", credentials); }, true);
  route("getUsers", function () { return req("/api/users"); });
  route("getUserById", function (value) { return req("/api/users/" + id(value)); });
  route("updateUser", function (value, patch) { return put("/api/users/" + id(value), patch); });
  route("deleteUser", function (value) { return remove("/api/users/" + id(value)); });
  route("changeUserPassword", function (value, current, next) {
    return post("/api/users/" + id(value) + "/password", { currentPassword: current, newPassword: next });
  });
  route("getCompanies", function () { return req("/api/companies"); });
  route("getCompanyById", function (value) { return req("/api/companies/" + id(value)); });
  route("updateCompany", function (value, patch) { return put("/api/companies/" + id(value), patch); });
  route("deleteCompany", function (value) { return remove("/api/companies/" + id(value)); });
  route("setCompanyStatus", function (value, state) { return status("/api/companies/" + id(value), state); });
  route("changeCompanyPassword", function (value, current, next) {
    return post("/api/companies/" + id(value) + "/password", { currentPassword: current, newPassword: next });
  });
  route("getInternships", function () { return req("/api/internships"); });
  route("getInternshipsByCompany", function (value) { return req("/api/internships?companyId=" + id(value)); });
  route("getInternshipById", function (value) { return req("/api/internships/" + id(value)); });
  route("getPublicInternships", function () { return req("/api/internships/board"); });
  route("addInternship", function (job) { return post("/api/internships", internshipBody(job)); });
  route("updateInternship", function (value, patch) {
    var fields = Object.keys(patch).filter(function (key) { return ["status", "moderatedAt", "moderationNote", "expiredAt", "updatedAt"].indexOf(key) === -1; });
    if (!fields.length && patch.status) return status("/api/internships/" + id(value), patch.status);
    return put("/api/internships/" + id(value), internshipBody(patch));
  });
  route("setInternshipStatus", function (value, state) { return status("/api/internships/" + id(value), state); });
  route("deleteInternship", function (value) { return remove("/api/internships/" + id(value)); });
  route("getApplications", function () { return req("/api/applications"); });
  route("getApplicationsByUser", function (value) { return req("/api/applications?userId=" + id(value)); });
  route("getApplicationById", function (value) { return req("/api/applications/" + id(value)); });
  route("addApplication", function (app) { return post("/api/applications", applicationBody(app)); });
  route("applyToInternship", function (userId, jobId) { return post("/api/internships/" + id(jobId) + "/apply?userId=" + id(userId)); });
  route("updateApplication", function (value, patch) {
    if (Object.keys(patch).length === 1 && patch.status) return status("/api/applications/" + id(value), patch.status);
    return put("/api/applications/" + id(value), applicationBody(patch));
  });
  route("setApplicationStatus", function (value, state) { return status("/api/applications/" + id(value), state); });
  route("deleteApplication", function (value) { return remove("/api/applications/" + id(value)); });
  route("getSavedSearches", function (value) { return req("/api/alerts?userId=" + id(value)); });
  route("saveSearch", function (value, search) { return post("/api/alerts?userId=" + id(value), search); });
  route("deleteSavedSearch", function (value) { return remove("/api/alerts/" + id(value)); });
  api.getSession = function () { return session ? Object.assign({}, session) : null; };
  api.isBackendAvailable = function () { return available; };
  api.refreshConnection = function () { return connect(); };
  api.setSession = function (value) {
    // Display-only cache; the server session is the authorization authority.
    if (session && value.role === session.role && String(value.userId) === String(session.userId)) {
      session = Object.assign({}, session, { name: value.name, email: value.email });
    }
  };
  route("clearSession", async function () {
    await post("/api/auth/logout");
    forgetSession();
    csrf = await req("/api/auth/csrf");
  });
  api.getPreference = function (name, fallback) {
    return preferences[name] === undefined ? fallback : JSON.parse(JSON.stringify(preferences[name]));
  };
  route("setPreference", async function (name, value) {
    var saved = await put("/api/preferences/" + id(name), value);
    preferences[name] = saved;
    return saved;
  });
  route("saveInternship", async function (jobId) {
    var ids = api.getPreference("savedInternships", []).map(String);
    if (!ids.includes(String(jobId))) {
      ids.push(String(jobId));
      await api.setPreference("savedInternships", ids);
    }
  });

  async function initialize() {
    available = false;
    try {
      var health = await req("/api/health", { timeout: 2500 });
      if (!health || health.status !== "ready" || health.service !== "InternLog") throw new Error("The configured server is not a ready InternLog backend.");
      csrf = await req("/api/auth/csrf");
      try {
        var signedIn = await req("/api/auth/session");
        session = { role: signedIn.role, userId: signedIn.userId, name: signedIn.name, email: signedIn.email };
        preferences = await req("/api/preferences");
        if (session.role === "admin" && preferences.adminName) session.name = preferences.adminName;
      } catch (error) {
        if (error.status !== 401) throw error;
        csrf = await req("/api/auth/csrf");
      }
      csrf = await req("/api/auth/csrf");
      available = true;
      return true;
    } catch (error) {
      forgetSession();
      return false;
    }
  }
  function connect() {
    if (connecting) return connecting;
    var attempt = initialize();
    connecting = attempt;
    api.ready = attempt;
    attempt.then(function () { if (connecting === attempt) connecting = null; });
    return attempt;
  }
  window.InternLogConfig = {
    base: base,
    setBase: function (url) {
      var parsed = new URL(url);
      if (!/^https?:$/.test(parsed.protocol)) throw new Error("Use an HTTP or HTTPS API URL.");
      forgetSession();
      apiBase = String(url).replace(/\/+$/, "");
      connecting = null;
      api.ready = connect();
    },
    isEnabled: function () { return true; },
    ping: async function () { try { var health = await req("/api/health"); return health.status === "ready"; } catch (e) { return false; } }
  };
  api.ready = connect();
  window.addEventListener("unhandledrejection", function (event) {
    window.InternLog.showNotification((event.reason && event.reason.message) || "Unable to complete this action.", "error");
  });
})();
