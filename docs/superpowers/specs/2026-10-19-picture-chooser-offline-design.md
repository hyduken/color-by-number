# Picture chooser and offline use

## Intent

Children can start a new puzzle without supplying a photo, and use the app without a connection after the first complete download. Preserve the existing visual style, crop controls, puzzle settings, browser history and local saves. No accounts, backend, tracking or runtime image service.

## Picture flow

- `#/create` opens a picture chooser when starting a new adventure. It works without an existing source image, including on refresh.
- The chooser offers four bundled starter illustrations, a picture from the device, and a separate Take a photo button.
- Replace the old Sunny little cat illustration with four clearly recognizable subjects: a fox, a sea turtle, a rocket and a flower garden. Use friendly, simple illustrations with large color areas suited to the existing difficulty settings. Ship the final assets with the app; do not generate or fetch them from a third-party service at runtime.
- Replace the homepage hero preview and old cat-specific copy with one of the new illustrations. Existing saved puzzles remain intact, including puzzles made from the old demo.
- Picking a starter or a device image leads to the existing crop and settings screen. Keep dragging, arrow-key positioning, crop zoom and all difficulty choices.
- Another adventure opens the chooser, without immediately opening a file picker. The homepage Choose a picture entry and crop-screen Change action also open the chooser.
- Keep hash navigation. Distinguish the chooser and crop step so Back and Forward move through them. Retain the selected photo and settings in memory during the session. A refreshed crop route without a source falls back to the chooser with an explanation.
- Selecting a replacement image resets crop settings and invalidates the generated puzzle. Merely opening the chooser must not erase saved puzzles or progress.

## Saved picture collection

- `#/library` is a dedicated All pictures page containing every saved puzzle, including works in progress and completed pictures, ordered most recently updated first.
- The homepage displays the seven most recently updated saved puzzles and a link to the complete collection.
- My puzzles and All pictures links go to the collection. Selecting a saved picture opens its existing `#/puzzle/<id>` route.
- The homepage starter card says “Pick a little adventure” and “Explore our starter pictures →”, and opens the chooser.

## Camera and device pictures

- Reuse the existing file decoding, validation, orientation handling and browser-local processing for device files and camera results.
- The camera button uses a native image file input with the environment-camera capture hint. Supporting mobile browsers may open the device camera; other browsers may offer their normal file picker. Do not add a live webcam preview or promise desktop webcam capture.
- Cancellation leaves the chooser usable. Invalid or unsupported images show the existing friendly validation message. Camera availability remains controlled by the device and browser.

## Offline behavior

- Add a production service worker that precaches the complete app shell, styles, JavaScript, icon and every bundled starter image during installation. Asset names must come from the actual build output, including hashed filenames.
- An incomplete or failed cache install must not show Ready offline. The app remains usable online and can retry on a later visit.
- On the first successful install, activate and claim the current page so the user does not need an extra refresh before going offline.
- Show a small, accessible Preparing for offline use / Ready offline status on the home and chooser screens. Explain a failed or unsupported offline setup without blocking online use.
- Once ready, home, chooser, crop, coloring, parents information, saved puzzles, local file selection, starter images and device-supported camera capture work without a connection. Browser reloads of hash routes must also work offline.
- Keep personal images, puzzles and progress in the existing IndexedDB database. Precache only shipped app assets, not user files or external destinations such as the hyduken.com credit link.
- Use versioned app caches and remove only obsolete caches owned by this app. Do not delete IndexedDB saves.
- Download updates into a new cache and wait for old app tabs to close before activating an update. Do not force a reload or interrupt a coloring session. If an update download fails, the existing offline version remains available.
- Register offline support for production builds only, keeping Vite development free of stale cached app versions. Production continues to be a static Cloudflare Pages site.

## Limits and privacy copy

- The first visit requires a connection until Ready offline appears. No separate app installation is required.
- Offline support requires service-worker and storage support. Browser storage can be cleared or evicted, and private browsing may limit persistence. Do not promise permanent offline availability.
- Cloud-only files in a device photo library may need downloading by that device before they are available offline.
- Update the parents page and README to explain offline readiness, on-device storage and the effects of clearing site data. Photos and puzzle data are never uploaded.

## Verification

- Run existing tests and the production build. Add focused coverage for offline cache installation failures, version cleanup and generated asset inclusion where needed.
- Check all starter images through crop, generation and play; confirm new assets load from the built site.
- Check homepage entry, Change, Another adventure, native file selection cancellation, and browser Back/Forward through chooser and crop.
- In a browser, start with a fresh production cache, wait for Ready offline, disable network access or stop the local production server, then reload and use starter images, generation, play and saved progress. Confirm the cache survives a page reload and no unvisited starter asset requires a connection.
- Check responsive chooser layouts. Report actual camera and physical touch testing separately; a desktop file chooser is not proof of mobile camera capture.

## Scope

No backend, account system, remote image library, live camera UI, install prompt, push notifications or change to the coloring rules. Existing parents-page and drag-crop work stays in place. Commit and deployment of product changes are separate from design review.
