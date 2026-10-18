# Color by Number implementation

Build the supplied brief end to end in the empty local folder. No backend, remote image requests, analytics, accounts, or framework. Uploaded images stay in the browser.

1. Processing: validate JPEG/PNG/WebP, browser orientation decode, bound preview to 1600px, square crop via position and zoom, smooth downsample, opaque white transparency composite, deterministic image-q Wu palette and nearest-color mapping. Merge very similar colors conservatively. No dithering or speculative filters.
2. Pure puzzle state: serialisable definition and separate progress, matching-only painting, stroke-sized undo/redo, counts and completion. Test dimensions, transparency, palette bounds, determinism, tiny/large source grids, undo, reset, and coordinates outside the grid.
3. Interface: upload/drop/paste home with an optional built-in pixel picture, crop/settings plus puzzle preview, canvas play with palette, progress, hint, undo/redo/reset, zoom, pan and keyboard navigation. Use a warm paper background, plum ink, bold rounded controls and a simple pixel-art motif.
4. Persistence: IndexedDB records containing definition, preview Blob, settings and progress; save after each completed stroke and pause, report failures without removing in-memory work. Restore from the library after reload.
5. Verify: Node tests, production build, representative generated images and real browser upload/play/reload, plus narrow touch viewport inspection. Document hardware validation limits.

No Git repository exists; no branch, commit, push or deployment is part of this implementation.
