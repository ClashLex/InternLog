/* Run with: node --test tests/frontend.test.js (no npm dependencies). */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");

function response(data, status = 200) { return { ok: status < 400, status, text: async () => JSON.stringify(data) }; }
function app(handler, signedIn = null, prefs = {}, healthy = true) {
  const requests = [];
  const nodes = new Map();
  function uiNode(tag) {
    return { tagName: tag, open: false, disabled: false, innerHTML: "", setAttribute() {},
      showModal() { this.open = true; }, close() { this.open = false; } };
  }
  const window = { location: { protocol: "http:", hostname: "localhost", port: "8080", origin: "http://localhost:8080" },
    matchMedia: () => ({ matches: false }), addEventListener() {} };
  const document = { documentElement: { setAttribute() {} }, addEventListener() {}, getElementById: id => nodes.get(id) || null,
    createElement: uiNode, body: { appendChild(node) {
      nodes.set(node.id, node);
      for (const match of node.innerHTML.matchAll(/id="([^"]+)"/g)) nodes.set(match[1], uiNode("div"));
    } } };
  const forbiddenStorage = new Proxy({}, { get() { throw new Error("Browser storage must not be accessed"); } });
  const fetch = async (url, options) => {
    requests.push({ url, options });
    const endpoint = new URL(url).pathname;
    if (endpoint === "/api/health") return (typeof healthy === "object" ? healthy.available : healthy) ? response({ status: "ready", service: "InternLog" }) : response({ message: "Database unavailable" }, 503);
    if (endpoint === "/api/auth/csrf") return response({ headerName: "X-CSRF-TOKEN", token: "csrf-token" });
    if (endpoint === "/api/auth/session") return response(signedIn || { message: "Sign in" }, signedIn ? 200 : 401);
    if (endpoint === "/api/preferences" && options.method === "GET") return response(prefs);
    return handler ? handler(url, options) : response({ message: "Not found" }, 404);
  };
  const context = vm.createContext({ window, document, localStorage: forbiddenStorage, sessionStorage: forbiddenStorage,
    URL, URLSearchParams, AbortController, TypeError, setTimeout, clearTimeout, fetch });
  for (const file of ["js/script.js", "js/api.js"]) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, "..", file), "utf8"), context, { filename: file });
  }
  return { api: window.InternLog, config: window.InternLogConfig, requests, context, nodes };
}

test("backend remains mandatory for data operations and cannot be replaced by local storage", async () => {
  const { api, config } = app();
  assert.equal(await api.ready, true);
  assert.equal(config.isEnabled(), true);
  assert.equal(config.setEnabled, undefined);
  assert.equal(api.getSession(), null);
});

test("startup does not open a connection popup; account attempts do", async () => {
  const { api, requests, nodes } = app(null, null, {}, false);
  assert.equal(await api.ready, false);
  assert.equal(nodes.has("backendGate"), false);
  await assert.rejects(api.getPublicInternships(), /Java backend unavailable/);
  assert.equal(nodes.has("backendGate"), false);
  await assert.rejects(api.registerUser({ name: "Student", email: "student@example.com", password: "Password123" }), /Java backend unavailable/);
  assert.ok(!requests.some(request => request.url.endsWith("/api/auth/register")));
  assert.equal(nodes.get("backendGate").open, true);
  nodes.get("backendBrowse").onclick();
  assert.equal(nodes.get("backendGate").open, false);
});

test("all student, company and admin account actions check the connection", async () => {
  for (const method of ["registerUser", "loginUser", "loginAdmin", "registerCompany", "loginCompany"]) {
    const { api, nodes } = app(null, null, {}, false);
    await api.ready;
    await assert.rejects(api[method]({ name: "Example", email: "example@example.com", password: "Password123" }), /Java backend unavailable/);
    assert.equal(nodes.get("backendGate").open, true, method);
  }
});

test("a backend started after page load can be used without reloading", async () => {
  const health = { available: false };
  const { api, nodes } = app(() => response({ role: "user", userId: 1, name: "Student", email: "student@example.com" }), null, {}, health);
  await api.ready;
  health.available = true;
  await api.loginUser({ email: "student@example.com", password: "Password123" });
  assert.equal(api.getSession().userId, 1);
  assert.equal(nodes.has("backendGate"), false);
});

test("incorrect credentials do not display a Java connection popup", async () => {
  const { api, nodes } = app(() => response({ message: "Invalid email or password" }, 400));
  await api.ready;
  await assert.rejects(api.loginUser({ email: "student@example.com", password: "wrong" }), /Invalid email or password/);
  assert.equal(nodes.has("backendGate"), false);
});

test("connection-dialog retry is dismissible and never resubmits credentials", async () => {
  const health = { available: false };
  const { api, nodes, requests } = app(null, null, {}, health);
  const notifications = [];
  api.showNotification = message => notifications.push(message);
  await api.ready;
  await assert.rejects(api.loginUser({ email: "student@example.com", password: "Password123" }));
  health.available = true;
  await nodes.get("backendRetry").onclick();
  assert.equal(nodes.get("backendGate").open, false);
  assert.equal(api.isBackendAvailable(), true);
  assert.equal(requests.filter(request => request.url.endsWith("/api/auth/login")).length, 0);
  assert.equal(notifications.length, 1);
});

test("public navigation and account forms initialize before the readiness check finishes", async () => {
  const source = fs.readFileSync(path.join(__dirname, "..", "js", "script.js"), "utf8");
  const start = source.lastIndexOf('  document.addEventListener("DOMContentLoaded", async function () {');
  const end = source.indexOf("  window.InternLog =", start);
  let initialize, resolveReady;
  const calls = [];
  const ready = new Promise(resolve => { resolveReady = resolve; });
  const scope = { window: { location: { pathname: "/index.html" }, InternLog: { ready }, InternLogAccessibility: { init: () => calls.push("UI") } },
    document: { addEventListener: (event, listener) => { initialize = listener; }, querySelector: () => null } };
  for (const name of ["injectFavicon", "initCompanyRegisterGuard", "initCompanyLoginGuard", "initNavigation", "initPillNav", "initMagicBento", "initThemeToggle", "initGalaxy", "initCurvedLoop", "initUserLogin", "initAdminLogin", "initRegister", "initUserDashboard"]) {
    scope[name] = () => calls.push(name);
  }
  vm.runInContext(source.slice(start, end), vm.createContext(scope));
  const task = initialize();
  assert.ok(calls.includes("initNavigation"));
  assert.ok(calls.includes("initUserLogin"));
  assert.ok(calls.includes("initRegister"));
  assert.ok(calls.includes("UI"));
  assert.ok(!calls.includes("initUserDashboard"));
  resolveReady(false);
  await task;
});

test("login uses server cookies and CSRF without retaining JWTs or credentials", async () => {
  const { api, requests } = app((url, options) => response({ role: "user", userId: 1, token: "api-only-token", name: "Student", email: "student@example.com" }));
  await api.ready;
  const result = await api.loginUser({ email: "student@example.com", password: "Password123" });
  assert.equal(result.token, undefined);
  assert.equal(api.getSession().role, "user");
  const login = requests.find(request => request.url.endsWith("/api/auth/login"));
  assert.equal(login.options.credentials, "include");
  assert.equal(login.options.headers["X-CSRF-TOKEN"], "csrf-token");
  assert.equal(login.options.headers.Authorization, undefined);
});

test("page reload restores identity and preferences from Java", async () => {
  const { api } = app(null, { role: "user", userId: 9, name: "Student", email: "student@example.com" }, { theme: "dark", savedInternships: [5] });
  assert.equal(await api.ready, true);
  assert.equal(api.getSession().userId, 9);
  assert.equal(api.getPreference("theme", "light"), "dark");
  assert.deepEqual(Array.from(api.getPreference("savedInternships", [])), [5]);
});

test("sparse moderation requests preserve unspecified fields", async () => {
  const { api, requests } = app(() => response({ id: 5, status: "Published" }));
  await api.ready;
  await api.updateInternship(5, { status: "Published", moderatedAt: "2026-10-13" });
  await api.updateApplication(6, { status: "Shortlisted" });
  await api.updateApplication(6, { notes: "Updated note" });
  const writes = requests.filter(request => ["PATCH", "PUT"].includes(request.options.method));
  assert.equal(writes[0].options.method, "PATCH");
  assert.deepEqual(JSON.parse(writes[0].options.body), { status: "Published" });
  assert.equal(writes[1].options.method, "PATCH");
  assert.deepEqual(JSON.parse(writes[2].options.body), { notes: "Updated note" });
});

test("preference cache updates only after MySQL write confirmation", async () => {
  let fail = true;
  const { api } = app((url, options) => fail ? response({ message: "Denied" }, 403) : response(JSON.parse(options.body)),
    { role: "user", userId: 1, name: "Student", email: "student@example.com" }, { savedInternships: [] });
  await api.ready;
  await assert.rejects(api.saveInternship(7), /Denied/);
  assert.equal(api.getPreference("savedInternships", []).length, 0);
  fail = false;
  await api.saveInternship(7);
  assert.deepEqual(Array.from(api.getPreference("savedInternships", [])), ["7"]);
});

test("network failure rejects writes and never switches to offline data", async () => {
  const { api } = app(() => { throw new TypeError("offline"); });
  await api.ready;
  await assert.rejects(api.registerUser({ name: "Student", email: "student@example.com", password: "Password123" }), /Java backend unavailable/);
  await assert.rejects(api.getUsers(), /Java backend unavailable/);
});

test("logout invalidates the Java session before discarding its display cache", async () => {
  const { api, requests } = app(() => response({ message: "Signed out" }),
    { role: "user", userId: 1, name: "Student", email: "student@example.com" });
  await api.ready;
  await api.clearSession();
  assert.equal(api.getSession(), null);
  assert.ok(requests.some(request => request.url.endsWith("/api/auth/logout") && request.options.method === "POST"));
});

test("frontend source contains no browser storage or demo authentication", () => {
  const root = path.join(__dirname, "..");
  for (const folder of ["js", "user", "company", "admin"]) {
    for (const file of fs.readdirSync(path.join(root, folder))) {
      if (!/\.(js|html)$/.test(file)) continue;
      const source = fs.readFileSync(path.join(root, folder, file), "utf8");
      assert.doesNotMatch(source, /localStorage|sessionStorage|indexedDB|admin123/, `${folder}/${file}`);
    }
  }
});

test("homepage internships links stay on the homepage", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  assert.match(html, /id="internships"/);
  assert.match(html, /src="js\/landing.js"/);
  assert.ok((html.match(/href="#internships"/g) || []).length >= 3);
  assert.doesNotMatch(html, /href="user\/internships.html"/);
});

function landing(options = {}) {
  class Node {
    constructor(tag = "div") { this.tagName = tag; this.children = []; this.events = {}; this.attributes = {}; this.value = ""; this.disabled = false; this.hidden = false; this.open = false; this._text = ""; }
    set textContent(value) { this._text = String(value); this.children = []; }
    get textContent() { return this._text + this.children.map(child => child.textContent).join(" "); }
    appendChild(child) { this.children.push(child); return child; }
    setAttribute(name, value) { this.attributes[name] = String(value); }
    removeAttribute(name) { delete this.attributes[name]; }
    addEventListener(name, listener) { (this.events[name] ||= []).push(listener); }
    querySelectorAll() { return []; }
    showModal() { this.open = true; }
    close() { this.open = false; }
    async emit(name) { if (!this.disabled) await Promise.all((this.events[name] || []).map(listener => listener({ preventDefault() {} }))); }
  }
  const nodes = new Map(), messages = [], writes = [];
  const get = id => { if (!nodes.has(id)) nodes.set(id, new Node()); return nodes.get(id); };
  get("landingType").value = "all";
  let initialize;
  const prefs = { savedInternships: [] };
  const api = {
    ready: Promise.resolve(options.ready !== false),
    getSession: () => options.session || null,
    getPublicInternships: async () => { if (options.failRead) throw new Error("Read failed"); return options.jobs || []; },
    getApplicationsByUser: async () => options.applications || [],
    getPreference: (name, fallback) => prefs[name] || fallback,
    saveInternship: async id => { writes.push(["save", id]); if (options.failSave) throw new Error("Save failed"); prefs.savedInternships.push(String(id)); },
    applyToInternship: async (userId, jobId) => { writes.push(["apply", userId, jobId]); if (options.failApply) throw new Error("Apply failed"); },
    showNotification: (message, kind) => messages.push([message, kind])
  };
  const context = vm.createContext({ window: { InternLog: api }, document: {
    getElementById: get, createElement: tag => new Node(tag), querySelectorAll: () => [],
    addEventListener: (event, listener) => { if (event === "DOMContentLoaded") initialize = listener; }
  }, URL, Set });
  vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "js", "landing.js"), "utf8"), context);
  return { initialize, get, messages, writes, prefs };
}

const publicJobs = [
  { id: 1, status: "Published", title: "Frontend intern", company: "Test Company", location: "Remote", internshipType: "Remote", skills: ["React"], description: "Build interfaces", createdAt: "2026-10-13" },
  { id: 2, status: "Published", title: "Design intern", company: "Other Company", location: "Kochi", internshipType: "Hybrid", skills: ["Figma"], description: "Design experiences", createdAt: "2026-10-12" },
  { id: 3, status: "Draft", title: "Private draft", company: "Hidden Company" }
];

test("homepage renders published jobs and filters by skills and arrangement", async () => {
  const page = landing({ jobs: publicJobs });
  await page.initialize();
  assert.equal(page.get("landingJobs").children.length, 2);
  assert.doesNotMatch(page.get("landingJobs").textContent, /Private draft/);
  page.get("landingSearch").value = "react";
  await page.get("landingSearch").emit("input");
  assert.equal(page.get("landingJobs").children.length, 1);
  assert.match(page.get("landingResults").textContent, /1 opportunity matching/);
  page.get("landingType").value = "Hybrid";
  await page.get("landingType").emit("change");
  assert.match(page.get("landingJobs").textContent, /different search/);
  await page.get("landingReset").emit("click");
  assert.equal(page.get("landingJobs").children.length, 2);
  assert.equal(page.get("landingJobs").attributes["aria-busy"], "false");
});

test("homepage details are safe text and guest actions require student login", async () => {
  const page = landing({ jobs: [{ ...publicJobs[0], title: "<img onerror=alert(1)>", applyUrl: "javascript:alert(1)" }] });
  await page.initialize();
  const card = page.get("landingJobs").children[0];
  await card.children.at(-1).children.at(-1).emit("click");
  assert.equal(page.get("landingJobDialog").open, true);
  assert.equal(page.get("landingJobTitle").textContent, "<img onerror=alert(1)>");
  assert.equal(page.get("landingJobTitle").children.length, 0);
  assert.equal(page.get("landingExternalLink").hidden, true);
  assert.equal(page.get("landingJobActions").children.at(-1).href, "user/login.html");
  assert.equal(page.writes.length, 0);
  await page.get("landingJobClose").emit("click");
  assert.equal(page.get("landingJobDialog").open, false);
});

test("homepage saves and applies only after confirmed server writes", async () => {
  const options = { jobs: [publicJobs[0]], session: { role: "user", userId: 4 }, failSave: true, failApply: true };
  const page = landing(options);
  await page.initialize();
  await page.get("landingJobs").children[0].children.at(-1).children.at(-1).emit("click");
  await page.get("landingJobActions").children[0].emit("click");
  assert.equal(page.get("landingJobActions").children[0].textContent, "Save internship");
  assert.equal(page.prefs.savedInternships.length, 0);
  options.failSave = false;
  await page.get("landingJobActions").children[0].emit("click");
  assert.equal(page.get("landingJobActions").children[0].textContent, "Saved");
  await page.get("landingJobActions").children[1].emit("click");
  assert.equal(page.get("landingJobActions").children[1].textContent, "Apply to internship");
  options.failApply = false;
  await page.get("landingJobActions").children[1].emit("click");
  assert.equal(page.get("landingJobActions").children[1].textContent, "Applied");
  assert.equal(page.get("landingJobActions").children[1].disabled, true);
  assert.match(page.get("landingJobMessage").textContent, /Application recorded/);
});

test("homepage displays empty/error states without invented offline listings", async () => {
  const empty = landing();
  await empty.initialize();
  assert.match(empty.get("landingJobs").textContent, /opportunity is on its way/);
  const failed = landing({ failRead: true });
  await failed.initialize();
  assert.match(failed.get("landingJobs").textContent, /No offline listings/);
  assert.equal(failed.messages.length, 0);
  const unavailable = landing({ ready: false, jobs: publicJobs });
  await unavailable.initialize();
  assert.match(unavailable.get("landingJobs").textContent, /Keep exploring/);
  assert.equal(unavailable.messages.length, 0);
});

test("pages share base styling and accessibility without loading archived redesign assets", () => {
  const root = path.join(__dirname, "..");
  const pages = ["index.html", "404.html"];
  for (const folder of ["user", "company", "admin"]) {
    pages.push(...fs.readdirSync(path.join(root, folder)).filter(file => file.endsWith(".html")).map(file => `${folder}/${file}`));
  }
  for (const page of pages) {
    const source = fs.readFileSync(path.join(root, page), "utf8");
    assert.doesNotMatch(source, /href="(?:\.\.\/)?css\/(?:classic|design-system|landing).css"/, page);
    assert.doesNotMatch(source, /src="(?:\.\.\/)?js\/ui-components.js/, page);
    if (page !== "404.html") {
      assert.match(source, /href="(?:\.\.\/)?css\/style.css"/, page);
      assert.match(source, /src="(?:\.\.\/)?js\/accessibility.js" defer/, page);
    }
  }
  const homepage = fs.readFileSync(path.join(root, "index.html"), "utf8");
  assert.match(homepage, /class="editorial-page" data-navigation="pills"/);
  assert.match(homepage, /href="css\/editorial.css"/);
  assert.match(homepage, /src="js\/editorial.js" defer/);
  assert.match(homepage, /data-pixel-swap/);
  assert.match(homepage, /Illustrated preview · sample records/);
  assert.equal((homepage.match(/data-story-panel=/g) || []).length, 3);
  assert.equal((homepage.match(/data-editorial-spotlight/g) || []).length, 3);
  assert.doesNotMatch(homepage, /data-curved-loop|magic-bento-card|landing-journey|gsap|react-router/);
});

function uiHarness(reduced = false, classic = false) {
  const handlers = new Map(), frames = new Map(), observed = [], animationCalls = [];
  let frameId = 0, mutations;
  class Element {
    constructor(classes = "") {
      this.classes = new Set(classes.split(" ").filter(Boolean));
      this.children = []; this.attributes = {}; this.disabled = false;
      this.classList = { add: name => this.classes.add(name), remove: name => this.classes.delete(name), contains: name => this.classes.has(name) };
      this.style = { setProperty: (name, value) => { this.attributes[name] = value; } };
    }
    set className(value) { this.classes = new Set(value.split(" ").filter(Boolean)); }
    get className() { return [...this.classes].join(" "); }
    matches(selector) { return selector.split(",").some(part => this.classes.has(part.trim().slice(1))); }
    querySelectorAll(selector) { return this.children.filter(child => child.matches(selector)); }
    querySelector() { return null; }
    closest(selector) { return this.matches(selector) ? this : null; }
    appendChild(child) { child.parent = this; this.children.push(child); }
    remove() { if (this.parent) this.parent.children = this.parent.children.filter(child => child !== this); }
    contains(item) { return this === item || this.children.includes(item); }
    setAttribute(name, value) { this.attributes[name] = value; }
    getAttribute(name) { return this.attributes[name] || null; }
    getBoundingClientRect() { return { left: 10, top: 20, width: 180, height: 100 }; }
    getContext() { return { clearRect() {}, setTransform() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {} }; }
    animate(keyframes, options) {
      const listeners = {};
      const animation = { addEventListener: (name, callback) => { listeners[name] = callback; }, cancel: () => listeners.cancel?.() };
      animationCalls.push({ keyframes, options, animation, listeners });
      return animation;
    }
  }
  function events(target) {
    target.addEventListener = (name, listener) => { const key = `${target.name}:${name}`; handlers.set(key, [...(handlers.get(key) || []), listener]); };
    target.removeEventListener = (name, listener) => { const key = `${target.name}:${name}`; handlers.set(key, (handlers.get(key) || []).filter(fn => fn !== listener)); };
    return target;
  }
  const body = new Element(), card = new Element("card"), auth = new Element("auth-wrap");
  body.appendChild(card);
  const motion = events({ name: "motion", matches: reduced });
  const Observer = class { constructor(callback) { this.callback = callback; observed.push(this); } observe(target) { this.target = target; } unobserve() {} disconnect() {} };
  const Mutation = class { constructor(callback) { mutations = callback; } observe() {} disconnect() {} };
  const document = events({ name: "document", body, hidden: false, documentElement: {},
    querySelector: selector => selector === 'link[href$="classic.css"]' ? (classic ? {} : null) : selector === ".auth-wrap" ? auth : null,
    querySelectorAll: selector => selector === ".rb-spotlight-active" ? body.children.filter(child => child.classes.has("rb-spotlight-active")) : [],
    getElementById: () => null, createElement: () => new Element() });
  const window = events({ name: "window", InternLog: {}, location: { pathname: "/user/login.html" }, devicePixelRatio: 1,
    matchMedia: query => query.includes("reduced-motion") ? motion : events({ name: query, matches: true }),
    IntersectionObserver: Observer, MutationObserver: Mutation });
  const context = vm.createContext({ window, document, Element, IntersectionObserver: Observer, MutationObserver: Mutation,
    performance: { now: () => 0 }, requestAnimationFrame: callback => { frames.set(++frameId, callback); return frameId; },
    cancelAnimationFrame: id => frames.delete(id), getComputedStyle: () => ({ getPropertyValue: () => "#42613c" }) });
  vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "ui-archive", "ui-components.js"), "utf8"), context);
  const emit = (name, event) => (handlers.get(`document:${name}`) || []).forEach(listener => listener(event));
  return { ui: window.InternLogUI, body, card, motion, handlers, frames, observed, animationCalls, emit, Element,
    addCard: () => { const item = new Element("stat"); body.appendChild(item); mutations([{ addedNodes: [item] }]); return item; }, document };
}

test("UI enhancements are idempotent and include API-rendered cards", () => {
  const page = uiHarness(true);
  page.ui.init(); page.ui.init();
  assert.ok(page.card.classes.has("rb-spotlight"));
  assert.ok(page.body.classes.has("auth-page"));
  assert.equal(page.handlers.get("document:click").length, 1);
  assert.ok(page.addCard().classes.has("rb-spotlight"));
  page.ui.destroy();
  assert.equal(page.handlers.get("document:click").length, 0);
});

test("classic appearance does not enable the redesigned shell or motion effects", () => {
  const page = uiHarness(false, true);
  page.ui.init();
  assert.equal(page.card.classes.has("rb-spotlight"), false);
  assert.equal(page.body.classes.has("auth-page"), false);
  assert.equal(page.frames.size, 0);
  assert.equal(page.animationCalls.length, 0);
  page.ui.destroy();
});

test("React Bits effects respect reduced motion and never hide readable content", () => {
  const page = uiHarness(true);
  page.ui.init();
  page.observed[0].callback([{ target: page.card, isIntersecting: true }]);
  page.emit("pointermove", { target: page.card, clientX: 20, clientY: 30 });
  const button = new page.Element(); button.closest = () => button;
  page.emit("click", { target: button, detail: 0 });
  assert.equal(page.animationCalls.length, 0);
  assert.equal(page.frames.size, 0);
  assert.equal(page.card.classes.has("rb-spotlight-active"), false);
  page.ui.destroy();
});

test("entrance and click feedback animate only while active and clean up", () => {
  const page = uiHarness(false);
  page.ui.init();
  assert.equal(page.frames.size, 0);
  page.observed[0].callback([{ target: page.card, isIntersecting: true }]);
  assert.equal(page.animationCalls.length, 1);
  assert.equal(page.animationCalls[0].options.duration, 480);
  const button = new page.Element(); button.closest = selector => selector === "button, a.btn" ? button : null;
  page.emit("click", { target: button, detail: 0 });
  assert.equal(page.frames.size, 1);
  assert.equal(page.body.children.length, 2);
  page.document.hidden = true;
  page.emit("visibilitychange", {});
  assert.equal(page.frames.size, 0);
  assert.equal(page.body.children.length, 1);
  assert.equal(page.card.classes.has("rb-entrance"), false);
  page.ui.destroy();
});

function stepperHarness() {
  const document = { querySelectorAll() {}, activeElement: null };
  class Element {
    constructor() {
      this.children = []; this.attributes = {}; this.events = {}; this.style = {};
      this.classList = { add() {}, remove() {} };
    }
    appendChild(child) { this.children.push(child); }
    insertBefore(child, target) { this.children.splice(this.children.indexOf(target), 0, child); }
    get firstChild() { return this.children[0]; }
    setAttribute(name, value) { this.attributes[name] = value; }
    getAttribute(name) { return this.attributes[name] || null; }
    removeAttribute(name) { delete this.attributes[name]; }
    addEventListener(name, listener) { (this.events[name] ||= []).push(listener); }
    querySelector() { return this.children[0] || null; }
    contains(field) { return this.children.includes(field); }
    focus() { document.activeElement = this; }
  }
  document.createElement = () => new Element();
  const form = new Element(), panes = [new Element(), new Element()];
  panes.forEach(pane => { pane.appendChild(new Element()); form.appendChild(pane); });
  form.querySelectorAll = () => panes;
  const source = fs.readFileSync(path.join(__dirname, "..", "js/script.js"), "utf8");
  const context = vm.createContext({ document, window: { matchMedia: () => ({ matches: true }) }, STEP_CHECK_SVG: "check" });
  vm.runInContext(source.slice(source.indexOf("  function initAuthStepper("), source.indexOf("  /* ---------------- Page initializers")), context);
  let valid = false;
  const config = { validateStep: () => valid };
  const stepper = context.initAuthStepper(form, config);
  return { form, panes, document, stepper, context, config, validate: () => { valid = true; } };
}

test("auth stepper gates Enter, focuses the next field and reveals hidden invalid fields", () => {
  const page = stepperHarness();
  assert.equal(page.panes[1].hidden, true);
  let prevented = 0, stopped = 0;
  const submit = () => page.form.events.submit[0]({ preventDefault() { prevented++; }, stopImmediatePropagation() { stopped++; } });
  submit();
  assert.equal(page.panes[1].hidden, true);
  page.validate(); submit();
  assert.equal(page.panes[0].hidden, true);
  assert.equal(page.document.activeElement, page.panes[1].children[0]);
  submit();
  assert.equal(prevented, 2);
  assert.equal(stopped, 2);
  page.stepper.reveal(page.panes[0].children[0]);
  assert.equal(page.panes[0].hidden, false);
  assert.equal(page.panes[1].hidden, true);
  assert.equal(page.context.initAuthStepper(page.form, page.config), page.stepper);
  assert.equal(page.form.events.submit.length, 1);
});

test("failed student saves release the busy button and do not redirect", async () => {
  const source = fs.readFileSync(path.join(__dirname, "..", "js/script.js"), "utf8");
  for (const mode of ["Add", "Edit"]) {
    let submit;
    const busy = [], messages = [], redirects = [];
    const form = { addEventListener: (name, listener) => { if (name === "submit") submit = listener; } };
    const context = vm.createContext({ document: { getElementById: id => id === (mode === "Add" ? "addForm" : "editForm") ? form : null },
      window: { location: { search: "?id=4" }, InternLog: {
        getApplicationById: async () => ({ id: 4, userId: 1 }),
        addApplication: async () => { throw new Error("Write failed"); },
        updateApplication: async () => { throw new Error("Write failed"); }
      } }, URLSearchParams, requireAuth: () => ({ userId: 1 }), collectApplicationForm: () => ({}),
      validateApplication: () => ({}), paintErrors: () => true, hideErrorSummary() {},
      setBusy: (form, value) => busy.push(value), showNotification: message => messages.push(message),
      setTimeout: callback => redirects.push(callback) });
    const name = `init${mode}Application`;
    const start = source.indexOf(`  async function ${name}(`);
    const end = source.indexOf("  async function ", start + 1);
    vm.runInContext(source.slice(start, end), context);
    await context[name]();
    assert.equal(typeof submit, "function");
    await submit({ preventDefault() {} });
    assert.deepEqual(busy, [true, false]);
    assert.deepEqual(messages, ["Write failed"]);
    assert.equal(redirects.length, 0);
  }
});

test("company internship submit recovers when the initial listing read fails", async () => {
  const source = fs.readFileSync(path.join(__dirname, "..", "js/script.js"), "utf8");
  let submit;
  const busy = [], messages = [];
  const form = { addEventListener: (event, listener) => { submit = listener; } };
  const context = vm.createContext({ document: { getElementById: id => id === "internshipForm" ? form : {} },
    window: { InternLog: { getCompanyById: async () => ({ id: 2 }), getInternshipsByCompany: async () => { throw new Error("Read failed"); } } },
    getSession: () => ({ role: "company", userId: 2 }), companyIsApproved: () => true,
    readInternshipForm: () => ({ title: "Test Internship", location: "Remote", deadline: "2099-01-01", description: "Description" }),
    todayISO: () => "2026-01-01", flagError: () => true, hideErrorSummary() {},
    setBusy: (form, value) => busy.push(value), showNotification: message => messages.push(message) });
  vm.runInContext(source.slice(source.indexOf("  function initCompanyInternshipSubmitGuard("), source.indexOf("  function initCompanyModerationControls(")), context);
  context.initCompanyInternshipSubmitGuard();
  await submit({ preventDefault() {}, stopImmediatePropagation() {} });
  assert.deepEqual(busy, [true, false]);
  assert.deepEqual(messages, ["Read failed"]);
});

function editorialHarness(reduced = false) {
  const timers = new Map(), windowEvents = {}, motionEvents = {}, animations = [];
  let timerId = 0;
  const document = { activeElement: null, addEventListener() {} };
  class Element {
    constructor() {
      this.attributes = {}; this.children = []; this.events = {}; this.style = {}; this.hidden = false;
      this.clientWidth = 600; this.clientHeight = 445;
    }
    setAttribute(name, value) { this.attributes[name] = String(value); }
    getAttribute(name) { return this.attributes[name] ?? null; }
    removeAttribute(name) { delete this.attributes[name]; }
    get id() { return this.attributes.id || ""; }
    set id(value) { this.attributes.id = value; }
    appendChild(child) { child.parentElement = this; this.children.push(child); }
    remove() { this.parentElement.children = this.parentElement.children.filter(child => child !== this); }
    addEventListener(name, callback) { (this.events[name] ||= []).push(callback); }
    emit(name, extra = {}) { (this.events[name] || []).forEach(callback => callback({ preventDefault() {}, ...extra })); }
    querySelectorAll(selector) {
      const descendants = this.children.flatMap(child => [child, ...child.querySelectorAll(selector)]);
      const attr = selector.slice(1, -1);
      return descendants.filter(child => child.getAttribute(attr) !== null);
    }
    cloneNode(deep) {
      const clone = new Element(); clone.attributes = { ...this.attributes }; clone.hidden = this.hidden;
      if (deep) this.children.forEach(child => clone.appendChild(child.cloneNode(true)));
      return clone;
    }
    focus() { document.activeElement = this; }
    animate(frames, timing) { const animation = { frames, timing, cancelled: false, cancel() { this.cancelled = true; } }; animations.push(animation); return animation; }
  }
  document.createElement = () => new Element();
  const motion = { matches: reduced, addEventListener: (name, callback) => { motionEvents[name] = callback; } };
  const window = { matchMedia: () => motion, addEventListener: (name, callback) => { windowEvents[name] = callback; },
    setTimeout: callback => { timers.set(++timerId, callback); return timerId; }, clearTimeout: id => timers.delete(id) };
  const source = fs.readFileSync(path.join(__dirname, "..", "js/editorial.js"), "utf8");
  const context = vm.createContext({ document, window });
  vm.runInContext(source.slice(source.indexOf("  function initTabs("), source.indexOf("  function initMenu(")), context);
  return { context, Element, document, timers, windowEvents, motionEvents, motion, animations };
}

test("editorial product tabs support arrows, Home/End and one visible panel", () => {
  const page = editorialHarness();
  const buttons = [0, 1, 2].map(i => { const e = new page.Element(); e.id = "tab-" + i; return e; });
  const panels = [0, 1, 2].map(i => { const e = new page.Element(); e.id = "panel-" + i; return e; });
  const track = new page.Element();
  page.context.initTabs({ querySelectorAll: selector => selector === "[data-story-tab]" ? buttons : panels, querySelector: () => track });
  assert.equal(track.getAttribute("role"), "tablist");
  assert.deepEqual(panels.map(panel => panel.hidden), [false, true, true]);
  buttons[0].emit("keydown", { key: "ArrowLeft" });
  assert.deepEqual(panels.map(panel => panel.hidden), [true, true, false]);
  assert.equal(page.document.activeElement, buttons[2]);
  buttons[2].emit("keydown", { key: "Home" });
  assert.equal(buttons[0].tabIndex, 0);
  buttons[0].emit("keydown", { key: "End" });
  assert.equal(buttons[2].getAttribute("aria-selected"), "true");
  assert.equal(panels[2].getAttribute("aria-labelledby"), "tab-2");
});

test("homepage colors inherit the shared workspace palette instead of defining a separate theme", () => {
  const css = fs.readFileSync(path.join(__dirname, "..", "css/editorial.css"), "utf8");
  for (const [alias, token] of Object.entries({ paper: "bg", card: "surface", ink: "text", muted: "muted", rule: "border", accent: "primary", "accent-hover": "primary-dark", tint: "primary-light" })) {
    assert.ok(css.includes(`--ed-${alias}: var(--${token})`));
  }
  assert.doesNotMatch(css, /--(?:bg|surface|text|muted|border|primary|primary-light)\s*:/);
  assert.doesNotMatch(css, /#(?:f6f3ec|fffdf8|a5422b|b9472e|efae8f|fff4e5|f0ded2|dfe5d7)\b/i);
});

test("PixelSwap respects reduced motion and cleans bounded decorative clones on interruption", () => {
  for (const reduced of [true, false]) {
    const page = editorialHarness(reduced), root = new page.Element(), toggle = new page.Element();
    const layers = [0, 1].map(i => {
      const layer = new page.Element(); layer.setAttribute("data-pixel-layer", i); layer.id = "layer-" + i;
      const child = new page.Element(); child.id = "example-" + i; layer.appendChild(child); root.appendChild(layer); return layer;
    });
    page.context.initPixelSwap(root, toggle);
    toggle.emit("click");
    if (reduced) {
      assert.equal(page.animations.length, 0);
      assert.equal(toggle.getAttribute("aria-pressed"), "false");
      assert.equal(layers[0].hidden, false);
    } else {
      const grid = root.children.at(-1);
      assert.equal(grid.getAttribute("aria-hidden"), "true");
      assert.equal(grid.inert, true);
      assert.ok(grid.children.length <= 120);
      assert.equal(grid.querySelectorAll("[id]").length, 0);
      toggle.emit("click"); // Rapid reversal must resolve to the latest state.
      page.windowEvents.resize();
      assert.equal(toggle.getAttribute("aria-pressed"), "true");
      assert.deepEqual(layers.map(layer => layer.hidden), [true, false]);
      assert.ok(page.animations.every(animation => animation.cancelled));
      assert.equal(root.children.length, 2);
      assert.equal(page.timers.size, 0);
    }
  }
});

function ditherHarness({ reduced = false, unavailable = false, compileFails = false } = {}) {
  function target(extra = {}) {
    return Object.assign({ events: {}, hidden: true, attributes: {}, dataset: {},
      setAttribute(name, value) { this.attributes[name] = String(value); },
      addEventListener(name, listener) { (this.events[name] ||= []).push(listener); },
      removeEventListener(name, listener) { this.events[name] = (this.events[name] || []).filter(item => item !== listener); },
      emit(name, event = {}) { (this.events[name] || []).slice().forEach(listener => listener(event)); }
    }, extra);
  }
  let draws = 0, deleted = 0, observer, color = "rgb(17, 19, 18)", lastInk;
  const gl = { getShaderParameter: () => !compileFails, getProgramParameter: () => true, isContextLost: () => false,
    getUniformLocation: (program, name) => name, drawArrays: () => { draws++; }, uniform3fv: (name, value) => { lastInk = [...value]; } };
  for (const name of ["createShader", "createProgram", "createBuffer", "createVertexArray"]) gl[name] = () => ({});
  for (const name of ["deleteShader", "deleteProgram", "deleteBuffer", "deleteVertexArray"]) gl[name] = () => { deleted++; };
  for (const name of ["shaderSource", "compileShader", "attachShader", "bindAttribLocation", "linkProgram", "bindVertexArray", "bindBuffer", "bufferData", "enableVertexAttribArray", "vertexAttribPointer", "useProgram", "viewport", "uniform2f", "uniform1f"]) gl[name] = () => {};
  const frames = new Map(); let frameId = 0;
  const canvas = target({ getContext: () => unavailable ? null : gl }), button = target(), motion = target({ matches: reduced });
  const document = target({ hidden: false, body: {}, documentElement: target(), getElementById: id => ({ homepageDither: canvas, backgroundMotion: button })[id] });
  const window = target({ innerWidth: 2000, innerHeight: 1200, matchMedia: () => motion,
    requestAnimationFrame: listener => { frames.set(++frameId, listener); return frameId; }, cancelAnimationFrame: id => frames.delete(id) });
  const Observer = class { constructor(callback) { this.callback = callback; this.disconnected = false; observer = this; } observe() {} disconnect() { this.disconnected = true; } };
  const context = vm.createContext({ window, document, MutationObserver: Observer, getComputedStyle: () => ({ color }) });
  vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "js/dither.js"), "utf8"), context);
  document.emit("DOMContentLoaded");
  return { canvas, button, motion, window, document, frames, get draws() { return draws; }, get deleted() { return deleted; },
    get observer() { return observer; }, get ink() { return lastInk; },
    advance: now => { const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(callback => callback(now)); },
    setColor: value => { color = value; observer.callback(); } };
}

test("minimal Dither gracefully falls back and leaves reduced-motion backgrounds static", () => {
  for (const options of [{ unavailable: true }, { compileFails: true }]) {
    const page = ditherHarness(options);
    assert.equal(page.canvas.hidden, true);
    assert.equal(page.button.hidden, true);
    assert.equal(page.frames.size, 0);
    if (options.compileFails) assert.ok(page.deleted > 0);
  }
  const page = ditherHarness({ reduced: true });
  assert.equal(page.canvas.hidden, false);
  assert.equal(page.button.hidden, true);
  assert.equal(page.frames.size, 0);
  page.motion.matches = false; page.motion.emit("change");
  assert.equal(page.frames.size, 1);
  page.motion.matches = true; page.motion.emit("change");
  assert.equal(page.frames.size, 0);
});

test("Dither caps rendering, follows theme colors, pauses and releases resources", () => {
  const page = ditherHarness();
  assert.ok(page.canvas.width <= 720 && page.canvas.height <= 480);
  page.advance(0); const first = page.draws;
  page.advance(16); assert.equal(page.draws, first);
  page.advance(50); assert.equal(page.draws, first + 1);
  page.button.emit("click");
  assert.equal(page.frames.size, 0);
  assert.equal(page.button.attributes["aria-pressed"], "false");
  page.setColor("rgb(244, 244, 244)");
  assert.deepEqual(page.ink, [244 / 255, 244 / 255, 244 / 255]);
  page.button.emit("click"); assert.equal(page.frames.size, 1);
  page.document.hidden = true; page.document.emit("visibilitychange"); assert.equal(page.frames.size, 0);
  page.document.hidden = false; page.document.emit("visibilitychange"); assert.equal(page.frames.size, 1);
  let prevented = false;
  page.canvas.emit("webglcontextlost", { preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
  assert.equal(page.frames.size, 0);
  assert.equal(page.canvas.hidden, true);
  assert.equal(page.button.hidden, true);
  assert.equal(page.observer.disconnected, true);
  assert.equal(page.deleted, 5); // Two shaders, one program, buffer and VAO.
});
