# Handoff: Rake — Loading screen

## Overview
The loading state for the Rake fantasy-baseball tracker. A single dot-grid icon flips
through the brand icon set while one witty line shimmers underneath. Small, quiet, on brand.

## About the design files
`Rake - Brand & Product.dc.html` (+ `support.js`) is an HTML **design reference** — open it
in a browser and scroll to the **"While the numbers land"** (Loading) section to see the
live behavior. It is not production code to copy verbatim; recreate the loader in your
codebase (React/etc.) using the spec below. The mark/icons render from a JS dot-grid
generator in the prototype — rebuild them as inline SVG or a tiny component. **High-fidelity.**

## Layout
Full-screen state on paper (`#FBFAF6`), contents centered vertically + horizontally,
`gap: 26px` between the icon and the line. (In the prototype it's shown inside a
`400px`-min card, but in-app it's the whole viewport.)

## Component 1 — Flipping dot-icon
- A **single icon slot** that swaps through four brand icons, in order, on a loop:
  **field (diamond) → game (baseball) → gaining (up arrow) → title (trophy)**.
- Color: Honolulu Blue **`#0076B6`**. Same coarse dot-grid language as the mark/icon set.
- **Bit-rows** (each string = a row; `1` = a dot):
  - diamond  `["00100","01110","11111","01110","00100"]`
  - baseball `["01110","11011","10101","11011","01110"]`
  - up arrow `["00100","01110","11111","00100","00100"]`
  - trophy   `["11111","11111","01110","00100","01110","11111"]`
- Render each row/col cell as a dot: dot size ≈ `5px`, `border-radius ≈ 16%` of dot size,
  grid `gap ≈ 12%` of dot size (min 1px). Off-cells transparent.
- **Timing:** advance to the next icon every **~620ms**.
- **Flip transition** on each swap — Y-axis flip-in, wrapped in `perspective: 400px`:
  ```css
  @keyframes flipIn { 0% { transform: rotateY(-90deg); opacity: 0 } 55% { opacity: 1 } 100% { transform: rotateY(0); opacity: 1 } }
  /* applied to the icon wrapper, re-triggered on each icon change */
  animation: flipIn .34s cubic-bezier(.4, 0, .2, 1);
  ```
  (Re-trigger by keying the wrapper on the current icon index so it remounts and replays.)

## Component 2 — Shimmering line
- **One line only, chosen at random per load.** No rotation mid-load — reload = new line.
- Type: **Sora, regular (400), 14px.**
- **Claude-style shimmer** — an ink glint sweeps through muted text via a gradient clipped
  to the text:
  ```css
  font-family: 'Sora', sans-serif; font-weight: 400; font-size: 14px;
  background-image: linear-gradient(100deg, #BDB4A1 0%, #BDB4A1 40%, #1A1611 50%, #BDB4A1 60%, #BDB4A1 100%);
  background-size: 200% 100%;
  -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent; color: transparent;
  animation: textShimmer 1.8s linear infinite;
  ```
  ```css
  @keyframes textShimmer { to { background-position: -200% 0 } }
  ```
  Base text tone `#BDB4A1` (muted sand), glint `#1A1611` (ink). ~1.8s linear loop.

### Line pool
Pick one at random on mount:
- Tallying the dingers…
- Counting who actually paid…
- Auditing the commissioner…
- Doing the math your league won't…
- Following the money…

Add or cut freely — keep them short and in the house voice (dry, money-league, a little cheeky).

## Reference implementation sketch (React)
```jsx
const ICONS = [ /* diamond, baseball, up, trophy bit-rows above */ ];
const LINES = ["Tallying the dingers…","Counting who actually paid…",
  "Auditing the commissioner…","Doing the math your league won't…","Following the money…"];

function Loading() {
  const [i, setI] = useState(0);
  const line = useMemo(() => LINES[Math.floor(Math.random() * LINES.length)], []);
  useEffect(() => {
    const t = setInterval(() => setI(v => (v + 1) % ICONS.length), 620);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="rake-loader">           {/* centered column, gap 26px, bg #FBFAF6 */}
      <div className="flip" key={i}>{/* render ICONS[i] as SVG/dots, blue #0076B6 */}</div>
      <div className="shimmer">{line}</div>  {/* styles above */}
    </div>
  );
}
```

## Design tokens used
| Token         | Hex       | Use                                |
|---------------|-----------|------------------------------------|
| Honolulu Blue | `#0076B6` | Icon                               |
| Ink           | `#1A1611` | Shimmer glint                      |
| Muted sand    | `#BDB4A1` | Shimmer base text                  |
| Off-white     | `#FBFAF6` | Background                         |

- Fonts: **Sora** (line), **Bricolage Grotesque** (only if you add a wordmark) — Google Fonts.
- No image assets; icons rebuilt from the bit-rows above.

## Files
- `Rake - Brand & Product.dc.html` — full prototype; the **Loading** section
  ("While the numbers land") is the visual source of truth for this screen.
- `support.js` — runtime needed to open the prototype in a browser.
