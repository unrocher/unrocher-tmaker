const fs = require("fs");
const path = require("path");

const DESIGNS_DIR = path.join(__dirname, "public", "designs");
const OUTPUT_FILE = path.join(__dirname, "src", "designs-data.js");
const PATCHES_FILE = path.join(__dirname, "design-placement-patches.cjs");

/**
 * 実寸(mm)
 * front / back 別指定可能
 */
const designRealSizeMm = {
  "unrocher-logo": {
    front: { widthMm: 300 },
    back: { widthMm: 300 },
  },
  "seekwords": {
    front: { widthMm: 280 },
    back: { widthMm: 280 },
  },
};

/**
 * デザイン全体の基準位置
 */
const designAnchors = {
  "unrocher-logo": { x: 50, y: 30 },
  "seekwords": { x: 50, y: 30 },
};

/**
 * 面ごとの差分
 */
const designPlacementOverrides = {
  "unrocher-logo": {
    front: { flipX: false },
    back: { flipX: false },
  },
  "seekwords": {
    front: { flipX: false },
    back: { flipX: false },
  },
};

const DEFAULT_WIDTH_CM = 28;
const DEFAULT_X = 50;
const DEFAULT_Y = 30;
const DEFAULT_FLIP_X = false;

function toTitleCaseFromId(id) {
  return id
    .split(/[-_]/g)
    .filter(Boolean)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");
}

function isSvgFile(fileName) {
  return /\.svg$/i.test(fileName);
}

function getAttr(tag, attrName) {
  const re = new RegExp(`${attrName}\\s*=\\s*"([^"]*)"`, "i");
  const match = tag.match(re);
  return match ? match[1] : null;
}

function parseNumeric(value) {
  if (!value) return null;
  const match = String(value).match(/-?\d+(\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function parseSvgMetrics(svgText) {
  const svgTagMatch = svgText.match(/<svg\b[^>]*>/i);
  if (!svgTagMatch) {
    return {
      width: null,
      height: null,
      aspectRatio: 1,
      viewBox: null,
      widthAttr: null,
      heightAttr: null,
    };
  }

  const svgTag = svgTagMatch[0];
  const widthAttr = getAttr(svgTag, "width");
  const heightAttr = getAttr(svgTag, "height");
  const viewBox = getAttr(svgTag, "viewBox");

  let width = null;
  let height = null;

  if (viewBox) {
    const parts = viewBox
      .trim()
      .split(/[\s,]+/)
      .map((n) => Number(n));

    if (parts.length === 4 && Number.isFinite(parts[2]) && Number.isFinite(parts[3])) {
      width = parts[2];
      height = parts[3];
    }
  }

  if ((!width || !height) && widthAttr && heightAttr) {
    const parsedWidth = parseNumeric(widthAttr);
    const parsedHeight = parseNumeric(heightAttr);

    if (Number.isFinite(parsedWidth) && Number.isFinite(parsedHeight)) {
      width = parsedWidth;
      height = parsedHeight;
    }
  }

  const aspectRatio =
    width && height && height !== 0 ? Number((width / height).toFixed(6)) : 1;

  return {
    width: width ?? null,
    height: height ?? null,
    aspectRatio,
    viewBox: viewBox ?? null,
    widthAttr: widthAttr ?? null,
    heightAttr: heightAttr ?? null,
  };
}

function roundPlacement(face) {
  if (!face || typeof face !== 'object') {
    return {
      x: DEFAULT_X,
      y: DEFAULT_Y,
      widthCm: DEFAULT_WIDTH_CM,
      flipX: DEFAULT_FLIP_X,
    };
  }

  return {
    ...(typeof face.x === "number" ? { x: Number(face.x.toFixed(2)) } : {}),
    ...(typeof face.y === "number" ? { y: Number(face.y.toFixed(2)) } : {}),
    widthCm:
      typeof face.widthCm === "number"
        ? Number(face.widthCm.toFixed(2))
        : DEFAULT_WIDTH_CM,
    flipX: typeof face.flipX === "boolean" ? face.flipX : DEFAULT_FLIP_X,
  };
}

function normalizePlacement(face, fallback) {
  return {
    x: typeof face?.x === "number" ? Number(face.x.toFixed(2)) : fallback.x,
    y: typeof face?.y === "number" ? Number(face.y.toFixed(2)) : fallback.y,
    widthCm:
      typeof face?.widthCm === "number"
        ? Number(face.widthCm.toFixed(2))
        : fallback.widthCm,
    flipX: typeof face?.flipX === "boolean" ? face.flipX : fallback.flipX,
  };
}

function getAnchor(designId) {
  return {
    x: designAnchors[designId]?.x ?? DEFAULT_X,
    y: designAnchors[designId]?.y ?? DEFAULT_Y,
  };
}

function getPlacementDefaults(designId, side) {
  const override = designPlacementOverrides[designId]?.[side] || {};
  const realSize = designRealSizeMm[designId]?.[side] || {};

  return {
    ...(override.x != null ? { x: override.x } : {}),
    ...(override.y != null ? { y: override.y } : {}),
    widthCm:
      realSize.widthMm != null
        ? Number((realSize.widthMm / 10).toFixed(2))
        : DEFAULT_WIDTH_CM,
    flipX: override.flipX ?? DEFAULT_FLIP_X,
  };
}

function loadPlacementPatches() {
  if (!fs.existsSync(PATCHES_FILE)) {
    return {};
  }

  try {
    delete require.cache[require.resolve(PATCHES_FILE)];
    const loaded = require(PATCHES_FILE);

    if (!loaded || typeof loaded !== "object") {
      console.warn(`placement patch が不正です: ${PATCHES_FILE}`);
      return {};
    }

    return loaded;
  } catch (error) {
    console.error(`placement patch の読み込みに失敗: ${PATCHES_FILE}`);
    console.error(error);
    return {};
  }
}

function getPatchedPlacementDefaults(designId, generatedDefaults, patches) {
  const patch = patches?.[designId]?.placementDefaults;
  if (!patch) return generatedDefaults;

  const frontFallback = normalizePlacement(generatedDefaults.front, {
    x: DEFAULT_X,
    y: DEFAULT_Y,
    widthCm: DEFAULT_WIDTH_CM,
    flipX: DEFAULT_FLIP_X,
  });

  const backFallback = normalizePlacement(generatedDefaults.back, {
    x: DEFAULT_X,
    y: DEFAULT_Y,
    widthCm: DEFAULT_WIDTH_CM,
    flipX: DEFAULT_FLIP_X,
  });

  return {
    front: normalizePlacement(patch.front, frontFallback),
    back: normalizePlacement(patch.back, backFallback),
  };
}

function getPatchedSavedBasePlacements(designId, placementDefaults, patches) {
  const patch = patches?.[designId]?.savedBasePlacements;
  if (!patch || typeof patch !== "object") return null;

  const frontFallback = normalizePlacement(placementDefaults.front, {
    x: DEFAULT_X,
    y: DEFAULT_Y,
    widthCm: DEFAULT_WIDTH_CM,
    flipX: DEFAULT_FLIP_X,
  });

  const backFallback = normalizePlacement(placementDefaults.back, {
    x: DEFAULT_X,
    y: DEFAULT_Y,
    widthCm: DEFAULT_WIDTH_CM,
    flipX: DEFAULT_FLIP_X,
  });

  const makeSide = (sidePatch, fallback) => {
    if (!sidePatch || typeof sidePatch !== "object") return null;

    const out = {};
    for (const sizeKey of ["120", "M", "XXL"]) {
      if (sidePatch[sizeKey]) {
        out[sizeKey] = normalizePlacement(sidePatch[sizeKey], fallback);
      }
    }

    return Object.keys(out).length ? out : null;
  };

  const front = makeSide(patch.front, frontFallback);
  const back = makeSide(patch.back, backFallback);

  if (!front && !back) return null;

  return {
    ...(front ? { front } : {}),
    ...(back ? { back } : {}),
  };
}

function buildDesignsData() {
  if (!fs.existsSync(DESIGNS_DIR)) {
    throw new Error(`designs フォルダが見つかりません: ${DESIGNS_DIR}`);
  }

  const patches = loadPlacementPatches();

  const dirEntries = fs
    .readdirSync(DESIGNS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory());

  const designs = [];

  for (const entry of dirEntries) {
    const designId = entry.name;
    const designDir = path.join(DESIGNS_DIR, designId);
    const files = fs.readdirSync(designDir).filter(isSvgFile);

    const frontFile =
      files.find((f) => /_front\.svg$/i.test(f)) ||
      files.find((f) => /front\.svg$/i.test(f)) ||
      null;

    const backFile =
      files.find((f) => /_back\.svg$/i.test(f)) ||
      files.find((f) => /back\.svg$/i.test(f)) ||
      null;

    if (!frontFile && !backFile) continue;

    const frontPath = frontFile ? `/designs/${designId}/${frontFile}` : "";
    const backPath = backFile ? `/designs/${designId}/${backFile}` : "";

    const emptyMeta = {
      width: null,
      height: null,
      aspectRatio: 1,
      viewBox: null,
      widthAttr: null,
      heightAttr: null,
    };

    const frontMetrics = frontFile
      ? parseSvgMetrics(fs.readFileSync(path.join(designDir, frontFile), "utf8"))
      : emptyMeta;

    const backMetrics = backFile
      ? parseSvgMetrics(fs.readFileSync(path.join(designDir, backFile), "utf8"))
      : emptyMeta;

    const generatedDefaults = {
      front: roundPlacement(getPlacementDefaults(designId, "front")),
      back: roundPlacement(getPlacementDefaults(designId, "back")),
    };

    const patchedDefaults = getPatchedPlacementDefaults(
      designId,
      generatedDefaults,
      patches
    );

    const savedBasePlacements = getPatchedSavedBasePlacements(
      designId,
      patchedDefaults,
      patches
    );

    designs.push({
      id: designId,
      name: toTitleCaseFromId(designId),
      front: frontPath,
      back: backPath,
      anchor: getAnchor(designId),
      svgMeta: {
        front: frontMetrics,
        back: backMetrics,
      },
      placementDefaults: patchedDefaults,
      ...(savedBasePlacements ? { savedBasePlacements } : {}),
    });
  }

  designs.sort((a, b) => a.id.localeCompare(b.id));
  return designs;
}

function generateFileContent(designs) {
  return `export const designs = ${JSON.stringify(designs, null, 2)};

export function getInitialPlacement(designId) {
  const design = designs.find((d) => d.id === designId);

  const anchorX = design?.anchor?.x ?? 50;
  const anchorY = design?.anchor?.y ?? 30;

  const front = design?.placementDefaults?.front ?? {};
  const back = design?.placementDefaults?.back ?? {};

  return {
    front: {
      x: front.x ?? anchorX,
      y: front.y ?? anchorY,
      widthCm: front.widthCm ?? 28,
      flipX: front.flipX ?? false
    },
    back: {
      x: back.x ?? anchorX,
      y: back.y ?? anchorY,
      widthCm: back.widthCm ?? 28,
      flipX: back.flipX ?? false
    }
  };
}

export function getSavedBasePlacements(designId) {
  const design = designs.find((d) => d.id === designId);
  return design?.savedBasePlacements ?? null;
}
`;
}

function main() {
  const designs = buildDesignsData();
  const content = generateFileContent(designs);

  fs.writeFileSync(OUTPUT_FILE, content, "utf8");

  console.log(`designs-data.js を生成しました: ${OUTPUT_FILE}`);
  console.log(`件数: ${designs.length}デザイン`);

  if (fs.existsSync(PATCHES_FILE)) {
    console.log(`placement patch 取り込み: ${PATCHES_FILE}`);
  } else {
    console.log("placement patch なし（通常生成）");
  }
}

main();