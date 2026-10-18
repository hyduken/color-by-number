# Color by Number

A private, browser-only picture-to-puzzle app. Built with Vite, vanilla JavaScript, Canvas 2D, image-q and IndexedDB. No backend, accounts, image uploads to a server, analytics, remote fonts or runtime API calls.

## Run

Requires Node.js 20.19+ or 22.12+ (tested with Node 26).

```sh
npm ci
npm run dev
```

Open the URL printed by Vite. For production:

```sh
npm run build
npm run preview
```

Deploy `dist/` to a static host. Keep the same origin to keep access to existing browser saves.

## Use

Choose, drop or paste a JPEG, PNG or WebP image, or try the built-in cat. Adjust the square crop with position and zoom sliders. Choose Easy (16×16 / 6 colours), Medium (32×32 / 8), Hard (64×64 / 16), or custom settings; regenerate before starting.

Select a numbered swatch and tap or drag over matching cells. Wrong numbers flash briefly without changing progress. A drag is one undo step. Finished colours receive a check mark and selection advances automatically. Zoom with the buttons or a two-finger pinch; toggle the move tool to pan. Peek briefly reveals the finished puzzle. Arrow keys move around the canvas; Space or Enter colours the focused cell. Ctrl/Command-Z undoes; Shift-Ctrl/Command-Z redoes. Reset can be undone.

The library reopens puzzles after a refresh. Progress saves after strokes and when the page becomes hidden. The browser must allow IndexedDB. Saves belong to this device, browser profile and site origin; clearing site data removes them. A storage failure leaves the current puzzle available in memory and displays a warning.

## Implementation

- `src/image/`: image validation and orientation-aware browser decoding, previews bounded to 1600px, square cropping, smooth grid resizing, white transparency compositing, deterministic Wu quantisation and nearest-colour mapping without dithering. Near-identical shades merge conservatively. The generated palette may have fewer colours than requested.
- `src/puzzle/state.js`: serialisable definitions, separate progress, stroke undo/redo, completion and reset.
- `src/renderer/`: high-DPI Canvas rendering, interpolated pointer drags, zoom/pan, and keyboard input. Pointer movement repaints changed cells rather than reprocessing the picture.
- `src/storage/database.js`: IndexedDB transactions. Records include the definition, progress, source preview Blob, settings and timestamps.
- `src/main.js`: home, create and colouring views, palette controls and saving.

Images are limited to 25 MB and 60 megapixels. The browser decodes the source before reducing it, so very large photos can still cause a temporary memory spike. Quantisation operates on at most 4096 pixels in the application; it runs on the main thread. Add a worker if device profiling shows a responsiveness problem.

## Checks

```sh
npm test
npm run build
```

With the dev server running, open `/tests/browser.html` for real-browser Canvas, file-decoding and IndexedDB checks. It creates and removes only its own uniquely named test record. Fixture images in `tests/fixtures/` are generated for this project; `invalid.png` is deliberately not an image.

See [verification notes](docs/verification.md) for tested behaviour and limits.
