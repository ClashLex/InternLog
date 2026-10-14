/* Functional keyboard/focus fixes only; no layout, theme or animation changes. */
(function () {
  "use strict";
  var initialized = false;
  function init() {
    if (initialized) return;
    initialized = true;
    var sidebar = document.getElementById("sidebar"), menu = document.getElementById("menuBtn"), backdrop = document.getElementById("sidebarBackdrop");
    var main = document.querySelector(".app-layout > .main");
    if (sidebar && menu) {
      var compact = window.matchMedia("(max-width: 768px)");
      menu.setAttribute("aria-controls", "sidebar");
      function sync() {
        var open = compact.matches && sidebar.classList.contains("open");
        menu.setAttribute("aria-expanded", String(open));
        sidebar.inert = compact.matches && !open;
        if (main) main.inert = open;
        if (!compact.matches) { sidebar.classList.remove("open"); if (backdrop) backdrop.classList.remove("show"); }
      }
      function close() { sidebar.classList.remove("open"); if (backdrop) backdrop.classList.remove("show"); sync(); menu.focus(); }
      var button = document.createElement("button");
      button.className = "workspace-drawer-close"; button.type = "button"; button.textContent = "×";
      button.setAttribute("aria-label", "Close navigation"); button.addEventListener("click", close); sidebar.appendChild(button);
      menu.addEventListener("click", function () { sync(); if (compact.matches && sidebar.classList.contains("open")) sidebar.querySelector("nav a").focus(); });
      if (backdrop) backdrop.addEventListener("click", function () { sync(); menu.focus(); });
      document.addEventListener("keydown", function (event) {
        if (!compact.matches || !sidebar.classList.contains("open") || document.querySelector(".modal-backdrop.open, dialog[open]")) return;
        if (event.key === "Escape") { event.preventDefault(); close(); }
        if (event.key === "Tab") {
          var items = sidebar.querySelectorAll("a[href], button:not([disabled])"), first = items[0], last = items[items.length - 1];
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
        }
      }, true);
      if (compact.addEventListener) compact.addEventListener("change", sync);
      sync();
    }
    if (!("MutationObserver" in window)) return;
    var lastTrigger = null;
    document.addEventListener("click", function (event) { var item = event.target.closest && event.target.closest("button, a[href]"); if (item && !item.closest(".modal-backdrop")) lastTrigger = item; }, true);
    document.querySelectorAll(".modal-backdrop").forEach(function (overlay) {
      var modal = overlay.querySelector(".modal"); if (!modal) return;
      modal.tabIndex = -1;
      var open = false, previousFocus = null, previousOverflow = "", previousInert = false;
      var background = document.querySelector(".app-layout, .auth-wrap");
      function controls() { return Array.from(modal.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]')).filter(function (item) { return item.getClientRects().length && !item.closest("[hidden]"); }); }
      new MutationObserver(function () {
        var visible = overlay.classList.contains("open");
        if (visible && !open) {
          open = true; previousFocus = document.activeElement;
          if ((!previousFocus || ["BODY", "HTML"].includes(previousFocus.tagName)) && lastTrigger && lastTrigger.isConnected) previousFocus = lastTrigger;
          previousOverflow = document.body.style.overflow; document.body.style.overflow = "hidden";
          if (background && !background.contains(overlay)) { previousInert = background.inert; background.inert = true; }
          (controls()[0] || modal).focus();
        } else if (!visible && open) {
          open = false; document.body.style.overflow = previousOverflow;
          if (background && !background.contains(overlay)) background.inert = previousInert;
          if (previousFocus && previousFocus.isConnected) previousFocus.focus();
        }
      }).observe(overlay, { attributes: true, attributeFilter: ["class"] });
      overlay.addEventListener("click", function (event) { if (event.target === overlay) overlay.classList.remove("open"); });
      overlay.addEventListener("keydown", function (event) {
        if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); overlay.classList.remove("open"); }
        if (event.key === "Tab") {
          var items = controls(), first = items[0], last = items[items.length - 1];
          if (!items.length) { event.preventDefault(); modal.focus(); }
          else if (event.shiftKey && (document.activeElement === first || document.activeElement === modal)) { event.preventDefault(); last.focus(); }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
        }
      });
    });
  }
  window.InternLogAccessibility = { init: init };
})();
