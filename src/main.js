import "./styles/main.css";
import confetti from "canvas-confetti";
import { icon } from "./ui/icons.js";
import { HintMarker } from "./renderer/hint.js";
import { bindCropInteraction } from "./image/crop-interaction.js";
import { starterPictures, loadStarter } from "./image/starters.js";
import { recentPuzzles } from "./puzzle/library.js";
import {
  loadImage,
  cropImage,
  processImage,
} from "./image/processor.js";
import {
  createState,
  paintBrush,
  findHints,
  endStroke,
  undo,
  redo,
  reset,
  summary,
} from "./puzzle/state.js";
import { PuzzleCanvas } from "./renderer/canvas.js";
import { fitGrid } from "./renderer/geometry.js";
import { bindInteraction } from "./renderer/interaction.js";
import { savePuzzle, listPuzzles, deletePuzzle } from "./storage/database.js";

const app = document.querySelector("#app");
const $ = (selector) => app.querySelector(selector);
const escape = (text) =>
  String(text).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
let dispose = () => {},
  current = null,
  source = null,
  draft = null,
  busy = false;
let settings = { grid: 16, colors: 6, x: 50, y: 50, zoom: 1 };
let noticeTimer;
const memoryRecords = new Map();
let saveQueue = Promise.resolve();
let routeRevision = 0;
let brushRadius = 3;
const footer = () => `<footer>Color a picture, one square at a time.<span class="footer-links"><a href="#/parents">For parents</a><a href="https://hyduken.com/">made by hyduken</a></span></footer>`;

function navigate(hash) {
  if (location.hash === hash) renderRoute();
  else location.hash = hash;
}
async function renderRoute() {
  const revision = ++routeRevision;
  dispose();
  dispose = () => {};
  if (current) persist(current.record, current.state.progress);
  current = null;
  const hash = location.hash;
  if (hash === "#/parents") {
    showParents();
    return;
  }
  if (hash === "#/create") {
    showChooser();
    return;
  }
  if (hash === "#/library") {
    showLibrary(revision);
    return;
  }
  if (hash === "#/crop" && source) {
    showCreate();
    return;
  }
  const puzzleRoute = /^#\/puzzle\/([^/]+)$/.exec(hash);
  if (puzzleRoute) {
    const id = puzzleRoute[1];
    let record = memoryRecords.get(id);
    if (!record) {
      mount('<p class="muted">Opening your picture…</p>');
      try {
        record = (await listPuzzles()).find((p) => p.id === id);
      } catch {
        if (revision !== routeRevision) return;
        notice("Saved pictures are unavailable in this browser.");
      }
    }
    if (revision !== routeRevision) return;
    if (record) {
      memoryRecords.set(id, record);
      showPlay(record);
      return;
    }
    notice("This picture is not saved on this device.");
  }
  if (hash === "#/crop" && !source) {
    notice("Choose your picture again to start coloring.");
    history.replaceState(null, "", "#/create");
    showChooser();
    return;
  }
  if (!["#/", "#/library"].includes(hash))
    history.replaceState(null, "", "#/");
  showHome(revision);
}

function notice(message, persistent = false) {
  const box = document.querySelector("#notice");
  clearTimeout(noticeTimer);
  box.textContent = message;
  box.hidden = false;
  if (!persistent)
    noticeTimer = setTimeout(() => {
      box.hidden = true;
    }, 4500);
}
function announce(message) {
  document.querySelector("#announcement").textContent = message;
}
function mount(html) {
  dispose();
  dispose = () => {};
  app.innerHTML = html;
  document.documentElement.classList.toggle("touch-input", navigator.maxTouchPoints > 0);
  document.body.classList.toggle("playing", !!app.querySelector(".play-screen"));
  document.body.classList.toggle("focused", !!app.querySelector(".play-screen, .chooser-screen, .crop-screen"));
  window.scrollTo(0, 0);
}
function confirmAction(title, copy) {
  const dialog = document.querySelector("#confirm-dialog");
  document.querySelector("#confirm-title").textContent = title;
  document.querySelector("#confirm-copy").textContent = copy;
  dialog.showModal();
  return new Promise((resolve) => {
    dialog.addEventListener(
      "close",
      () => resolve(dialog.returnValue === "confirm"),
      { once: true },
    );
  });
}
function persist(record, progress) {
  record.progress = [...progress];
  record.updatedAt = Date.now();
  const snapshot = structuredClone(record);
  memoryRecords.set(record.id, snapshot);
  saveQueue = saveQueue
    .catch(() => {})
    .then(() => savePuzzle(snapshot))
    .catch(() => {
      if (memoryRecords.get(record.id) !== snapshot) return;
      notice(
        "Your picture could not be saved. Keep this page open so you don’t lose your coloring. Ask a grown-up to check the browser’s storage settings.",
        true,
      );
    });
  return saveQueue;
}
async function pick(file) {
  if (!file || busy) return;
  busy = true;
  try {
    const loaded = await loadImage(file);
    source = loaded;
    settings = { grid: 16, colors: 6, x: 50, y: 50, zoom: 1 };
    draft = null;
    navigate("#/crop");
  } catch (error) {
    notice(error.message);
  } finally {
    busy = false;
  }
}
function inputFile(camera = false) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = camera ? "image/*" : "image/jpeg,image/png,image/webp";
  if (camera) input.setAttribute("capture", "environment");
  input.addEventListener("change", () => pick(input.files[0]));
  input.click();
}
function renderMini(canvas, definition, progress) {
  const renderer = new PuzzleCanvas(
    canvas,
    definition,
    progress || definition.cells.map(() => true),
  );
  renderer.resize(240);
}
function showParents() {
  mount(`<section class="parents-page">
    <div class="parents-heading"><h1>For parents</h1><p>How this app keeps your pictures private.</p></div>
    <section><h2>Your pictures stay on your device</h2><p>Photos are processed right in your browser to make a color-by-number picture. They aren’t uploaded to a server, and your puzzle and coloring progress are saved in this browser on this device.</p></section>
    <section><h2>No accounts, ads or trackers</h2><p>There’s no sign-up and no profile to create. The app has no ads or tracking tools.</p></section>
    <p class="parents-note">If you clear this browser’s stored site data, saved pictures and progress may be removed.</p>
    <footer>Color a picture, one square at a time.<a href="https://hyduken.com/">made by hyduken</a></footer>
  </section>`);
}
async function showHome(revision = routeRevision) {
  mount(`<section class="home-hero">
    <div class="hero-copy"><h1>Choose a picture.<br>Let’s <em>color!</em><span class="spark" aria-hidden="true">${icon("Asterisk")}</span></h1>
    <p>Choose a picture, then match the colors to the numbers.</p>
    <div class="upload-zone" id="drop-zone"><button class="button primary upload-button" id="upload">${icon("Plus")} Choose a picture</button><span>or drop it here · JPG, PNG, WebP</span></div>
    <p class="local-note">${icon("House")} Your pictures stay right here, on your device.</p><a class="parents-link" href="#/parents">For parents ${icon("ArrowRight")}</a></div>
    <div class="hero-art"><div class="art-tape" aria-hidden="true"></div><div class="art-paper"><img class="hero-picture" src="/images/hero-fox.png" alt="A woodland fox, partly colored by number" width="728" height="728"><div class="art-caption"><span>Match the colors to the numbers.</span><span aria-hidden="true">☀</span></div></div><div class="floating-swatch swatch-yellow" aria-hidden="true">1</div><div class="floating-swatch swatch-green" aria-hidden="true">3</div></div>
    </section>
    <section class="library" id="library"><div class="section-heading"><h2>Your recent pictures</h2><a class="parents-link" href="#/library">See all pictures ${icon("ArrowRight")}</a></div><div id="saved-puzzles" class="saved-grid"><p class="muted">Loading your pictures…</p></div></section>
    ${footer()}`);
  $("#upload").onclick = () => navigate("#/create");
  renderSavedPictures(7, revision);

}
async function renderSavedPictures(limit = Infinity, revision = routeRevision) {
  try {
    const saved = await listPuzzles();
    saved.forEach((record) => {
      if (
        !memoryRecords.has(record.id) ||
        memoryRecords.get(record.id).updatedAt < record.updatedAt
      )
        memoryRecords.set(record.id, record);
    });
  } catch {
    notice(
      "Saved pictures are unavailable in this browser. You can still make and color a picture.",
    );
  }
  if (revision !== routeRevision || !$("#saved-puzzles")) return;
  const records = recentPuzzles(memoryRecords.values(), limit);
  if ($("#library-count")) $("#library-count").textContent = `${memoryRecords.size} ${memoryRecords.size === 1 ? "picture" : "pictures"}`;
  $("#saved-puzzles").innerHTML = limit === 7
    ? `<a class="demo-card" href="#/create"><span class="demo-flower" aria-hidden="true">${icon("Flower2")}</span><strong>Choose a picture</strong><span>See our starter pictures ${icon("ArrowRight")}</span></a>`
    : records.length ? "" : '<p class="muted">No pictures saved yet. Choose a picture to start coloring.</p>';
  records.forEach((record) => {
    const filled = record.progress.filter(Boolean).length;
    const percent = Math.floor((filled / record.definition.cells.length) * 100);
    const card = document.createElement("article");
    card.className = "saved-card";
    card.innerHTML = `<a class="open-puzzle" href="#/puzzle/${escape(record.id)}"><canvas aria-hidden="true"></canvas><span class="saved-info"><strong>${escape(record.title)}</strong><span>${percent === 100 ? "Finished! ✨" : `${percent}% colored · ${record.definition.width} × ${record.definition.height}`}</span><span class="mini-progress"><i style="width:${percent}%"></i></span></span></a><button class="delete-puzzle" aria-label="Delete ${escape(record.title)}" title="Delete puzzle">×</button>`;
    $("#saved-puzzles").append(card);
    try {
      renderMini(card.querySelector("canvas"), record.definition);
    } catch {
      card.remove();
      return;
    }
    card.querySelector(".delete-puzzle").onclick = async () => {
      if (
        !(await confirmAction(
          "Delete this picture?",
          "This removes the picture and its coloring from this device.",
        ))
      )
        return;
      try {
        await saveQueue;
        await deletePuzzle(record.id);
        memoryRecords.delete(record.id);
        navigate(location.hash);
      } catch {
        notice("Could not delete this picture. Please try again.");
      }
    };
  });

}
function showLibrary(revision) {
  mount(`<section class="create-screen collection-screen"><div class="collection-heading"><div><h1>All pictures</h1><p>Keep coloring a picture or see the ones you’ve finished.</p></div><a class="button primary" href="#/create">Choose a picture ${icon("ArrowRight")}</a></div><div class="section-heading"><h2>Your pictures</h2><span id="library-count"></span></div><div id="saved-puzzles" class="saved-grid"><p class="muted">Loading your pictures…</p></div></section>${footer()}`);
  renderSavedPictures(Infinity, revision);
}
function showChooser() {
  mount(`<section class="create-screen chooser-screen"><a class="back-button" href="#/library">${icon("ArrowLeft")} All pictures</a><div class="create-heading"><h1>Choose a picture.</h1><p>Choose a starter picture, use your own picture, or take a photo.</p></div><div class="picture-sources"><button class="button secondary" id="choose-file">${icon("ImagePlus")} Choose from your device</button><button class="button secondary" id="take-photo">${icon("Camera")} Take a photo</button></div><p class="muted source-note">Your device may offer a photo picker instead of a camera. Your pictures stay on this device.</p><div class="section-heading"><h2>Our starter pictures</h2><span>Choose one to color</span></div><div class="starter-grid">${starterPictures.map((picture) => `<button class="starter-card" data-starter="${picture.id}"><img src="${picture.url}" alt="${picture.title}" width="640" height="640"><strong>${picture.title}</strong><span>Use this picture ${icon("ArrowRight")}</span></button>`).join("")}</div></section>${footer()}`);
  $("#choose-file").onclick = () => inputFile();
  $("#take-photo").onclick = () => inputFile(true);
  app.querySelectorAll("[data-starter]").forEach((button) => {
    button.onclick = async () => {
      if (busy) return;
      const revision = routeRevision;
      busy = true;
      button.disabled = true;
      try {
        const loaded = await loadStarter(button.dataset.starter);
        if (revision !== routeRevision) return;
        source = loaded;
        settings = { grid: 16, colors: 6, x: 50, y: 50, zoom: 1 };
        draft = null;
        navigate("#/crop");
      } catch (error) {
        if (revision === routeRevision) notice(error.message);
      } finally {
        busy = false;
        button.disabled = false;
      }
    };
  });
}
function showCreate() {
  mount(`<section class="create-screen crop-screen"><a class="back-button" id="back" href="#/library">${icon("ArrowLeft")} All pictures</a><div class="create-heading"><h1>Get your picture ready.</h1><p>Move and zoom your picture, then choose how hard to make it.</p></div>
    <div class="create-layout"><section class="picture-panel"><div class="panel-heading"><h2>Your picture</h2><button class="button subtle" id="change-image">Change</button></div><div class="crop-frame"><canvas id="crop-preview" tabindex="0" aria-label="Your picture. Drag to move it, pinch or use the slider to zoom, or use arrow keys to move."></canvas></div><p class="crop-help"><span class="mouse-crop-help">Drag to move · use the slider to zoom</span><span class="touch-crop-help">Drag to move · pinch to zoom</span></p><div class="crop-preview-tools"><div class="crop-controls"><label>Picture zoom<input id="crop-zoom" type="range" min="1" max="3" step="0.01" value="${settings.zoom}"></label></div><div class="generated-preview" id="generated-preview"><div class="preview-placeholder"><span aria-hidden="true">▦</span>Your picture will appear here</div></div></div><div class="preview-meta" id="preview-meta" role="status" aria-live="polite"></div></section>
    <section class="settings-panel"><div class="presets" role="group" aria-label="Difficulty"><button class="preset active" data-grid="16" data-colors="6"><span aria-hidden="true">${icon("Flower2")}</span>Easy<small>16 × 16 squares</small></button><button class="preset" data-grid="32" data-colors="8"><span aria-hidden="true">${icon("Asterisk")}</span>Medium<small>32 × 32 squares</small></button><button class="preset" data-grid="64" data-colors="16"><span aria-hidden="true">${icon("Star")}</span>Hard<small>64 × 64 squares</small></button><button class="preset" data-grid="128" data-colors="32"><span aria-hidden="true">${icon("Sparkles")}</span>Extra hard<small>128 × 128 squares</small></button></div><div class="select-row"><label>Picture size<select id="grid-size">${[16, 24, 32, 48, 64, 128].map((n) => `<option value="${n}" ${settings.grid === n ? "selected" : ""}>${n} × ${n}</option>`).join("")}</select></label><label>Number of colors<select id="palette-size">${[6, 8, 12, 16, 24, 32].map((n) => `<option value="${n}" ${settings.colors === n ? "selected" : ""}>${n} colors</option>`).join("")}</select></label></div><label class="title-label">Picture name<input id="picture-title" maxlength="60" value="${escape(source.title)}"></label><button class="button primary" id="start" disabled>Let’s color ${icon("ArrowRight")}</button></section></div></section>`);
  $("#change-image").onclick = () => navigate("#/create");
  $("#picture-title").oninput = (event) => {
    source.title = event.target.value;
  };
  const drawCrop = () => {
    const crop = cropImage(source.canvas, settings, 480);
    const canvas = $("#crop-preview");
    canvas.width = canvas.height = 480;
    canvas.getContext("2d").drawImage(crop, 0, 0);
  };
  const startButton = $("#start");
  const previewPanel = $("#generated-preview");
  const previewMeta = $("#preview-meta");
  let previewTimer;
  const updatePreview = () => {
    clearTimeout(previewTimer);
    draft = null;
    startButton.disabled = true;
    previewPanel.setAttribute("aria-busy", "true");
    previewMeta.textContent = "Updating your picture…";
    previewTimer = setTimeout(() => {
      if (!previewPanel.isConnected) return;
      try {
        const nextDraft = processImage(source.canvas, settings);
        previewPanel.innerHTML =
          '<canvas id="puzzle-preview" aria-label="Your picture with numbered squares"></canvas>';
        renderMini($("#puzzle-preview"), nextDraft);
        draft = nextDraft;
        previewMeta.textContent =
          `${draft.width} × ${draft.height} squares · ${draft.palette.length} ${draft.palette.length === 1 ? "color" : "colors"}`;
        startButton.disabled = false;
      } catch (error) {
        previewMeta.textContent = "Could not update this picture. Try another setting or picture.";
        notice(error.message);
      } finally {
        previewPanel.setAttribute("aria-busy", "false");
      }
    }, 180);
  };
  dispose = () => clearTimeout(previewTimer);
  const updateCrop = ({ x = settings.x, y = settings.y, zoom = settings.zoom }) => {
    x = Math.max(0, Math.min(100, x));
    y = Math.max(0, Math.min(100, y));
    zoom = Math.max(1, Math.min(3, zoom));
    if (x === settings.x && y === settings.y && zoom === settings.zoom) return;
    Object.assign(settings, { x, y, zoom });
    $("#crop-zoom").value = zoom;
    drawCrop();
    updatePreview();
  };
  const cropPreview = $("#crop-preview");
  bindCropInteraction({ canvas: cropPreview, source: source.canvas, settings, onChange: updateCrop });
  cropPreview.onkeydown = (event) => {
    const moves = { ArrowLeft: [-2, 0], ArrowRight: [2, 0], ArrowUp: [0, -2], ArrowDown: [0, 2] };
    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();
    updateCrop({ x: settings.x + move[0], y: settings.y + move[1] });
  };
  $("#crop-zoom").oninput = (event) => updateCrop({ zoom: +event.target.value });
  const updatePresets = () =>
    app.querySelectorAll(".preset").forEach((button) => {
      const active =
        +button.dataset.grid === settings.grid &&
        +button.dataset.colors === settings.colors;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", active);
    });
  app.querySelectorAll(".preset").forEach((button) => {
    button.onclick = () => {
      settings.grid = +button.dataset.grid;
      settings.colors = +button.dataset.colors;
      $("#grid-size").value = settings.grid;
      $("#palette-size").value = settings.colors;
      updatePresets();
      updatePreview();
    };
  });
  $("#grid-size").onchange = (event) => {
    settings.grid = +event.target.value;
    updatePresets();
    updatePreview();
  };
  $("#palette-size").onchange = (event) => {
    settings.colors = +event.target.value;
    updatePresets();
    updatePreview();
  };
  $("#start").onclick = () => {
    if (!draft) return;
    const record = {
      id: crypto.randomUUID(),
      title: $("#picture-title").value.trim() || source.title,
      definition: draft,
      progress: draft.cells.map(() => false),
      settings: { ...settings },
      preview: source.blob,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    persist(record, record.progress);
    navigate(`#/puzzle/${record.id}`);
  };
  drawCrop();
  updatePresets();
  updatePreview();
}
function showPlay(record) {
  let state;
  try {
    state = createState(record.definition, record.progress);
  } catch (error) {
    notice(error.message);
    return;
  }
  current = { record, state };
  let selected =
    record.definition.palette.find((p) =>
      state.definition.cells.some((id, i) => id === p.id && !state.progress[i]),
    )?.id || 1;
  let scale = 1,
    panning = false,
    wasComplete = summary(state).complete,
    hintTimer,
    wrongTimer,
    resizeFrame,
    visibleColor;
  mount(`<section class="play-screen"><div class="play-heading"><a class="back-button" id="back" href="#/library">${icon("ArrowLeft")} My pictures</a><div class="play-title"><h1>${escape(record.title)}</h1><span id="progress-text"></span></div></div><progress id="progress" max="100" value="0" aria-label="Puzzle completion"></progress>
    <div class="workspace"><div class="canvas-area"><div class="canvas-toolbar" role="toolbar" aria-label="Coloring tools"><button class="tool" id="undo" aria-label="Undo coloring" title="Undo">${icon("Undo2")}</button><button class="tool" id="paint-mode" aria-label="Paint and choose brush size" aria-pressed="true" popovertarget="brush-settings" title="Brush size">${icon("Paintbrush")}</button><button class="tool" id="pan" aria-label="Move picture" aria-pressed="false" title="Move picture">${icon("Hand")}</button><button class="tool icon-action" id="show-picture" aria-label="Show the finished picture for a moment" aria-pressed="false">${icon("Eye")}<span>Show</span></button><button class="tool icon-action" id="hint" aria-label="Hint: show all remaining squares of this color">${icon("Search")}<span>Hint</span></button><button class="tool" id="picture-tools-button" popovertarget="picture-options" aria-label="More picture tools" title="More tools">${icon("Ellipsis")}</button></div>
    <div class="viewport" id="viewport"><canvas id="puzzle-canvas" tabindex="0" role="application" aria-label="Coloring grid. Use arrow keys to move and press Space to color. Choose a numbered color first."></canvas></div></div>
    <aside class="palette-panel" aria-label="Your colors"><div class="palette" id="palette" role="group" aria-label="Numbered colors"></div></aside></div>
    <div class="play-popover" id="brush-settings" popover><h2>Brush size</h2><div class="brush-sizes" role="group" aria-label="Brush size">${[[0,"1 square",4],[1,"Small",7],[3,"Medium",12],[5,"Large",18]].map(([radius,label,size]) => `<button class="brush-size" data-radius="${radius}" aria-label="${label} brush" title="${label}" aria-pressed="${brushRadius === radius}"><span class="brush-dot ${radius === 0 ? "brush-pixel" : ""}" style="--dot-size:${size}px" aria-hidden="true"></span></button>`).join("")}</div></div>
    <div class="play-popover" id="picture-options" popover><h2>Picture tools</h2><div class="tool-group"><button class="tool" id="zoom-out" aria-label="Zoom out">${icon("Minus")}</button><button class="zoom-value" id="fit" title="Fit picture">100%</button><button class="tool" id="zoom-in" aria-label="Zoom in">${icon("Plus")}</button><button class="tool" id="redo" aria-label="Redo coloring" title="Redo">${icon("Redo2")}</button></div><p id="colors-done"></p><div class="selected-info" id="selected-info"></div><button class="button subtle" id="reset">Start again ${icon("RotateCcw")}</button><p class="picture-dimensions">${record.definition.width} × ${record.definition.height} squares</p></div>
    <dialog class="completion-dialog" id="completion-dialog" aria-labelledby="completion-title"><div class="completion-card"><button class="completion-close" id="completion-close" aria-label="Close and see your picture">${icon("X")}</button><span class="complete-flower" aria-hidden="true">${icon("Flower2")}</span><h2 id="completion-title">Hooray! You finished!</h2><p>Every square is colored. What would you like to do?</p><div class="completion-actions"><button class="button primary" id="new-picture">Another picture ${icon("ArrowRight")}</button><button class="button secondary" id="completion-reset">Start again ${icon("RotateCcw")}</button></div></div></dialog></section>`);
  const popovers = [
    [$("#brush-settings"), $("#paint-mode")],
    [$("#picture-options"), $("#picture-tools-button")],
  ];
  const positionPopover = (popover, button) => {
    const rect = button.getBoundingClientRect();
    const halfWidth = popover.offsetWidth / 2;
    const center = Math.max(12 + halfWidth, Math.min(window.innerWidth - 12 - halfWidth, rect.left + rect.width / 2));
    popover.style.left = `${center}px`;
    popover.style.top = `${rect.bottom + 8}px`;
  };
  const repositionOpenPopovers = () => popovers.forEach(([popover, button]) => {
    if (popover.matches(":popover-open")) positionPopover(popover, button);
  });
  popovers.forEach(([popover, button]) => popover.addEventListener("toggle", (event) => {
    if (event.newState === "open") requestAnimationFrame(() => positionPopover(popover, button));
  }));
  window.addEventListener("resize", repositionOpenPopovers);
  const canvas = $("#puzzle-canvas"),
    viewport = $("#viewport");
  const renderer = new PuzzleCanvas(canvas, record.definition, state.progress);
  renderer.selected = selected;
  const hintMarker = new HintMarker(viewport, canvas, record.definition.width);
  let baseSize = 500;
  const fitSize = () => {
    baseSize = fitGrid(
      viewport.clientWidth,
      viewport.clientHeight,
    );
    renderer.resize(Math.round(baseSize * scale));
    hintMarker.update();
  };
  const zoom = (value) => {
    if (value === undefined) return scale;
    const before = scale;
    scale = Math.max(1, Math.min(4, value));
    if (before !== scale) {
      const x = (viewport.scrollLeft + viewport.clientWidth / 2) / before;
      const y = (viewport.scrollTop + viewport.clientHeight / 2) / before;
      fitSize();
      viewport.scrollLeft = x * scale - viewport.clientWidth / 2;
      viewport.scrollTop = y * scale - viewport.clientHeight / 2;
    }
    $("#fit").textContent = `${Math.round(scale * 100)}%`;
    $("#zoom-out").disabled = scale <= 1;
    $("#zoom-in").disabled = scale >= 4;
    return scale;
  };
  record.definition.palette.forEach((p) => {
    const button = document.createElement("button");
    button.className = "swatch";
    button.dataset.id = p.id;
    button.style.setProperty("--swatch", p.color);
    const [r, g, b] = p.color
      .match(/[a-f0-9]{2}/gi)
      .map((n) => parseInt(n, 16));
    button.style.setProperty(
      "--number",
      r * 0.299 + g * 0.587 + b * 0.114 > 150 ? "#342b32" : "#fff",
    );
    button.innerHTML = `<span class="swatch-circle">${p.id}<span class="swatch-check" aria-hidden="true">${icon("Check")}</span></span><span class="swatch-count"></span>`;
    button.onclick = () => {
      hintMarker.clear();
      selected = p.id;
      renderer.selected = selected;
      renderer.draw();
      updateUI();
    };
    $("#palette").append(button);
  });
  const celebrate = () => {
    const phone = window.innerWidth <= 600;
    const compact = window.innerWidth <= 1000;
    const options = {
      colors: ["#edbd59", "#c78365", "#739485", "#9279b0", "#f5a6ba"],
      shapes: ["circle", "square"], scalar: compact ? 1.2 : 1.6, ticks: 240,
      gravity: 0.8, disableForReducedMotion: true,
    };
    for (const x of [0.15, 0.5, 0.85]) {
      confetti({ ...options, particleCount: phone ? 20 : compact ? 35 : 60, spread: 160, angle: 270,
        startVelocity: 22, origin: { x, y: 0.05 } });
    }
    confetti({ ...options, particleCount: phone ? 30 : compact ? 45 : 80, spread: 120, startVelocity: compact ? 40 : 60,
      origin: { x: 0.5, y: 0.9 } });
  };
  const updateUI = () => {
    const stats = summary(state);
    $("#progress").value = stats.percent;
    $("#progress-text").textContent = `${stats.percent}% colored`;
    $("#colors-done").textContent =
      `${Object.values(stats.remaining).filter((n) => n === 0).length} / ${record.definition.palette.length} done`;
    $("#selected-info").hidden = stats.complete;
    $("#selected-info").textContent = stats.complete
      ? "Picture finished!"
      : `color ${selected} · ${stats.remaining[selected]} ${stats.remaining[selected] === 1 ? "square" : "squares"} to go`;
    app.querySelectorAll(".swatch").forEach((button) => {
      const id = +button.dataset.id,
        remaining = stats.remaining[id];
      button.classList.toggle("selected", id === selected);
      button.classList.toggle("done", !remaining);
      button.setAttribute("aria-pressed", id === selected);
      button.setAttribute(
        "aria-label",
        `color ${id}, ${remaining ? `${remaining} ${remaining === 1 ? "square" : "squares"} left` : "complete"}`,
      );
      button.querySelector(".swatch-count").textContent = remaining
        ? `${remaining} left`
        : "Done!";
    });
    if (visibleColor !== selected) {
      app.querySelector(`.swatch[data-id="${selected}"]`)?.scrollIntoView({ block: "nearest", inline: "nearest" });
      visibleColor = selected;
    }
    $("#undo").disabled = !state.undo.length;
    $("#redo").disabled = !state.redo.length;
    const completionDialog = $("#completion-dialog");
    $("#reset").hidden = stats.complete && completionDialog.open;
    $("#selected-info").hidden = stats.complete && completionDialog.open;
    if (stats.complete && !wasComplete && !completionDialog.open) {
      app.querySelectorAll(".play-popover").forEach((panel) => panel.hidePopover());
      completionDialog.showModal();
      $("#new-picture").focus();
    } else if (!stats.complete && completionDialog.open) {
      completionDialog.close();
    }
    $("#hint").disabled = !stats.remaining[selected];
    if (!stats.complete && wasComplete) confetti.reset();
    if (stats.complete && !wasComplete) {
      celebrate();
      announce("Hooray! You finished! Your picture is complete.");
    }
    wasComplete = stats.complete;
  };
  const finish = () => {
    const changed = state.stroke.length > 0;
    endStroke(state);
    if (changed) {
      const stats = summary(state);
      if (!stats.remaining[selected]) {
        selected =
          record.definition.palette.find((p) => stats.remaining[p.id] > 0)
            ?.id || selected;
        renderer.selected = selected;
        renderer.draw();
      }
      persist(record, state.progress);
      updateUI();
    }
  };
  app.querySelectorAll("[data-radius]").forEach((button) => {
    button.onclick = () => {
      finish();
      brushRadius = +button.dataset.radius;
      $("#brush-settings").hidePopover();
      app.querySelectorAll("[data-radius]").forEach((item) => {
        item.setAttribute("aria-pressed", +item.dataset.radius === brushRadius);
      });
    };
  });
  const fill = (index) => {
    if (renderer.hint || index < 0 || index >= state.progress.length) return;
    const changed = paintBrush(state, index, selected, brushRadius);
    changed.forEach((cell) => renderer.drawCell(cell));
    if (changed.length) hintMarker.remove(changed);
    if (!changed.length &&
      !state.progress[index] &&
      record.definition.cells[index] !== selected
    ) {
      const before = renderer.bad;
      renderer.bad = index;
      if (before >= 0) renderer.drawCell(before);
      renderer.drawCell(index);
      clearTimeout(wrongTimer);
      wrongTimer = setTimeout(() => {
        renderer.bad = -1;
        renderer.drawCell(index);
      }, 240);
    }
  };
  bindInteraction({
    canvas,
    viewport,
    renderer,
    fill,
    finish,
    zoom,
    isPanning: () => panning,
    announce,
  });
  $("#undo").onclick = () => {
    hintMarker.clear();
    undo(state);
    renderer.draw();
    updateUI();
    persist(record, state.progress);
  };
  $("#redo").onclick = () => {
    hintMarker.clear();
    redo(state);
    renderer.draw();
    updateUI();
    persist(record, state.progress);
  };
  const resetPicture = async () => {
    if (
      !(await confirmAction(
        "Start this picture again?",
        "This will clear the colors you added. You can press Undo to get them back.",
      ))
    )
      return;
    hintMarker.clear();
    reset(state);
    renderer.draw();
    updateUI();
    announce("Picture started again. Choose a color and start coloring.");
    persist(record, state.progress);
  };
  $("#reset").onclick = resetPicture;
  $("#completion-reset").onclick = resetPicture;
  $("#zoom-in").onclick = () => zoom(scale + 0.5);
  $("#zoom-out").onclick = () => zoom(scale - 0.5);
  $("#fit").onclick = () => zoom(1);
  $("#paint-mode").onclick = () => {
    panning = false;
    $("#pan").setAttribute("aria-pressed", "false");
    $("#paint-mode").setAttribute("aria-pressed", "true");
    canvas.classList.remove("panning");
  };
  $("#pan").onclick = () => {
    panning = !panning;
    $("#pan").setAttribute("aria-pressed", panning);
    $("#paint-mode").setAttribute("aria-pressed", !panning);
    canvas.classList.toggle("panning", panning);
  };
  $("#show-picture").onclick = () => {
    hintMarker.clear();
    renderer.hint = !renderer.hint;
    $("#show-picture").setAttribute("aria-pressed", renderer.hint);
    renderer.draw();
    clearTimeout(hintTimer);
    if (renderer.hint)
      hintTimer = setTimeout(() => {
        renderer.hint = false;
        $("#show-picture")?.setAttribute("aria-pressed", "false");
        renderer.draw();
      }, 2200);
  };
  $("#hint").onclick = () => {
    const indices = findHints(state, selected);
    if (!indices.length) return;
    clearTimeout(hintTimer);
    renderer.hint = false;
    $("#show-picture").setAttribute("aria-pressed", "false");
    renderer.draw();
    hintMarker.show(indices);
    announce(`Hint: ${indices.length} ${indices.length === 1 ? "square" : "squares"} left for color ${selected}.`);
  };
  const completionDialog = $("#completion-dialog");
  $("#completion-close").onclick = () => completionDialog.close();
  completionDialog.addEventListener("click", (event) => {
    if (event.target === completionDialog) completionDialog.close();
  });
  completionDialog.addEventListener("close", () => {
    if (!summary(state).complete) return;
    $("#selected-info").hidden = false;
    $("#reset").hidden = false;
  });
  $("#new-picture").onclick = () => navigate("#/create");
  const keyboard = (event) => {
    if (
      !(event.ctrlKey || event.metaKey) ||
      event.key.toLowerCase() !== "z" ||
      document.querySelector("dialog[open]")
    )
      return;
    event.preventDefault();
    (event.shiftKey ? $("#redo") : $("#undo")).click();
  };
  document.addEventListener("keydown", keyboard);
  const observer = new ResizeObserver(() => {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(fitSize);
  });
  observer.observe(viewport);
  dispose = () => {
    finish();
    observer.disconnect();
    cancelAnimationFrame(resizeFrame);
    clearTimeout(hintTimer);
    clearTimeout(wrongTimer);
    hintMarker.clear();
    confetti.reset();
    window.removeEventListener("resize", repositionOpenPopovers);
    document.removeEventListener("keydown", keyboard);
  };
  fitSize();
  zoom(1);
  updateUI();
}

window.addEventListener("dragover", (event) => {
  if (event.dataTransfer.types.includes("Files")) {
    event.preventDefault();
    $("#drop-zone")?.classList.add("dragover");
  }
});
window.addEventListener("dragleave", (event) => {
  if (!event.relatedTarget) $("#drop-zone")?.classList.remove("dragover");
});
window.addEventListener("drop", (event) => {
  event.preventDefault();
  $("#drop-zone")?.classList.remove("dragover");
  pick(event.dataTransfer.files[0]);
});
window.addEventListener("paste", (event) => {
  if (event.target.matches("input,textarea")) return;
  const file = [...(event.clipboardData?.items || [])]
    .find((item) => item.type.startsWith("image/"))
    ?.getAsFile();
  if (file) {
    event.preventDefault();
    pick(file);
  }
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden && current) {
    endStroke(current.state);
    persist(current.record, current.state.progress);
  }
});
window.addEventListener("pagehide", () => {
  if (current) persist(current.record, current.state.progress);
});
document.querySelector("#library-link span").innerHTML = icon("Images");
window.addEventListener("hashchange", renderRoute);
renderRoute();
