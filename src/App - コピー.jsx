import React, { useEffect, useMemo, useRef, useState } from "react";
import { shirts } from "./shirts-data";
import { designs, getInitialPlacement } from "./designs-data";

const inkPresets = [
  { id: "light-green", name: "浅緑 / ライトグリーン", color: "#c7d2bc" },
  { id: "vermilion", name: "朱 / バーミリオン", color: "#bd1737" },
  { id: "light-gray", name: "深川鼠色 / ライトグレー", color: "#b7b7b9" },
  { id: "brown", name: "茶 / パイロンブラウン", color: "#835632" },
  { id: "anrocher-blue", name: "蒼緑 / アンロシェブルー", color: "#41b4bb" },
  { id: "black", name: "黒 / ブラック", color: "#201010" },
  { id: "white", name: "白 / ホワイト", color: "#ffffff" },
  { id: "masking-green", name: "若草 / マスキンググリーン", color: "#85c17a" },
  { id: "anrocher-pink", name: "薄橙 / アンロシェピンク", color: "#eac8bd" },
];

const sizeSpec = {
  "120": { code: "21", bodyLengthCm: 48 },
  "130": { code: "22", bodyLengthCm: 52 },
  "140": { code: "23", bodyLengthCm: 56 },
  "150": { code: "24", bodyLengthCm: 60 },
  XS: { code: "98", bodyLengthCm: 63 },
  S: { code: "01", bodyLengthCm: 66 },
  M: { code: "02", bodyLengthCm: 70 },
  L: { code: "03", bodyLengthCm: 74 },
  XL: { code: "07", bodyLengthCm: 78 },
  XXL: { code: "45", bodyLengthCm: 82 },
};

const ALL_SIZES = ["120", "130", "140", "150", "XS", "S", "M", "L", "XL", "XXL"];
const EDITABLE_SIZES = ["120", "M", "XXL"];

const BASE_PRINT_SIZE = "M";
const PLACEMENT_STORAGE_KEY = "anrocher-design-placements-v5";
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const HANDLE_SIZE = 14;
const MIN_WIDTH_CM = 5;
const MAX_WIDTH_CM = 45;

function forceSingleColorSvg(svgText, color) {
  if (!svgText) return "";

  let out = svgText;

  const normalize = (value) =>
    String(value).trim().toLowerCase().replace(/\s+/g, "");

  const isWhite = (value) => {
    const v = normalize(value);
    return (
      v === "#fff" ||
      v === "#ffffff" ||
      v === "white" ||
      v === "rgb(255,255,255)" ||
      v === "rgb(100%,100%,100%)"
    );
  };

  const isNone = (value) => normalize(value) === "none";

  out = out.replace(/fill\s*:\s*([^;"']+)/gi, (match, value) => {
    if (isNone(value)) return match;
    if (isWhite(value)) return "fill:none";
    return `fill:${color}`;
  });

  out = out.replace(/stroke\s*:\s*([^;"']+)/gi, (match, value) => {
    if (isNone(value)) return match;
    if (isWhite(value)) return "stroke:none";
    return `stroke:${color}`;
  });

  out = out.replace(/fill="([^"]*)"/gi, (match, value) => {
    if (isNone(value)) return match;
    if (isWhite(value)) return 'fill="none"';
    return `fill="${color}"`;
  });

  out = out.replace(/stroke="([^"]*)"/gi, (match, value) => {
    if (isNone(value)) return match;
    if (isWhite(value)) return 'stroke="none"';
    return `stroke="${color}"`;
  });

  out = out.replace(
    /<(path|polygon|rect|circle|ellipse|text|polyline)([^>]*?)\/>/gi,
    (m, tag, attrs) => {
      const hasFill = /\sfill=/.test(attrs) || /fill\s*:/.test(attrs);
      const hasStroke = /\sstroke=/.test(attrs) || /stroke\s*:/.test(attrs);
      if (hasFill || hasStroke) return m;
      return `<${tag}${attrs} fill="${color}" />`;
    }
  );

  out = out.replace(
    /<(path|polygon|rect|circle|ellipse|text|polyline)([^>]*?)>/gi,
    (m, tag, attrs) => {
      const hasFill = /\sfill=/.test(attrs) || /fill\s*:/.test(attrs);
      const hasStroke = /\sstroke=/.test(attrs) || /stroke\s*:/.test(attrs);
      if (hasFill || hasStroke) return m;
      return `<${tag}${attrs} fill="${color}">`;
    }
  );

  return out;
}

async function fetchText(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`読み込み失敗: ${url}`);
  return res.text();
}

function downloadCanvas(canvas, fileName) {
  const link = document.createElement("a");
  link.download = fileName;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

function panelStyle(compact = false) {
  return {
    background: "#ffffff",
    borderRadius: compact ? 16 : 20,
    padding: compact ? 12 : 16,
    boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
  };
}

function labelStyle() {
  return {
    display: "block",
    fontSize: 14,
    fontWeight: 700,
    marginBottom: 8,
  };
}

function buttonStyle(active = false, compact = false) {
  return {
    padding: compact ? "9px 11px" : "10px 14px",
    borderRadius: 12,
    border: active ? "2px solid #111" : "1px solid #d6d3d1",
    background: active ? "#f5f5f4" : "#fff",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: compact ? 13 : 14,
  };
}

function inputStyle(compact = false) {
  return {
    width: "100%",
    padding: compact ? "9px 11px" : "10px 12px",
    borderRadius: 12,
    border: "1px solid #d6d3d1",
    boxSizing: "border-box",
  };
}

function safeClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function roundPlacement(face) {
  return {
    x: Number((face?.x ?? 50).toFixed(2)),
    y: Number((face?.y ?? 30).toFixed(2)),
    widthCm: Number((face?.widthCm ?? 28).toFixed(2)),
    flipX: Boolean(face?.flipX),
  };
}

function formatPlacementInline(face) {
  const p = roundPlacement(face);
  return `{ x: ${p.x}, y: ${p.y}, widthCm: ${p.widthCm}, flipX: ${p.flipX} }`;
}

function loadSavedPlacements() {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(PLACEMENT_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function savePlacementsToStorage(map) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PLACEMENT_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function getBodyLengthCm(sizeKey) {
  return sizeSpec[sizeKey]?.bodyLengthCm ?? sizeSpec[BASE_PRINT_SIZE].bodyLengthCm;
}

function getBaseVariantForShirt(shirt) {
  if (!shirt?.variants) return null;
  return shirt.variants.M || shirt.variants.S || shirt.variants.XS || Object.values(shirt.variants)[0] || null;
}

function getShirtScale(sizeKey) {
  const base = getBodyLengthCm(BASE_PRINT_SIZE);
  const current = getBodyLengthCm(sizeKey);
  return current / base;
}

function getCanvasPoint(clientX, clientY, canvas) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((clientX - rect.left) / rect.width) * canvas.width,
    y: ((clientY - rect.top) / rect.height) * canvas.height,
  };
}

function drawSelectionBox(ctx, info) {
  if (!info) return;

  const { designX, designY, designW, designH } = info;
  const hx = designX + designW;
  const hy = designY + designH;
  const zoom = info.zoom || 1;
  const half = HANDLE_SIZE / 2;

  ctx.save();
  ctx.strokeStyle = "#0ea5e9";
  ctx.lineWidth = 2 / zoom;
  ctx.setLineDash([]);
  ctx.strokeRect(designX, designY, designW, designH);

  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#0ea5e9";
  ctx.lineWidth = 2 / zoom;
  ctx.beginPath();
  ctx.rect(hx - half / zoom, hy - half / zoom, HANDLE_SIZE / zoom, HANDLE_SIZE / zoom);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function hitResizeHandle(point, info) {
  if (!info) return false;
  const zoom = info.zoom || 1;
  const hx = info.designX + info.designW;
  const hy = info.designY + info.designH;
  const half = (HANDLE_SIZE / 2) / zoom;

  return (
    point.x >= hx - half &&
    point.x <= hx + half &&
    point.y >= hy - half &&
    point.y <= hy + half
  );
}

function hitDesignBody(point, info) {
  if (!info) return false;
  return (
    point.x >= info.designX &&
    point.x <= info.designX + info.designW &&
    point.y >= info.designY &&
    point.y <= info.designY + info.designH
  );
}

function normalizeFace(face, fallbackFace) {
  return {
    x: typeof face?.x === "number" ? face.x : fallbackFace.x,
    y: typeof face?.y === "number" ? face.y : fallbackFace.y,
    widthCm:
      typeof face?.widthCm === "number"
        ? face.widthCm
        : typeof face?.width === "number"
        ? Number(((getBodyLengthCm(BASE_PRINT_SIZE) * face.width) / 100).toFixed(2))
        : fallbackFace.widthCm,
    flipX: typeof face?.flipX === "boolean" ? face.flipX : fallbackFace.flipX,
  };
}

function getAllowedStoredFaceSizes(saved, designId, side) {
  const bySide = saved?.[designId]?.[side] || {};
  return Object.keys(bySide)
    .filter((size) => sizeSpec[size] && EDITABLE_SIZES.includes(size))
    .sort((a, b) => getBodyLengthCm(a) - getBodyLengthCm(b));
}

function pickNearestBaseFace(bySide, sizes, targetSize, fallbackFace) {
  if (!sizes.length) return normalizeFace(fallbackFace, fallbackFace);
  if (sizes.length === 1) return normalizeFace(bySide[sizes[0]], fallbackFace);

  const targetCm = getBodyLengthCm(targetSize);
  let nearestSize = sizes[0];
  let nearestDiff = Math.abs(getBodyLengthCm(nearestSize) - targetCm);

  for (const size of sizes) {
    const diff = Math.abs(getBodyLengthCm(size) - targetCm);
    if (diff < nearestDiff) {
      nearestDiff = diff;
      nearestSize = size;
    }
  }

  return normalizeFace(bySide[nearestSize], fallbackFace);
}

function interpolateFacePlacement(saved, designId, side, targetSize) {
  const defaults = getInitialPlacement(designId);
  const fallbackFace = defaults?.[side] ?? {
    x: 50,
    y: 30,
    widthCm: 28,
    flipX: false,
  };

  const bySide = saved?.[designId]?.[side] || {};
  const direct = EDITABLE_SIZES.includes(targetSize) ? bySide[targetSize] : null;

  if (direct) return normalizeFace(direct, fallbackFace);

  const sizes = getAllowedStoredFaceSizes(saved, designId, side);

  if (sizes.length === 0) return normalizeFace(fallbackFace, fallbackFace);
  if (sizes.length === 1) {
    const only = normalizeFace(bySide[sizes[0]], fallbackFace);
    return {
      x: only.x,
      y: only.y,
      widthCm: only.widthCm,
      flipX: only.flipX,
    };
  }

  const targetCm = getBodyLengthCm(targetSize);

  let lowerSize = null;
  let upperSize = null;

  for (const size of sizes) {
    const cm = getBodyLengthCm(size);
    if (cm <= targetCm) lowerSize = size;
    if (cm >= targetCm) {
      upperSize = size;
      break;
    }
  }

  if (!lowerSize) {
    const upper = normalizeFace(bySide[upperSize], fallbackFace);
    const mFace = bySide.M ? normalizeFace(bySide.M, fallbackFace) : upper;
    return {
      x: upper.x,
      y: upper.y,
      widthCm: mFace.widthCm,
      flipX: mFace.flipX,
    };
  }

  if (!upperSize) {
    const lower = normalizeFace(bySide[lowerSize], fallbackFace);
    const mFace = bySide.M ? normalizeFace(bySide.M, fallbackFace) : lower;
    return {
      x: lower.x,
      y: lower.y,
      widthCm: mFace.widthCm,
      flipX: mFace.flipX,
    };
  }

  if (lowerSize === upperSize) {
    const same = normalizeFace(bySide[lowerSize], fallbackFace);
    const mFace = bySide.M ? normalizeFace(bySide.M, fallbackFace) : same;
    return {
      x: same.x,
      y: same.y,
      widthCm: mFace.widthCm,
      flipX: mFace.flipX,
    };
  }

  const lower = normalizeFace(bySide[lowerSize], fallbackFace);
  const upper = normalizeFace(bySide[upperSize], fallbackFace);

  const lowerCm = getBodyLengthCm(lowerSize);
  const upperCm = getBodyLengthCm(upperSize);
  const t = (targetCm - lowerCm) / (upperCm - lowerCm);

  const mFace = bySide.M
    ? normalizeFace(bySide.M, fallbackFace)
    : pickNearestBaseFace(bySide, sizes, targetSize, fallbackFace);

  return {
    x: lerp(lower.x, upper.x, t),
    y: lerp(lower.y, upper.y, t),
    widthCm: mFace.widthCm,
    flipX: mFace.flipX,
  };
}

function buildPlacementState(saved, designId, targetSize) {
  return {
    front: interpolateFacePlacement(saved, designId, "front", targetSize),
    back: interpolateFacePlacement(saved, designId, "back", targetSize),
  };
}

function ShirtPicker({ shirts, shirtCode, setShirtCode, side, compact }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapRef = useRef(null);

  const selectedShirt = shirts.find((shirt) => shirt.code === shirtCode) ?? shirts[0];

  const filteredShirts = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return shirts;
    return shirts.filter((shirt) => {
      const text = `${shirt.code} ${shirt.name || ""}`.toLowerCase();
      return text.includes(q);
    });
  }, [query, shirts]);

  useEffect(() => {
    const onDown = (e) => {
      if (!wrapRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const getThumb = (shirt) => {
    const baseVariant = getBaseVariantForShirt(shirt);
    return side === "front" ? baseVariant?.front : baseVariant?.back;
  };

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <button
        type="button"
        style={{
          ...inputStyle(compact),
          display: "flex",
          alignItems: "center",
          gap: 12,
          background: "#fff",
          textAlign: "left",
          cursor: "pointer",
        }}
        onClick={() => setOpen((v) => !v)}
      >
        <img
          src={getThumb(selectedShirt)}
          alt={selectedShirt?.code || "shirt"}
          style={{
            width: compact ? 40 : 44,
            height: compact ? 40 : 44,
            objectFit: "cover",
            borderRadius: 10,
            border: "1px solid #d6d3d1",
            background: "#fafaf9",
            flexShrink: 0,
          }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: compact ? 13 : 14 }}>{selectedShirt?.code || "-"}</div>
          <div style={{ fontSize: 12, color: "#78716c" }}>{selectedShirt?.name || "Tシャツカラー"}</div>
        </div>
        <div style={{ fontSize: 12, color: "#57534e" }}>▼</div>
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            left: 0,
            right: 0,
            zIndex: 20,
            background: "#fff",
            border: "1px solid #d6d3d1",
            borderRadius: 16,
            boxShadow: "0 12px 32px rgba(0,0,0,0.12)",
            padding: 10,
          }}
        >
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="色コード / 色名で検索"
            style={{ ...inputStyle(compact), marginBottom: 10 }}
          />

          <div
            style={{
              maxHeight: 320,
              overflowY: "auto",
              display: "grid",
              gap: 8,
            }}
          >
            {filteredShirts.map((shirt) => (
              <button
                key={shirt.code}
                type="button"
                onClick={() => {
                  setShirtCode(shirt.code);
                  setOpen(false);
                }}
                style={{
                  border: shirt.code === shirtCode ? "2px solid #111" : "1px solid #d6d3d1",
                  background: "#fff",
                  borderRadius: 12,
                  padding: 8,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  textAlign: "left",
                }}
              >
                <img
                  src={getThumb(shirt)}
                  alt={shirt.code}
                  style={{
                    width: compact ? 38 : 42,
                    height: compact ? 38 : 42,
                    objectFit: "cover",
                    borderRadius: 10,
                    border: "1px solid #d6d3d1",
                    background: "#fafaf9",
                    flexShrink: 0,
                  }}
                />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: compact ? 13 : 14 }}>{shirt.code}</div>
                  <div style={{ fontSize: 12, color: "#78716c" }}>{shirt.name || "Tシャツカラー"}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DesignPicker({
  designs,
  designId,
  setDesignId,
  setIsSwitchingDesign,
  columns = 3,
  compact = false,
}) {
  const thumbSide = "back";
  const [hoveredId, setHoveredId] = useState(null);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        gap: compact ? 6 : 8,
      }}
    >
      {designs.map((design) => {
        const thumbSrc =
          thumbSide === "front"
            ? design.front || design.back
            : design.back || design.front;

        const active = design.id === designId;
        const hovered = hoveredId === design.id;

        return (
          <button
            key={design.id}
            type="button"
            onMouseEnter={() => setHoveredId(design.id)}
            onMouseLeave={() => setHoveredId((prev) => (prev === design.id ? null : prev))}
            onFocus={() => setHoveredId(design.id)}
            onBlur={() => setHoveredId((prev) => (prev === design.id ? null : prev))}
            onClick={() => {
              if (design.id === designId) return;
              setIsSwitchingDesign(true);
              setDesignId(design.id);
            }}
            style={{
              position: "relative",
              border: active ? "2px solid #111" : "1px solid #d6d3d1",
              background: "#fff",
              borderRadius: compact ? 10 : 12,
              padding: compact ? 5 : 6,
              cursor: "pointer",
              display: "block",
              boxShadow: active ? "0 4px 12px rgba(0,0,0,0.08)" : "none",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: "100%",
                aspectRatio: "1 / 1",
                borderRadius: compact ? 8 : 9,
                border: active ? "1px solid #d6d3d1" : "1px solid #e7e5e4",
                background: "#fafaf9",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
              }}
            >
              {thumbSrc ? (
                <img
                  src={thumbSrc}
                  alt={design.name}
                  style={{
                    width: compact ? "94%" : "92%",
                    height: compact ? "94%" : "92%",
                    objectFit: "contain",
                    display: "block",
                    transition: "transform 0.14s ease",
                    transform: hovered ? "scale(1.03)" : "scale(1)",
                  }}
                />
              ) : (
                <div style={{ fontSize: 11, color: "#a8a29e" }}>no image</div>
              )}
            </div>

            <div
              style={{
                position: "absolute",
                left: 6,
                right: 6,
                bottom: 6,
                padding: compact ? "5px 6px" : "6px 7px",
                borderRadius: 8,
                background: active ? "rgba(17,17,17,0.92)" : "rgba(17,17,17,0.82)",
                color: "#fff",
                fontSize: compact ? 10 : 10.5,
                fontWeight: 700,
                lineHeight: 1.25,
                textAlign: "left",
                opacity: hovered || active ? 1 : 0,
                transform: hovered || active ? "translateY(0)" : "translateY(4px)",
                transition: "opacity 0.14s ease, transform 0.14s ease",
                pointerEvents: "none",
                whiteSpace: "normal",
                wordBreak: "break-word",
              }}
            >
              {design.name}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function SizeButton({ size, active, editable, onClick, compact = false }) {
  return (
    <button
      type="button"
      style={{
        ...buttonStyle(active, compact),
        position: "relative",
        paddingTop: compact ? 9 : 10,
        paddingBottom: compact ? 7 : 8,
        paddingLeft: compact ? 8 : 10,
        paddingRight: compact ? 8 : 10,
        minHeight: compact ? 36 : 40,
        fontSize: compact ? 12 : 13,
        borderRadius: 10,
      }}
      onClick={onClick}
    >
      {editable && (
        <span
          style={{
            position: "absolute",
            top: 3,
            right: 6,
            fontSize: 9,
            lineHeight: 1,
            color: active ? "#111" : "#78716c",
          }}
        >
          ●
        </span>
      )}
      {size}
    </button>
  );
}

function SectionHeader({
  title,
  open,
  onToggle,
  collapsible,
  isMobile,
  fontSize,
}) {
  return (
    <div
      onClick={collapsible ? onToggle : undefined}
      style={{
        fontWeight: 800,
        fontSize,
        marginBottom: open ? 14 : 0,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        cursor: collapsible ? "pointer" : "default",
        userSelect: "none",
      }}
    >
      <span>{title}</span>
      {isMobile && collapsible && <span style={{ fontSize: 18, lineHeight: 1 }}>{open ? "−" : "＋"}</span>}
    </div>
  );
}

export default function App() {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const renderInfoRef = useRef(null);

  const dragRef = useRef({
    active: false,
    mode: null,
    pointerId: null,
    startCanvasX: 0,
    startCanvasY: 0,
    startPlacementX: 0,
    startPlacementY: 0,
    startWidthCm: 0,
  });

  const panRef = useRef({
    active: false,
    startX: 0,
    startY: 0,
    startOffsetX: 0,
    startOffsetY: 0,
  });

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [side, setSide] = useState("front");
  const [shirtCode, setShirtCode] = useState(shirts[0]?.code || "001");
  const [fit, setFit] = useState("M");
  const [designId, setDesignId] = useState(designs[0]?.id || "");
  const [inkColor, setInkColor] = useState("#201010");
  const [svgCache, setSvgCache] = useState({});
  const [canvasSize, setCanvasSize] = useState({ width: 900, height: 900 });
  const [status, setStatus] = useState("画像とSVGを読み込み中...");
  const [isDesignSelected, setIsDesignSelected] = useState(false);
  const [hoverMode, setHoverMode] = useState(null);
  const [isShiftPressed, setIsShiftPressed] = useState(false);
  const [isSwitchingDesign, setIsSwitchingDesign] = useState(false);
  const [exportText, setExportText] = useState("");
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth : 1440
  );

  const [openSections, setOpenSections] = useState({
    shirtSettings: true,
    inkColor: true,
    designPicker: true,
    designAdjust: true,
  });

  const [placement, setPlacement] = useState(() => {
    const firstDesignId = designs[0]?.id || "";
    const saved = loadSavedPlacements();
    return buildPlacementState(saved, firstDesignId, "M");
  });

  const isMobile = viewportWidth < 700;
  const isTablet = viewportWidth < 980;
  const compact = viewportWidth < 560;
  const layoutColumns = isTablet ? "1fr" : "minmax(0, 1fr) minmax(340px, 420px)";
  const sizeColumns = isMobile ? 4 : 5;
  const designColumns = isMobile ? 2 : isTablet ? 2 : 3;

  const canEditCurrentSize = EDITABLE_SIZES.includes(fit);

  const selectedShirt = useMemo(
    () => shirts.find((s) => s.code === shirtCode) ?? shirts[0],
    [shirtCode]
  );

  const selectedDesign = useMemo(
    () => designs.find((d) => d.id === designId) ?? designs[0],
    [designId]
  );

  const baseVariant = useMemo(() => getBaseVariantForShirt(selectedShirt), [selectedShirt]);

  const shirtSrc = side === "front" ? baseVariant?.front : baseVariant?.back;
  const activeSvgRaw = svgCache[designId]?.[side] || "";
  const currentPlacement = placement?.[side];

  const svgDataUrl = useMemo(() => {
    if (!activeSvgRaw) return "";
    const recolored = forceSingleColorSvg(activeSvgRaw, inkColor);
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(recolored)}`;
  }, [activeSvgRaw, inkColor]);

  useEffect(() => {
    const onResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (isMobile) {
      setOpenSections({
        shirtSettings: false,
        inkColor: false,
        designPicker: true,
        designAdjust: true,
      });
    } else {
      setOpenSections({
        shirtSettings: true,
        inkColor: true,
        designPicker: true,
        designAdjust: true,
      });
    }
  }, [isMobile]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Shift") setIsShiftPressed(true);
    };
    const onKeyUp = (e) => {
      if (e.key === "Shift") setIsShiftPressed(false);
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const pending = designs.filter((d) => !svgCache[d.id]);
        if (pending.length === 0) {
          if (!cancelled) setStatus("SVG読み込み完了");
          return;
        }

        const results = await Promise.all(
          pending.map(async (d) => {
            const front = d.front ? await fetchText(d.front) : "";
            const back = d.back ? await fetchText(d.back) : "";
            return { id: d.id, front, back };
          })
        );

        if (!cancelled) {
          setSvgCache((prev) => {
            const next = { ...prev };
            results.forEach((r) => {
              next[r.id] = { front: r.front, back: r.back };
            });
            return next;
          });
          setStatus("SVG読み込み完了");
        }
      } catch {
        if (!cancelled) setStatus("SVGの読み込みに失敗。public/designs を確認してください。");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [svgCache]);

  useEffect(() => {
    const handleResize = () => {
      const w = wrapRef.current?.clientWidth ?? 900;
      const paddingOffset = isMobile ? 12 : 24;
      const size = Math.max(280, Math.min(isTablet ? 760 : 980, Math.floor(w - paddingOffset)));
      setCanvasSize({ width: size, height: size });
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isMobile, isTablet]);

  useEffect(() => {
    if (!designId) return;
    const saved = loadSavedPlacements();
    const nextPlacement = buildPlacementState(saved, designId, fit);
    setPlacement(nextPlacement);
    setIsDesignSelected(false);
    setIsSwitchingDesign(false);
  }, [designId, fit]);

  useEffect(() => {
    if (!designId || !placement) return;
    if (!canEditCurrentSize) return;

    const saved = loadSavedPlacements();
    if (!saved[designId]) saved[designId] = {};
    if (!saved[designId].front) saved[designId].front = {};
    if (!saved[designId].back) saved[designId].back = {};

    saved[designId].front[fit] = safeClone(placement.front);
    saved[designId].back[fit] = safeClone(placement.back);

    savePlacementsToStorage(saved);
  }, [designId, fit, placement, canEditCurrentSize]);

  useEffect(() => {
    if (isSwitchingDesign) return;

    if (!shirtSrc) {
      setStatus(`画像なし: ${selectedShirt?.code || "?"} / ${side}`);
      return;
    }

    if (!svgDataUrl || !canvasRef.current || !currentPlacement) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const shirtImg = new Image();
    const svgImg = new Image();
    shirtImg.crossOrigin = "anonymous";
    svgImg.crossOrigin = "anonymous";

    let shirtLoaded = false;
    let svgLoaded = false;

    const render = () => {
      if (!shirtLoaded || !svgLoaded) return;

      canvas.width = canvasSize.width;
      canvas.height = canvasSize.height;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#f5f5f4";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      ctx.save();
      ctx.translate(cx + pan.x, cy + pan.y);
      ctx.scale(zoom, zoom);
      ctx.translate(-cx, -cy);

      const shirtAspect = shirtImg.width / shirtImg.height;
      const maxW = canvas.width * 0.92;
      const maxH = canvas.height * 0.92;
      let drawW = maxW;
      let drawH = drawW / shirtAspect;

      if (drawH > maxH) {
        drawH = maxH;
        drawW = drawH * shirtAspect;
      }

      const shirtScale = getShirtScale(fit);
      drawW *= shirtScale;
      drawH *= shirtScale;

      const shirtX = (canvas.width - drawW) / 2;
      const shirtY = (canvas.height - drawH) / 2;

      ctx.drawImage(shirtImg, shirtX, shirtY, drawW, drawH);

      const currentBodyLengthCm = getBodyLengthCm(fit);
      const pxPerCm = drawH / currentBodyLengthCm;

      const designW = currentPlacement.widthCm * pxPerCm;
      const svgAspect = svgImg.width && svgImg.height ? svgImg.width / svgImg.height : 1;
      const designH = designW / svgAspect;

      const designCenterX = shirtX + (currentPlacement.x / 100) * drawW;
      const designCenterY = shirtY + (currentPlacement.y / 100) * drawH;
      const designX = designCenterX - designW / 2;
      const designY = designCenterY - designH / 2;

      renderInfoRef.current = {
        shirtX,
        shirtY,
        drawW,
        drawH,
        designX,
        designY,
        designW,
        designH,
        designCenterX,
        designCenterY,
        pxPerCm,
        currentBodyLengthCm,
        zoom,
        panX: pan.x,
        panY: pan.y,
      };

      ctx.save();
      ctx.translate(designCenterX, designCenterY);
      ctx.scale(currentPlacement.flipX ? -1 : 1, 1);
      ctx.drawImage(svgImg, -designW / 2, -designH / 2, designW, designH);
      ctx.restore();

      if (isDesignSelected && canEditCurrentSize) {
        drawSelectionBox(ctx, renderInfoRef.current);
      }

      ctx.restore();

      setStatus(`表示OK: ${selectedShirt?.code} / ${fit} / ${side} / ${selectedDesign?.name}`);
    };

    shirtImg.onload = () => {
      shirtLoaded = true;
      render();
    };
    svgImg.onload = () => {
      svgLoaded = true;
      render();
    };
    shirtImg.onerror = () => setStatus(`Tシャツ画像の読み込みに失敗: ${shirtSrc}`);
    svgImg.onerror = () => setStatus("SVG画像の表示に失敗。SVG内容を確認してください。");

    shirtImg.src = shirtSrc;
    svgImg.src = svgDataUrl;
  }, [
    shirtSrc,
    svgDataUrl,
    canvasSize,
    side,
    currentPlacement,
    selectedShirt,
    fit,
    selectedDesign,
    isDesignSelected,
    zoom,
    pan,
    canEditCurrentSize,
    isSwitchingDesign,
  ]);

  const updateCurrentPlacement = (patch) => {
    if (!canEditCurrentSize) return;
    setPlacement((prev) => ({
      ...prev,
      [side]: { ...prev[side], ...patch },
    }));
  };

  const refreshPlacementFromStorage = (message) => {
    const saved = loadSavedPlacements();
    const nextPlacement = buildPlacementState(saved, designId, fit);
    setPlacement(nextPlacement);
    setIsDesignSelected(false);
    setStatus(message);
  };

  const removeStoredBaseSize = (sizeKey) => {
    const saved = loadSavedPlacements();

    if (saved?.[designId]?.[side]?.[sizeKey]) {
      delete saved[designId][side][sizeKey];
      if (Object.keys(saved[designId][side]).length === 0) {
        delete saved[designId][side];
      }
      savePlacementsToStorage(saved);
      refreshPlacementFromStorage(`${selectedDesign?.name} / ${side} の ${sizeKey} 保存値を削除しました`);
    } else {
      setStatus(`${selectedDesign?.name} / ${side} の ${sizeKey} 保存値はありません`);
    }
  };

  const removeAllStoredBaseSizesForSide = () => {
    const saved = loadSavedPlacements();
    let removedCount = 0;

    if (!saved?.[designId]?.[side]) {
      setStatus(`${selectedDesign?.name} / ${side} に削除できる保存値はありません`);
      return;
    }

    for (const sizeKey of EDITABLE_SIZES) {
      if (saved?.[designId]?.[side]?.[sizeKey]) {
        delete saved[designId][side][sizeKey];
        removedCount += 1;
      }
    }

    if (saved?.[designId]?.[side] && Object.keys(saved[designId][side]).length === 0) {
      delete saved[designId][side];
    }

    savePlacementsToStorage(saved);

    if (removedCount > 0) {
      refreshPlacementFromStorage(`${selectedDesign?.name} / ${side} の基準点を ${removedCount} 件削除しました`);
    } else {
      setStatus(`${selectedDesign?.name} / ${side} に削除できる基準点はありません`);
    }
  };

  const buildExportText = () => {
    const saved = loadSavedPlacements();
    const defaults = getInitialPlacement(designId);

    const frontSaved = {};
    const backSaved = {};

    for (const sizeKey of EDITABLE_SIZES) {
      frontSaved[sizeKey] = roundPlacement(
        saved?.[designId]?.front?.[sizeKey] ?? defaults?.front
      );
      backSaved[sizeKey] = roundPlacement(
        saved?.[designId]?.back?.[sizeKey] ?? defaults?.back
      );
    }

    return [
      "module.exports = {",
      `  "${designId}": {`,
      "    placementDefaults: {",
      `      front: ${formatPlacementInline(frontSaved.M)},`,
      `      back: ${formatPlacementInline(backSaved.M)},`,
      "    },",
      "    savedBasePlacements: {",
      "      front: {",
      `        "120": ${formatPlacementInline(frontSaved["120"])},`,
      `        "M": ${formatPlacementInline(frontSaved["M"])},`,
      `        "XXL": ${formatPlacementInline(frontSaved["XXL"])},`,
      "      },",
      "      back: {",
      `        "120": ${formatPlacementInline(backSaved["120"])},`,
      `        "M": ${formatPlacementInline(backSaved["M"])},`,
      `        "XXL": ${formatPlacementInline(backSaved["XXL"])},`,
      "      },",
      "    },",
      "  },",
      "};",
    ].join("\n");
  };

  const exportCurrentDesign = async () => {
    const text = buildExportText();
    setExportText(text);

    try {
      await navigator.clipboard.writeText(text);
      setStatus(`${selectedDesign?.name} の patch 完成形をコピーしました`);
    } catch {
      setStatus(`${selectedDesign?.name} の patch 完成形を表示しました（手動コピーしてください）`);
    }
  };

  const resetPlacement = () => {
    if (!canEditCurrentSize) return;

    const defaults = getInitialPlacement(designId);
    const next = {
      ...placement,
      [side]: safeClone(defaults[side]),
    };
    setPlacement(next);

    const saved = loadSavedPlacements();
    if (!saved[designId]) saved[designId] = {};
    if (!saved[designId].front) saved[designId].front = {};
    if (!saved[designId].back) saved[designId].back = {};

    saved[designId][side][fit] = safeClone(defaults[side]);
    savePlacementsToStorage(saved);

    setIsDesignSelected(false);
  };

  const resetView = () => {
    setPan({ x: 0, y: 0 });
    setIsDesignSelected(false);
  };

  const randomizeStyle = () => {
    const randomShirt = shirts[Math.floor(Math.random() * shirts.length)];
    const randomInk = inkPresets[Math.floor(Math.random() * inkPresets.length)];
    setShirtCode(randomShirt.code);
    setInkColor(randomInk.color);
  };

  const zoomAtPoint = (deltaY) => {
    const intensity = 0.0015;
    setZoom((prev) => clamp(prev * Math.exp(-deltaY * intensity), MIN_ZOOM, MAX_ZOOM));
  };

  const zoomByButton = (direction) => {
    const factor = direction > 0 ? 1.1 : 1 / 1.1;
    setZoom((prev) => clamp(prev * factor, MIN_ZOOM, MAX_ZOOM));
  };

  const toLogicalPoint = (point, canvas) => ({
    x: (point.x - (canvas.width / 2 + pan.x)) / zoom + canvas.width / 2,
    y: (point.y - (canvas.height / 2 + pan.y)) / zoom + canvas.height / 2,
  });

  const onPointerDown = (e) => {
    const canvas = canvasRef.current;
    if (!canvas || !currentPlacement) return;

    if (e.shiftKey) {
      panRef.current = {
        active: true,
        startX: e.clientX,
        startY: e.clientY,
        startOffsetX: pan.x,
        startOffsetY: pan.y,
      };
      canvas.setPointerCapture?.(e.pointerId);
      return;
    }

    if (!canEditCurrentSize) {
      setIsDesignSelected(false);
      return;
    }

    const info = renderInfoRef.current;
    if (!info) return;

    const point = getCanvasPoint(e.clientX, e.clientY, canvas);
    const logicalPoint = toLogicalPoint(point, canvas);

    if (hitResizeHandle(logicalPoint, info)) {
      dragRef.current = {
        active: true,
        mode: "resize-se",
        pointerId: e.pointerId,
        startCanvasX: logicalPoint.x,
        startCanvasY: logicalPoint.y,
        startPlacementX: currentPlacement.x,
        startPlacementY: currentPlacement.y,
        startWidthCm: currentPlacement.widthCm,
      };
      setIsDesignSelected(true);
      canvas.setPointerCapture?.(e.pointerId);
      return;
    }

    if (hitDesignBody(logicalPoint, info)) {
      dragRef.current = {
        active: true,
        mode: "move",
        pointerId: e.pointerId,
        startCanvasX: logicalPoint.x,
        startCanvasY: logicalPoint.y,
        startPlacementX: currentPlacement.x,
        startPlacementY: currentPlacement.y,
        startWidthCm: currentPlacement.widthCm,
      };
      setIsDesignSelected(true);
      canvas.setPointerCapture?.(e.pointerId);
      return;
    }

    setIsDesignSelected(false);
    setHoverMode(null);
  };

  const onPointerMove = (e) => {
    const canvas = canvasRef.current;
    const info = renderInfoRef.current;
    if (!canvas || !info) return;

    if (panRef.current.active) {
      const dx = e.clientX - panRef.current.startX;
      const dy = e.clientY - panRef.current.startY;
      setPan({
        x: panRef.current.startOffsetX + dx,
        y: panRef.current.startOffsetY + dy,
      });
      return;
    }

    const point = getCanvasPoint(e.clientX, e.clientY, canvas);
    const logicalPoint = toLogicalPoint(point, canvas);

    if (!dragRef.current.active) {
      if (!canEditCurrentSize) {
        setHoverMode(null);
        return;
      }
      if (hitResizeHandle(logicalPoint, info)) {
        setHoverMode("resize-se");
      } else if (hitDesignBody(logicalPoint, info)) {
        setHoverMode("move");
      } else {
        setHoverMode(null);
      }
      return;
    }

    if (dragRef.current.mode === "move") {
      const dxCanvas = logicalPoint.x - dragRef.current.startCanvasX;
      const dyCanvas = logicalPoint.y - dragRef.current.startCanvasY;

      const deltaXPercent = (dxCanvas / info.drawW) * 100;
      const deltaYPercent = (dyCanvas / info.drawH) * 100;

      updateCurrentPlacement({
        x: clamp(dragRef.current.startPlacementX + deltaXPercent, 0, 100),
        y: clamp(dragRef.current.startPlacementY + deltaYPercent, 0, 100),
      });
      return;
    }

    if (dragRef.current.mode === "resize-se") {
      const dxCanvas = logicalPoint.x - dragRef.current.startCanvasX;
      const deltaCm = dxCanvas / info.pxPerCm;

      updateCurrentPlacement({
        widthCm: clamp(dragRef.current.startWidthCm + deltaCm, MIN_WIDTH_CM, MAX_WIDTH_CM),
      });
    }
  };

  const endDrag = (e) => {
    dragRef.current.active = false;
    dragRef.current.mode = null;
    panRef.current.active = false;

    const canvas = canvasRef.current;
    if (canvas && e?.pointerId != null) {
      canvas.releasePointerCapture?.(e.pointerId);
    }
  };

  const toggleSection = (key) => {
    if (!isMobile) return;
    setOpenSections((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const selectedInkName =
    inkPresets.find((ink) => ink.color.toLowerCase() === inkColor.toLowerCase())?.name ||
    `カスタムカラー ${inkColor}`;

  const canvasCursor = panRef.current.active
    ? "move"
    : isShiftPressed
    ? "grab"
    : !canEditCurrentSize
    ? "default"
    : dragRef.current.active
    ? dragRef.current.mode === "resize-se"
      ? "nwse-resize"
      : "grabbing"
    : hoverMode === "resize-se"
    ? "nwse-resize"
    : hoverMode === "move"
    ? "grab"
    : "default";

  const currentBodyLengthCm = getBodyLengthCm(fit);
  const designWidthCm = currentPlacement?.widthCm ?? 0;
  const widthPercentOfBody = currentBodyLengthCm ? (designWidthCm / currentBodyLengthCm) * 100 : 0;

  const saved = loadSavedPlacements();
  const directSaved = Boolean(
    EDITABLE_SIZES.includes(fit) && saved?.[designId]?.[side]?.[fit]
  );

  const sideSavedMap = saved?.[designId]?.[side] || {};

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f5f5f4",
        padding: isMobile ? 10 : 16,
        boxSizing: "border-box",
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: 1480,
          margin: "0 auto",
          display: "grid",
          gap: isTablet ? 16 : 24,
          gridTemplateColumns: layoutColumns,
          alignItems: "start",
        }}
      >
        <div style={panelStyle(compact)}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              alignItems: "center",
              flexWrap: "wrap",
              marginBottom: 16,
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: isMobile ? 24 : 32,
                  fontWeight: 800,
                  color: "#1c1917",
                  lineHeight: 1.15,
                  wordBreak: "break-word",
                }}
              >
                アンロシェカスタムTメーカー
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                width: isTablet ? "100%" : "auto",
              }}
            >
              <button style={buttonStyle(false, compact)} onClick={randomizeStyle}>
                ランダム
              </button>
              <button style={buttonStyle(false, compact)} onClick={resetView}>
                表示位置リセット
              </button>
              <button style={buttonStyle(false, compact)} onClick={exportCurrentDesign}>
                このデザインを書き出し
              </button>
              <button
                style={buttonStyle(false, compact)}
                onClick={() => {
                  const canvas = canvasRef.current;
                  if (!canvas) return;
                  downloadCanvas(canvas, `anrocher-${shirtCode}-${fit}-${designId}-${side}.png`);
                }}
              >
                PNG保存
              </button>
              <button
                style={{
                  ...buttonStyle(false, compact),
                  opacity: canEditCurrentSize ? 1 : 0.5,
                  cursor: canEditCurrentSize ? "pointer" : "not-allowed",
                }}
                disabled={!canEditCurrentSize}
                onClick={resetPlacement}
              >
                この面の位置をリセット
              </button>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              marginBottom: 10,
              flexWrap: "wrap",
            }}
          >
            <button style={buttonStyle(false, compact)} onClick={() => zoomByButton(-1)}>−</button>
            <div style={{ minWidth: 64, textAlign: "center", fontWeight: 700 }}>
              {Math.round(zoom * 100)}%
            </div>
            <button style={buttonStyle(false, compact)} onClick={() => zoomByButton(1)}>＋</button>
            <button style={buttonStyle(false, compact)} onClick={() => setZoom(1)}>100%</button>
          </div>

          <div
            ref={wrapRef}
            style={{
              background: "#fff",
              borderRadius: compact ? 16 : 20,
              padding: isMobile ? 8 : 12,
              boxShadow: "inset 0 2px 8px rgba(0,0,0,0.05)",
              overflow: "hidden",
              maxHeight: isTablet ? "none" : "82vh",
            }}
          >
            <canvas
              ref={canvasRef}
              style={{
                width: "100%",
                display: "block",
                borderRadius: 16,
                background: "#fafaf9",
                cursor: canvasCursor,
                touchAction: "none",
                opacity: isSwitchingDesign ? 0.96 : 1,
              }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={endDrag}
              onPointerLeave={endDrag}
              onWheel={(e) => {
                if (!(e.ctrlKey || e.metaKey || e.altKey || e.shiftKey)) return;
                e.preventDefault();
                zoomAtPoint(e.deltaY);
              }}
            />
          </div>

          <div style={{ marginTop: 10, fontSize: 13, color: "#57534e" }}>
            状態: {isSwitchingDesign ? "デザイン切替中..." : status}
          </div>

          {exportText && (
            <div
              style={{
                marginTop: 14,
                border: "1px solid #d6d3d1",
                borderRadius: 14,
                background: "#fff",
                padding: 12,
              }}
            >
              <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 8 }}>
                patch 完成形
              </div>
              <textarea
                value={exportText}
                readOnly
                style={{
                  width: "100%",
                  minHeight: isMobile ? 200 : 260,
                  resize: "vertical",
                  border: "1px solid #d6d3d1",
                  borderRadius: 10,
                  padding: 10,
                  boxSizing: "border-box",
                  fontFamily: "monospace",
                  fontSize: 12,
                  lineHeight: 1.5,
                  background: "#fafaf9",
                }}
              />
            </div>
          )}
        </div>

        <div style={{ display: "grid", gap: isTablet ? 16 : 24 }}>
          <div style={panelStyle(compact)}>
            <SectionHeader
              title="Tシャツ設定"
              open={openSections.shirtSettings}
              onToggle={() => toggleSection("shirtSettings")}
              collapsible={isMobile}
              isMobile={isMobile}
              fontSize={isMobile ? 18 : 20}
            />

            {(!isMobile || openSections.shirtSettings) && (
              <>
                <label style={labelStyle()}>カラーコード</label>
                <ShirtPicker
                  shirts={shirts}
                  shirtCode={shirtCode}
                  setShirtCode={setShirtCode}
                  side={side}
                  compact={compact}
                />

                <div style={{ height: 12 }} />

                <label style={labelStyle()}>サイズ</label>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: `repeat(${sizeColumns}, 1fr)`,
                    gap: 6,
                    marginBottom: 12,
                  }}
                >
                  {ALL_SIZES.map((size) => (
                    <SizeButton
                      key={size}
                      size={size}
                      active={fit === size}
                      editable={EDITABLE_SIZES.includes(size)}
                      onClick={() => setFit(size)}
                      compact={compact}
                    />
                  ))}
                </div>

                <div style={{ fontSize: 12, color: "#78716c", marginTop: -2, marginBottom: 14 }}>
                  ● が付いているサイズだけ編集できます
                </div>

                <label style={labelStyle()}>表 / 裏</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <button style={buttonStyle(side === "front", compact)} onClick={() => setSide("front")}>表</button>
                  <button style={buttonStyle(side === "back", compact)} onClick={() => setSide("back")}>裏</button>
                </div>
              </>
            )}
          </div>

          <div style={panelStyle(compact)}>
            <SectionHeader
              title="インクカラー（1色）"
              open={openSections.inkColor}
              onToggle={() => toggleSection("inkColor")}
              collapsible={isMobile}
              isMobile={isMobile}
              fontSize={isMobile ? 18 : 20}
            />

            {(!isMobile || openSections.inkColor) && (
              <>
                <label style={labelStyle()}>プリセット</label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
                  {inkPresets.map((ink) => (
                    <button
                      key={ink.id}
                      title={ink.name}
                      onClick={() => setInkColor(ink.color)}
                      style={{
                        minWidth: compact ? 38 : 42,
                        height: compact ? 38 : 42,
                        padding: "0 10px",
                        borderRadius: 999,
                        background: ink.color,
                        border:
                          inkColor.toLowerCase() === ink.color.toLowerCase()
                            ? "3px solid #111"
                            : "1px solid #a8a29e",
                        cursor: "pointer",
                        boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
                        color: ink.color === "#ffffff" ? "#111" : "transparent",
                      }}
                    >
                      ●
                    </button>
                  ))}
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "56px 1fr",
                    gap: 10,
                    alignItems: "center",
                  }}
                >
                  <div
                    style={{
                      width: 50,
                      height: 42,
                      border: "1px solid #d6d3d1",
                      borderRadius: 8,
                      background: inkColor,
                    }}
                  />
                  <div
                    style={{
                      ...inputStyle(compact),
                      background: "#fafaf9",
                      color: "#44403c",
                      display: "flex",
                      alignItems: "center",
                      fontWeight: 700,
                    }}
                  >
                    {selectedInkName}
                  </div>
                </div>
              </>
            )}
          </div>

          <div style={panelStyle(compact)}>
            <SectionHeader
              title="デザイン選択"
              open={openSections.designPicker}
              onToggle={() => toggleSection("designPicker")}
              collapsible={isMobile}
              isMobile={isMobile}
              fontSize={isMobile ? 18 : 20}
            />

            {(!isMobile || openSections.designPicker) && (
              <DesignPicker
                designs={designs}
                designId={designId}
                setDesignId={setDesignId}
                setIsSwitchingDesign={setIsSwitchingDesign}
                columns={designColumns}
                compact={compact}
              />
            )}
          </div>

          <div style={panelStyle(compact)}>
            <SectionHeader
              title="この面のデザイン調整"
              open={openSections.designAdjust}
              onToggle={() => toggleSection("designAdjust")}
              collapsible={isMobile}
              isMobile={isMobile}
              fontSize={isMobile ? 18 : 20}
            />

            {(!isMobile || openSections.designAdjust) && (
              <>
                <div style={{ fontSize: 14, color: "#57534e", lineHeight: 1.7, marginBottom: 14 }}>
                  ・編集できるのは 120 / M / XXL のみ
                  <br />
                  ・中間サイズは位置のみ補間、版幅は M 基準
                  <br />
                  ・Shift + ドラッグで表示移動
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                    gap: 8,
                    marginBottom: 10,
                  }}
                >
                  <div style={{ ...inputStyle(compact), background: "#fafaf9", color: "#44403c", fontWeight: 700 }}>
                    X: {currentPlacement?.x?.toFixed?.(1) ?? 0}%
                  </div>
                  <div style={{ ...inputStyle(compact), background: "#fafaf9", color: "#44403c", fontWeight: 700 }}>
                    Y: {currentPlacement?.y?.toFixed?.(1) ?? 0}%
                  </div>
                  <div style={{ ...inputStyle(compact), background: "#fafaf9", color: "#44403c", fontWeight: 700 }}>
                    版幅: {designWidthCm.toFixed(1)}cm
                  </div>
                  <div style={{ ...inputStyle(compact), background: "#fafaf9", color: "#44403c", fontWeight: 700 }}>
                    身丈: {currentBodyLengthCm}cm
                  </div>
                  <div style={{ ...inputStyle(compact), background: "#fafaf9", color: "#44403c", fontWeight: 700 }}>
                    身丈比: {widthPercentOfBody.toFixed(1)}%
                  </div>
                  <div style={{ ...inputStyle(compact), background: "#fafaf9", color: "#44403c", fontWeight: 700 }}>
                    種別: {directSaved ? "基準点" : "補間表示"}
                  </div>
                  <div
                    style={{
                      ...inputStyle(compact),
                      background: "#fafaf9",
                      color: "#44403c",
                      fontWeight: 700,
                      gridColumn: isMobile ? "auto" : "1 / -1",
                    }}
                  >
                    編集: {canEditCurrentSize ? "可" : "不可（補間のみ）"}
                  </div>
                </div>

                <button
                  style={{
                    ...buttonStyle(false, compact),
                    width: "100%",
                    opacity: canEditCurrentSize ? 1 : 0.5,
                    cursor: canEditCurrentSize ? "pointer" : "not-allowed",
                    marginBottom: 14,
                  }}
                  disabled={!canEditCurrentSize}
                  onClick={() => {
                    if (!canEditCurrentSize) return;
                    updateCurrentPlacement({ flipX: !Boolean(currentPlacement?.flipX) });
                  }}
                >
                  左右反転 {currentPlacement?.flipX ? "ON" : "OFF"}
                </button>

                <div
                  style={{
                    borderTop: "1px solid #e7e5e4",
                    paddingTop: 14,
                    display: "grid",
                    gap: 8,
                  }}
                >
                  <div style={{ fontWeight: 800, fontSize: 15, color: "#44403c" }}>
                    デバッグ：この面の保存値削除
                  </div>

                  <div style={{ fontSize: 12, color: "#78716c", lineHeight: 1.6 }}>
                    保存状況： 120 {sideSavedMap["120"] ? "あり" : "なし"} / M {sideSavedMap["M"] ? "あり" : "なし"} / XXL {sideSavedMap["XXL"] ? "あり" : "なし"}
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)",
                      gap: 8,
                    }}
                  >
                    <button style={buttonStyle(false, compact)} onClick={() => removeStoredBaseSize("120")}>
                      120削除
                    </button>
                    <button style={buttonStyle(false, compact)} onClick={() => removeStoredBaseSize("M")}>
                      M削除
                    </button>
                    <button style={buttonStyle(false, compact)} onClick={() => removeStoredBaseSize("XXL")}>
                      XXL削除
                    </button>
                  </div>

                  <button
                    style={{
                      ...buttonStyle(false, compact),
                      width: "100%",
                      border: "1px solid #fca5a5",
                      background: "#fff5f5",
                    }}
                    onClick={removeAllStoredBaseSizesForSide}
                  >
                    この面の基準点を全部削除
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}