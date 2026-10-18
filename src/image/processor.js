import { quantize } from "./quantize.js";

export async function loadImage(file) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error("Choose a JPG, PNG or WebP picture.");
  if (file.size > 25 * 1024 * 1024)
    throw new Error("This picture is too big. Choose one smaller than 25 MB.");
  const url = URL.createObjectURL(file);
  const image = new Image();
  try {
    image.src = url;
    await image.decode();
    if (
      !image.naturalWidth ||
      image.naturalWidth * image.naturalHeight > 60_000_000
    )
      throw new Error("Choose a picture smaller than 60 megapixels.");
    const scale = Math.min(
      1,
      1600 / Math.max(image.naturalWidth, image.naturalHeight),
    );
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.88),
    );
    if (!blob) throw new Error("Could not prepare this picture. Try another.");
    return {
      canvas,
      blob,
      title: file.name.replace(/\.[^.]+$/, "").slice(0, 60) || "My picture",
    };
  } catch (error) {
    if (error.name === "EncodingError")
      throw new Error(
        "We could not open that picture. Try a different JPG, PNG or WebP.",
      );
    throw error;
  } finally {
    URL.revokeObjectURL(url);
  }
}
export function cropImage(source, settings, size) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const side = Math.min(source.width, source.height) / settings.zoom;
  const x = ((source.width - side) * settings.x) / 100;
  const y = ((source.height - side) * settings.y) / 100;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, x, y, side, side, 0, 0, size, size);
  return canvas;
}
export function processImage(source, settings) {
  const canvas = cropImage(source, settings, settings.grid);
  return quantize(
    canvas.getContext("2d").getImageData(0, 0, settings.grid, settings.grid),
    settings.colors,
  );
}

export function demoImage() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 320;
  const ctx = canvas.getContext("2d");
  const rows = [
    "................",
    "................",
    "....yy....yy....",
    "...yyyy..yyyy...",
    "..yyyyyyyyyyyy..",
    "..yykkyyyykkyy..",
    "..yykkyyyykkyy..",
    "..yyyyyyyyyyyy..",
    "...yyyykkyyyy...",
    "....yykrrkyy....",
    ".....yyyyyy.....",
    "...ggyyyyyygg...",
    "..ggggyyyygggg..",
    "..gggggyyggggg..",
    "...gggggggggg...",
    "................",
  ];
  const colors = {
    ".": "#dcebe7",
    y: "#edbb55",
    k: "#51443e",
    r: "#d67863",
    g: "#659b7b",
  };
  rows.forEach((row, y) =>
    [...row].forEach((c, x) => {
      ctx.fillStyle = colors[c];
      ctx.fillRect(x * 20, y * 20, 20, 20);
    }),
  );
  return canvas;
}
