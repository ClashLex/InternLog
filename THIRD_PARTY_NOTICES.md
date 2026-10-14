# Third-party UI attribution

The original frontend retains its existing Pill Nav, Bento grid, galaxy backdrop
and curved-loop implementations. The later redesign sources listed below are
preserved in `ui-archive/`, not loaded by the restored frontend or packaged as
active website assets. License attribution is retained for those sources:

- [SpotlightCard](https://github.com/DavidHDev/react-bits/tree/main/src/content/Components/SpotlightCard) — card spotlight (`rb-spotlight`)
- [MagicBento](https://github.com/DavidHDev/react-bits/tree/main/src/content/Components/MagicBento) — feature grid glow + click wave
- [PillNav](https://github.com/DavidHDev/react-bits/tree/main/src/content/Components/PillNav) — landing pill navigation
- [ClickSpark](https://github.com/DavidHDev/react-bits/tree/main/src/content/Animations/ClickSpark) — click bursts
- [AnimatedContent](https://github.com/DavidHDev/react-bits/tree/main/src/content/Animations/AnimatedContent) / FadeContent — scroll entrance
- [Galaxy](https://github.com/DavidHDev/react-bits/tree/main/src/content/Backgrounds/Galaxy) — auth starfield canvas
- [SplitText](https://github.com/DavidHDev/react-bits/tree/main/src/content/TextAnimations/SplitText) / [BlurText](https://github.com/DavidHDev/react-bits/tree/main/src/content/TextAnimations/BlurText) / [ShinyText](https://github.com/DavidHDev/react-bits/tree/main/src/content/TextAnimations/ShinyText) — headings + eyebrows
- [AnimatedList](https://github.com/DavidHDev/react-bits/tree/main/src/content/Components/AnimatedList) — staggered boards, stats, nav
- [Counter](https://github.com/DavidHDev/react-bits/tree/main/src/content/Components/Counter) — stat count-up
- [Magnet](https://github.com/DavidHDev/react-bits/tree/main/src/content/Animations/Magnet) — button pull
- [StarBorder](https://github.com/DavidHDev/react-bits/tree/main/src/content/Animations/StarBorder) / Border Glow — primary button edge light
- [CurvedLoop](https://github.com/DavidHDev/react-bits/tree/main/src/content/TextAnimations/CurvedLoop) — landing marquee band

The archived adaptations use native DOM, canvas, intersection observation and Web Animations
instead of introducing React/GSAP into the Java-served static frontend.

Upstream: [reactbits.dev](https://reactbits.dev/) / [React Bits](https://github.com/DavidHDev/react-bits).
The upstream license notice remains with the archived JavaScript source.

## SpotlightBar (OpenSourceUI)

The homepage internship search adapts [SpotlightBar](https://opensourceui.in/components/spotlight-bar)
(frosted command-search bar with live suggestions, keyboard navigation and
shortcut hint) as vanilla HTML/CSS/JS in `index.html`, `css/style.css` and
`js/landing.js` — no React or Tailwind dependency.

## Additional OpenSourceUI adaptations

The following are adapted as vanilla HTML/CSS/JS (no React, Tailwind or
lucide dependencies) in `css/style.css` and `js/script.js`, keeping every
existing class name, element id and event contract unchanged:

- [Tactile 3D](https://opensourceui.in/components) buttons — `.btn` keycaps
  with layered depth; press sinks the key in (solid / soft / danger variants).
- [Toast Notification](https://opensourceui.in/components/toast-notification) —
  light snackbar with per-kind icon, message and dismiss control.
- [Search Input](https://opensourceui.in/components/search-input) — toolbar
  searches gain a leading icon and clear button with keyboard-friendly reset.
- [Checkbox Field Input](https://opensourceui.in/components/checkbox-field-input) —
  custom checkbox mark with focus and disabled states.
- [Select Field Input](https://opensourceui.in/components/select-field-input) —
  native selects restyled with custom chevron, hover and focus treatment.
- [Text Field Input](https://opensourceui.in/components) — text inputs and
  textareas gain hover borders and soft focus rings alongside the existing
  error pattern.
- [Password Field Input](https://opensourceui.in/components) — show/hide
  toggles expose pressed state.
- [Counter](https://opensourceui.in/components) — `.stat .value` numbers
  count up once when visible (instant under reduced motion).
- [Spin Loader](https://opensourceui.in/components/spin-loader) — ring loader
  used by board, dashboard and moderation loading states.

Upstream: [opensourceui.in](https://opensourceui.in/) — MIT licensed. Free for
personal and commercial use with no UI attribution required; the MIT copyright
notice travels with the adapted source in `js/landing.js` and `css/style.css`.

## React Bits license

MIT + Commons Clause License Condition v1.0

Copyright (c) 2026 David Haz

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, and distribute the Software **as part of an application, website, or product**, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

### Commons Clause Restriction

You may use this Software, including for any commercial purpose, **so long as you do not sell, sublicense, or redistribute the components themselves-whether alone, in a bundle, or as a ported version.**

### No Warranty

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
