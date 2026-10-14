/*
 * Archived redesign — not loaded by the original frontend.
 * Vanilla JavaScript adaptations of React Bits components, integrated as part
 * of the InternLog application (not a redistributed library):
 * SpotlightCard, Magic Bento, ClickSpark, AnimatedContent / FadeContent,
 * Pill Nav, Galaxy, SplitText, BlurText, ShinyText, AnimatedList,
 * Counter (CountUp), Magnet, StarBorder / Border Glow.
 * Source: https://github.com/DavidHDev/react-bits
 *
 * MIT + Commons Clause License Condition v1.0
 * Copyright (c) 2026 David Haz
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, and distribute the Software as part of an
 * application, website, or product, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * Commons Clause Restriction: You may use this Software, including for any
 * commercial purpose, so long as you do not sell, sublicense, or redistribute
 * the components themselves-whether alone, in a bundle, or as a ported version.
 *
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
  var initialized = false, cleanups = [], bursts = [], animations = new Set(), frame = 0;
  var cards = ".card, .stat, .auth-card, .landing-job-card, .landing-journey";
  var enhanced = new WeakSet(), entered = new WeakSet(), splitDone = new WeakSet();
  var motion = null, entranceObserver = null, mutationObserver = null, staggerCount = 0;
  var countFrames = [];

  var pages = {
    "user/dashboard.html": ["Your search, a little clearer.", "Choose your next useful step and keep your internship journey moving."],
    "user/applications.html": ["Every application. One clear view.", "Search, filter and keep your next steps together—from the first application to a final decision."],
    "user/add-application.html": ["Make your next move a plan.", "Bring the role, dates and details together. You can track opportunities from any platform."],
    "user/edit-application.html": ["Keep the details up to date.", "Update your progress, record the next conversation, and keep the context that matters."],
    "user/internships.html": ["Find your next possibility.", "Explore reviewed opportunities and keep the ones that fit your interests close."],
    "user/profile.html": ["A profile that grows with you.", "Keep your academic details current and manage your account with confidence."],
    "company/dashboard.html": ["Fresh opportunities start here.", "Bring students closer to meaningful work and keep your hiring process clear."],
    "company/internships.html": ["Give good opportunities a home.", "Manage your roles, publication reviews and deadlines from one focused workspace."],
    "company/add-internship.html": ["Build an opportunity worth exploring.", "Give students a clear picture of the work, expectations and support they can look forward to."],
    "company/applicants.html": ["Meet your next fresh perspective.", "Review applications and keep students informed as your decisions progress."],
    "company/profile.html": ["Put your company’s best foot forward.", "Keep your company information useful, current and easy for students to understand."],
    "admin/dashboard.html": ["A clear view of the whole platform.", "Keep accounts, opportunities and application activity on the right track."],
    "admin/users.html": ["Support a trusted community.", "Manage student accounts, review companies and keep opportunities accountable."],
    "admin/internships.html": ["Thoughtful opportunities. Careful review.", "Review company submissions before they become part of a student’s next chapter."],
    "admin/applications.html": ["Understand every step of the pipeline.", "Review application activity and keep a clear overview of student progress."],
    "admin/profile.html": ["Your administration workspace.", "Manage the display details for your platform administration account."]
  };
  var icons = {
    "dashboard.html": '<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
    "applications.html": '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V2h6v2M9 10h6M9 14h6M9 18h3"/>',
    "internships.html": '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5 5-2Z"/>',
    "add-application.html": '<rect x="4" y="4" width="16" height="16" rx="4"/><path d="M12 8v8M8 12h8"/>',
    "add-internship.html": '<rect x="4" y="4" width="16" height="16" rx="4"/><path d="M12 8v8M8 12h8"/>',
    "profile.html": '<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
    "applicants.html": '<circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6M18 14a5 5 0 0 1 3 4v2"/>',
    "users.html": '<path d="m12 3 8 3v6c0 4-3 7-8 9-5-2-8-5-8-9V6l8-3Z"/><path d="m8 12 3 3 5-6"/>',
    logout: '<path d="M9 4H5v16h4M14 8l4 4-4 4M8 12h10"/>'
  };

  function node(tag, className, text) {
    var item = document.createElement(tag);
    item.className = className;
    if (text !== undefined) item.textContent = text;
    return item;
  }

  function listen(target, event, callback, options) {
    target.addEventListener(event, callback, options);
    cleanups.push(function () { target.removeEventListener(event, callback, options); });
  }

  function enhanceShell() {
    // Favicons are moss-green at the source in every HTML file; no runtime patch.
    var parts = window.location.pathname.split("/").filter(Boolean);
    var role = parts[parts.length - 2];
    var file = parts[parts.length - 1] || "index.html";
    var names = { user: "Student workspace", company: "Company workspace", admin: "Administrator workspace" };
    var sidebar = document.querySelector(".sidebar");
    var content = document.querySelector("main.content");
    if (document.querySelector(".auth-wrap")) document.body.classList.add("auth-page");
    if (!sidebar || !content) return;
    document.body.classList.add("workspace-page");
    document.body.setAttribute("data-workspace", role || "user");
    var brand = sidebar.querySelector(".brand");
    if (!sidebar.querySelector(".workspace-meta")) {
      var meta = node("div", "workspace-meta");
      meta.appendChild(node("span", "", names[role] || "Your workspace"));
      meta.appendChild(node("p", "", "Track. Apply. Grow."));
      if (brand) brand.insertAdjacentElement("afterend", meta);
    }
    sidebar.querySelectorAll("nav a").forEach(function (link) {
      var name = (link.getAttribute("href") || "").split("?")[0].split("#")[0].split("/").pop();
      var path = icons[link.hasAttribute("data-logout") ? "logout" : name];
      if (path && !link.querySelector(".workspace-nav-icon")) {
        var icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        icon.setAttribute("viewBox", "0 0 24 24");
        icon.setAttribute("fill", "none");
        icon.setAttribute("stroke", "currentColor");
        icon.setAttribute("stroke-width", "1.7");
        icon.setAttribute("stroke-linecap", "round");
        icon.setAttribute("stroke-linejoin", "round");
        icon.setAttribute("aria-hidden", "true");
        icon.setAttribute("class", "workspace-nav-icon");
        // Paths above are developer-owned SVG constants, never API-supplied text.
        icon.innerHTML = path;
        link.prepend(icon);
      }
      if (link.classList.contains("active")) link.setAttribute("aria-current", "page");
    });
    if (!content.querySelector(".workspace-heading")) {
      var header = node("header", "workspace-heading");
      header.appendChild(node("p", "workspace-eyebrow", names[role] || "Your workspace"));
      var first = content.firstElementChild;
      var copy = pages[role + "/" + file] || [document.querySelector(".topbar h1").textContent, "Your next step, a little more organized."];
      var existingTitle = first && first.matches("div:not(.card):not(.toolbar)") && first.querySelector("h2");
      if (existingTitle) {
        if (!existingTitle.id) existingTitle.textContent = copy[0];
        header.appendChild(first);
      } else {
        header.appendChild(node("h2", "", copy[0]));
        if (first && first.matches("p.muted")) header.appendChild(first);
        else header.appendChild(node("p", "", copy[1]));
      }
      content.prepend(header);
    }
    sidebarAccessibility(sidebar);
  }

  function sidebarAccessibility(sidebar) {
    var button = document.getElementById("menuBtn");
    var backdrop = document.getElementById("sidebarBackdrop");
    var main = document.querySelector(".app-layout > .main");
    if (!button) return;
    var compact = window.matchMedia("(max-width: 768px)");
    button.setAttribute("aria-controls", sidebar.id || "sidebar");
    function sync() {
      var open = compact.matches && sidebar.classList.contains("open");
      button.setAttribute("aria-expanded", String(open));
      sidebar.inert = compact.matches && !open;
      if (main) main.inert = open;
      if (!compact.matches) {
        sidebar.classList.remove("open");
        if (backdrop) backdrop.classList.remove("show");
      }
    }
    function close() {
      sidebar.classList.remove("open");
      if (backdrop) backdrop.classList.remove("show");
      sync();
      button.focus();
    }
    var closeButton = sidebar.querySelector(".workspace-drawer-close");
    if (!closeButton) {
      closeButton = node("button", "workspace-drawer-close", "×");
      closeButton.type = "button";
      closeButton.setAttribute("aria-label", "Close navigation");
      sidebar.appendChild(closeButton);
    }
    listen(closeButton, "click", close);
    listen(button, "click", function () {
      sync();
      if (compact.matches && sidebar.classList.contains("open")) {
        var first = sidebar.querySelector("nav a");
        if (first) first.focus();
      }
    });
    if (backdrop) listen(backdrop, "click", function () { sync(); button.focus(); });
    listen(document, "keydown", function (event) {
      if (!compact.matches || !sidebar.classList.contains("open")) return;
      if (document.querySelector(".modal-backdrop.open, dialog[open]")) return;
      if (event.key === "Escape") { event.preventDefault(); close(); }
      if (event.key === "Tab") {
        var links = sidebar.querySelectorAll("a[href], button:not([disabled])");
        var first = links[0], last = links[links.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    }, true);
    if (compact.addEventListener) listen(compact, "change", sync);
    sync();
  }

  function enhanceCards(root) {
    if (!(root instanceof Element)) return;
    var candidates = root.matches(cards) ? [root] : [];
    candidates = candidates.concat(Array.from(root.querySelectorAll(cards)));
    candidates.forEach(function (card) {
      if (enhanced.has(card)) return;
      enhanced.add(card);
      card.classList.add("rb-spotlight");
      // AnimatedList: per-card stagger index for entrance delay (CSS reads --rb-index).
      try { card.style.setProperty("--rb-index", String(staggerCount++ % 8)); } catch (e) {}
      if (entranceObserver && !card.closest(".modal-backdrop, dialog")) entranceObserver.observe(card);
    });
    // Counter (CountUp): animate stat numbers when they scroll into view.
    var values = root.matches(".stat .value") ? [root] : [];
    values = values.concat(Array.from(root.querySelectorAll(".stat .value")));
    values.forEach(function (el) {
      if (entranceObserver && !entered.has(el)) entranceObserver.observe(el);
    });
    splitText(root);
  }

  /* SplitText + BlurText + ShinyText: word-split hero/workspace headings for a
     staggered entrance, blur-resolve for section headings, sheen for eyebrows.
     Pure class hooks — the actual motion is CSS; textContent is preserved. */
  function splitText(root) {
    if (!(root instanceof Element)) return;
    var heads = [];
    if (root.matches(".landing-hero-copy h1, .workspace-heading h2")) heads.push(root);
    Array.from(root.querySelectorAll(".landing-hero-copy h1, .workspace-heading h2")).forEach(function (h) {
      if (heads.indexOf(h) === -1) heads.push(h);
    });
    heads.forEach(function (h) {
      if (splitDone.has(h)) return;
      splitDone.add(h);
      h.classList.add("rb-split");
    });
    var blurs = [];
    if (root.matches(".landing-section-heading h2, .landing-about-grid h2")) blurs.push(root);
    Array.from(root.querySelectorAll(".landing-section-heading h2, .landing-about-grid h2")).forEach(function (h) {
      if (blurs.indexOf(h) === -1) blurs.push(h);
    });
    blurs.forEach(function (h) { h.classList.add("rb-blur"); });
    var brows = [];
    if (root.matches(".landing-eyebrow, .workspace-eyebrow")) brows.push(root);
    Array.from(root.querySelectorAll(".landing-eyebrow, .workspace-eyebrow")).forEach(function (b) {
      if (brows.indexOf(b) === -1) brows.push(b);
    });
    brows.forEach(function (b) { b.classList.add("rb-shiny"); });
  }

  function countUp(el) {
    if (!el || entered.has(el) || !el.textContent) return;
    entered.add(el);
    var raw = el.textContent.replace(/[^0-9]/g, "");
    if (!raw) return;
    var target = parseInt(raw, 10);
    if (!isFinite(target) || target <= 0 || target > 1000000) return;
    if (motion.matches || !window.requestAnimationFrame) return;
    var start = null, dur = 900, id = 0;
    function step(ts) {
      if (start == null) start = ts;
      var p = Math.min(1, (ts - start) / dur);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = String(Math.round(target * eased));
      if (p < 1 && document.body.contains(el)) {
        id = requestAnimationFrame(step);
        if (countFrames.indexOf(id) === -1) countFrames.push(id);
      } else {
        el.textContent = String(target);
      }
    }
    id = requestAnimationFrame(step);
    countFrames.push(id);
  }

  function modalAccessibility() {
    if (!("MutationObserver" in window)) return;
    var overlays = document.querySelectorAll(".modal-backdrop");
    if (!overlays.length) return;
    var lastTrigger = null;
    listen(document, "click", function (event) {
      var control = event.target.closest && event.target.closest("button, a[href]");
      if (control && !control.closest(".modal-backdrop")) lastTrigger = control;
    }, true);
    overlays.forEach(function (overlay) {
      var wasOpen = false, previousFocus = null, previousOverflow = "", previousInert = false;
      var background = document.querySelector(".app-layout, .auth-wrap");
      var modal = overlay.querySelector(".modal");
      if (!modal) return;
      modal.setAttribute("tabindex", "-1");
      function controls() {
        return Array.from(modal.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]'))
          .filter(function (item) { return item.getClientRects().length && !item.closest("[hidden]"); });
      }
      function restore() {
        document.body.style.overflow = previousOverflow;
        if (background && !background.contains(overlay)) background.inert = previousInert;
        if (previousFocus && previousFocus.isConnected) previousFocus.focus();
        wasOpen = false;
      }
      var observer = new MutationObserver(function () {
        var open = overlay.classList.contains("open");
        if (open && !wasOpen) {
          wasOpen = true; previousFocus = document.activeElement;
          if ((!previousFocus || ["BODY", "HTML"].includes(previousFocus.tagName)) && lastTrigger && lastTrigger.isConnected) previousFocus = lastTrigger;
          previousOverflow = document.body.style.overflow;
          document.body.style.overflow = "hidden";
          if (background && !background.contains(overlay)) { previousInert = background.inert; background.inert = true; }
          var items = controls();
          (items[0] || modal).focus();
        } else if (!open && wasOpen) restore();
      });
      observer.observe(overlay, { attributes: true, attributeFilter: ["class"] });
      listen(overlay, "keydown", function (event) {
        if (!overlay.classList.contains("open")) return;
        if (event.key === "Escape") {
          event.preventDefault(); event.stopPropagation();
          overlay.classList.remove("open");
        }
        if (event.key === "Tab") {
          var items = controls(), first = items[0], last = items[items.length - 1];
          if (!items.length) { event.preventDefault(); modal.focus(); }
          else if (event.shiftKey && (document.activeElement === first || document.activeElement === modal)) { event.preventDefault(); last.focus(); }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
        }
      });
      listen(overlay, "click", function (event) { if (event.target === overlay) overlay.classList.remove("open"); });
      cleanups.push(function () { observer.disconnect(); if (wasOpen) restore(); });
    });
  }

  function animateEntrance(element) {
    if (entered.has(element) || motion.matches || !element.animate) return;
    entered.add(element);
    element.classList.add("rb-entrance");
    // AnimatedContent's opacity/offset entrance, using native animation instead of GSAP.
    var animation = element.animate([{ opacity: 0, transform: "translateY(14px)" }, { opacity: 1, transform: "translateY(0)" }],
      { duration: 480, easing: "cubic-bezier(.16,1,.3,1)" });
    animations.add(animation);
    function finish() { animations.delete(animation); element.classList.remove("rb-entrance"); }
    animation.addEventListener("finish", finish, { once: true });
    animation.addEventListener("cancel", finish, { once: true });
  }

  function spotlight() {
    var active = null;
    var precise = window.matchMedia("(hover: hover) and (pointer: fine)");
    function reset() { if (active) active.classList.remove("rb-spotlight-active"); active = null; }
    listen(document, "pointermove", function (event) {
      if (motion.matches || !precise.matches) return;
      var card = event.target.closest && event.target.closest(".rb-spotlight");
      if (card !== active) reset();
      if (!card) return;
      var rect = card.getBoundingClientRect();
      card.style.setProperty("--rb-x", (event.clientX - rect.left).toFixed(1) + "px");
      card.style.setProperty("--rb-y", (event.clientY - rect.top).toFixed(1) + "px");
      card.classList.add("rb-spotlight-active");
      active = card;
    }, { passive: true });
    listen(document, "pointerout", function (event) { if (!event.relatedTarget) reset(); });
    listen(document, "focusin", function (event) {
      if (motion.matches) return;
      var card = event.target.closest && event.target.closest(".rb-spotlight");
      if (!card) return;
      reset();
      card.style.setProperty("--rb-x", "50%"); card.style.setProperty("--rb-y", "50%");
      card.classList.add("rb-spotlight-active"); active = card;
    });
    listen(document, "focusout", function (event) { if (!active || !active.contains(event.relatedTarget)) reset(); });
    cleanups.push(reset);
  }

  function removeBurst(burst) { burst.canvas.remove(); bursts = bursts.filter(function (item) { return item !== burst; }); }
  function stopMotion() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    countFrames.slice().forEach(function (id) { try { cancelAnimationFrame(id); } catch (e) {} });
    countFrames = [];
    bursts.slice().forEach(removeBurst);
    animations.forEach(function (animation) { animation.cancel(); });
    animations.clear();
    document.querySelectorAll(".rb-spotlight-active").forEach(function (card) { card.classList.remove("rb-spotlight-active"); });
    document.querySelectorAll(".rb-magnet").forEach(function (el) { el.style.transform = ""; });
  }

  function drawSparks(now) {
    frame = 0;
    bursts.slice().forEach(function (burst) {
      var progress = Math.min(1, (now - burst.start) / 380);
      if (progress >= 1) { removeBurst(burst); return; }
      var ctx = burst.context;
      ctx.clearRect(0, 0, burst.canvas.width, burst.canvas.height);
      ctx.setTransform(burst.ratio, 0, 0, burst.ratio, 0, 0);
      var eased = 1 - Math.pow(1 - progress, 3);
      var fade = Math.max(0, Math.min(1, (1 - progress) / .45));
      ctx.strokeStyle = burst.color; ctx.lineWidth = 1.6; ctx.lineCap = "round"; ctx.globalAlpha = fade;
      burst.angles.forEach(function (angle) {
        var distance = 30 * eased;
        var length = 9 * Math.pow(1 - progress, 1.6);
        ctx.beginPath();
        ctx.moveTo(48 + Math.cos(angle) * distance, 48 + Math.sin(angle) * distance);
        ctx.lineTo(48 + Math.cos(angle) * (distance + length), 48 + Math.sin(angle) * (distance + length));
        ctx.stroke();
      });
      ctx.globalAlpha = 1;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    });
    if (bursts.length) frame = requestAnimationFrame(drawSparks);
  }

  function clickSpark() {
    listen(document, "click", function (event) {
      var connectionDialog = document.getElementById("backendGate");
      if (motion.matches || document.hidden || (connectionDialog && connectionDialog.open)) return;
      // Magic Bento click wave rides the same single document click listener.
      try {
        var bento = event.target.closest && event.target.closest(".magic-bento-card");
        if (bento) {
          bento.classList.remove("rb-wave");
          void bento.offsetWidth;
          bento.classList.add("rb-wave");
          setTimeout(function () { bento.classList.remove("rb-wave"); }, 550);
        }
      } catch (e) {}
      var button = event.target.closest && event.target.closest("button, a.btn");
      if (!button || button.disabled || button.getAttribute("aria-disabled") === "true") return;
      var rect = button.getBoundingClientRect();
      var x = event.detail === 0 ? rect.left + rect.width / 2 : event.clientX;
      var y = event.detail === 0 ? rect.top + rect.height / 2 : event.clientY;
      var canvas = node("canvas", "rb-click-canvas");
      canvas.setAttribute("aria-hidden", "true");
      var ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = 96 * ratio; canvas.height = 96 * ratio;
      canvas.style.width = "96px"; canvas.style.height = "96px";
      canvas.style.left = (x - 48) + "px"; canvas.style.top = (y - 48) + "px";
      (button.closest("dialog[open]") || document.body).appendChild(canvas);
      var context = canvas.getContext("2d");
      if (!context) { canvas.remove(); return; }
      bursts.push({ canvas: canvas, context: context, ratio: ratio, start: performance.now(),
        color: getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#42613c",
        angles: Array.from({ length: 6 }, function (_, i) { return i * Math.PI / 3; }) });
      while (bursts.length > 12) removeBurst(bursts[0]);
      if (!frame) frame = requestAnimationFrame(drawSparks);
    }, true);
  }

  /* Magnet: primary buttons ease a few px toward the cursor, then settle back.
     Skipped on touch / reduced motion. Pointer events only — no extra clicks. */
  function magnet() {
    var fine = null;
    try { fine = window.matchMedia("(hover: hover) and (pointer: fine)"); } catch (e) {}
    if (!fine || !fine.matches) return;
    var current = null;
    function reset() {
      if (current) { current.classList.remove("rb-magnet"); current.style.transform = ""; current = null; }
    }
    listen(document, "pointermove", function (event) {
      if (motion.matches) return;
      var btn = event.target.closest && event.target.closest(".btn:not([disabled])");
      if (!btn || btn.getBoundingClientRect().width > 420) { if (current && event.target !== current) reset(); return; }
      if (current !== btn) reset();
      current = btn;
      var r = btn.getBoundingClientRect();
      var dx = event.clientX - (r.left + r.width / 2);
      var dy = event.clientY - (r.top + r.height / 2);
      var pull = Math.min(1, Math.hypot(dx, dy) / 220);
      btn.classList.add("rb-magnet");
      btn.style.transform = "translate(" + (dx * 0.06 * pull).toFixed(1) + "px," + (dy * 0.08 * pull).toFixed(1) + "px)";
    }, { passive: true });
    listen(document, "pointerout", function (event) { if (current && !current.contains(event.relatedTarget)) reset(); });
    listen(document, "scroll", reset, { passive: true });
    cleanups.push(reset);
  }

  function init() {
    if (initialized || !document.body) return;
    initialized = true;
    motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (document.querySelector('link[href$="classic.css"]')) {
      var favicon = document.querySelector('link[rel~="icon"]');
      if (favicon) favicon.setAttribute("href", (favicon.getAttribute("href") || "").replace("%2342613c", "%23000000"));
      var sidebar = document.querySelector(".sidebar");
      if (sidebar) sidebarAccessibility(sidebar);
      modalAccessibility();
      return;
    }
    enhanceShell();
    modalAccessibility();
    if ("IntersectionObserver" in window) {
      entranceObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entranceObserver.unobserve(entry.target);
          if (entry.target.matches && entry.target.matches(".stat .value")) countUp(entry.target);
          else animateEntrance(entry.target);
        });
      }, { threshold: .08 });
    }
    enhanceCards(document.body);
    document.querySelectorAll(".workspace-heading, .landing-section-heading, .landing-hero-copy").forEach(function (item) {
      if (entranceObserver) entranceObserver.observe(item);
    });
    if ("MutationObserver" in window) {
      mutationObserver = new MutationObserver(function (records) {
        records.forEach(function (record) { record.addedNodes.forEach(enhanceCards); });
      });
      mutationObserver.observe(document.body, { childList: true, subtree: true });
    }
    spotlight(); clickSpark(); magnet();
    if (motion.addEventListener) listen(motion, "change", function () { if (motion.matches) stopMotion(); });
    listen(document, "visibilitychange", function () { if (document.hidden) stopMotion(); });
    listen(window, "pagehide", stopMotion);
  }

  function destroy() {
    stopMotion();
    if (entranceObserver) entranceObserver.disconnect();
    if (mutationObserver) mutationObserver.disconnect();
    cleanups.splice(0).forEach(function (cleanup) { cleanup(); });
    initialized = false;
  }

  window.InternLogUI = { init: init, destroy: destroy };
  document.addEventListener("DOMContentLoaded", function () {
    // The standalone error page has no data layer; regular pages initialize after API readiness.
    if (!window.InternLog) {
      document.documentElement.setAttribute("data-theme", window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
      init();
    }
  });
})();
