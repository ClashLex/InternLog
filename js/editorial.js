/* Homepage-only vanilla adaptations of supplied React Bits components.
 * MIT + Commons Clause License Condition v1.0 — Copyright (c) 2026 David Haz.
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
 * SOFTWARE. Upstream: https://github.com/DavidHDev/react-bits
 */
(function () {
  "use strict";
  var initialized = false;

  function initTabs(root) {
    var buttons = Array.from(root.querySelectorAll("[data-story-tab]"));
    var panels = Array.from(root.querySelectorAll("[data-story-panel]"));
    var track = root.querySelector(".ed-story-buttons");
    if (!buttons.length || buttons.length !== panels.length || !track) return;
    track.setAttribute("role", "tablist");
    function select(index, focus) {
      buttons.forEach(function (button, i) {
        var selected = index === i;
        button.setAttribute("role", "tab");
        button.setAttribute("aria-controls", panels[i].id);
        button.setAttribute("aria-selected", String(selected));
        button.tabIndex = selected ? 0 : -1;
        panels[i].setAttribute("role", "tabpanel");
        panels[i].setAttribute("aria-labelledby", button.id);
        panels[i].tabIndex = 0;
        panels[i].hidden = !selected;
      });
      if (focus) buttons[index].focus();
    }
    buttons.forEach(function (button, index) {
      button.addEventListener("click", function () { select(index, false); });
      button.addEventListener("keydown", function (event) {
        var next;
        if (event.key === "ArrowRight") next = (index + 1) % buttons.length;
        else if (event.key === "ArrowLeft") next = (index + buttons.length - 1) % buttons.length;
        else if (event.key === "Home") next = 0;
        else if (event.key === "End") next = buttons.length - 1;
        else return;
        event.preventDefault();
        select(next, true);
      });
    });
    select(0, false);
  }

  function initPixelSwap(root, toggle) {
    if (!root || !toggle) return;
    var layers = Array.from(root.querySelectorAll("[data-pixel-layer]"));
    if (layers.length !== 2 || !toggle) return;
    var motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    var active = 1, animations = [], grid = null, timer = null;
    function paint() {
      layers.forEach(function (layer, index) { layer.hidden = index !== active; layer.setAttribute("aria-hidden", String(index !== active)); });
      toggle.setAttribute("aria-pressed", String(active === 1));
    }
    function settle() {
      animations.forEach(function (animation) { animation.cancel(); });
      animations = [];
      if (timer !== null) window.clearTimeout(timer);
      timer = null;
      if (grid) grid.remove();
      grid = null;
      paint();
    }
    toggle.addEventListener("click", function () {
      var next = 1 - active;
      settle();
      active = next;
      var width = root.clientWidth, height = root.clientHeight;
      if (motion.matches || !width || !height || typeof root.animate !== "function") { paint(); return; }
      var size = 72, columns = Math.ceil(width / size), rows = Math.ceil(height / size);
      while (columns * rows > 120) { size += 8; columns = Math.ceil(width / size); rows = Math.ceil(height / size); }
      grid = document.createElement("div");
      grid.className = "pixel-swap__grid";
      grid.setAttribute("aria-hidden", "true");
      grid.inert = true;
      root.appendChild(grid);
      try {
        for (var row = 0; row < rows; row++) {
          for (var column = 0; column < columns; column++) {
            var left = column * size, top = row * size;
            var pixel = document.createElement("div");
            pixel.className = "pixel-swap__pixel";
            Object.assign(pixel.style, { left: left + "px", top: top + "px", width: size + "px", height: size + "px" });
            var content = document.createElement("div");
            content.className = "pixel-swap__pixel-content";
            Object.assign(content.style, { left: -left + "px", top: -top + "px", width: width + "px", height: height + "px", transformOrigin: (left + size / 2) + "px " + (top + size / 2) + "px" });
            // Illustrations only: never clone live job cards, forms or controls.
            var clone = layers[next].cloneNode(true);
            clone.hidden = false;
            clone.removeAttribute("id");
            clone.removeAttribute("data-pixel-layer");
            clone.querySelectorAll("[id]").forEach(function (node) { node.removeAttribute("id"); });
            clone.setAttribute("aria-hidden", "true");
            clone.inert = true;
            content.appendChild(clone);
            pixel.appendChild(content);
            grid.appendChild(pixel);
            var windows = [], inverse = [];
            for (var step = 0; step <= 10; step++) {
              var progress = step / 10, eased = 1 - Math.pow(1 - progress, 3);
              var scale = .15 + .85 * eased, angle = 4 * (1 - eased);
              windows.push({ offset: progress, opacity: Math.min(1, eased * 2), transform: "rotate(" + angle + "deg) scale(" + scale + ")" });
              inverse.push({ offset: progress, transform: "scale(" + (1 / scale) + ") rotate(" + (-angle) + "deg)" });
            }
            var timing = { duration: 310, delay: ((column + row) / Math.max(1, columns + rows - 2)) * 290, fill: "both", easing: "linear" };
            animations.push(pixel.animate(windows, timing), content.animate(inverse, timing));
          }
        }
        timer = window.setTimeout(settle, 620);
      } catch (error) { settle(); }
    });
    window.addEventListener("resize", settle);
    document.addEventListener("visibilitychange", function () { if (document.hidden) settle(); });
    if (motion.addEventListener) motion.addEventListener("change", function () { if (motion.matches) settle(); });
    paint();
  }

  function initMenu() {
    var button = document.getElementById("pillMenuBtn"), menu = document.getElementById("pillMenuPopover");
    if (!button || !menu) return;
    var compact = window.matchMedia("(max-width: 768px)");
    function sync() { menu.inert = !compact.matches || !menu.classList.contains("open"); }
    function close(restoreFocus) {
      menu.classList.remove("open");
      button.setAttribute("aria-expanded", "false");
      sync();
      if (restoreFocus) button.focus();
    }
    button.addEventListener("click", sync);
    menu.querySelectorAll("a").forEach(function (link) { link.addEventListener("click", function () { close(true); }); });
    document.addEventListener("keydown", function (event) { if (event.key === "Escape" && menu.classList.contains("open")) { event.preventDefault(); close(true); } }, true);
    document.addEventListener("focusin", function (event) { if (menu.classList.contains("open") && event.target !== button && !menu.contains(event.target)) close(false); });
    if (compact.addEventListener) compact.addEventListener("change", function () { close(false); });
    if ("MutationObserver" in window) new MutationObserver(sync).observe(menu, { attributes: true, attributeFilter: ["class"] });
    sync();
  }

  function initActiveNav() {
    var links = Array.from(document.querySelectorAll("[data-pill-nav] a[href^='#']"));
    function paint() {
      links.forEach(function (link) {
        var current = !!window.location.hash && link.getAttribute("href") === window.location.hash;
        link.classList.toggle("is-active", current);
        if (current) link.setAttribute("aria-current", "location");
        else link.removeAttribute("aria-current");
      });
    }
    window.addEventListener("hashchange", paint);
    paint();
  }

  function init() {
    if (initialized || !document.body.classList.contains("editorial-page")) return;
    initialized = true;
    document.querySelectorAll("[data-story-tabs]").forEach(initTabs);
    initPixelSwap(document.querySelector("[data-pixel-swap]"), document.querySelector("[data-pixel-toggle]"));
    initMenu();
    initActiveNav();
    var motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    document.querySelectorAll("[data-editorial-spotlight]").forEach(function (card) {
      card.addEventListener("pointermove", function (event) {
        if (motion.matches || event.pointerType === "touch") return;
        var box = card.getBoundingClientRect();
        card.style.setProperty("--spot-x", (event.clientX - box.left) + "px");
        card.style.setProperty("--spot-y", (event.clientY - box.top) + "px");
      });
    });
    document.body.classList.add("editorial-ready");
  }
  document.addEventListener("DOMContentLoaded", init);
})();
