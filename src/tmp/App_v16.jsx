import React, { useEffect, useMemo, useRef, useState } from "react";
import { Download, FileText, House, Minus, Plus, Repeat2, Star } from "lucide-react";
import { shirts } from "./shirts-data";
import { designs } from "./designs-data";

const APP_VERSION = "Canvas-Pinch-Test-V16";
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 4;
const DEFAULT_INK_COLOR = "#201010";
const HANDLE_SIZE = 24;
const HANDLE_HIT_SIZE = 52;
const MIN_SCALE = 0.18;
const MAX_SCALE = 0.7;

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

const ALL_SIZES = ["120", "130", "140", "150", "XS", "S", "M", "L", "XL", "XXL"];
const EDITABLE_SIZES = ["120", "M", "XXL"];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getTouchDistance(t1, t2) {
  return Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
}

function getBaseVariantForShirt(shirt) {
  if (!shirt?.variants) return null;
  return shirt.variants.M || shirt.variants.S || shirt.variants.XS || Object.values(shirt.variants)[0] || null;
}

function forceSingleColorSvg(svgText, color) {
  if (!svgText) return "";
  let out = svgText;
  const normalize = (value) => String(value).trim().toLowerCase().replace(/\s+/g, "");
  const isWhite = (value) => {
    const v = normalize(value);
    return v === "#fff" || v === "#ffffff" || v === "white" || v === "rgb(255,255,255)";
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

  return out;
}

async function fetchText(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`読み込み失敗: ${url}`);
  return res.text();
}

function panelStyle(compact = false) {
  return {
    background: "#ffffff",
    borderRadius: compact ? 16 : 20,
    padding: compact ? 12 : 16,
    boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
    minWidth: 0,
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

function labelStyle() {
  return { display: "block", fontSize: 14, fontWeight: 700, marginBottom: 8 };
}

function inputStyle(compact = false) {
  return {
    width: "100%",
    padding: compact ? "9px 11px" : "10px 12px",
    borderRadius: 12,
    border: "1px solid #d6d3d1",
    boxSizing: "border-box",
    minWidth: 0,
  };
}

function IconButton({ title, compact = false, children, onClick }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      style={{
        ...buttonStyle(false, compact),
        width: compact ? 40 : 44,
        height: compact ? 40 : 44,
        padding: 0,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function SectionTitle({ children }) {
  return <div style={{ fontWeight: 800, fontSize: 20, marginBottom: 14 }}>{children}</div>;
}

export default function App() {
  const previewColumnRef = useRef(null);
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const zoomRef = useRef(1);
  const pinchRef = useRef({ active: false, startDistance: 0, startZoom: 1 });
  const panRef = useRef({ active: false, startTouchX: 0, startTouchY: 0, startX: 0, startY: 0 });
  const dragRef = useRef({
    active: false,
    mode: "move",
    startTouchX: 0,
    startTouchY: 0,
    startX: 50,
    startY: 34,
    startScale: 0.34,
  });
  const renderInfoRef = useRef(null);
  const shirtImgRef = useRef(null);
  const svgImgRef = useRef(null);

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [svgRaw, setSvgRaw] = useState("");
  const [status, setStatus] = useState("読み込み中...");
  const [canvasSize, setCanvasSize] = useState({ width: 900, height: 900 });
  const [debug, setDebug] = useState({
    mode: "idle",
    touches: 0,
    startDistance: 0,
    currentDistance: 0,
    scale: 1,
    nextZoom: 1,
    zoom: 1,
  });
  const [viewportWidth, setViewportWidth] = useState(() => (typeof window !== "undefined" ? window.innerWidth : 1440));
  const [side, setSide] = useState("front");
  const [shirtIndex, setShirtIndex] = useState(0);
  const [designIndex, setDesignIndex] = useState(0);
  const [inkIndex, setInkIndex] = useState(5);
  const [fit, setFit] = useState("M");
  const [isEditMode, setIsEditMode] = useState(false);
  const [placement, setPlacement] = useState({ x: 50, y: 34, scale: 0.34 });

  const compact = viewportWidth < 560;
  const isMobile = viewportWidth < 700;
  const twoColumn = viewportWidth >= 900;
  const layoutColumns = twoColumn ? "minmax(0, 1.1fr) minmax(320px, 420px)" : "1fr";

  const selectedShirt = useMemo(() => shirts?.[shirtIndex] ?? shirts?.[0] ?? null, [shirtIndex]);
  const selectedDesign = useMemo(() => designs?.[designIndex] ?? designs?.[0] ?? null, [designIndex]);
  const selectedInk = inkPresets[inkIndex] ?? inkPresets[5];
  const baseVariant = useMemo(() => getBaseVariantForShirt(selectedShirt), [selectedShirt]);

  const shirtSrc = side === "front" ? (baseVariant?.front || baseVariant?.back || "") : (baseVariant?.back || baseVariant?.front || "");
  const designSrc = side === "front" ? (selectedDesign?.front || selectedDesign?.back || "") : (selectedDesign?.back || selectedDesign?.front || "");

  useEffect(() => { zoomRef.current = zoom; }, [zoom]);

  useEffect(() => {
    const onResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!designSrc) {
        setStatus("designs-data の画像パスが見つかりません");
        return;
      }
      try {
        const text = await fetchText(designSrc);
        if (!cancelled) {
          setSvgRaw(text);
          setStatus("SVG読み込み完了");
        }
      } catch {
        if (!cancelled) setStatus(`SVG読み込み失敗: ${designSrc}`);
      }
    })();
    return () => { cancelled = true; };
  }, [designSrc]);

  useEffect(() => {
    const updateCanvasSize = () => {
      const hostWidth = previewColumnRef.current?.clientWidth ?? window.innerWidth;
      const safeWidth = Math.max(280, hostWidth - (isMobile ? 20 : 32));
      const size = Math.max(280, Math.min(twoColumn ? 820 : 980, Math.floor(safeWidth)));
      setCanvasSize({ width: size, height: size });
    };
    updateCanvasSize();
    const ro = typeof ResizeObserver !== "undefined" && previewColumnRef.current
      ? new ResizeObserver(() => updateCanvasSize())
      : null;
    if (ro && previewColumnRef.current) ro.observe(previewColumnRef.current);
    window.addEventListener("resize", updateCanvasSize);
    return () => {
      window.removeEventListener("resize", updateCanvasSize);
      if (ro) ro.disconnect();
    };
  }, [twoColumn, isMobile]);

  const svgDataUrl = useMemo(() => {
    if (!svgRaw) return "";
    const recolored = forceSingleColorSvg(svgRaw, selectedInk.color);
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(recolored)}`;
  }, [svgRaw, selectedInk.color]);

  useEffect(() => {
    if (!shirtSrc) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      shirtImgRef.current = img;
      setStatus("Tシャツ画像読み込み完了");
    };
    img.onerror = () => setStatus(`Tシャツ画像読み込み失敗: ${shirtSrc}`);
    img.src = shirtSrc;
  }, [shirtSrc]);

  useEffect(() => {
    if (!svgDataUrl) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      svgImgRef.current = img;
      setStatus("SVG画像読み込み完了");
    };
    img.onerror = () => setStatus("SVG画像読み込み失敗");
    img.src = svgDataUrl;
  }, [svgDataUrl]);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    const getTouchPoint = (touch) => {
      const canvas = canvasRef.current;
      if (!canvas) {
        const rect = wrap.getBoundingClientRect();
        return {
          x: touch.clientX - rect.left,
          y: touch.clientY - rect.top,
        };
      }

      const rect = canvas.getBoundingClientRect();
      const displayX = ((touch.clientX - rect.left) / rect.width) * canvasSize.width;
      const displayY = ((touch.clientY - rect.top) / rect.height) * canvasSize.height;

      const logicalX = (displayX - (canvasSize.width / 2 + pan.x)) / Math.max(zoomRef.current, 0.0001) + canvasSize.width / 2;
      const logicalY = (displayY - (canvasSize.height / 2 + pan.y)) / Math.max(zoomRef.current, 0.0001) + canvasSize.height / 2;

      return {
        x: logicalX,
        y: logicalY,
      };
    };

    const hitResizeHandle = (px, py, info) => {
      if (!info) return false;
      const half = HANDLE_HIT_SIZE / 2;

      const squareHit =
        px >= info.handleX - half &&
        px <= info.handleX + half &&
        py >= info.handleY - half &&
        py <= info.handleY + half;

      const cornerZoneHit =
        px >= info.designX + info.designW * 0.68 &&
        px <= info.designX + info.designW + half &&
        py >= info.designY + info.designH * 0.68 &&
        py <= info.designY + info.designH + half;

      return squareHit || cornerZoneHit;
    };

    const hitDesignBody = (px, py, info) => {
      if (!info) return false;
      return (
        px >= info.designX &&
        px <= info.designX + info.designW &&
        py >= info.designY &&
        py <= info.designY + info.designH
      );
    };

    const handleTouchStart = (e) => {
      if (e.touches.length === 2) {
        dragRef.current.active = false;
        const [t1, t2] = e.touches;
        const startDistance = getTouchDistance(t1, t2);
        pinchRef.current = {
          active: true,
          startDistance,
          startZoom: zoomRef.current,
        };
        setDebug({
          mode: "pinch-start",
          touches: 2,
          startDistance,
          currentDistance: startDistance,
          scale: 1,
          nextZoom: zoomRef.current,
          zoom: zoomRef.current,
        });
        e.preventDefault();
        return;
      }

      if (e.touches.length === 1 && !pinchRef.current.active) {
        const touch = e.touches[0];
        const p = getTouchPoint(touch);
        const info = renderInfoRef.current;

        if (isEditMode) {
          if (info && hitResizeHandle(p.x, p.y, info)) {
            dragRef.current = {
              active: true,
              mode: "resize",
              startTouchX: p.x,
              startTouchY: p.y,
              startX: placement.x,
              startY: placement.y,
              startScale: placement.scale,
            };
            panRef.current.active = false;
            setStatus("サイズ変更開始");
            e.preventDefault();
            return;
          }

          if (info && hitDesignBody(p.x, p.y, info)) {
            dragRef.current = {
              active: true,
              mode: "move",
              startTouchX: p.x,
              startTouchY: p.y,
              startX: placement.x,
              startY: placement.y,
              startScale: placement.scale,
            };
            panRef.current.active = false;
            setStatus("デザイン移動開始");
            e.preventDefault();
            return;
          }

          const rect = wrap.getBoundingClientRect();
          panRef.current = {
            active: true,
            startTouchX: touch.clientX - rect.left,
            startTouchY: touch.clientY - rect.top,
            startX: pan.x,
            startY: pan.y,
          };
          dragRef.current.active = false;
          setStatus("キャンバス移動開始");
          e.preventDefault();
          return;
        } else {
          const rect = wrap.getBoundingClientRect();
          panRef.current = {
            active: true,
            startTouchX: touch.clientX - rect.left,
            startTouchY: touch.clientY - rect.top,
            startX: pan.x,
            startY: pan.y,
          };
          dragRef.current.active = false;
          setStatus("キャンバス移動開始");
          e.preventDefault();
          return;
        }
      }

      setDebug((prev) => ({
        ...prev,
        mode: "touchstart-non-pinch",
        touches: e.touches.length,
        zoom: zoomRef.current,
      }));
    };

    const handleTouchMove = (e) => {
      if (e.touches.length === 2 && !pinchRef.current.active) {
        dragRef.current.active = false;
        const [t1, t2] = e.touches;
        const startDistance = getTouchDistance(t1, t2);
        pinchRef.current = {
          active: true,
          startDistance,
          startZoom: zoomRef.current,
        };
        setDebug({
          mode: "pinch-start-from-move",
          touches: 2,
          startDistance,
          currentDistance: startDistance,
          scale: 1,
          nextZoom: zoomRef.current,
          zoom: zoomRef.current,
        });
        e.preventDefault();
        return;
      }

      if (e.touches.length === 2 && pinchRef.current.active) {
        dragRef.current.active = false;
        const [t1, t2] = e.touches;
        const currentDistance = getTouchDistance(t1, t2);
        const scale = currentDistance / (pinchRef.current.startDistance || 1);
        const nextZoom = clamp(pinchRef.current.startZoom * scale, MIN_ZOOM, MAX_ZOOM);
        setZoom(nextZoom);
        zoomRef.current = nextZoom;
        setDebug({
          mode: "pinch-move",
          touches: 2,
          startDistance: pinchRef.current.startDistance,
          currentDistance,
          scale,
          nextZoom,
          zoom: nextZoom,
        });
        e.preventDefault();
        return;
      }

      if (e.touches.length === 1 && dragRef.current.active && isEditMode && !pinchRef.current.active) {
        const touch = e.touches[0];
        const p = getTouchPoint(touch);
        const info = renderInfoRef.current;
        if (info) {
          if (dragRef.current.mode === "move") {
            const dx = ((p.x - dragRef.current.startTouchX) / info.drawW) * 100;
            const dy = ((p.y - dragRef.current.startTouchY) / info.drawH) * 100;
            setPlacement((prev) => ({
              ...prev,
              x: clamp(dragRef.current.startX + dx, 10, 90),
              y: clamp(dragRef.current.startY + dy, 10, 90),
            }));
            e.preventDefault();
            return;
          }

          if (dragRef.current.mode === "resize") {
            const dxPx = p.x - dragRef.current.startTouchX;
            const scaleDelta = dxPx / Math.max(info.drawW, 1);
            setPlacement((prev) => ({
              ...prev,
              scale: clamp(dragRef.current.startScale + scaleDelta, MIN_SCALE, MAX_SCALE),
            }));
            e.preventDefault();
            return;
          }
        }
      }

      if (e.touches.length === 1 && panRef.current.active && !pinchRef.current.active) {
        const touch = e.touches[0];
        const rect = wrap.getBoundingClientRect();
        const currentX = touch.clientX - rect.left;
        const currentY = touch.clientY - rect.top;
        setPan({
          x: panRef.current.startX + (currentX - panRef.current.startTouchX),
          y: panRef.current.startY + (currentY - panRef.current.startTouchY),
        });
        setStatus("キャンバス移動中");
        e.preventDefault();
        return;
      }

      if (e.touches.length >= 2) {
        setDebug((prev) => ({
          ...prev,
          mode: "touchmove-2-no-active-pinch",
          touches: e.touches.length,
          zoom: zoomRef.current,
        }));
        e.preventDefault();
        return;
      }

      setDebug((prev) => ({
        ...prev,
        mode: "touchmove-single",
        touches: e.touches.length,
        zoom: zoomRef.current,
      }));
    };

    const handleTouchEnd = (e) => {
      if (e.touches.length < 2) pinchRef.current.active = false;
      if (e.touches.length === 0) {
        dragRef.current.active = false;
        panRef.current.active = false;
      }
      setDebug((prev) => ({
        ...prev,
        mode: pinchRef.current.active ? "touch-end-active-pinch" : "touch-end-no-pinch-mode",
        touches: e.touches.length,
        zoom: zoomRef.current,
      }));
    };

    wrap.addEventListener("touchstart", handleTouchStart, { passive: false });
    wrap.addEventListener("touchmove", handleTouchMove, { passive: false });
    wrap.addEventListener("touchend", handleTouchEnd, { passive: false });
    wrap.addEventListener("touchcancel", handleTouchEnd, { passive: false });

    return () => {
      wrap.removeEventListener("touchstart", handleTouchStart);
      wrap.removeEventListener("touchmove", handleTouchMove);
      wrap.removeEventListener("touchend", handleTouchEnd);
      wrap.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, [isEditMode, placement, twoColumn, isMobile]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const shirtImg = shirtImgRef.current;
    const svgImg = svgImgRef.current;
    if (!canvas || !shirtImg || !svgImg || !shirtSrc || !svgDataUrl) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(canvasSize.width * dpr);
    canvas.height = Math.floor(canvasSize.height * dpr);
    canvas.style.width = `${canvasSize.width}px`;
    canvas.style.height = `${canvasSize.height}px`;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);
    ctx.fillStyle = "#f5f5f4";
    ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);

    const cx = canvasSize.width / 2;
    const cy = canvasSize.height / 2;
    ctx.save();
    ctx.translate(cx + pan.x, cy + pan.y);
    ctx.scale(zoom, zoom);
    ctx.translate(-cx, -cy);

    const shirtAspect = shirtImg.width / shirtImg.height;
    const maxW = canvasSize.width * 0.92;
    const maxH = canvasSize.height * 0.92;
    let drawW = maxW;
    let drawH = drawW / shirtAspect;
    if (drawH > maxH) {
      drawH = maxH;
      drawW = drawH * shirtAspect;
    }
    const shirtX = (canvasSize.width - drawW) / 2;
    const shirtY = (canvasSize.height - drawH) / 2;
    ctx.drawImage(shirtImg, shirtX, shirtY, drawW, drawH);

    const designW = drawW * placement.scale;
    const svgAspect = svgImg.width && svgImg.height ? svgImg.width / svgImg.height : 1;
    const designH = designW / svgAspect;
    const designX = shirtX + drawW * (placement.x / 100) - designW / 2;
    const designY = shirtY + drawH * (placement.y / 100) - designH / 2;

    renderInfoRef.current = {
      drawW,
      drawH,
      designX,
      designY,
      designW,
      designH,
      handleX: designX + designW,
      handleY: designY + designH,
    };

    ctx.drawImage(svgImg, designX, designY, designW, designH);

    if (isEditMode) {
      ctx.save();
      ctx.strokeStyle = "#0ea5e9";
      ctx.lineWidth = 2 / Math.max(zoom, 0.0001);
      ctx.strokeRect(designX, designY, designW, designH);

      const handleSize = HANDLE_SIZE / Math.max(zoom, 0.0001);
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = "#0ea5e9";
      ctx.lineWidth = 2 / Math.max(zoom, 0.0001);
      ctx.fillRect(designX + designW - handleSize / 2, designY + designH - handleSize / 2, handleSize, handleSize);
      ctx.strokeRect(designX + designW - handleSize / 2, designY + designH - handleSize / 2, handleSize, handleSize);
      ctx.restore();
    }

    ctx.restore();
  }, [shirtSrc, svgDataUrl, canvasSize, zoom, pan, placement, isEditMode]);

  return (
    <div style={{ minHeight: "100vh", background: "#f5f5f4", padding: isMobile ? 10 : 16, boxSizing: "border-box", fontFamily: "sans-serif" }}>
      <div style={{ maxWidth: 1480, margin: "0 auto", display: "grid", gap: 16 }}>
        <div style={{ display: "grid", gap: twoColumn ? 24 : 16, gridTemplateColumns: layoutColumns, alignItems: "start", minWidth: 0 }}>
          <div ref={previewColumnRef} style={{ minWidth: 0 }}>
            <div style={panelStyle(compact)}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 16, minWidth: 0 }}>
                <div style={{ minWidth: 0 }}>
                  <img src="/title.svg" alt="アンロシェカスタムTメーカー" style={{ display: "block", width: isMobile ? "100%" : 320, maxWidth: "100%", height: "auto" }} />
                  <div style={{ fontSize: 11, color: "#78716c", marginTop: 6 }}>{APP_VERSION}</div>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", width: isMobile ? "100%" : "auto", minWidth: 0 }}>
                  <IconButton title="お気に入り保存" compact={compact} onClick={() => setStatus("V12では未実装")}><Star size={compact ? 16 : 18} strokeWidth={2.25} /></IconButton>
                  <IconButton title="PNG保存" compact={compact} onClick={() => setStatus("V12では未実装")}><Download size={compact ? 16 : 18} strokeWidth={2.25} /></IconButton>
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10, flexWrap: "wrap", minWidth: 0 }}>
                <button type="button" title={side === "front" ? "裏を見る" : "表を見る"} aria-label={side === "front" ? "裏を見る" : "表を見る"} style={{ ...buttonStyle(false, compact), display: "inline-flex", alignItems: "center", gap: 6 }} onClick={() => setSide((prev) => (prev === "front" ? "back" : "front"))}>
                  <Repeat2 size={compact ? 15 : 17} strokeWidth={2.25} />
                  <span>{side === "front" ? "裏" : "表"}</span>
                </button>
                <IconButton title="縮小" compact={compact} onClick={() => setZoom((prev) => clamp(prev / 1.1, MIN_ZOOM, MAX_ZOOM))}><Minus size={compact ? 16 : 18} strokeWidth={2.25} /></IconButton>
                <div style={{ minWidth: 64, textAlign: "center", fontWeight: 700 }}>{Math.round(zoom * 100)}%</div>
                <IconButton title="拡大" compact={compact} onClick={() => setZoom((prev) => clamp(prev * 1.1, MIN_ZOOM, MAX_ZOOM))}><Plus size={compact ? 16 : 18} strokeWidth={2.25} /></IconButton>
                <IconButton title="表示リセット" compact={compact} onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}><House size={compact ? 16 : 18} strokeWidth={2.25} /></IconButton>
                <button type="button" style={{ ...buttonStyle(false, compact), display: "inline-flex", alignItems: "center", gap: 6, marginLeft: compact ? 8 : 12 }} onClick={() => setStatus("V12では未実装")}>
                  <FileText size={compact ? 15 : 17} strokeWidth={2.25} />
                  <span>発注書</span>
                </button>
              </div>

              <div style={{ fontSize: 12, color: "#78716c", marginBottom: 10 }}>
                shirt: {shirtSrc || "not found"}<br />
                design: {designSrc || "not found"}
              </div>

              <div ref={wrapRef} style={{ position: "relative", width: "100%", maxWidth: "100%", background: "#fff", borderRadius: 20, padding: 12, boxShadow: "inset 0 2px 8px rgba(0,0,0,0.05)", overflow: "hidden", boxSizing: "border-box", touchAction: "none", overscrollBehavior: "none", WebkitUserSelect: "none", userSelect: "none" }}>
                <canvas ref={canvasRef} style={{ display: "block", width: "100%", maxWidth: "100%", height: "auto", margin: "0 auto", borderRadius: 16, background: "#fafaf9", touchAction: "none" }} />
              </div>

              <div style={{ marginTop: 10, fontSize: 13, color: "#57534e" }}>状態: {status}</div>
            </div>
          </div>

          <div style={{ display: "grid", gap: 24, minWidth: 0 }}>
            <div style={panelStyle(compact)}>
              <SectionTitle>Tシャツ設定</SectionTitle>
              <label style={labelStyle()}>カラーコード</label>
              <select value={shirtIndex} onChange={(e) => setShirtIndex(Number(e.target.value))} style={inputStyle(compact)}>
                {shirts.map((shirt, index) => <option key={shirt.code || index} value={index}>{shirt.code} / {shirt.name || "Tシャツカラー"}</option>)}
              </select>

              <div style={{ height: 12 }} />
              <label style={labelStyle()}>サイズ</label>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(4, 1fr)" : "repeat(5, 1fr)", gap: 6 }}>
                {ALL_SIZES.map((size) => (
                  <button key={size} type="button" onClick={() => setFit(size)} style={{ ...buttonStyle(fit === size, compact), position: "relative", minHeight: compact ? 36 : 40, fontSize: compact ? 12 : 13 }}>
                    {EDITABLE_SIZES.includes(size) && <span style={{ position: "absolute", top: 3, right: 6, fontSize: 9, lineHeight: 1, color: fit === size ? "#111" : "#78716c" }}>●</span>}
                    {size}
                  </button>
                ))}
              </div>
              <div style={{ fontSize: 12, color: "#78716c", marginTop: 10 }}>● が付いているサイズは本体で編集対象</div>
            </div>

            <div style={panelStyle(compact)}>
              <SectionTitle>インクカラー（1色）</SectionTitle>
              <label style={labelStyle()}>プリセット</label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
                {inkPresets.map((ink, index) => (
                  <button key={ink.id} title={ink.name} onClick={() => setInkIndex(index)} style={{ minWidth: compact ? 38 : 42, height: compact ? 38 : 42, padding: "0 10px", borderRadius: 999, background: ink.color, border: inkIndex === index ? "3px solid #111" : "1px solid #a8a29e", cursor: "pointer", boxShadow: "0 2px 6px rgba(0,0,0,0.1)", color: ink.color === "#ffffff" ? "#111" : "transparent" }}>●</button>
                ))}
              </div>
              <div style={{ ...inputStyle(compact), background: "#fafaf9", color: "#44403c", fontWeight: 700 }}>{selectedInk.name}</div>
            </div>

            <div style={panelStyle(compact)}>
              <SectionTitle>デザイン選択</SectionTitle>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(3, 1fr)", gap: 8 }}>
                {designs.slice(0, 9).map((design, index) => {
                  const thumbSrc = design.back || design.front || "";
                  const active = designIndex === index;
                  return (
                    <button key={design.id || index} type="button" onClick={() => setDesignIndex(index)} style={{ border: active ? "2px solid #111" : "1px solid #d6d3d1", background: "#fff", borderRadius: 12, padding: 6, cursor: "pointer", overflow: "hidden", minWidth: 0 }}>
                      <div style={{ width: "100%", aspectRatio: "1 / 1", borderRadius: 9, border: "1px solid #e7e5e4", background: "#fafaf9", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", marginBottom: 6 }}>
                        {thumbSrc ? <img src={thumbSrc} alt={design.name} style={{ width: "92%", height: "92%", objectFit: "contain", display: "block" }} /> : <div style={{ fontSize: 11, color: "#a8a29e" }}>no image</div>}
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 700, lineHeight: 1.3, color: "#1c1917", wordBreak: "break-word" }}>{design.name}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={panelStyle(compact)}>
              <SectionTitle>デザイン調整</SectionTitle>
              <div style={{ fontSize: 14, color: "#57534e", lineHeight: 1.7, marginBottom: 14 }}>
                ・V16 では編集ON中の余白パンを実際に有効化<br />
                ・1本指編集 + 2本指ピンチ共存確認<br />
                ・右下ハンドルで拡大縮小
              </div>
              <div style={{ display: "grid", gap: 8 }}>
                <button style={{ ...buttonStyle(isEditMode, compact), width: "100%" }} onClick={() => setIsEditMode((prev) => !prev)}>
                  デザイン編集 {isEditMode ? "ON" : "OFF"}
                </button>
                <div style={{ ...inputStyle(compact), background: "#fafaf9", color: "#44403c", fontWeight: 700 }}>
                  X: {placement.x.toFixed(1)}% / Y: {placement.y.toFixed(1)}% / Scale: {placement.scale.toFixed(3)}
                </div>
                <div style={{ ...inputStyle(compact), background: "#fafaf9", color: "#44403c", fontWeight: 700 }}>
                  PanX: {pan.x.toFixed(1)} / PanY: {pan.y.toFixed(1)}
                </div>
                <button style={{ ...buttonStyle(false, compact), width: "100%" }} onClick={() => { setPlacement({ x: 50, y: 34, scale: 0.34 }); setPan({ x: 0, y: 0 }); }}>
                  この面の位置をリセット
                </button>
              </div>
            </div>
          </div>
        </div>

        <div style={{ position: "fixed", right: 12, bottom: 12, background: "rgba(17,17,17,0.88)", color: "#fff", borderRadius: 14, padding: "12px 14px", fontSize: 12, lineHeight: 1.55, fontFamily: "monospace", whiteSpace: "pre-wrap", zIndex: 10, minWidth: 240, pointerEvents: "none" }}>
{`version: ${APP_VERSION}
mode: ${debug.mode}
touches: ${debug.touches}
start: ${Number(debug.startDistance).toFixed(2)}
current: ${Number(debug.currentDistance).toFixed(2)}
scale: ${Number(debug.scale).toFixed(4)}
nextZoom: ${Number(debug.nextZoom).toFixed(4)}
zoom: ${Number(debug.zoom).toFixed(4)}`}
        </div>
      </div>
    </div>
  );
}
