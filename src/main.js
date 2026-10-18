import "./styles/main.css";
import {
  loadImage,
  cropImage,
  processImage,
  demoImage,
} from "./image/processor.js";
import {
  createState,
  paint,
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
  const label = $("#save-status");
  if (label) label.textContent = "Saving…";
  saveQueue = saveQueue
    .catch(() => {})
    .then(() => savePuzzle(snapshot))
    .then(() => {
      if (memoryRecords.get(record.id) !== snapshot) return;
      if (current?.record.id === record.id && $("#save-status"))
        $("#save-status").textContent = "Saved on this device";
    })
    .catch(() => {
      if (memoryRecords.get(record.id) !== snapshot) return;
      if ($("#save-status"))
        $("#save-status").textContent = "Not saved — keep this tab open";
      notice(
        "Your browser could not save. Keep this tab open to keep coloring, and check device storage or private browsing settings.",
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
    showCreate();
  } catch (error) {
    notice(error.message);
  } finally {
    busy = false;
  }
}
function inputFile() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/jpeg,image/png,image/webp";
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
async function showHome(focusLibrary = false) {
  if (current) persist(current.record, current.state.progress);
  current = null;
  source = null;
  draft = null;
  mount(`<section class="home-hero">
    <div class="hero-copy"><h1>A little color.<br>A lot of <em>you.</em><span class="spark" aria-hidden="true">✳</span></h1>
    <p>Turn a favourite picture into a color-by-number adventure. One little square at a time.</p>
    <div class="upload-zone" id="drop-zone"><button class="button primary upload-button" id="upload"><span aria-hidden="true">＋</span> Choose a picture</button><span>or drop it here · JPG, PNG, WebP</span></div>
    <p class="local-note"><span aria-hidden="true">⌂</span> Your pictures stay right here, on your device.</p></div>
    <div class="hero-art"><div class="art-tape" aria-hidden="true"></div><div class="art-paper"><canvas id="hero-canvas" aria-label="A pixel-art cat, partly colored by number"></canvas><div class="art-caption"><span>Small squares, happy places.</span><span aria-hidden="true">☀</span></div></div><div class="floating-swatch swatch-yellow" aria-hidden="true">1</div><div class="floating-swatch swatch-green" aria-hidden="true">3</div></div>
    </section>
    <section class="library" id="library"><div class="section-heading"><h2>Your little masterpieces</h2><span id="library-count"></span></div><div id="saved-puzzles" class="saved-grid"><p class="muted">Opening your puzzle box…</p></div></section>
    <footer>Made for curious minds & colorful afternoons.<span>A Hyduken project</span></footer>`);
  $("#upload").onclick = inputFile;
  const demo = demoImage();
  const definition = processImage(demo, {
    grid: 16,
    colors: 6,
    x: 50,
    y: 50,
    zoom: 1,
  });
  const renderer = new PuzzleCanvas(
    $("#hero-canvas"),
    definition,
    definition.cells.map(
      (_, i) => i % 16 < 7 || (Math.floor(i / 16) > 10 && i % 16 < 11),
    ),
  );
  renderer.resize(400);
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
      "Saved puzzles are unavailable in this browser. You can still make and color a picture.",
    );
  }
  if (!$("#saved-puzzles")) return;
  const records = [...memoryRecords.values()].sort(
    (a, b) => b.updatedAt - a.updatedAt,
  );
  $("#library-count").textContent = records.length
    ? `${records.length} ${records.length === 1 ? "picture" : "pictures"}`
    : "";
  $("#saved-puzzles").innerHTML =
    `<button id="try-demo" class="demo-card"><span class="demo-flower" aria-hidden="true">✿</span><strong>Just want to try?</strong><span>color our sunny little cat <span aria-hidden="true">→</span></span></button>`;
  $("#try-demo").onclick = async () => {
    const canvas = demoImage();
    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/png"),
    );
    source = { canvas, blob, title: "Sunny little cat" };
    draft = null;
    settings = { grid: 16, colors: 6, x: 50, y: 50, zoom: 1 };
    showCreate();
  };
  records.forEach((record) => {
    const filled = record.progress.filter(Boolean).length;
    const percent = Math.floor((filled / record.definition.cells.length) * 100);
    const card = document.createElement("article");
    card.className = "saved-card";
    card.innerHTML = `<button class="open-puzzle"><canvas aria-hidden="true"></canvas><span class="saved-info"><strong>${escape(record.title)}</strong><span>${percent === 100 ? "Finished! ✨" : `${percent}% colored · ${record.definition.width} × ${record.definition.height}`}</span><span class="mini-progress"><i style="width:${percent}%"></i></span></span></button><button class="delete-puzzle" aria-label="Delete ${escape(record.title)}" title="Delete puzzle">×</button>`;
    $("#saved-puzzles").append(card);
    try {
      renderMini(card.querySelector("canvas"), record.definition);
    } catch {
      card.remove();
      return;
    }
    card.querySelector(".open-puzzle").onclick = () => showPlay(record);
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
        showHome(true);
      } catch {
        notice("Could not delete this picture. Please try again.");
      }
    };
  });
  if (focusLibrary) $("#library").scrollIntoView({ behavior: "instant" });
}
function showCreate() {
  mount(`<section class="create-screen"><button class="back-button" id="back">← All pictures</button><div class="create-heading"><h1>Make it your own.</h1><p>A little crop. A few colors. A new adventure.</p></div>
    <div class="create-layout"><section class="picture-panel"><div class="panel-heading"><h2>Your picture</h2><button class="button subtle" id="change-image">Change</button></div><div class="crop-frame"><canvas id="crop-preview" aria-label="Square crop preview"></canvas></div><div class="crop-controls"><label>Move across<input id="crop-x" type="range" min="0" max="100" value="${settings.x}"></label><label>Move up / down<input id="crop-y" type="range" min="0" max="100" value="${settings.y}"></label><label>Crop zoom<input id="crop-zoom" type="range" min="1" max="3" step="0.1" value="${settings.zoom}"></label></div></section>
    <section class="settings-panel"><h2>Pick your adventure</h2><div class="presets" role="group" aria-label="Difficulty"><button class="preset active" data-grid="16" data-colors="6"><span aria-hidden="true">✿</span>Easy<small>Little steps</small></button><button class="preset" data-grid="32" data-colors="8"><span aria-hidden="true">✳</span>Medium<small>A little more</small></button><button class="preset" data-grid="64" data-colors="16"><span aria-hidden="true">✷</span>Hard<small>Big adventure</small></button></div><div class="select-row"><label>Squares<select id="grid-size">${[16, 24, 32, 48, 64].map((n) => `<option value="${n}" ${settings.grid === n ? "selected" : ""}>${n} × ${n}</option>`).join("")}</select></label><label>colors<select id="palette-size">${[6, 8, 12, 16].map((n) => `<option value="${n}" ${settings.colors === n ? "selected" : ""}>${n} colors</option>`).join("")}</select></label></div><label class="title-label">Picture name<input id="picture-title" maxlength="60" value="${escape(source.title)}"></label><button class="button secondary" id="generate">Make my puzzle <span aria-hidden="true">↗</span></button><div class="generated-preview" id="generated-preview"><div class="preview-placeholder"><span aria-hidden="true">▦</span>Your puzzle will appear here</div></div><div class="preview-meta" id="preview-meta"></div><button class="button primary" id="start" disabled>Let’s color <span aria-hidden="true">→</span></button></section></div></section>`);
  $("#back").onclick = () => showHome();
  $("#change-image").onclick = inputFile;
  const drawCrop = () => {
    const crop = cropImage(source.canvas, settings, 480);
    const canvas = $("#crop-preview");
    canvas.width = canvas.height = 480;
    canvas.getContext("2d").drawImage(crop, 0, 0);
  };
  const invalidate = () => {
    draft = null;
    $("#start").disabled = true;
    $("#preview-meta").textContent =
      "Settings changed — make your puzzle again.";
  };
  for (const [id, key] of [
    ["crop-x", "x"],
    ["crop-y", "y"],
    ["crop-zoom", "zoom"],
  ]) {
    $(`#${id}`).oninput = (event) => {
      settings[key] = +event.target.value;
      drawCrop();
      invalidate();
    };
  }
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
      invalidate();
    };
  });
  $("#grid-size").onchange = (event) => {
    settings.grid = +event.target.value;
    updatePresets();
    invalidate();
  };
  $("#palette-size").onchange = (event) => {
    settings.colors = +event.target.value;
    updatePresets();
    invalidate();
  };
  $("#generate").onclick = async () => {
    const button = $("#generate");
    button.disabled = true;
    button.textContent = "Making little squares…";
    await new Promise((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(resolve)),
    );
    if (!button.isConnected) return;
    try {
      draft = processImage(source.canvas, settings);
      $("#generated-preview").innerHTML =
        '<canvas id="puzzle-preview" aria-label="Generated pixel-art puzzle preview"></canvas>';
      renderMini($("#puzzle-preview"), draft);
      $("#preview-meta").textContent =
        `${draft.width} × ${draft.height} squares · ${draft.palette.length} ${draft.palette.length === 1 ? "color" : "colors"}`;
      $("#start").disabled = false;
    } catch (error) {
      notice(error.message);
    } finally {
      button.disabled = false;
      button.innerHTML = 'Make my puzzle <span aria-hidden="true">↗</span>';
    }
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
    source = null;
    draft = null;
    showPlay(record);
    persist(record, record.progress);
  };
  drawCrop();
  updatePresets();
  $("#generate").click();
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
  source = null;
  draft = null;
  let selected =
    record.definition.palette.find((p) =>
      state.definition.cells.some((id, i) => id === p.id && !state.progress[i]),
    )?.id || 1;
  let scale = 1,
    panning = false,
    wasComplete = summary(state).complete,
    hintTimer,
    wrongTimer,
    resizeFrame;
  mount(`<section class="play-screen"><div class="play-heading"><button class="back-button" id="back">← My puzzles</button><span id="save-status">Saved on this device</span></div><div class="play-title"><h1>${escape(record.title)}</h1><span id="progress-text"></span></div><progress id="progress" max="100" value="0" aria-label="Puzzle completion"></progress>
    <div class="workspace"><div class="canvas-area"><div class="canvas-toolbar"><div class="tool-group"><button class="tool" id="undo" aria-label="Undo stroke" title="Undo (Ctrl/⌘ Z)">↶</button><button class="tool" id="redo" aria-label="Redo stroke" title="Redo (Ctrl/⌘ Shift Z)">↷</button></div><div class="tool-group"><button class="tool" id="pan" aria-label="Move picture" aria-pressed="false" title="Move picture">✥</button><button class="tool" id="zoom-out" aria-label="Zoom out">−</button><button class="zoom-value" id="fit" title="Fit picture">100%</button><button class="tool" id="zoom-in" aria-label="Zoom in">＋</button></div><button class="button subtle" id="hint">Peek <span aria-hidden="true">◉</span></button></div>
    <div class="viewport" id="viewport"><canvas id="puzzle-canvas" tabindex="0" role="application" aria-label="coloring grid. Use arrow keys to move and Space to color. Choose a numbered color first." aria-describedby="canvas-help"></canvas></div><p class="canvas-help" id="canvas-help">Pick a color, then tap or drag over its number.<span>Pinch to zoom · ✥ to move</span></p></div>
    <aside class="palette-panel"><div class="palette-heading"><h2>Your colors</h2><span id="colors-done"></span></div><div class="palette" id="palette" role="group" aria-label="Numbered colors"></div><div class="selected-info" id="selected-info"></div><div class="completion" id="completion" hidden><span class="complete-flower" aria-hidden="true">✿</span><h2>You made this!</h2><p>Every little square, all you.</p><button class="button primary" id="new-picture">Another adventure →</button></div><div class="palette-bottom"><button class="button subtle" id="reset">Start again ↶</button><span>${record.definition.width} × ${record.definition.height} little squares</span></div></aside></div></section>`);
  const canvas = $("#puzzle-canvas"),
    viewport = $("#viewport");
  const renderer = new PuzzleCanvas(canvas, record.definition, state.progress);
  renderer.selected = selected;
  let baseSize = 500;
  const fitSize = () => {
    baseSize = fitGrid(
      viewport.clientWidth,
      window.innerWidth > 700
        ? viewport.clientHeight
        : window.innerHeight * 0.65,
    );
    renderer.resize(Math.round(baseSize * scale));
    $("#canvas-help").firstChild.textContent =
      renderer.size / record.definition.width < 12
        ? "Zoom in for bigger numbers, then tap or drag to color."
        : "Pick a color, then tap or drag over its number.";
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
    button.innerHTML = `<span class="swatch-circle">${p.id}<span class="swatch-check" aria-hidden="true">✓</span></span><span class="swatch-count"></span>`;
    button.onclick = () => {
      selected = p.id;
      renderer.selected = selected;
      renderer.draw();
      updateUI();
    };
    $("#palette").append(button);
  });
  const updateUI = () => {
    const stats = summary(state);
    $("#progress").value = stats.percent;
    $("#progress-text").textContent = `${stats.percent}% colored`;
    $("#colors-done").textContent =
      `${Object.values(stats.remaining).filter((n) => n === 0).length} / ${record.definition.palette.length} done`;
    $("#selected-info").textContent = stats.complete
      ? "All the colors, all filled in."
      : `color ${selected} · ${stats.remaining[selected]} squares to go`;
    app.querySelectorAll(".swatch").forEach((button) => {
      const id = +button.dataset.id,
        remaining = stats.remaining[id];
      button.classList.toggle("selected", id === selected);
      button.classList.toggle("done", !remaining);
      button.setAttribute("aria-pressed", id === selected);
      button.setAttribute(
        "aria-label",
        `color ${id}, ${remaining ? `${remaining} squares left` : "complete"}`,
      );
      button.querySelector(".swatch-count").textContent = remaining
        ? `${remaining} left`
        : "Done!";
    });
    $("#undo").disabled = !state.undo.length;
    $("#redo").disabled = !state.redo.length;
    $("#completion").hidden = !stats.complete;
    if (stats.complete && !wasComplete) {
      $("#completion").classList.remove("celebrate");
      void $("#completion").offsetWidth;
      $("#completion").classList.add("celebrate");
      announce("You did it! Your picture is complete.");
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
  const fill = (index) => {
    if (renderer.hint || index < 0) return;
    if (paint(state, index, selected)) renderer.drawCell(index);
    else if (
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
  $("#back").onclick = () => {
    finish();
    showHome(true);
  };
  $("#undo").onclick = () => {
    undo(state);
    renderer.draw();
    updateUI();
    persist(record, state.progress);
  };
  $("#redo").onclick = () => {
    redo(state);
    renderer.draw();
    updateUI();
    persist(record, state.progress);
  };
  $("#reset").onclick = async () => {
    if (
      !(await confirmAction(
        "A fresh start?",
        "Your coloring will be cleared. You can use Undo if you change your mind.",
      ))
    )
      return;
    reset(state);
    renderer.draw();
    updateUI();
    persist(record, state.progress);
  };
  $("#zoom-in").onclick = () => zoom(scale + 0.5);
  $("#zoom-out").onclick = () => zoom(scale - 0.5);
  $("#fit").onclick = () => zoom(1);
  $("#pan").onclick = () => {
    panning = !panning;
    $("#pan").setAttribute("aria-pressed", panning);
    canvas.classList.toggle("panning", panning);
  };
  $("#hint").onclick = () => {
    renderer.hint = !renderer.hint;
    $("#hint").setAttribute("aria-pressed", renderer.hint);
    renderer.draw();
    clearTimeout(hintTimer);
    if (renderer.hint)
      hintTimer = setTimeout(() => {
        renderer.hint = false;
        $("#hint")?.setAttribute("aria-pressed", "false");
        renderer.draw();
      }, 2200);
  };
  $("#new-picture").onclick = inputFile;
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
    document.removeEventListener("keydown", keyboard);
  };
  fitSize();
  zoom(1);
  updateUI();
}

document.querySelector(".brand").onclick = (event) => {
  event.preventDefault();
  showHome();
};
document.querySelector("#library-link").onclick = () => showHome(true);
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
showHome();
