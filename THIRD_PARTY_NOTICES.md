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

## Active React Bits adaptations

The current frontend also adapts the following components in `js/script.js`
and `css/style.css`, with keyboard/focus support and reduced-motion handling:

- [StaggeredMenu](https://github.com/DavidHDev/react-bits/tree/main/src/content/Components/StaggeredMenu) — overlay navigation built from each page's own links; animation uses CSS transitions instead of GSAP.
- [Stepper](https://github.com/DavidHDev/react-bits/tree/main/src/content/Components/Stepper) — multi-step account forms with validation; CSS motion and inline SVG instead of React and animation/icon dependencies.

The React Bits license below is also retained in the active JavaScript source.

### Editorial homepage

The local, git-ignored `components.md` supplied React versions of PixelSwap,
SpotlightCard and PillNav.
The homepage uses scoped, application-specific vanilla adaptations in
`js/editorial.js`, `css/editorial.css`, and the existing PillNav helpers.
PixelSwap is limited to explicitly labeled illustrations, not live listings or
interactive controls. SpotlightCard uses local pointer events without ambient
animation. PillNav uses regular links and CSS hover transitions, not GSAP or
React Router. Missing CSS was cross-checked against the upstream component styles.

The supplied React Bits Dither effect is adapted in `js/dither.js` as a single-pass
monochrome WebGL2 background: low opacity, edge-weighted masking, slow waves,
a capped render resolution and 20 fps drawing limit. Mouse trails, click ripples
and intro animation are disabled. A footer control pauses motion; reduced-motion
preferences produce a static texture. Hidden tabs stop animation, and unsupported
WebGL or context loss leaves the normal page background unchanged. The React Bits
license is retained with the adaptation.

The three provided OpenSourceUI references are
[Soft UI Button](https://opensourceui.in/components/soft-ui-button),
[3D Button](https://opensourceui.in/components/3d-button), and
[3D Icon Button](https://opensourceui.in/components/3d-icon-button).
The new homepage uses original scoped CSS inspired by their soft/depth styling;
the source pages were not readable through the text fetcher. Search, selects,
cards, tabs, steps, loading/empty/error states, and FAQ are native HTML/CSS/JS
implementations; internship dialogs and notifications retain the existing API
contracts. No additional React packages are introduced.

The supplied `fonts/Times New Roman MT Condensed Regular.otf` is used for headings.
No license accompanied that file: confirm web-embedding and distribution rights
before publishing. Akzidenz-Grotesk is requested from local installations; the
supplied CC0 Aileron Regular/SemiBold/Bold files provide a clearly named web
fallback where it is unavailable. Aileron's CC0 notice is retained alongside the
fonts. Unused Basic Commerce, FreeSans and Protestant files are not included in
Pages or Java frontend packaging. Aileron is not represented as Akzidenz-Grotesk.

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
