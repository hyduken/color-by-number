import { utils, buildPaletteSync, applyPaletteSync } from "image-q";

export function quantize({ width, height, data }, colors) {
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < 1 ||
    height < 1 ||
    width * height > 1_000_000 ||
    data.length !== width * height * 4 ||
    !Number.isInteger(colors) ||
    colors < 1 ||
    colors > 32
  ) {
    throw new Error("Invalid image dimensions or palette size.");
  }
  const opaque = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3] / 255;
    for (let c = 0; c < 3; c++)
      opaque[i + c] = Math.round(data[i + c] * alpha + 255 * (1 - alpha));
    opaque[i + 3] = 255;
  }
  const image = utils.PointContainer.fromUint8Array(opaque, width, height);
  const generated = buildPaletteSync([image], {
    colors,
    paletteQuantization: "wuquant",
    colorDistanceFormula: "euclidean-bt709",
  });
  const mapped = applyPaletteSync(image, generated, {
    imageQuantization: "nearest",
    colorDistanceFormula: "euclidean-bt709",
  });
  const palette = [];
  const cells = mapped.getPointArray().map(({ r, g, b }) => {
    // Merge only near-identical shades, retaining the quantizer's natural colors.
    let index = palette.findIndex(
      (p) => Math.hypot(p.rgb[0] - r, p.rgb[1] - g, p.rgb[2] - b) < 12,
    );
    if (index < 0) {
      index = palette.length;
      palette.push({
        id: index + 1,
        color:
          "#" + [r, g, b].map((c) => c.toString(16).padStart(2, "0")).join(""),
        rgb: [r, g, b],
      });
    }
    return index + 1;
  });
  return {
    width,
    height,
    palette: palette.map(({ id, color }) => ({ id, color })),
    cells,
  };
}
