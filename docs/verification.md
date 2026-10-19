# Verification — 18 October 2026

- Node unit checks: dimensions, palette bounds, valid cell references, transparent, tiny, large and single-colour input, deterministic quantisation without input mutation, invalid inputs, matching-only paint, stroke undo/redo, new-stroke redo invalidation, completion, progress serialisation, undoable reset, coordinate boundaries, partial transparency, drag interpolation and height-aware canvas fitting and extra-finger gesture protection.
- Browser self-checks (`/tests/browser.html`): crop position and aspect ratio; all five grid sizes; JPEG/PNG/WebP decode and JPEG EXIF orientation; unsupported, malformed and oversized files; 3200×2400 input reduction to 1600×1200; transparency; IndexedDB creation, update and restoration of definition, settings, source Blob and progress.
- Interactive browser checks: 404×827 phone layout without horizontal overflow; 1280×720 desktop layout; actual file-picker upload; clipboard image paste; generated preview; presets; drag colouring; undo and redo; keyboard painting; zoom; pointer pan; progress restoration after reload; 256-cell completion and celebration.
- Conversion samples: built-in limited-palette pixel-art cat, generated landscape JPEG, transparent 1×1 PNG, scikit-image's Chelsea cat and NASA astronaut portrait (downloaded temporarily for QA, not shipped). Medium retains recognisable subjects; Hard improves facial and background detail. Fur, textures and busy backgrounds retain scattered cells. Cropping the subject and lowering grid size are the current simplification controls. No unproven noise-removal algorithm was added.
- Production build: static assets only; image-q is bundled locally. No external resources are required by application code.

Still needs physical iPad/Android testing, actual two-finger pinch validation, broader Safari/Firefox coverage, OS file-drag checks, and forced quota/private-mode failure checks. This session used the available in-app browser; viewport emulation does not prove physical touchscreen behaviour. Browser storage can be cleared or evicted by the device.

Final read-only review identified and resolved two edge cases: save-status callbacks now ignore superseded snapshots; an extra finger during a pinch cannot start a painting stroke. The latter has a regression test using the real interaction handlers.

## 2026-10-19: picture chooser, collection and offline build

- `npm test`: 21 passing. Added cache-build/versioning, failed-install cleanup, owned-cache activation, offline navigation/assets, complete readiness and seven-recent/all-picture selection checks.
- `npm run build`: successful; generated a service worker listing all eight shipped files (HTML, JS, CSS, icon and four WebP starter images).
- Browser first-load status reached Ready offline. Stopped the Vite production preview process, then reloaded successfully with the server unavailable. All four starter images were visible without previously opening the chooser.
- Still with the server stopped: generated and painted puzzles for fox, turtle, rocket and garden. Created five saved starter puzzles in the test browser; confirmed homepage had seven saved cards while All pictures had all eight saved records then present, including old saves.
- Selected a local transparent PNG while offline, completed all 256 cells using mouse drags, refreshed the puzzle route, and confirmed 100% progress restored. Another adventure opened the chooser without a file picker.
- Verified the desktop native-camera file-picker fallback with an oriented JPEG, plus Back/Forward through chooser and crop. Actual mobile camera capture and physical touch gestures were not tested.
- Checked the chooser at a phone viewport: no horizontal page overflow and all four 640px source images loaded. Desktop/mobile screenshots are in ignored `test-results/`.
- Found and fixed an actual offline reload issue caused by preview responses using Vary: Origin while script/style requests supplied a different Origin header. Versioned, same-origin shipped assets now match with ignoreVary; the repaired build passed the server-off reload test.
- Preview server stopped after offline tests. Production deployment has not been performed for these changes.

## Brush sizes

- Default Medium brush radius is three grid squares (29 cells for a full circular stamp); 1 square, Small (radius 1) and Large (radius 5) are also available. Only matching selected-color cells are painted.
- `npm test`: 25 passing, including circle shape, clipping without row wrapping, matching cells with a different center color, and overlapping stamps as one undo/redo action. Production build passed.
- Actual browser: medium click filled 29 cells, precise click filled one, and large stamp clipped at a corner. A medium stroke filled 78 cells, one Undo restored all of them, Redo restored them, and a pan gesture painted no extra cells.
- Phone viewport 390×844 had no horizontal or vertical page overflow with the brush selector. Physical touch/pen brush operation remains unverified.

## Icons, hints and confetti

- Lucide SVG icons and canvas-confetti are bundled locally, with ISC notices in the offline cache. Paint/move modes, four brush-size icons, Show and Hint have accessible names and state.
- `npm test`: 27 passing. Hint tests cover selected-color matching, the last remaining square, finished colors, and no progress mutation. Production build and `git diff --check` passed.
- Browser: painted 255 of 256 squares, clicked Hint, and confirmed the ring highlighted row 16/column 16 while the remaining count stayed one. Painting it removed the marker and displayed confetti and completion. Reload retained completion and did not replay confetti.
- Browser: Show revealed the picture; paint/move and brush-size buttons changed their pressed states. A 390×844 phone viewport fit without document overflow, and the Hint marker remained visible. No browser warnings/errors were logged.
- Read-only review found no actionable issues. Reduced-motion behavior was inspected in code; physical touch devices and the OS reduced-motion preference were not tested. Changes remain local and undeployed.

## Larger celebration

- Increased confetti from 100 to 650 pieces, with larger pieces, five bursts distributed across the top and a central upward burst. The temporary test button used during visual review was removed after sizing the effect; reduced-motion handling remains enabled.
- Production build and diff whitespace check passed. Desktop browser test showed confetti across the full viewport without changing picture progress. Physical mobile performance remains untested.

## Responsive celebration and stacked layout

- Confetti now uses 260 pieces above 1000px, 150 at 601–1000px, and 90 at 600px and below. Compact layouts use smaller pieces and a lower upward velocity.
- Coloring-screen stacked layout now applies at 1000px and below. Home/create page breakpoints remain unchanged.
- Production build and diff check passed. Browser geometry confirmed stacked at 1000px and side-by-side at 1001px. The 390×844 phone viewport showed the lighter effect without horizontal document overflow. Physical device performance remains untested.


## Compact drawing layouts

- Replaced the width-based palette layout with a 64px bottom row in portrait and right column in landscape. Swatches retain 48×48px tap targets and scroll in one direction. Auto-selected colors scroll into view.
- The toolbar stays on one row. Brush sizes open from Paint; More tools contains zoom, Redo, remaining counts and restart. Chooser/crop pages hide the main site header/footer and keep local back links.
- Browser viewport checks: 320×568, 390×844, 844×390, 600×960, 960×600, 768×1024 and 1024×768. No document overflow. Canvas sizes increased from 67 to 270px on the smallest phone, 8 to 237px in phone landscape, and 134 to 447px in small-tablet landscape. All 32 colors were reachable in both orientations.
- Browser checks: brush selector dismissal, zoom, matching-color painting, Undo, and menu-based Redo. No console warnings/errors. All 27 unit tests and production build passed. Physical phone/tablet gestures and browser chrome remain unverified.


## Crop screen and touch gestures

- Removed the difficulty heading and moved the generated thumbnail and size/color summary into Your picture, alongside its zoom control. Mobile presets use one compact row; the crop stays square and the Start action follows the fields without covering them.
- Crop pointer handling supports one-finger drag and anchored two-finger pinch, constrained to zoom 1–3. Slider values stay synchronized. Releasing/cancelling a pointer rebases the remaining gesture.
- All 30 tests and production build passed, including pinch limits, off-center anchor, drag continuity and cancellation. Browser checks covered mouse drag, slider zoom, automatic preview updates, preview placement and layouts at 320×568, 390×844, 768×1024, 844×390 and 1280×800; no horizontal page overflow or console warnings/errors. Physical touch pinch remains untested.


## Touch zoom and hints for every matching square

- Crop zoom slider and slider instructions are hidden when the device reports touch points or a coarse pointer, including hybrid touch computers. Desktop mouse-only devices retain the slider. Physical touch detection/pinch still needs device validation.
- Hint now marks every unpainted square of the selected color on one canvas overlay. It neither zooms nor scrolls. Painted targets are removed while other rings remain; changing colors clears them. Reduced-motion users get static rings.
- Browser: 49 remaining squares were highlighted; canvas size and scroll offsets stayed exactly unchanged. Painting reduced the count to 45 while the overlay remained. No console warnings/errors. Large single-color lookup is covered by a 128×128 regression check.
