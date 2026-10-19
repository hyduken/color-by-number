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

Choose, drop or paste a JPEG, PNG or WebP image, or open the picture chooser for four bundled starter illustrations and a native camera option. Drag the square crop to reposition (or use arrow keys), and use the zoom slider. Choose Easy (16×16 / 6 colours), Medium (32×32 / 8), Hard (64×64 / 16), Extra hard (128×128 / 32), or custom settings; the preview updates automatically as you change the picture or settings. Press Let’s color when it is ready.

Select a numbered swatch and brush over matching cells. The paintbrush and four size icons offer 1 square, Small, Medium (the default), and Large. Larger brushes paint a circular area and only fill the selected number. A stroke still undoes in one step. Wrong numbers flash briefly without changing progress. A drag is one undo step. Finished colours receive a check mark and selection advances automatically. Zoom with the buttons or a two-finger pinch; toggle the move tool to pan. Show briefly reveals the finished picture. Hint zooms to an uncolored square of the selected number and marks it with a ripple. Completing a picture triggers a short confetti celebration; reduced-motion preferences disable the confetti and ripple animation. Arrow keys move around the canvas; Space or Enter colours the focused cell. Ctrl/Command-Z undoes; Shift-Ctrl/Command-Z redoes. Reset can be undone.

The library reopens puzzles after a refresh. Progress saves after strokes and when the page becomes hidden. The browser must allow IndexedDB. Saves belong to this device, browser profile and site origin; clearing site data removes them. A storage failure leaves the current puzzle available in memory and displays a warning.

## Implementation

- `src/image/`: image validation and orientation-aware browser decoding, previews bounded to 1600px, square cropping, smooth grid resizing, white transparency compositing, deterministic Wu quantisation and nearest-colour mapping without dithering. Near-identical shades merge conservatively. The generated palette may have fewer colours than requested.
- `src/puzzle/state.js`: serialisable definitions, separate progress, stroke undo/redo, completion and reset.
- `src/renderer/`: high-DPI Canvas rendering, interpolated pointer drags, zoom/pan, and keyboard input. Pointer movement repaints changed cells rather than reprocessing the picture.
- `src/storage/database.js`: IndexedDB transactions. Records include the definition, progress, source preview Blob, settings and timestamps.
- `src/main.js`: home, create and colouring views, palette controls and saving.

Images are limited to 25 MB and 60 megapixels. The browser decodes the source before reducing it, so very large photos can still cause a temporary memory spike. Quantisation operates on at most 16384 pixels in the application; it runs on the main thread. Add a worker if device profiling shows a responsiveness problem.

## Checks

```sh
npm test
npm run build
```

With the dev server running, open `/tests/browser.html` for real-browser Canvas, file-decoding and IndexedDB checks. It creates and removes only its own uniquely named test record. Fixture images in `tests/fixtures/` are generated for this project; `invalid.png` is deliberately not an image.

See [verification notes](docs/verification.md) for tested behaviour and limits.

## Offline and picture navigation

After the first production visit, wait for **Ready offline** before disconnecting. The app shell and all four starter images are precached, so pages can be refreshed, pictures selected, puzzles created and progress saved without a network. Cloud-only device photos may need to be downloaded first. Camera capture uses the native device picker where supported; other browsers may offer file selection. Actual camera availability depends on the device and browser.

The build creates a versioned `dist/sw.js` from the actual output files. New versions wait until old tabs close before taking over; updates do not interrupt a coloring session. Failed installs keep an older offline version intact. Service workers are only registered in production builds, not the Vite development server. Clearing site data or browser storage eviction can remove the offline copy and puzzles; private browsing can limit persistence. The external hyduken.com credit link requires a connection.

`#/create` is the picture chooser, `#/crop` the current session's crop editor, `#/library` all saved pictures and works in progress, and `#/puzzle/<id>` an individual saved puzzle. The homepage shows the seven most recently updated saved puzzles. Existing saves remain compatible. Crop images are kept in memory until a puzzle is created; refreshing the crop editor returns to the chooser.

Icons use locally bundled [Lucide](https://lucide.dev/license) SVGs. Confetti uses [canvas-confetti](https://github.com/catdad/canvas-confetti). Both are ISC licensed; notices ship in `public/licenses/`. Neither requires a runtime external service.
