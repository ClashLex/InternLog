# Third-party UI attribution

InternLog includes application-specific vanilla JavaScript/CSS adaptations of these
React Bits components, integrated as part of the application (not a standalone
redistributed component library):

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

The adaptations are integrated in `js/ui-components.js` and the shared design
system. They use native DOM, canvas, intersection observation and Web Animations
instead of introducing React/GSAP into the Java-served static frontend.

Upstream: [reactbits.dev](https://reactbits.dev/) / [React Bits](https://github.com/DavidHDev/react-bits).
The upstream license notice is also included in the shipped JavaScript so it
travels with the application’s packaged frontend.

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
