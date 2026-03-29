
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Dices, Star, Download, Repeat2, House, Minus, Plus, FileText, Printer, Save, Trash2, ClipboardPlus, Lock, CircleHelp, X } from "lucide-react";
import { shirts } from "./shirts-data";
import { designs, getInitialPlacement, getSavedBasePlacements } from "./designs-data";

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
const PLACEMENT_STORAGE_KEY = "anrocher-design-placements-v7";
const FAVORITES_STORAGE_KEY = "anrocher-favorites-v1";
const ORDER_STORAGE_KEY = "anrocher-order-drafts-v1";
const DESIGN_ADJUST_AUTH_STORAGE_KEY = "anrocher-design-adjust-auth-v1";
const MOBILE_RIGHT_PANEL_GUIDE_STORAGE_KEY = "anrocher-mobile-right-panel-guide-v1";
const MAX_FAVORITES = 30;
const APP_VERSION = "V04.2.24-touch-stable-simple-export";
const DISPLAY_VERSION = (APP_VERSION.match(/v?\d+(?:\.\d+)*/i)?.[0] ?? APP_VERSION);
const DESIGNS_DATA_VERSION = "from-generate-designs-current";

/**
 * 注意:
 * これはフロント側の簡易ロックです。
 * 本気のセキュリティにはなりません。
 * 外部公開ページでの誤操作防止用として使ってください。
 */
const DESIGN_ADJUST_PASSWORD = "unr0ch3r";

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 4;
const HANDLE_SIZE = 24;
const HANDLE_HIT_SIZE = 52;
const MIN_WIDTH_CM = 5;
const MAX_WIDTH_CM = 45;
const HIGH_RES_EXPORT_SIZE = 3000;

const UI_BG_GRADIENT = "linear-gradient(180deg, #e7f6f8 0%, #eff9fa 36%, #f7fbfb 64%, #fffdfa 100%)";
const UI_PANEL = "rgba(255,255,255,0.98)";
const UI_PANEL_SOFT = "linear-gradient(180deg, #f8fdfe 0%, #f2fafb 45%, #ffffff 100%)";
const UI_PANEL_STAGE = "#eef5f6";
const UI_BORDER = "rgba(65,180,187,0.18)";
const UI_BORDER_STRONG = "rgba(65,180,187,0.28)";
const UI_TEXT = "#2f3b40";
const UI_HEAD = "#2e6670";
const UI_SUB = "#6b7e84";
const UI_BLUE = "#41b4bb";
const UI_BLUE_DEEP = "#2f8f98";
const UI_PINK = "#eac8bd";


function forceSingleColorSvg(svgText, color) {
  if (!svgText) return "";

  let out = svgText;

  const normalize = (value) => String(value).trim().toLowerCase().replace(/\s+/g, "");

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

function dataUrlToFile(dataUrl, fileName) {
  const parts = String(dataUrl).split(",");
  if (parts.length < 2) throw new Error("data URL の変換に失敗しました");
  const mimeMatch = parts[0].match(/data:([^;]+);base64/);
  const mime = mimeMatch?.[1] || "image/png";
  const binary = atob(parts[1]);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], fileName, { type: mime });
}

async function downloadCanvas(canvas, fileName) {
  const triggerDownload = (href) => {
    const link = document.createElement("a");
    link.download = fileName;
    link.href = href;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  if (canvas.toBlob) {
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
    if (blob) {
      const blobUrl = URL.createObjectURL(blob);
      try {
        triggerDownload(blobUrl);
        return "downloaded";
      } finally {
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
      }
    }
  }

  triggerDownload(canvas.toDataURL("image/png"));
  return "downloaded";
}

function panelStyle(compact = false) {
  return {
    background: UI_PANEL,
    borderRadius: compact ? 18 : 22,
    padding: compact ? 12 : 16,
    boxShadow: compact
      ? "0 10px 22px rgba(47,59,64,0.07)"
      : "0 14px 32px rgba(47,59,64,0.08)",
    border: `1px solid ${UI_BORDER}`,
    backdropFilter: "blur(4px)",
    minWidth: 0,
  };
}


function groupedSectionStyle(compact = false) {
  return {
    border: `1px solid ${UI_BORDER}`,
    borderRadius: compact ? 16 : 18,
    padding: compact ? 12 : 14,
    background: UI_PANEL_SOFT,
    minWidth: 0,
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.7)",
  };
}

function labelStyle() {
  return {
    display: "block",
    fontSize: 13,
    fontWeight: 800,
    letterSpacing: "0.02em",
    color: UI_HEAD,
    marginBottom: 8,
  };
}

function buttonStyle(active = false, compact = false) {
  return {
    padding: compact ? "9px 11px" : "10px 14px",
    borderRadius: 14,
    border: active ? `1px solid ${UI_BLUE}` : `1px solid ${UI_BORDER}`,
    background: active
      ? `linear-gradient(180deg, ${UI_BLUE} 0%, ${UI_BLUE_DEEP} 100%)`
      : "rgba(255,255,255,0.9)",
    cursor: "pointer",
    fontWeight: 800,
    fontSize: compact ? 13 : 14,
    color: active ? "#ffffff" : UI_TEXT,
    WebkitTextFillColor: active ? "#ffffff" : UI_TEXT,
    opacity: 1,
    appearance: "none",
    WebkitAppearance: "none",
    lineHeight: 1.2,
    boxSizing: "border-box",
    boxShadow: active
      ? "0 8px 18px rgba(65,180,187,0.24)"
      : "0 2px 8px rgba(47,59,64,0.04)",
    transition: "background 0.16s ease, border-color 0.16s ease, box-shadow 0.16s ease, transform 0.16s ease",
  };
}

function inputStyle(compact = false) {
  return {
    width: "100%",
    padding: compact ? "9px 11px" : "10px 12px",
    borderRadius: 14,
    border: `1px solid ${UI_BORDER}`,
    background: "#ffffff",
    color: UI_TEXT,
    boxSizing: "border-box",
    minWidth: 0,
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.7)",
  };
}

function IconButton({ title, onClick, compact = false, children, ariaLabel, active = false }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={ariaLabel || title}
      style={{
        ...buttonStyle(active, compact),
        width: compact ? 40 : 44,
        height: compact ? 40 : 44,
        padding: 0,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        overflow: "visible",
        color: active ? "#ffffff" : UI_TEXT,
        WebkitTextFillColor: active ? "#ffffff" : UI_TEXT,
      }}
      onClick={onClick}
    >
      {children}
    </button>
  );
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

function clearAllPlacementsStorage() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(PLACEMENT_STORAGE_KEY);
  } catch {
    // ignore
  }
}

function loadFavorites() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveFavoritesToStorage(items) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(items.slice(0, MAX_FAVORITES)));
  } catch {
    // ignore
  }
}

function loadOrderDrafts() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(ORDER_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveOrderDraftsToStorage(items) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore
  }
}

function loadDesignAdjustAuth() {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(DESIGN_ADJUST_AUTH_STORAGE_KEY) === "ok";
  } catch {
    return false;
  }
}

function saveDesignAdjustAuth(value) {
  if (typeof window === "undefined") return;
  try {
    if (value) {
      window.sessionStorage.setItem(DESIGN_ADJUST_AUTH_STORAGE_KEY, "ok");
    } else {
      window.sessionStorage.removeItem(DESIGN_ADJUST_AUTH_STORAGE_KEY);
    }
  } catch {
    // ignore
  }
}

function createEmptyOrderLine(seed = {}) {
  return {
    id: `line-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    designId: seed.designId || "",
    shirtCode: seed.shirtCode || "",
    inkColor: seed.inkColor || "",
    inkColorHex: seed.inkColorHex || "",
    fit: seed.fit || "M",
    qty: seed.qty ?? 1,
    unitPrice: seed.unitPrice ?? 3800,
    memo: seed.memo || "",
  };
}

function createEmptyOrderDraft() {
  const today = new Date().toISOString().slice(0, 10);
  return {
    id: `order-${Date.now()}`,
    orderDate: today,
    customerName: "",
    phone: "",
    address: "",
    deliveryDate: "",
    paymentStatus: "未",
    note: "",
    lines: [createEmptyOrderLine()],
  };
}

function formatYen(value) {
  const num = Number(value) || 0;
  return `¥${num.toLocaleString("ja-JP")}`;
}

function OrderLinePreviewWatermark({ line, shirts, svgCache }) {
  const shirt = shirts.find((item) => item.code === line.shirtCode);
  const variant = shirt?.variants?.[line.fit] || getBaseVariantForShirt(shirt);
  const shirtBackSrc = getVariantDisplayImage(variant, "back", "main");
  const rawBackSvg = svgCache?.[line.designId]?.back || svgCache?.[line.designId]?.front || "";
  const inkPreset = getInkPresetByValue(line.inkColor, line.inkColorHex);
  const designColor = line.inkColorHex || inkPreset?.color || "#111111";
  const designBackSrc = rawBackSvg
    ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(forceSingleColorSvg(rawBackSvg, designColor))}`
    : "";
  const placementBack = line.designId ? buildPlacementStateFromDesignsData(line.designId, line.fit || "M")?.back : null;

  if (!shirtBackSrc && !designBackSrc) return null;

  const designLeft = `${(placementBack?.x ?? 50) + 28}%`;
  const designTop = `${placementBack?.y ?? 34}%`;
  const designWidth = `${Math.max(24, Math.min(96, (placementBack?.widthCm ?? 28) * 2.1))}%`;

  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
        borderRadius: 16,
        background: "#ffffff",
        zIndex: 0,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: "translate(28%, -2%) scale(1.22)",
        }}
      >
        <div
          style={{
            position: "relative",
            width: "92%",
            maxWidth: 520,
            flexShrink: 0,
            overflow: "hidden",
          }}
        >
          {shirtBackSrc ? (
            <img
              src={shirtBackSrc}
              alt=""
              style={{
                width: "100%",
                height: "auto",
                objectFit: "contain",
                display: "block",
                opacity: 0.28,
              }}
            />
          ) : null}

          {designBackSrc ? (
            <img
              src={designBackSrc}
              alt=""
              style={{
                position: "absolute",
                left: designLeft,
                top: designTop,
                width: designWidth,
                height: "auto",
                transform: "translate(-50%, -50%)",
                opacity: 0.48,
                objectFit: "contain",
              }}
            />
          ) : null}
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          borderRadius: 16,
          background: `linear-gradient(to right, ${hexToRgba(designColor, 0.32)} 0%, ${hexToRgba(designColor, 0.18)} 22%, ${hexToRgba(designColor, 0.08)} 38%, ${hexToRgba(designColor, 0.03)} 46%, ${hexToRgba(designColor, 0)} 50%, ${hexToRgba(designColor, 0)} 100%)`,
        }}
      />
    </div>
  );
}

function OrderPanel({
  compact,
  isMobile,
  isTablet,
  draft,
  setDraft,
  savedOrders,
  setSavedOrders,
  onBackToMaker,
  onAddCurrentSelection,
  onOpenBaseOrderPage,
  hasBaseOrderUrl,
  currentSelectionLabel,
  designs,
  shirts,
  svgCache,
}) {
  const updateField = (key, value) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const updateLine = (lineId, key, value) => {
    setDraft((prev) => ({
      ...prev,
      lines: prev.lines.map((line) => (line.id === lineId ? { ...line, [key]: value } : line)),
    }));
  };

  const addLine = () => {
    setDraft((prev) => ({ ...prev, lines: [...prev.lines, createEmptyOrderLine()] }));
  };

  const removeLine = (lineId) => {
    setDraft((prev) => ({
      ...prev,
      lines: prev.lines.length <= 1 ? prev.lines : prev.lines.filter((line) => line.id !== lineId),
    }));
  };

  const subtotal = draft.lines.reduce((sum, line) => sum + (Number(line.qty) || 0) * (Number(line.unitPrice) || 0), 0);
  const total = subtotal;

  const saveDraft = () => {
    const next = [
      { ...draft, savedAt: new Date().toISOString() },
      ...savedOrders.filter((item) => item.id !== draft.id),
    ].slice(0, 50);
    setSavedOrders(next);
    saveOrderDraftsToStorage(next);
  };

  const loadDraft = (item) => {
    setDraft({ ...item });
  };

  const deleteDraft = (id) => {
    const next = savedOrders.filter((item) => item.id !== id);
    setSavedOrders(next);
    saveOrderDraftsToStorage(next);
  };

  const startNew = () => {
    setDraft(createEmptyOrderDraft());
  };

  return (
    <>
      <style>{`
        @page { size: A4 portrait; margin: 10mm; }
        @media print {
          html, body { background: #ffffff !important; }
          body * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          [data-print-hide="true"] { display: none !important; }
          [data-print-only="true"] { display: block !important; }
        }
        @media screen {
          [data-print-only="true"] { display: none !important; }
        }
      `}</style>
      <div data-print-hide="true" style={{ display: "grid", gap: isTablet ? 16 : 24, minWidth: 0 }}>

      <div style={panelStyle(compact)}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 16 }}>
          <div
              style={{
                minWidth: 0,
                pointerEvents: isMobile && isMobileRightPanelOpen ? "none" : "auto",
                userSelect: isMobile && isMobileRightPanelOpen ? "none" : undefined,
              }}
            >
            <img
              src="/title.svg"
              alt="アンロシェカスタムTメーカー"
              style={{
                display: "block",
                width: isMobile ? "100%" : 320,
                maxWidth: "100%",
                height: "auto",
              }}
            />
            <div style={{ fontSize: 12, color: UI_SUB, marginTop: 6 }}>発注書</div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              style={{
                ...buttonStyle(false, compact),
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
              onClick={onBackToMaker}
            >
              <House size={16} />
              <span>戻る</span>
            </button>
            <IconButton title="現在の内容を明細に追加" ariaLabel="現在の内容を明細に追加" compact={compact} onClick={onAddCurrentSelection}>
              <ClipboardPlus size={18} />
            </IconButton>
            <IconButton title="保存" ariaLabel="発注書を保存" compact={compact} onClick={saveDraft}>
              <Save size={18} />
            </IconButton>
            <button
              type="button"
              title={hasBaseOrderUrl ? "BASEで注文する" : "このデザインはまだBASE未設定"}
              aria-label={hasBaseOrderUrl ? "BASEで注文する" : "このデザインはまだBASE未設定"}
              style={{
                ...buttonStyle(false, compact),
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                opacity: hasBaseOrderUrl ? 1 : 0.5,
                cursor: hasBaseOrderUrl ? "pointer" : "not-allowed",
              }}
              onClick={onOpenBaseOrderPage}
              disabled={!hasBaseOrderUrl}
            >
              <span>BASEで注文する</span>
            </button>
            <IconButton title="印刷用レイアウトで印刷" ariaLabel="印刷用レイアウトで印刷" compact={compact} onClick={() => window.print()}>
              <Printer size={18} />
            </IconButton>
          </div>
        </div>

        <div style={{ ...inputStyle(compact), marginBottom: 14, background: UI_PANEL_SOFT, color: UI_SUB, fontWeight: 700 }}>
          現在の選択内容: {currentSelectionLabel}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))", gap: 10, marginBottom: 16 }}>
          <div>
            <label style={labelStyle()}>発注日</label>
            <input type="date" value={draft.orderDate} onChange={(e) => updateField("orderDate", e.target.value)} style={inputStyle(compact)} />
          </div>
          <div>
            <label style={labelStyle()}>お客様名</label>
            <input value={draft.customerName} onChange={(e) => updateField("customerName", e.target.value)} style={inputStyle(compact)} />
          </div>
          <div>
            <label style={labelStyle()}>電話</label>
            <input value={draft.phone || ""} onChange={(e) => updateField("phone", e.target.value)} style={inputStyle(compact)} />
          </div>
          <div style={{ gridColumn: isMobile ? "auto" : "1 / -1" }}>
            <label style={labelStyle()}>住所</label>
            <input value={draft.address || ""} onChange={(e) => updateField("address", e.target.value)} style={inputStyle(compact)} />
          </div>
          <div>
            <label style={labelStyle()}>お渡し予定日</label>
            <input type="date" value={draft.deliveryDate} onChange={(e) => updateField("deliveryDate", e.target.value)} style={inputStyle(compact)} />
          </div>
          <div>
            <label style={labelStyle()}>支払い状況</label>
            <select value={draft.paymentStatus} onChange={(e) => updateField("paymentStatus", e.target.value)} style={inputStyle(compact)}>
              <option>未</option>
              <option>済</option>
            </select>
          </div>
        </div>

        <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 10 }}>注文明細</div>
        <div style={{ display: "grid", gap: 10, marginBottom: 14 }}>
          {draft.lines.map((line, index) => {
            const amount = (Number(line.qty) || 0) * (Number(line.unitPrice) || 0);
            const inkPreset = getInkPresetByValue(line.inkColor, line.inkColorHex);
            const lineTint = inkPreset ? hexToRgba(inkPreset.color, 0.22) : "#fff";
            const inkFieldTint = inkPreset ? hexToRgba(inkPreset.color, 0.34) : "#fff";
            const selectedDesign = designs.find((design) => design.id === line.designId) || null;
            const selectedShirt = shirts.find((shirt) => shirt.code === line.shirtCode) || null;
            const staticFieldStyle = {
              ...inputStyle(compact),
              background: UI_PANEL_SOFT,
              display: "flex",
              alignItems: "center",
              fontWeight: 700,
            };
            return (
              <div key={line.id} style={{ position: "relative", border: `1px solid ${UI_BORDER}`, borderRadius: 16, padding: compact ? 10 : 12, background: lineTint, overflow: "hidden", isolation: "isolate" }}>
                <OrderLinePreviewWatermark line={line} shirts={shirts} svgCache={svgCache} />
                <div style={{ position: "relative", zIndex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", marginBottom: 10 }}>
                    <div style={{ fontWeight: 800 }}>明細 {index + 1}</div>
                    <IconButton title="この明細を削除" ariaLabel="この明細を削除" compact={compact} onClick={() => removeLine(line.id)}>
                      <Trash2 size={16} />
                    </IconButton>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))", gap: 10 }}>
                  <div>
                    <label style={labelStyle()}>デザイン名</label>
                    <div style={staticFieldStyle}>{selectedDesign?.name || line.designId || "-"}</div>
                  </div>
                  <div>
                    <label style={labelStyle()}>Tシャツカラー</label>
                    <div style={staticFieldStyle}>{selectedShirt ? `${selectedShirt.code} / ${selectedShirt.name}` : (line.shirtCode || "-")}</div>
                  </div>
                  <div>
                    <label style={labelStyle()}>インクカラー</label>
                    <div style={{ ...staticFieldStyle, background: inkFieldTint }}>{line.inkColor || "-"}</div>
                  </div>
                  <div>
                    <label style={labelStyle()}>サイズ</label>
                    <div style={staticFieldStyle}>{line.fit || "-"}</div>
                  </div>
                  <div>
                    <label style={labelStyle()}>枚数</label>
                    <input type="number" min="1" value={line.qty} onChange={(e) => updateLine(line.id, "qty", e.target.value)} style={inputStyle(compact)} />
                  </div>
                  <div>
                    <label style={labelStyle()}>単価</label>
                    <div style={{ ...inputStyle(compact), background: UI_PANEL_SOFT, display: "flex", alignItems: "center", fontWeight: 700 }}>¥3,800</div>
                  </div>
                  <div>
                    <label style={labelStyle()}>金額</label>
                    <div style={{ ...inputStyle(compact), background: UI_PANEL_SOFT, display: "flex", alignItems: "center", fontWeight: 700 }}>{formatYen(amount)}</div>
                  </div>
                  <div style={{ gridColumn: isMobile ? "auto" : "1 / -1" }}>
                    <label style={labelStyle()}>行メモ</label>
                    <input value={line.memo} onChange={(e) => updateLine(line.id, "memo", e.target.value)} style={inputStyle(compact)} />
                  </div>
                </div>
              </div>
            </div>
            );
          })}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
          <button type="button" style={buttonStyle(false, compact)} onClick={addLine}>明細を追加</button>
          <button type="button" style={buttonStyle(false, compact)} onClick={startNew}>新規発注書</button>
        </div>

        <div style={{ display: "grid", gap: 8, marginBottom: 16 }}>
          <div style={{ ...inputStyle(compact), background: UI_PANEL_SOFT, display: "flex", justifyContent: "space-between", alignItems: "center", fontWeight: 700 }}><span>小計</span><span>{formatYen(subtotal)}</span></div>
          <div style={{ ...inputStyle(compact), background: UI_BG_GRADIENT, display: "flex", justifyContent: "space-between", alignItems: "center", fontWeight: 800 }}><span>合計</span><span>{formatYen(total)}</span></div>
        </div>

        <div>
          <label style={labelStyle()}>備考</label>
          <textarea value={draft.note} onChange={(e) => updateField("note", e.target.value)} style={{ ...inputStyle(compact), minHeight: 110, resize: "vertical" }} />
        </div>
      </div>

      <div style={panelStyle(compact)}>
        <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 10 }}>保存済み発注書</div>
        <div style={{ display: "grid", gap: 8 }}>
          {savedOrders.length === 0 && <div style={{ fontSize: 13, color: UI_SUB }}>まだ保存された発注書はありません。</div>}
          {savedOrders.map((item) => (
            <div key={item.id} style={{ border: `1px solid ${UI_BORDER}`, borderRadius: 14, padding: 12, display: "grid", gap: 8 }}>
              <div style={{ fontWeight: 800 }}>"発注書"</div>
              <div style={{ fontSize: 12, color: UI_SUB }}>{item.customerName || "お客様名未入力"} / {item.orderDate || "日付未入力"}</div>
              <div style={{ fontSize: 12, color: UI_SUB }}>明細 {item.lines?.length || 0} 件</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button type="button" style={buttonStyle(false, compact)} onClick={() => loadDraft(item)}>読み込む</button>
                <button type="button" style={{ ...buttonStyle(false, compact), border: "1px solid #fca5a5", background: "#fff5f5" }} onClick={() => deleteDraft(item.id)}>削除</button>
              </div>
            </div>
          ))}
        </div>
      </div>
      </div>
      <OrderPrintDocument draft={draft} designs={designs} shirts={shirts} svgCache={svgCache} />
    </>
  );
}

function OrderPrintDocument({ draft, designs, shirts, svgCache }) {
  const lines = Array.isArray(draft?.lines) ? draft.lines : [];
  const subtotal = lines.reduce((sum, line) => sum + (Number(line.qty) || 0) * (Number(line.unitPrice) || 0), 0);
  const total = subtotal;

  return (
    <div data-print-only="true" style={{ display: "none" }}>
      <div
        style={{
          width: "190mm",
          margin: "0 auto",
          padding: "8mm 0",
          color: UI_TEXT,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "grid", gap: 8, marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
            <div style={{ display: "grid", gap: 4 }}>
              <img
                src="/title.svg"
                alt="アンロシェカスタムTメーカー"
                style={{
                  display: "block",
                  width: 150,
                  height: "auto",
                }}
              />
              <div style={{ fontSize: 13, fontWeight: 800, color: "#374151", paddingLeft: 2 }}>発注明細書</div>
            </div>
          </div>
          <div style={{ fontSize: 11, color: "#6b7280" }}>
            発注日: {draft?.orderDate || "-"}　お客様名: {draft?.customerName || "-"}　電話: {draft?.phone || "-"}
          </div>
          <div style={{ fontSize: 11, color: "#6b7280" }}>
            住所: {draft?.address || "-"}　お渡し予定日: {draft?.deliveryDate || "-"}　支払い状況: {draft?.paymentStatus || "-"}
          </div>
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          {lines.map((line, index) => {
            const amount = (Number(line.qty) || 0) * (Number(line.unitPrice) || 0);
            const inkPreset = getInkPresetByValue(line.inkColor, line.inkColorHex);
            const tint = inkPreset ? hexToRgba(inkPreset.color, 0.22) : "#ffffff";

            return (
              <div
                key={line.id || index}
                style={{
                  position: "relative",
                  minHeight: 64,
                  border: `1px solid ${UI_BORDER}`,
                  borderRadius: 12,
                  overflow: "hidden",
                  background: tint,
                  pageBreakInside: "avoid",
                  breakInside: "avoid",
                }}
              >
                <OrderLinePreviewWatermark line={line} designs={designs} shirts={shirts} svgCache={svgCache} />
                <div style={{ position: "relative", zIndex: 1, padding: "8px 10px", display: "grid", gap: 6 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" }}>
                    <div style={{ fontWeight: 800, fontSize: 12 }}>明細 {index + 1}</div>
                    <div style={{ fontWeight: 800, fontSize: 12 }}>{formatYen(amount)}</div>
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1.3fr 1.1fr 1.1fr 0.7fr 0.7fr 0.8fr",
                      gap: 8,
                      fontSize: 10.5,
                      lineHeight: 1.35,
                    }}
                  >
                    <div><div style={{ color: "#6b7280" }}>デザイン</div><div>{line.designName || line.designId || "-"}</div></div>
                    <div><div style={{ color: "#6b7280" }}>Tシャツ</div><div>{line.shirtCode ? `${line.shirtCode} / ${line.shirtName || ""}` : "-"}</div></div>
                    <div><div style={{ color: "#6b7280" }}>インク</div><div>{line.inkColor || "-"}</div></div>
                    <div><div style={{ color: "#6b7280" }}>サイズ</div><div>{line.fit || "-"}</div></div>
                    <div><div style={{ color: "#6b7280" }}>枚数</div><div>{line.qty || "-"}</div></div>
                    <div><div style={{ color: "#6b7280" }}>単価</div><div>{formatYen(Number(line.unitPrice) || 0)}</div></div>
                  </div>
                  {line.memo ? (
                    <div style={{ fontSize: 10, color: "#374151" }}>
                      <span style={{ color: "#6b7280" }}>メモ: </span>{line.memo}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
          <div style={{ display: "flex", justifyContent: "space-between", border: "1px solid #e5e7eb", borderRadius: 10, padding: "8px 10px", fontSize: 11 }}>
            <span>小計</span><strong>{formatYen(subtotal)}</strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", border: "1px solid #d1d5db", borderRadius: 10, padding: "8px 10px", fontSize: 12, fontWeight: 800 }}>
            <span>合計</span><strong>{formatYen(total)}</strong>
          </div>
          {draft?.note ? (
            <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: "8px 10px", fontSize: 10.5, whiteSpace: "pre-wrap" }}>
              <div style={{ color: "#6b7280", marginBottom: 4 }}>備考</div>
              <div>{draft.note}</div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function buildFavoritePreviewDataUrl(canvas, width = 220) {
  if (!canvas) return "";
  const scale = width / canvas.width;
  const targetW = Math.max(120, Math.round(canvas.width * scale));
  const targetH = Math.max(120, Math.round(canvas.height * scale));
  const thumb = document.createElement("canvas");
  thumb.width = targetW;
  thumb.height = targetH;
  const ctx = thumb.getContext("2d");
  if (!ctx) return "";
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, thumb.width, thumb.height);
  ctx.drawImage(canvas, 0, 0, thumb.width, thumb.height);
  return thumb.toDataURL("image/jpeg", 0.82);
}

function loadImageForPreview(src) {
  return new Promise((resolve, reject) => {
    if (!src) {
      reject(new Error("image src missing"));
      return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`image load failed: ${src}`));
    img.src = src;
  });
}

function hexToRgba(hex, alpha = 0.12) {
  if (!hex) return `rgba(0,0,0,${alpha})`;
  let value = String(hex).trim().replace('#', '');
  if (value.length === 3) value = value.split('').map((ch) => ch + ch).join('');
  if (value.length !== 6) return `rgba(0,0,0,${alpha})`;
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getInkPresetByValue(value, explicitHex = "") {
  const normalized = String(value || '').trim().toLowerCase();
  const normalizedHex = String(explicitHex || '').trim().toLowerCase();
  if (normalizedHex) {
    const byHex = inkPresets.find((ink) => ink.color.trim().toLowerCase() === normalizedHex);
    if (byHex) return byHex;
  }
  if (!normalized) return null;
  return (
    inkPresets.find((ink) => ink.name.trim().toLowerCase() === normalized) ||
    inkPresets.find((ink) => ink.id.trim().toLowerCase() === normalized) ||
    inkPresets.find((ink) => ink.color.trim().toLowerCase() === normalized) ||
    null
  );
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getTouchDistance(t1, t2) {
  return Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
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

function getVariantImageByTierAndSide(variant, tier, side) {
  if (!variant) return "";
  const opposite = side === "front" ? "back" : "front";
  const cap = side === "front" ? "Front" : "Back";
  const oppositeCap = opposite === "front" ? "Front" : "Back";

  const tierObj = variant?.[tier];
  const candidates = [
    tierObj?.[side],
    tierObj?.[opposite],
    variant?.[`${side}${tier === "main" ? "Main" : "List"}`],
    variant?.[`${opposite}${tier === "main" ? "Main" : "List"}`],
    variant?.[`${tier}${cap}`],
    variant?.[`${tier}${oppositeCap}`],
  ];

  for (const value of candidates) {
    if (typeof value === "string" && value.trim()) return value;
  }
  return "";
}

function getVariantDisplayImage(variant, side, usage = "main") {
  if (!variant) return "";
  const opposite = side === "front" ? "back" : "front";

  if (usage === "list") {
    return (
      getVariantImageByTierAndSide(variant, "list", side) ||
      getVariantImageByTierAndSide(variant, "main", side) ||
      variant?.[side] ||
      variant?.[opposite] ||
      ""
    );
  }

  return (
    getVariantImageByTierAndSide(variant, "main", side) ||
    variant?.[side] ||
    variant?.[opposite] ||
    getVariantImageByTierAndSide(variant, "list", side) ||
    ""
  );
}

function getShirtScale(sizeKey) {
  const base = getBodyLengthCm(BASE_PRINT_SIZE);
  const current = getBodyLengthCm(sizeKey);
  return current / base;
}

function getCanvasPoint(clientX, clientY, canvas) {
  const rect = canvas.getBoundingClientRect();
  const logicalWidth = canvas.clientWidth || rect.width || canvas.width;
  const logicalHeight = canvas.clientHeight || rect.height || canvas.height;
  return {
    x: ((clientX - rect.left) / Math.max(rect.width, 1)) * logicalWidth,
    y: ((clientY - rect.top) / Math.max(rect.height, 1)) * logicalHeight,
  };
}

function drawSelectionBox(ctx, info) {
  if (!info) return;

  const { designX, designY, designW, designH } = info;
  const hx = info.handleX ?? (designX + designW);
  const hy = info.handleY ?? (designY + designH);
  const zoom = info.zoom || 1;

  ctx.save();
  ctx.strokeStyle = "#0ea5e9";
  ctx.lineWidth = 2 / zoom;
  ctx.setLineDash([]);
  ctx.strokeRect(designX, designY, designW, designH);

  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#0ea5e9";
  ctx.lineWidth = 2 / zoom;
  const handleSize = HANDLE_SIZE / Math.max(zoom, 0.0001);
  ctx.fillRect(hx - handleSize / 2, hy - handleSize / 2, handleSize, handleSize);
  ctx.strokeRect(hx - handleSize / 2, hy - handleSize / 2, handleSize, handleSize);
  ctx.restore();
}

function hitResizeHandle(point, info) {
  if (!info) return false;
  const half = HANDLE_HIT_SIZE / 2;

  const squareHit =
    point.x >= info.handleX - half &&
    point.x <= info.handleX + half &&
    point.y >= info.handleY - half &&
    point.y <= info.handleY + half;

  const cornerZoneHit =
    point.x >= info.designX + info.designW * 0.68 &&
    point.x <= info.designX + info.designW + half &&
    point.y >= info.designY + info.designH * 0.68 &&
    point.y <= info.designY + info.designH + half;

  return squareHit || cornerZoneHit;
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

function interpolateFacePlacement(saved, designId, side, targetSize) {
  const defaults = getInitialPlacement(designId);
  const fallbackFace = defaults?.[side] ?? {
    x: 50,
    y: 30,
    widthCm: 28,
    flipX: false,
  };

  const bySide = saved?.[designId]?.[side] || {};
  const mFace = bySide.M ? normalizeFace(bySide.M, fallbackFace) : normalizeFace(fallbackFace, fallbackFace);
  const direct = EDITABLE_SIZES.includes(targetSize) ? bySide[targetSize] : null;

  if (direct) {
    const face = normalizeFace(direct, fallbackFace);
    return {
      x: face.x,
      y: face.y,
      widthCm: mFace.widthCm,
      flipX: face.flipX,
    };
  }

  const sizes = getAllowedStoredFaceSizes(saved, designId, side);

  if (sizes.length === 0) {
    const face = normalizeFace(fallbackFace, fallbackFace);
    return {
      x: face.x,
      y: face.y,
      widthCm: mFace.widthCm,
      flipX: face.flipX,
    };
  }

  if (sizes.length === 1) {
    const only = normalizeFace(bySide[sizes[0]], fallbackFace);
    return {
      x: only.x,
      y: only.y,
      widthCm: mFace.widthCm,
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
    return {
      x: upper.x,
      y: upper.y,
      widthCm: mFace.widthCm,
      flipX: upper.flipX,
    };
  }

  if (!upperSize) {
    const lower = normalizeFace(bySide[lowerSize], fallbackFace);
    return {
      x: lower.x,
      y: lower.y,
      widthCm: mFace.widthCm,
      flipX: lower.flipX,
    };
  }

  if (lowerSize === upperSize) {
    const same = normalizeFace(bySide[lowerSize], fallbackFace);
    return {
      x: same.x,
      y: same.y,
      widthCm: mFace.widthCm,
      flipX: same.flipX,
    };
  }

  const lower = normalizeFace(bySide[lowerSize], fallbackFace);
  const upper = normalizeFace(bySide[upperSize], fallbackFace);

  const lowerCm = getBodyLengthCm(lowerSize);
  const upperCm = getBodyLengthCm(upperSize);
  const t = (targetCm - lowerCm) / (upperCm - lowerCm);

  return {
    x: lerp(lower.x, upper.x, t),
    y: lerp(lower.y, upper.y, t),
    widthCm: mFace.widthCm,
    flipX: t < 0.5 ? lower.flipX : upper.flipX,
  };
}

function buildPlacementState(saved, designId, targetSize) {
  return {
    front: interpolateFacePlacement(saved, designId, "front", targetSize),
    back: interpolateFacePlacement(saved, designId, "back", targetSize),
  };
}

function buildPlacementStateFromDesignsData(designId, targetSize) {
  const savedBasePlacements = getSavedBasePlacements(designId) ?? {};
  return buildPlacementState({ [designId]: savedBasePlacements }, designId, targetSize);
}

function buildSavedMapFromDesignsData() {
  const map = {};
  for (const design of designs) {
    const designId = design?.id;
    if (!designId) continue;
    const defaults = getInitialPlacement(designId) ?? {};
    const savedBases = getSavedBasePlacements(designId) ?? {};

    const frontM = roundPlacement(savedBases?.front?.M ?? defaults?.front);
    const backM = roundPlacement(savedBases?.back?.M ?? defaults?.back);

    map[designId] = {
      front: {
        "120": { ...roundPlacement(savedBases?.front?.["120"] ?? defaults?.front), widthCm: frontM.widthCm },
        M: { ...frontM },
        XXL: { ...roundPlacement(savedBases?.front?.XXL ?? defaults?.front), widthCm: frontM.widthCm },
      },
      back: {
        "120": { ...roundPlacement(savedBases?.back?.["120"] ?? defaults?.back), widthCm: backM.widthCm },
        M: { ...backM },
        XXL: { ...roundPlacement(savedBases?.back?.XXL ?? defaults?.back), widthCm: backM.widthCm },
      },
    };
  }
  return map;
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
    return getVariantDisplayImage(baseVariant, side, "list");
  };

  return (
    <div ref={wrapRef} style={{ position: "relative", minWidth: 0 }}>
      <button
        type="button"
        style={{
          ...inputStyle(compact),
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: "#ffffff",
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
            borderRadius: 8,
            border: `1px solid ${UI_BORDER}`,
            background: UI_PANEL_SOFT,
            flexShrink: 0,
          }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: compact ? 13 : 14 }}>{selectedShirt?.code || "-"}</div>
          <div style={{ fontSize: 11, color: UI_SUB }}>{selectedShirt?.name || "Tシャツカラー"}</div>
        </div>
        <div style={{ fontSize: 11, color: UI_SUB }}>▼</div>
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            left: 0,
            right: 0,
            zIndex: 20,
            background: "#ffffff",
            border: `1px solid ${UI_BORDER}`,
            borderRadius: 16,
            boxShadow: "0 12px 32px rgba(0,0,0,0.12)",
            padding: 10,
            minWidth: 0,
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
                  background: "#ffffff",
                  borderRadius: 12,
                  padding: 8,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  textAlign: "left",
                  minWidth: 0,
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
                    border: `1px solid ${UI_BORDER}`,
                    background: UI_PANEL_SOFT,
                    flexShrink: 0,
                  }}
                />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: compact ? 13 : 14 }}>{shirt.code}</div>
                  <div style={{ fontSize: 12, color: UI_SUB }}>{shirt.name || "Tシャツカラー"}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DesignPicker({ designs, designId, onSelectDesign, columns = 3, compact = false, isMobile = false }) {
  const thumbSide = "back";
  const [hoveredId, setHoveredId] = useState(null);

  if (isMobile) {
    return (
      <div style={{ minWidth: 0, maxWidth: "100%", overflow: "hidden" }}>
        <div
          style={{
            display: "grid",
            gridAutoFlow: "column",
            gridTemplateRows: "repeat(2, auto)",
            gridAutoColumns: compact ? "132px" : "148px",
            gap: compact ? 8 : 10,
            overflowX: "auto",
            overflowY: "hidden",
            width: "100%",
            maxWidth: "100%",
            paddingBottom: 4,
            alignContent: "start",
            WebkitOverflowScrolling: "touch",
            scrollbarWidth: "thin",
          }}
        >
          {designs.map((design) => {
            const thumbSrc = thumbSide === "front" ? design.front || design.back : design.back || design.front;
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
                  onSelectDesign(design.id);
                }}
                style={{
                  position: "relative",
                  width: "100%",
                  minWidth: 0,
                  maxWidth: "100%",
                  border: active ? `2px solid ${UI_BLUE}` : `1px solid ${UI_BORDER}`,
                  background: "#ffffff",
                  borderRadius: compact ? 10 : 12,
                  padding: compact ? 5 : 6,
                  cursor: "pointer",
                  display: "block",
                  boxShadow: active ? "0 8px 18px rgba(65,180,187,0.18)" : "none",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: "100%",
                    aspectRatio: "1 / 1",
                    borderRadius: compact ? 8 : 9,
                    border: active ? "1px solid #d6d3d1" : "1px solid #e7e5e4",
                    background: UI_PANEL_SOFT,
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
                    background: active ? "rgba(46,102,112,0.92)" : "rgba(47,59,64,0.82)",
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
      </div>
    );
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        gap: compact ? 6 : 8,
        minWidth: 0,
      }}
    >
      {designs.map((design) => {
        const thumbSrc = thumbSide === "front" ? design.front || design.back : design.back || design.front;
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
              onSelectDesign(design.id);
            }}
            style={{
              position: "relative",
              border: active ? `2px solid ${UI_BLUE}` : `1px solid ${UI_BORDER}`,
              background: "#ffffff",
              borderRadius: compact ? 10 : 12,
              padding: compact ? 5 : 6,
              cursor: "pointer",
              display: "block",
              boxShadow: active ? "0 8px 18px rgba(65,180,187,0.18)" : "none",
              overflow: "hidden",
              minWidth: 0,
            }}
          >
            <div
              style={{
                width: "100%",
                aspectRatio: "1 / 1",
                borderRadius: compact ? 8 : 9,
                border: active ? "1px solid #d6d3d1" : "1px solid #e7e5e4",
                background: UI_PANEL_SOFT,
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
                background: active ? "rgba(46,102,112,0.92)" : "rgba(47,59,64,0.82)",
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


function RightDummyBlock({ title, rows = 6, compact = false }) {
  return (
    <div style={groupedSectionStyle(compact)}>
      <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 12 }}>{title}</div>
      <div style={{ display: "grid", gap: 8 }}>
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            style={{
              height: 38,
              borderRadius: 10,
              background: i % 2 === 0 ? "#f5f5f4" : "#fafaf9",
              border: `1px solid ${UI_BORDER}`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

function RightDummyTestPanel({
  compact,
  isMobile,
  designId,
  onSelectDesign,
  designColumns,
  shirts,
  shirtCode,
  setShirtCode,
  side,
  fit,
  setFit,
  inkColor,
  setInkColor,
  selectedInkName,
  openSections,
  toggleSection,
  isDesignAdjustAuthed,
  toggleDesignAdjustLock,
  currentPlacement,
  designWidthCm,
  currentBodyLengthCm,
  widthPercentOfBody,
  directSaved,
  canEditCurrentSize,
  isEditMode,
  ensureDesignAdjustAuth,
  setIsEditMode,
  setIsDesignSelected,
  resetPlacement,
  exportAllDesignsPatch,
}) {
  return (
    <div style={{ minWidth: 0 }}>
      <div
        style={{
          ...panelStyle(compact),
          display: "grid",
          gap: 14,
          alignContent: "start",
          position: isMobile ? "static" : "sticky",
          top: isMobile ? "auto" : 16,
          maxHeight: isMobile ? "none" : "calc(100vh - 32px)",
          overflowY: isMobile ? "visible" : "auto",
          minHeight: 0,
          paddingRight: isMobile ? undefined : 4,
          boxSizing: "border-box",
        }}
      >
        <div style={groupedSectionStyle(compact)}>
          <SectionHeader
            title="デザイン選択"
            open={openSections.designPicker}
            onToggle={() => toggleSection("designPicker")}
            collapsible={true}
            isMobile={isMobile}
            fontSize={isMobile ? 18 : 20}
          />
          {openSections.designPicker && (
            <DesignPicker
              designs={designs}
              designId={designId}
              onSelectDesign={onSelectDesign}
              columns={designColumns}
              compact={compact}
              isMobile={isMobile}
            />
          )}
        </div>

        <div style={groupedSectionStyle(compact)}>
          <SectionHeader
            title="Tシャツ設定"
            open={openSections.shirtSettings}
            onToggle={() => toggleSection("shirtSettings")}
            collapsible={true}
            isMobile={isMobile}
            fontSize={isMobile ? 18 : 20}
          />
          {openSections.shirtSettings && (
            <div style={{ display: "grid", gap: 12 }}>
              <div>
                <label style={labelStyle()}>カラーコード</label>
                <ShirtPicker
                  shirts={shirts}
                  shirtCode={shirtCode}
                  setShirtCode={setShirtCode}
                  side={side}
                  compact={compact}
                />
              </div>

              <div>
                <label style={labelStyle()}>サイズ</label>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
                    gap: 8,
                  }}
                >
                  {ALL_SIZES.map((size) => (
                    <SizeButton
                      key={size}
                      size={size}
                      active={fit === size}
                      editable={false}
                      showEditableMark={false}
                      compact={compact}
                      onClick={() => setFit(size)}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div style={groupedSectionStyle(compact)}>
          <SectionHeader
            title="インクカラー（1色）"
            open={openSections.inkColor}
            onToggle={() => toggleSection("inkColor")}
            collapsible={true}
            isMobile={isMobile}
            fontSize={isMobile ? 18 : 20}
          />
          {openSections.inkColor && (
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
                  minWidth: 0,
                }}
              >
                <div
                  style={{
                    width: 50,
                    height: 42,
                    border: `1px solid ${UI_BORDER}`,
                    borderRadius: 8,
                    background: inkColor,
                  }}
                />
                <div
                  style={{
                    ...inputStyle(compact),
                    background: UI_PANEL_SOFT,
                    color: UI_HEAD,
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

        <div style={groupedSectionStyle(compact)}>
          <SectionHeader
            title="デザイン調整"
            open={openSections.designAdjust}
            onToggle={() => toggleSection("designAdjust")}
            collapsible={true}
            isMobile={isMobile}
            fontSize={isMobile ? 18 : 20}
            rightElement={
              <button
                type="button"
                onClick={toggleDesignAdjustLock}
                title={isDesignAdjustAuthed ? "押すと再ロック" : "押して認証"}
                aria-label={isDesignAdjustAuthed ? "デザイン調整を再ロック" : "デザイン調整を認証"}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  fontSize: 11,
                  fontWeight: 700,
                  color: isDesignAdjustAuthed ? "#16a34a" : "#78716c",
                  border: `1px solid ${UI_BORDER}`,
                  borderRadius: 999,
                  padding: "4px 8px",
                  background: UI_PANEL_SOFT,
                  cursor: "pointer",
                }}
              >
                <Lock size={12} />
                {isDesignAdjustAuthed ? "認証済み" : "ロック中"}
              </button>
            }
          />

          {openSections.designAdjust && (
            <>
              <div style={{ fontSize: 14, color: UI_SUB, lineHeight: 1.7, marginBottom: 14 }}>
                ・このセクションは簡易パスワード保護つき
                <br />
                ・編集できるのは 120 / M / XXL のみ
                <br />
                ・中間サイズは位置のみ補間、版幅は M 基準
                <br />
                ・スマホは下の「デザイン編集 ON/OFF」で1本指操作を切り替え
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                  gap: 8,
                  marginBottom: 10,
                  minWidth: 0,
                }}
              >
                <div style={{ ...inputStyle(compact), background: UI_PANEL_SOFT, color: UI_TEXT, fontWeight: 700 }}>
                  X: {currentPlacement?.x?.toFixed?.(1) ?? 0}%
                </div>
                <div style={{ ...inputStyle(compact), background: UI_PANEL_SOFT, color: UI_TEXT, fontWeight: 700 }}>
                  Y: {currentPlacement?.y?.toFixed?.(1) ?? 0}%
                </div>
                <div style={{ ...inputStyle(compact), background: UI_PANEL_SOFT, color: UI_TEXT, fontWeight: 700 }}>
                  版幅: {designWidthCm.toFixed(1)}cm
                </div>
                <div style={{ ...inputStyle(compact), background: UI_PANEL_SOFT, color: UI_TEXT, fontWeight: 700 }}>
                  身丈: {currentBodyLengthCm}cm
                </div>
                <div style={{ ...inputStyle(compact), background: UI_PANEL_SOFT, color: UI_TEXT, fontWeight: 700 }}>
                  身丈比: {widthPercentOfBody.toFixed(1)}%
                </div>
                <div style={{ ...inputStyle(compact), background: UI_PANEL_SOFT, color: UI_TEXT, fontWeight: 700 }}>
                  種別: {directSaved ? "基準点" : "designs-data / 補間"}
                </div>
                <div
                  style={{
                    ...inputStyle(compact),
                    background: UI_PANEL_SOFT,
                    color: UI_TEXT,
                    fontWeight: 700,
                    gridColumn: isMobile ? "auto" : "1 / -1",
                  }}
                >
                  編集: {canEditCurrentSize ? "可 / 版幅は常にM基準" : "不可（補間のみ）"}
                </div>
              </div>

              <div style={{ marginBottom: 14, display: "grid", gap: 8 }}>
                <button
                  style={{
                    ...buttonStyle(isEditMode, compact),
                    width: "100%",
                    opacity: canEditCurrentSize ? 1 : 0.5,
                    cursor: canEditCurrentSize ? "pointer" : "not-allowed",
                  }}
                  disabled={!canEditCurrentSize}
                  onClick={() => {
                    if (!canEditCurrentSize) return;
                    if (!ensureDesignAdjustAuth()) return;
                    setIsEditMode((prev) => !prev);
                    setIsDesignSelected(false);
                  }}
                >
                  デザイン編集 {isEditMode ? "ON" : "OFF"}
                </button>

                <button
                  style={{
                    ...buttonStyle(false, compact),
                    width: "100%",
                    opacity: canEditCurrentSize ? 1 : 0.5,
                    cursor: canEditCurrentSize ? "pointer" : "not-allowed",
                  }}
                  disabled={!canEditCurrentSize}
                  onClick={resetPlacement}
                >
                  この面の位置をリセット
                </button>

                <button
                  style={{
                    ...buttonStyle(false, compact),
                    width: "100%",
                  }}
                  onClick={exportAllDesignsPatch}
                >
                  全デザインを書き出し
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function SizeButton({ size, active, editable, showEditableMark = true, onClick, compact = false }) {
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
      {editable && showEditableMark && (
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

function SectionHeader({ title, open, onToggle, collapsible, isMobile, fontSize, rightElement = null }) {
  const handleToggle = () => {
    if (!collapsible) return;
    onToggle?.();
  };

  return (
    <div
      onClick={handleToggle}
      style={{
        fontWeight: 800,
        fontSize,
        marginBottom: open ? 14 : 0,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 8,
        cursor: collapsible ? "pointer" : "default",
        userSelect: "none",
      }}
    >
      <span style={{ color: UI_HEAD }}>{title}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        {rightElement ? (
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ display: "flex", alignItems: "center" }}
          >
            {rightElement}
          </div>
        ) : null}
        {collapsible && (
          <button
            type="button"
            aria-label={open ? `${title} をたたむ` : `${title} を開く`}
            onClick={(e) => {
              e.stopPropagation();
              handleToggle();
            }}
            style={{
              border: "none",
              background: "transparent",
              width: 24,
              height: 24,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
              fontWeight: 900,
              lineHeight: 1,
              color: UI_TEXT,
              cursor: "pointer",
              padding: 0,
              flexShrink: 0,
              boxShadow: "none",
            }}
          >
            {open ? "−" : "＋"}
          </button>
        )}
      </div>
    </div>
  );
}

function HelpModal({ open, onClose, compact = false, isMobile = false }) {
  useEffect(() => {
    if (!open) return undefined;

    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  const sectionTitleStyle = {
    fontSize: isMobile ? 17 : 18,
    fontWeight: 800,
    color: "#1c1917",
    marginBottom: 8,
  };

  const sectionTextStyle = {
    fontSize: 14,
    color: UI_SUB,
    lineHeight: 1.75,
  };

  const cardStyle = {
    border: `1px solid ${UI_BORDER}`,
    borderRadius: 16,
    background: "#ffffff",
    padding: isMobile ? 14 : 16,
    boxShadow: "0 6px 20px rgba(0,0,0,0.05)",
  };

  const chipStyle = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    padding: "6px 10px",
    background: "#eefbfc",
    color: "#0f766e",
    fontSize: 12,
    fontWeight: 800,
    border: "1px solid #bfe8eb",
  };

  const steps = [
    "Tシャツカラーを選ぶ",
    "サイズを選ぶ",
    "デザインを選ぶ",
    "インクカラーを選ぶ",
    "表・裏を確認する",
    "保存または発注へ進む",
  ];

  const faqItems = [
    {
      q: "スマホでも使えますか？",
      a: "使えます。ピンチで拡大縮小しながら、画面上で仕上がりを確認できます。",
    },
    {
      q: "保存した内容はどこに残りますか？",
      a: "お気に入りや発注書の下書きは、この端末のブラウザ保存を使っています。同じ端末・同じブラウザで続きがしやすい仕組みです。",
    },
    {
      q: "画像保存がうまくいかないときは？",
      a: "もう一度ボタンを押し直すか、少し待ってからお試しください。端末やブラウザの状態によって保存開始まで少し時間がかかることがあります。",
    },
    {
      q: "BASE注文はどう使えばいいですか？",
      a: "BASEページが設定されているデザインは、そのまま注文ページへ進めます。未設定デザインではボタンが無効になります。",
    },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="アンロシェカスタムTメーカーのヘルプ"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(28,25,23,0.56)",
        display: "flex",
        alignItems: isMobile ? "stretch" : "center",
        justifyContent: "center",
        padding: isMobile ? 0 : 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(980px, 100%)",
          maxHeight: isMobile ? "100vh" : "min(88vh, 920px)",
          background: "#fcfcfc",
          borderRadius: isMobile ? 0 : 24,
          overflow: "hidden",
          boxShadow: "0 18px 50px rgba(0,0,0,0.22)",
          display: "grid",
          gridTemplateRows: "auto 1fr auto",
        }}
      >
        <div
          style={{
            padding: isMobile ? 14 : 18,
            borderBottom: "1px solid #e7e5e4",
            background: "linear-gradient(180deg, #f4feff 0%, #fff7f3 100%)",
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            alignItems: "flex-start",
          }}
        >
          <div>
            <div style={chipStyle}>はじめてでも使いやすいガイド</div>
            <div style={{ fontSize: isMobile ? 22 : 26, fontWeight: 900, color: "#1c1917", marginTop: 10 }}>
              アンロシェカスタムTメーカー 使い方
            </div>
            <div style={{ fontSize: 14, color: UI_SUB, marginTop: 8, lineHeight: 1.75 }}>
              迷ったらここを見ればOK。まずは「使い方の流れ」だけ見れば、だいたい進められます。
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="ヘルプを閉じる"
            style={{
              ...buttonStyle(false, compact),
              width: compact ? 40 : 44,
              height: compact ? 40 : 44,
              padding: 0,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              background: "#ffffffcc",
              backdropFilter: "blur(6px)",
            }}
          >
            <X size={18} strokeWidth={2.3} />
          </button>
        </div>

        <div style={{ overflowY: "auto", padding: isMobile ? 14 : 20, display: "grid", gap: 14 }}>
          <div style={cardStyle}>
            <div style={sectionTitleStyle}>このアプリでできること</div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))",
                gap: 6,
              }}
            >
              {[
                "Tシャツカラーとサイズを選べます",
                "デザインとインクカラーの組み合わせを確認できます",
                "表面・背面を切り替えて見られます",
                "お気に入り保存や画像保存ができます",
                "発注書を作ってあとで読み込みできます",
                "設定済みデザインは BASE 注文ページへ進めます",
              ].map((item) => (
                <div
                  key={item}
                  style={{
                    border: "1px solid #f0ede9",
                    borderRadius: 14,
                    padding: "8px 14px",
                    background: "#ffffff",
                    fontSize: 14,
                    color: UI_TEXT,
                    lineHeight: 1.6,
                    fontWeight: 700,
                  }}
                >
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div style={cardStyle}>
            <div style={sectionTitleStyle}>かんたん手順</div>
            <div style={{ display: "grid", gap: 10 }}>
              {steps.map((step, index) => (
                <div
                  key={step}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "44px 1fr",
                    gap: 12,
                    alignItems: "start",
                    border: "1px solid #f0ede9",
                    borderRadius: 14,
                    padding: "6px 12px",
                    background: index === steps.length - 1 ? "#fff7f3" : "#fff",
                  }}
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 999,
                      background: index % 2 === 0 ? "#41b4bb" : "#eac8bd",
                      color: "#1c1917",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 13,
                      fontWeight: 900,
                    }}
                  >
                    {index + 1}
                  </div>
                  <div style={{ ...sectionTextStyle, fontWeight: 700 }}>{step}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={cardStyle}>
            <div style={sectionTitleStyle}>PCでの操作</div>
            <div style={{ display: "grid", gap: 10 }}>
              {[
                "Shift＋ドラッグ：表示位置を動かせます",
                "Shift＋マウスホイール：プレビューを拡大・縮小できます",
                "クリック：各デザインや設定を選べます",
              ].map((item) => (
                <div
                  key={item}
                  style={{
                    border: "1px solid #f0ede9",
                    borderRadius: 14,
                    padding: "8px 14px",
                    background: "#ffffff",
                    fontSize: 14,
                    color: UI_TEXT,
                    lineHeight: 1.6,
                    fontWeight: 700,
                  }}
                >
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div style={cardStyle}>
            <div style={sectionTitleStyle}>操作アイコンについて</div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr",
                gap: 6,
              }}
            >
              {[
                { icon: Dices, label: "ランダム", text: "Tシャツやデザインの組み合わせをランダムに切り替えます" },
                { icon: Star, label: "お気に入り", text: "今の内容をお気に入りとして保存します" },
                { icon: Repeat2, label: "表／裏", text: "Tシャツの表面・背面を切り替えます" },
                { icon: Plus, label: "ズーム", text: "プレビューを拡大・縮小して見やすく確認できます" },
                { icon: House, label: "表示リセット", text: "プレビュー表示を見やすい初期状態に戻します" },
                { icon: CircleHelp, label: "ヘルプ", text: "使い方やよくある質問を開きます" },
                { icon: Download, label: "保存", text: "確認用の画像を保存できます" },
                { icon: FileText, label: "発注", text: "発注書の作成・保存・読み込みができます" },
                { icon: ClipboardPlus, label: "BASE", text: "注文ページへ進みます" },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.label}
                    style={{
                      border: "1px solid #f0ede9",
                      borderRadius: 14,
                      padding: "8px 10px",
                      background: "#ffffff",
                      display: "grid",
                      gridTemplateColumns: "28px 1fr",
                      gap: 8,
                      alignItems: "center",
                    }}
                  >
                    <div
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 10,
                        background: "#f4feff",
                        border: "1px solid #d9f0f2",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: UI_HEAD,
                      }}
                    >
                      <Icon size={13} strokeWidth={2.1} />
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: "#1c1917", marginBottom: 2 }}>{item.label}</div>
                      <div style={sectionTextStyle}>{item.text}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={cardStyle}>
            <div style={sectionTitleStyle}>保存・発注について</div>
            <div style={sectionTextStyle}>
              ・お気に入り保存ができます。<br />
              ・発注書は保存 / 読み込み / 削除ができます。<br />
              ・高解像度PNG保存にも対応しています。<br />
              ・BASEページがあるデザインは、そのまま注文導線へ進めます。
            </div>
          </div>

          <div style={cardStyle}>
            <div style={sectionTitleStyle}>よくある質問</div>
            <div style={{ display: "grid", gap: 10 }}>
              {faqItems.map((item) => (
                <div
                  key={item.q}
                  style={{
                    border: "1px solid #f0ede9",
                    borderRadius: 14,
                    background: "#ffffff",
                    padding: "12px 14px",
                  }}
                >
                  <div style={{ fontWeight: 800, fontSize: 14, color: "#1c1917", marginBottom: 6 }}>{item.q}</div>
                  <div style={sectionTextStyle}>{item.a}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div
          style={{
            padding: isMobile ? 14 : 16,
            borderTop: "1px solid #e7e5e4",
            background: "#ffffff",
            display: "flex",
            justifyContent: "space-between",
            gap: 10,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <div style={{ fontSize: 13, color: UI_SUB, lineHeight: 1.6 }}>
            まずは「かんたん手順」だけ見れば十分です。迷ったときは「困ったとき」を見ればOKです。
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              ...buttonStyle(false, compact),
              minWidth: isMobile ? "100%" : 140,
              background: "#41b4bb",
              color: "#ffffff",
              border: "1px solid #41b4bb",
            }}
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const renderInfoRef = useRef(null);
  const zoomRef = useRef(1);
  const pinchRef = useRef({ active: false, startDistance: 0, startZoom: 1 });
  const shirtImgRef = useRef(null);
  const svgImgRef = useRef(null);
  const activeShirtSrcRef = useRef("");
  const activeSvgSrcRef = useRef("");
  const shirtImageCacheRef = useRef(new Map());
  const svgImageCacheRef = useRef(new Map());

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
    pointerId: null,
    startX: 0,
    startY: 0,
    startOffsetX: 0,
    startOffsetY: 0,
  });

  const touchRef = useRef({
    active: false,
    mode: null,
    startDistance: 0,
    startZoom: 1,
    startPanX: 0,
    startPanY: 0,
    startCenterX: 0,
    startCenterY: 0,
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
  const [imageEpoch, setImageEpoch] = useState(0);
  const [isDesignSelected, setIsDesignSelected] = useState(false);
  const [hoverMode, setHoverMode] = useState(null);
  const [isShiftPressed, setIsShiftPressed] = useState(false);
  const [isSwitchingDesign, setIsSwitchingDesign] = useState(false);
  const [exportText, setExportText] = useState("");
  const [favorites, setFavorites] = useState(() => loadFavorites());
  const [appView, setAppView] = useState("maker");
  const [orderDraft, setOrderDraft] = useState(() => createEmptyOrderDraft());
  const [savedOrders, setSavedOrders] = useState(() => loadOrderDrafts());
  const [interactionMode, setInteractionMode] = useState("pan");
  const [isEditMode, setIsEditMode] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isMobileRightPanelOpen, setIsMobileRightPanelOpen] = useState(false);
  const [showMobileRightPanelGuide, setShowMobileRightPanelGuide] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem(MOBILE_RIGHT_PANEL_GUIDE_STORAGE_KEY) !== "seen";
    } catch {
      return false;
    }
  });

  const notifyStatus = (message, options = {}) => {
    const { forceAlert = false } = options || {};
    setStatus(message);
    if (forceAlert && typeof window !== "undefined" && typeof window.alert === "function") {
      window.alert(message);
    }
  };
  const [viewportWidth, setViewportWidth] = useState(() => (typeof window !== "undefined" ? window.innerWidth : 1440));
  const [isDesignAdjustAuthed, setIsDesignAdjustAuthed] = useState(() => loadDesignAdjustAuth());

  const [openSections, setOpenSections] = useState({
    shirtSettings: true,
    inkColor: true,
    designPicker: true,
    designAdjust: false,
  });

  const [placement, setPlacement] = useState(() => {
    const firstDesignId = designs[0]?.id || "";
    return buildPlacementStateFromDesignsData(firstDesignId, "M");
  });

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  useEffect(() => {
    saveFavoritesToStorage(favorites);
  }, [favorites]);

  useEffect(() => {
    saveOrderDraftsToStorage(savedOrders);
  }, [savedOrders]);

  useEffect(() => {
    saveDesignAdjustAuth(isDesignAdjustAuthed);
  }, [isDesignAdjustAuthed]);

  const hasSkippedInitialPlacementReloadRef = useRef(false);
  const sessionPlacementsRef = useRef({});

  const isMobile = viewportWidth < 700;
  const isTablet = viewportWidth < 980;
  const compact = viewportWidth < 560;
  const isTouchCapable = typeof navigator !== "undefined" && navigator.maxTouchPoints > 0;
  const previewDpr = useMemo(() => {
    if (typeof window === "undefined") return 1;
    const raw = window.devicePixelRatio || 1;
    return Math.max(1, Math.min(raw, isMobile ? 2.5 : 2));
  }, [isMobile]);
  const layoutColumns = isTablet ? "1fr" : "minmax(0, 1fr) minmax(340px, 420px)";
  const sizeColumns = isMobile ? 4 : 5;
  const designColumns = isMobile ? 2 : isTablet ? 2 : 3;

  useEffect(() => {
    if (!isMobile || typeof document === "undefined") return undefined;

    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;
    const prevBodyOverscroll = document.body.style.overscrollBehavior;

    if (isMobileRightPanelOpen) {
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
      document.body.style.overscrollBehavior = "none";
    }

    return () => {
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
      document.body.style.overscrollBehavior = prevBodyOverscroll;
    };
  }, [isMobile, isMobileRightPanelOpen]);

  useEffect(() => {
    if (!isMobile || appView !== "maker") return;
    if (!showMobileRightPanelGuide) return;
    if (isMobileRightPanelOpen) {
      setShowMobileRightPanelGuide(false);
      try {
        window.localStorage.setItem(MOBILE_RIGHT_PANEL_GUIDE_STORAGE_KEY, "seen");
      } catch {}
      return;
    }

    const timer = window.setTimeout(() => {
      setShowMobileRightPanelGuide(false);
      try {
        window.localStorage.setItem(MOBILE_RIGHT_PANEL_GUIDE_STORAGE_KEY, "seen");
      } catch {}
    }, 4200);

    return () => window.clearTimeout(timer);
  }, [isMobile, appView, isMobileRightPanelOpen, showMobileRightPanelGuide]);


  const canEditCurrentSize = EDITABLE_SIZES.includes(fit);
  const canEditActive = canEditCurrentSize && isEditMode;

  const selectedShirt = useMemo(() => shirts.find((s) => s.code === shirtCode) ?? shirts[0], [shirtCode]);
  const selectedDesign = useMemo(() => designs.find((d) => d.id === designId) ?? designs[0], [designId]);
  const currentBaseOrderUrl = selectedDesign?.baseOrderUrl?.trim?.() || "";
  const hasBaseOrderUrl = Boolean(currentBaseOrderUrl);
  const baseVariant = useMemo(() => getBaseVariantForShirt(selectedShirt), [selectedShirt]);

  const shirtSrc = getVariantDisplayImage(baseVariant, side, "main");
  const activeSvgRaw = side === "front"
    ? (svgCache[designId]?.front || svgCache[designId]?.back || "")
    : (svgCache[designId]?.back || svgCache[designId]?.front || "");
  const currentPlacement = placement?.[side];

  const svgDataUrl = useMemo(() => {
    if (!activeSvgRaw) return "";
    const recolored = forceSingleColorSvg(activeSvgRaw, inkColor);
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(recolored)}`;
  }, [activeSvgRaw, inkColor]);

  const svgDataUrlBySide = useMemo(() => {
    const frontRaw = svgCache[designId]?.front || "";
    const backRaw = svgCache[designId]?.back || "";
    return {
      front: frontRaw ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(forceSingleColorSvg(frontRaw, inkColor))}` : "",
      back: backRaw ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(forceSingleColorSvg(backRaw, inkColor))}` : "",
    };
  }, [svgCache, designId, inkColor]);

  const currentSelectionLabel = `${selectedDesign?.name || designId || "デザイン未選択"} / ${shirtCode || "-"} / ${fit || "-"} / ${shirts.find((s) => s.code === shirtCode)?.name || ""}`.trim();

  const selectedInkName =
    inkPresets.find((ink) => ink.color.toLowerCase() === inkColor.toLowerCase())?.name ||
    `カスタムカラー ${inkColor}`;

  const promptDesignAdjustPassword = () => {
    const input = window.prompt("デザイン調整用パスワードを入力してください");
    if (input == null) {
      setStatus("デザイン調整の認証をキャンセルしました");
      return false;
    }
    const normalizedInput = String(input).trim();
    if (normalizedInput === DESIGN_ADJUST_PASSWORD) {
      setIsDesignAdjustAuthed(true);
      setStatus("デザイン調整を認証しました");
      return true;
    }
    window.alert("パスワードが違います");
    setStatus("デザイン調整の認証に失敗しました");
    return false;
  };

  const ensureDesignAdjustAuth = () => {
    if (isDesignAdjustAuthed) return true;
    return promptDesignAdjustPassword();
  };

  const toggleDesignAdjustLock = () => {
    if (isDesignAdjustAuthed) {
      setIsDesignAdjustAuthed(false);
      setIsEditMode(false);
      setIsDesignSelected(false);
      setStatus("デザイン調整を再ロックしました");
      return;
    }
    promptDesignAdjustPassword();
  };

  const addCurrentSelectionToOrder = () => {
    const nextLine = createEmptyOrderLine({
      designId: designId || "",
      shirtCode: shirtCode || "",
      inkColor: selectedInkName || "",
      inkColorHex: inkColor || "",
      fit: fit || "M",
      qty: 1,
      unitPrice: 3800,
      memo: "",
    });

    setOrderDraft((prev) => {
      const lines = Array.isArray(prev.lines) ? [...prev.lines] : [];
      const first = lines[0];
      const hasOnlyEmptyStarter =
        lines.length === 1 &&
        first &&
        !first.designId &&
        !first.shirtCode &&
        !first.inkColor &&
        !first.inkColorHex &&
        (!first.fit || first.fit === "M") &&
        Number(first.qty ?? 1) === 1 &&
        Number(first.unitPrice ?? 3800) === 3800 &&
        !first.memo;

      return {
        ...prev,
        lines: hasOnlyEmptyStarter ? [nextLine] : [...lines, nextLine],
      };
    });
  };

  const openOrderWithCurrentSelection = () => {
    addCurrentSelectionToOrder();
    setAppView("order");
  };

  const openBaseOrderPage = () => {
    if (typeof window === "undefined") return;

    const url = currentBaseOrderUrl;
    if (!url) {
      setStatus(`このデザインはまだBASE注文ページが設定されていません: ${selectedDesign?.name || designId}`);
      return;
    }

    window.open(url, "_blank", "noopener,noreferrer");
  };

  const getPlacementStateForView = (nextDesignId, nextFit) => {
    const sessionMap = sessionPlacementsRef.current || {};
    if (sessionMap?.[nextDesignId]) {
      return buildPlacementState(sessionMap, nextDesignId, nextFit);
    }
    return buildPlacementStateFromDesignsData(nextDesignId, nextFit);
  };

  useEffect(() => {
    const nextSessionMap = buildSavedMapFromDesignsData();
    sessionPlacementsRef.current = nextSessionMap;
    savePlacementsToStorage(nextSessionMap);
  }, []);

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
        designAdjust: false,
      });
    } else {
      setOpenSections({
        shirtSettings: true,
        inkColor: true,
        designPicker: true,
        designAdjust: false,
      });
    }
  }, [isMobile]);

  useEffect(() => {
    setInteractionMode(isEditMode ? "design" : "pan");
  }, [isEditMode]);

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
    if (!isTouchCapable) return;

    const wrap = wrapRef.current;
    if (!wrap) return;

    const handleNativeTouchStart = (e) => {
      if (isMobile && isMobileRightPanelOpen) return;
      if (e.touches.length !== 2) return;
      const [t1, t2] = e.touches;
      stopSingleTouchInteraction();
      setIsDesignSelected(false);
      touchRef.current.active = true;
      touchRef.current.mode = "pinch";
      touchRef.current.startDistance = getTouchDistance(t1, t2);
      touchRef.current.startZoom = zoom;
      e.preventDefault();
      e.stopPropagation();
    };

    const handleNativeTouchMove = (e) => {
      if (isMobile && isMobileRightPanelOpen) return;
      if (e.touches.length !== 2) return;
      const [t1, t2] = e.touches;
      const currentDistance = getTouchDistance(t1, t2);

      if (!touchRef.current.active || touchRef.current.mode !== "pinch" || touchRef.current.startDistance <= 0) {
        stopSingleTouchInteraction();
        setIsDesignSelected(false);
        touchRef.current.active = true;
        touchRef.current.mode = "pinch";
        touchRef.current.startDistance = currentDistance;
        touchRef.current.startZoom = zoom;
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      const scale = currentDistance / touchRef.current.startDistance;
      const nextZoom = clamp(touchRef.current.startZoom * scale, MIN_ZOOM, MAX_ZOOM);
      setZoom((prev) => (Math.abs(prev - nextZoom) < 0.0001 ? prev : nextZoom));
      e.preventDefault();
      e.stopPropagation();
    };

    const handleNativeTouchEnd = (e) => {
      if (isMobile && isMobileRightPanelOpen) return;
      if (touchRef.current.mode !== "pinch") return;
      if (e.touches.length < 2) {
        touchRef.current.active = false;
        touchRef.current.mode = null;
        touchRef.current.startDistance = 0;
        touchRef.current.startZoom = zoom;
        stopSingleTouchInteraction();
        e.preventDefault();
        e.stopPropagation();
      }
    };

    wrap.addEventListener("touchstart", handleNativeTouchStart, { passive: false, capture: true });
    wrap.addEventListener("touchmove", handleNativeTouchMove, { passive: false, capture: true });
    wrap.addEventListener("touchend", handleNativeTouchEnd, { passive: false, capture: true });
    wrap.addEventListener("touchcancel", handleNativeTouchEnd, { passive: false, capture: true });

    return () => {
      wrap.removeEventListener("touchstart", handleNativeTouchStart, true);
      wrap.removeEventListener("touchmove", handleNativeTouchMove, true);
      wrap.removeEventListener("touchend", handleNativeTouchEnd, true);
      wrap.removeEventListener("touchcancel", handleNativeTouchEnd, true);
    };
  }, [isMobile, isMobileRightPanelOpen, isTouchCapable, zoom]);

  useEffect(() => {
    if (!isTouchCapable) return;

    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;

    const preventMultiTouchDefault = (e) => {
      if (e.touches && e.touches.length >= 2) {
        e.preventDefault();
      }
    };

    const preventGestureDefault = (e) => {
      e.preventDefault();
    };

    wrap.style.touchAction = "none";
    wrap.style.overscrollBehavior = "none";
    canvas.style.touchAction = "none";
    canvas.style.overscrollBehavior = "none";

    wrap.addEventListener("touchstart", preventMultiTouchDefault, { passive: false });
    wrap.addEventListener("touchmove", preventMultiTouchDefault, { passive: false });
    canvas.addEventListener("touchstart", preventMultiTouchDefault, { passive: false });
    canvas.addEventListener("touchmove", preventMultiTouchDefault, { passive: false });

    wrap.addEventListener("gesturestart", preventGestureDefault, { passive: false });
    wrap.addEventListener("gesturechange", preventGestureDefault, { passive: false });
    wrap.addEventListener("gestureend", preventGestureDefault, { passive: false });
    canvas.addEventListener("gesturestart", preventGestureDefault, { passive: false });
    canvas.addEventListener("gesturechange", preventGestureDefault, { passive: false });
    canvas.addEventListener("gestureend", preventGestureDefault, { passive: false });

    return () => {
      wrap.removeEventListener("touchstart", preventMultiTouchDefault);
      wrap.removeEventListener("touchmove", preventMultiTouchDefault);
      canvas.removeEventListener("touchstart", preventMultiTouchDefault);
      canvas.removeEventListener("touchmove", preventMultiTouchDefault);

      wrap.removeEventListener("gesturestart", preventGestureDefault);
      wrap.removeEventListener("gesturechange", preventGestureDefault);
      wrap.removeEventListener("gestureend", preventGestureDefault);
      canvas.removeEventListener("gesturestart", preventGestureDefault);
      canvas.removeEventListener("gesturechange", preventGestureDefault);
      canvas.removeEventListener("gestureend", preventGestureDefault);
    };
  }, [isTouchCapable, isMobile, isMobileRightPanelOpen]);

  useEffect(() => {
    let cancelled = false;

    const loadOne = async (design) => {
      try {
        const front = design.front ? await fetchText(design.front) : "";
        const back = design.back ? await fetchText(design.back) : "";
        if (cancelled) return;
        setSvgCache((prev) => {
          if (prev[design.id]?.front === front && prev[design.id]?.back === back) return prev;
          return {
            ...prev,
            [design.id]: { front, back },
          };
        });
        if (design.id === designId) {
          setStatus("SVG読み込み完了");
        }
      } catch {
        if (!cancelled && design.id === designId) {
          setStatus("SVGの読み込みに失敗。public/designs を確認してください。");
        }
      }
    };

    const pendingIds = new Set(designs.filter((d) => !svgCache[d.id]).map((d) => d.id));
    if (pendingIds.size === 0) {
      if (!cancelled) setStatus("SVG読み込み完了");
      return () => {
        cancelled = true;
      };
    }

    const activeDesign = designs.find((d) => d.id === designId);
    if (activeDesign && pendingIds.has(activeDesign.id)) {
      loadOne(activeDesign);
      pendingIds.delete(activeDesign.id);
    }

    pendingIds.forEach((id) => {
      const design = designs.find((d) => d.id === id);
      if (design) loadOne(design);
    });

    return () => {
      cancelled = true;
    };
  }, [designId, svgCache]);

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
    if (appView !== "maker") return;
    const sync = () => {
      const w = wrapRef.current?.clientWidth ?? 900;
      const paddingOffset = isMobile ? 12 : 24;
      const size = Math.max(280, Math.min(isTablet ? 760 : 980, Math.floor(w - paddingOffset)));
      setCanvasSize({ width: size, height: size });
      setStatus((prev) => (prev ? prev : "表示を再同期中..."));
    };
    requestAnimationFrame(sync);
  }, [appView, isMobile, isTablet]);

  useLayoutEffect(() => {
    if (!designId) return;

    if (!hasSkippedInitialPlacementReloadRef.current) {
      hasSkippedInitialPlacementReloadRef.current = true;
      setIsDesignSelected(false);
      setIsSwitchingDesign(false);
      return;
    }

    const nextPlacement = getPlacementStateForView(designId, fit);
    setPlacement(nextPlacement);
    setIsDesignSelected(false);
    setIsSwitchingDesign(false);
  }, [designId, fit]);

  useEffect(() => {
    if (!designId || !placement) return;
    if (!canEditCurrentSize) return;

    const sessionMap = safeClone(sessionPlacementsRef.current || {});
    if (!sessionMap[designId]) sessionMap[designId] = {};
    if (!sessionMap[designId].front) sessionMap[designId].front = {};
    if (!sessionMap[designId].back) sessionMap[designId].back = {};

    sessionMap[designId].front[fit] = safeClone(placement.front);
    sessionMap[designId].back[fit] = safeClone(placement.back);

    const defaults = getInitialPlacement(designId) || {};
    if (!sessionMap[designId].front.M) sessionMap[designId].front.M = safeClone(defaults.front ?? placement.front);
    if (!sessionMap[designId].back.M) sessionMap[designId].back.M = safeClone(defaults.back ?? placement.back);

    if (typeof placement.front?.widthCm === "number") {
      sessionMap[designId].front.M.widthCm = placement.front.widthCm;
    }
    if (typeof placement.back?.widthCm === "number") {
      sessionMap[designId].back.M.widthCm = placement.back.widthCm;
    }

    sessionPlacementsRef.current = sessionMap;
    savePlacementsToStorage(sessionMap);
  }, [designId, fit, placement, canEditCurrentSize]);

  useEffect(() => {
    if (!baseVariant) {
      shirtImgRef.current = null;
      activeShirtSrcRef.current = "";
      return;
    }

    let cancelled = false;
    const cache = shirtImageCacheRef.current;
    const cleanupFns = [];

    const activateLoadedShirtImage = (img, src) => {
      if (cancelled) return;
      if (shirtSrc !== src) return;
      shirtImgRef.current = img;
      activeShirtSrcRef.current = src;
      setStatus(`Tシャツ画像読み込み完了: ${selectedShirt?.code || shirtCode} / ${side}`);
      setImageEpoch((prev) => prev + 1);
    };

    const primeShirtImage = (src, { activate = false } = {}) => {
      if (!src) return null;

      const cached = cache.get(src);
      if (cached?.complete) {
        if (activate) {
          activateLoadedShirtImage(cached, src);
        }
        return cached;
      }

      if (cached) {
        if (activate) {
          const handleLoad = () => activateLoadedShirtImage(cached, src);
          const handleError = () => {
            if (!cancelled && shirtSrc === src) {
              activeShirtSrcRef.current = "";
              setStatus(`Tシャツ画像の読み込みに失敗: ${src}`);
            }
          };
          cached.addEventListener("load", handleLoad);
          cached.addEventListener("error", handleError);
          cleanupFns.push(() => {
            cached.removeEventListener("load", handleLoad);
            cached.removeEventListener("error", handleError);
          });
        }
        return cached;
      }

      const img = new Image();
      img.crossOrigin = "anonymous";
      const handleLoad = () => {
        cache.set(src, img);
        if (activate) {
          activateLoadedShirtImage(img, src);
        } else if (!cancelled) {
          setImageEpoch((prev) => prev + 1);
        }
      };
      const handleError = () => {
        if (!cancelled && activate && shirtSrc === src) {
          activeShirtSrcRef.current = "";
          setStatus(`Tシャツ画像の読み込みに失敗: ${src}`);
        }
      };
      img.addEventListener("load", handleLoad);
      img.addEventListener("error", handleError);
      cleanupFns.push(() => {
        img.removeEventListener("load", handleLoad);
        img.removeEventListener("error", handleError);
      });
      cache.set(src, img);
      img.src = src;
      return img;
    };

    const activeSrc = shirtSrc;
    const alternateSrc = getVariantDisplayImage(baseVariant, side === "front" ? "back" : "front", "main");

    primeShirtImage(activeSrc, { activate: true });
    primeShirtImage(alternateSrc, { activate: false });

    return () => {
      cancelled = true;
      cleanupFns.forEach((fn) => fn());
    };
  }, [baseVariant, shirtSrc, selectedShirt, shirtCode, side]);

  useEffect(() => {
    const cache = svgImageCacheRef.current;
    let cancelled = false;
    const cleanupFns = [];

    const activateLoadedSvgImage = (img, src) => {
      if (cancelled) return;
      if (svgDataUrl !== src) return;
      svgImgRef.current = img;
      activeSvgSrcRef.current = src;
      setStatus("SVG画像読み込み完了");
      setImageEpoch((prev) => prev + 1);
    };

    const primeSvgImage = (src, { activate = false } = {}) => {
      if (!src) return null;

      const cached = cache.get(src);
      if (cached?.complete) {
        if (activate) {
          activateLoadedSvgImage(cached, src);
        }
        return cached;
      }

      if (cached) {
        if (activate) {
          const handleLoad = () => activateLoadedSvgImage(cached, src);
          const handleError = () => {
            if (!cancelled && svgDataUrl === src) {
              activeSvgSrcRef.current = "";
              setStatus("SVG画像の表示に失敗。SVG内容を確認してください。");
            }
          };
          cached.addEventListener("load", handleLoad);
          cached.addEventListener("error", handleError);
          cleanupFns.push(() => {
            cached.removeEventListener("load", handleLoad);
            cached.removeEventListener("error", handleError);
          });
        }
        return cached;
      }

      const img = new Image();
      img.crossOrigin = "anonymous";
      const handleLoad = () => {
        cache.set(src, img);
        if (activate) {
          activateLoadedSvgImage(img, src);
        } else if (!cancelled) {
          setImageEpoch((prev) => prev + 1);
        }
      };
      const handleError = () => {
        if (!cancelled && activate && svgDataUrl === src) {
          activeSvgSrcRef.current = "";
          setStatus("SVG画像の表示に失敗。SVG内容を確認してください。");
        }
      };
      img.addEventListener("load", handleLoad);
      img.addEventListener("error", handleError);
      cleanupFns.push(() => {
        img.removeEventListener("load", handleLoad);
        img.removeEventListener("error", handleError);
      });
      cache.set(src, img);
      img.src = src;
      return img;
    };

    const activeSrc = svgDataUrl;
    const alternateSrc = side === "front" ? svgDataUrlBySide.back : svgDataUrlBySide.front;

    if (!activeSrc) {
      svgImgRef.current = null;
      activeSvgSrcRef.current = "";
      return () => {
        cancelled = true;
        cleanupFns.forEach((fn) => fn());
      };
    }

    primeSvgImage(activeSrc, { activate: true });
    primeSvgImage(alternateSrc, { activate: false });

    return () => {
      cancelled = true;
      cleanupFns.forEach((fn) => fn());
    };
  }, [svgDataUrl, svgDataUrlBySide, side]);

  useEffect(() => {
    if (!shirtSrc) {
      setStatus(`画像なし: ${selectedShirt?.code || "?"} / ${side}`);
      return;
    }

    if (!canvasRef.current || !currentPlacement) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const shirtImg = shirtImgRef.current;
    const svgImg = svgImgRef.current;

    if (!shirtImg || !shirtImg.complete || !shirtImg.naturalWidth) return;
    if (activeShirtSrcRef.current !== shirtSrc) return;

    const canDrawSvg = Boolean(
      svgDataUrl &&
      svgImg &&
      svgImg.complete &&
      svgImg.naturalWidth &&
      activeSvgSrcRef.current === svgDataUrl
    );

    const render = () => {

      const logicalWidth = canvasSize.width;
      const logicalHeight = canvasSize.height;
      canvas.width = Math.max(1, Math.floor(logicalWidth * previewDpr));
      canvas.height = Math.max(1, Math.floor(logicalHeight * previewDpr));
      ctx.setTransform(previewDpr, 0, 0, previewDpr, 0, 0);
      ctx.clearRect(0, 0, logicalWidth, logicalHeight);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, logicalWidth, logicalHeight);

      const cx = logicalWidth / 2;
      const cy = logicalHeight / 2;

      ctx.save();
      ctx.translate(cx + pan.x, cy + pan.y);
      ctx.scale(zoom, zoom);
      ctx.translate(-cx, -cy);

      const shirtAspect = shirtImg.width / shirtImg.height;
      const maxW = logicalWidth * 0.92;
      const maxH = logicalHeight * 0.92;
      let drawW = maxW;
      let drawH = drawW / shirtAspect;

      if (drawH > maxH) {
        drawH = maxH;
        drawW = drawH * shirtAspect;
      }

      const shirtScale = getShirtScale(fit);
      drawW *= shirtScale;
      drawH *= shirtScale;

      const shirtX = (logicalWidth - drawW) / 2;
      const shirtY = (logicalHeight - drawH) / 2;

      ctx.drawImage(shirtImg, shirtX, shirtY, drawW, drawH);

      const currentBodyLengthCm = getBodyLengthCm(fit);
      const pxPerCm = drawH / currentBodyLengthCm;

      const designW = currentPlacement.widthCm * pxPerCm;
      const svgAspect = canDrawSvg && svgImg && svgImg.width && svgImg.height ? svgImg.width / svgImg.height : 1;
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
        handleX: designX + designW,
        handleY: designY + designH,
      };

      if (canDrawSvg) {
        ctx.save();
        ctx.translate(designCenterX, designCenterY);
        ctx.scale(currentPlacement.flipX ? -1 : 1, 1);
        ctx.drawImage(svgImg, -designW / 2, -designH / 2, designW, designH);
        ctx.restore();
      }

      if (canEditActive) {
        drawSelectionBox(ctx, renderInfoRef.current);
      }

      ctx.restore();

      if (isSwitchingDesign) setIsSwitchingDesign(false);
      setStatus(`表示OK: ${selectedShirt?.code} / ${fit} / ${side} / ${selectedDesign?.name}`);
    };

    render();
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
    previewDpr,
    imageEpoch,
  ]);

  const updateCurrentPlacement = (patch) => {
    if (!canEditCurrentSize) return;
    setPlacement((prev) => ({
      ...prev,
      [side]: { ...prev[side], ...patch },
    }));
  };


  const applySelectionState = ({ nextDesignId = designId, nextFit = fit, nextShirtCode = shirtCode, statusMessage = "" }) => {
    const nextPlacement = getPlacementStateForView(nextDesignId, nextFit);
    setPlacement(nextPlacement);
    setIsDesignSelected(false);
    setIsSwitchingDesign(false);
    setDesignId(nextDesignId);
    setFit(nextFit);
    setShirtCode(nextShirtCode);
    if (statusMessage) setStatus(statusMessage);
  };

  const refreshPlacementFromDesignsData = (message) => {
    const nextSessionMap = buildSavedMapFromDesignsData();
    sessionPlacementsRef.current = nextSessionMap;
    savePlacementsToStorage(nextSessionMap);
    const nextPlacement = buildPlacementState(nextSessionMap, designId, fit);
    setPlacement(nextPlacement);
    setIsDesignSelected(false);
    setStatus(message);
  };

  const removeStoredBaseSize = (sizeKey) => {
    if (!ensureDesignAdjustAuth()) return;

    const saved = loadSavedPlacements();

    if (saved?.[designId]?.[side]?.[sizeKey]) {
      delete saved[designId][side][sizeKey];
      if (Object.keys(saved[designId][side]).length === 0) delete saved[designId][side];
      savePlacementsToStorage(saved);
      refreshPlacementFromDesignsData(`${selectedDesign?.name} / ${side} の ${sizeKey} 保存値を削除しました`);
    } else {
      setStatus(`${selectedDesign?.name} / ${side} の ${sizeKey} 保存値はありません`);
    }
  };

  const removeAllStoredBaseSizesForSide = () => {
    if (!ensureDesignAdjustAuth()) return;

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
      refreshPlacementFromDesignsData(`${selectedDesign?.name} / ${side} の基準点を ${removedCount} 件削除しました`);
    } else {
      setStatus(`${selectedDesign?.name} / ${side} に削除できる基準点はありません`);
    }
  };

  const removeAllStorageAndReloadDesignsData = () => {
    if (!ensureDesignAdjustAuth()) return;

    clearAllPlacementsStorage();
    sessionPlacementsRef.current = {};
    refreshPlacementFromDesignsData("端末保存を全削除し、designs-data.js から再読込しました");
  };

  function buildPatchEntry(designKey, savedMap) {
    const defaults = getInitialPlacement(designKey);

    const frontSaved = {};
    const backSaved = {};

    const frontMWidth = roundPlacement(savedMap?.[designKey]?.front?.M ?? defaults?.front).widthCm;
    const backMWidth = roundPlacement(savedMap?.[designKey]?.back?.M ?? defaults?.back).widthCm;

    for (const sizeKey of EDITABLE_SIZES) {
      frontSaved[sizeKey] = {
        ...roundPlacement(savedMap?.[designKey]?.front?.[sizeKey] ?? defaults?.front),
        widthCm: frontMWidth,
      };
      backSaved[sizeKey] = {
        ...roundPlacement(savedMap?.[designKey]?.back?.[sizeKey] ?? defaults?.back),
        widthCm: backMWidth,
      };
    }

    return [
      `  "${designKey}": {`,
      "    placementDefaults: {",
      `      front: ${formatPlacementInline(frontSaved.M)},`,
      `      back: ${formatPlacementInline(backSaved.M)},`,
      "    },",
      "    savedBasePlacements: {",
      "      front: {",
      `        "120": ${formatPlacementInline(frontSaved["120"])},`,
      `        "M": ${formatPlacementInline(frontSaved.M)},`,
      `        "XXL": ${formatPlacementInline(frontSaved.XXL)},`,
      "      },",
      "      back: {",
      `        "120": ${formatPlacementInline(backSaved["120"])},`,
      `        "M": ${formatPlacementInline(backSaved.M)},`,
      `        "XXL": ${formatPlacementInline(backSaved.XXL)},`,
      "      },",
      "    },",
      "  },",
    ].join("\n");
  }

  function buildAllDesignsExportText() {
    const saved = loadSavedPlacements();
    const allIds = designs.map((d) => d.id);
    const entries = allIds.map((id) => buildPatchEntry(id, saved));

    return [
      "module.exports = {",
      entries
        .map((entry, index) => {
          const withComma = index < entries.length - 1 ? `${entry.slice(0, -1)},` : entry;
          return withComma;
        })
        .join("\n"),
      "};",
    ].join("\n");
  }

  const exportAllDesignsPatch = async () => {
    if (!ensureDesignAdjustAuth()) return;

    const text = buildAllDesignsExportText();
    setExportText(text);
    try {
      await navigator.clipboard.writeText(text);
      setStatus("全デザインの patch 完全版をコピーしました");
    } catch {
      setStatus("全デザインの patch 完全版を表示しました（手動コピーしてください）");
    }
  };

  const resetPlacement = () => {
    if (!canEditCurrentSize) return;
    if (!ensureDesignAdjustAuth()) return;

    const defaults = getInitialPlacement(designId);
    const next = { ...placement, [side]: safeClone(defaults[side]) };
    setPlacement(next);

    const saved = loadSavedPlacements();
    if (!saved[designId]) saved[designId] = {};
    if (!saved[designId].front) saved[designId].front = {};
    if (!saved[designId].back) saved[designId].back = {};

    saved[designId][side][fit] = safeClone(defaults[side]);
    if (!saved[designId][side].M) saved[designId][side].M = safeClone(defaults[side]);
    saved[designId][side].M.widthCm = defaults[side].widthCm;
    savePlacementsToStorage(saved);

    setIsDesignSelected(false);
  };

  const resetView = () => {
    setPan({ x: 0, y: 0 });
    setZoom(1);
    setIsDesignSelected(false);
  };

  const randomizeStyle = () => {
    const randomShirt = shirts[Math.floor(Math.random() * shirts.length)];
    const randomInk = inkPresets[Math.floor(Math.random() * inkPresets.length)];
    setShirtCode(randomShirt.code);
    setInkColor(randomInk.color);
  };

  const buildCanonicalFavoritePreview = async () => {
    if (!shirtSrc || !svgDataUrl || !currentPlacement) return "";

    const [shirtImg, svgImg] = await Promise.all([
      loadImageForPreview(shirtSrc),
      loadImageForPreview(svgDataUrl),
    ]);

    const work = document.createElement("canvas");
    work.width = canvasSize.width;
    work.height = canvasSize.height;
    const ctx = work.getContext("2d");
    if (!ctx) return "";

    ctx.clearRect(0, 0, work.width, work.height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, work.width, work.height);

    const shirtAspect = shirtImg.width / shirtImg.height;
    const maxW = work.width * 0.92;
    const maxH = work.height * 0.92;
    let drawW = maxW;
    let drawH = drawW / shirtAspect;

    if (drawH > maxH) {
      drawH = maxH;
      drawW = drawH * shirtAspect;
    }

    const shirtScale = getShirtScale(fit);
    drawW *= shirtScale;
    drawH *= shirtScale;

    const shirtX = (work.width - drawW) / 2;
    const shirtY = (work.height - drawH) / 2;

    ctx.drawImage(shirtImg, shirtX, shirtY, drawW, drawH);

    const currentBodyLengthCm = getBodyLengthCm(fit);
    const pxPerCm = drawH / currentBodyLengthCm;
    const designW = currentPlacement.widthCm * pxPerCm;
    const svgAspect = svgImg && svgImg.width && svgImg.height ? svgImg.width / svgImg.height : 1;
    const designH = designW / svgAspect;
    const designCenterX = shirtX + (currentPlacement.x / 100) * drawW;
    const designCenterY = shirtY + (currentPlacement.y / 100) * drawH;

    ctx.save();
    ctx.translate(designCenterX, designCenterY);
    ctx.scale(currentPlacement.flipX ? -1 : 1, 1);
    ctx.drawImage(svgImg, -designW / 2, -designH / 2, designW, designH);
    ctx.restore();

    return buildFavoritePreviewDataUrl(work);
  };

  const exportHighResPng = async () => {
    const shirtImg = shirtImgRef.current;
    const svgImg = svgImgRef.current;

    if (!shirtImg || !currentPlacement) {
      setStatus("PNG保存に必要な表示がまだできていません");
      return;
    }

    try {
      const exportCanvas = document.createElement("canvas");
      exportCanvas.width = HIGH_RES_EXPORT_SIZE;
      exportCanvas.height = HIGH_RES_EXPORT_SIZE;
      const ctx = exportCanvas.getContext("2d");
      if (!ctx) {
        setStatus("PNG保存用のcanvas作成に失敗しました");
        return;
      }

      ctx.clearRect(0, 0, exportCanvas.width, exportCanvas.height);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

      const shirtAspect = shirtImg.width / shirtImg.height;
      const maxW = exportCanvas.width * 0.92;
      const maxH = exportCanvas.height * 0.92;
      let drawW = maxW;
      let drawH = drawW / shirtAspect;

      if (drawH > maxH) {
        drawH = maxH;
        drawW = drawH * shirtAspect;
      }

      const shirtScale = getShirtScale(fit);
      drawW *= shirtScale;
      drawH *= shirtScale;

      const shirtX = (exportCanvas.width - drawW) / 2;
      const shirtY = (exportCanvas.height - drawH) / 2;

      ctx.drawImage(shirtImg, shirtX, shirtY, drawW, drawH);

      const canDrawSvg = Boolean(svgImg && activeSvgSrcRef.current === svgDataUrl);
      if (canDrawSvg) {
        const currentBodyLengthCm = getBodyLengthCm(fit);
        const pxPerCm = drawH / currentBodyLengthCm;
        const designW = currentPlacement.widthCm * pxPerCm;
        const svgAspect = svgImg && svgImg.width && svgImg.height ? svgImg.width / svgImg.height : 1;
        const designH = designW / svgAspect;
        const designCenterX = shirtX + (currentPlacement.x / 100) * drawW;
        const designCenterY = shirtY + (currentPlacement.y / 100) * drawH;

        ctx.save();
        ctx.translate(designCenterX, designCenterY);
        ctx.scale(currentPlacement.flipX ? -1 : 1, 1);
        ctx.drawImage(svgImg, -designW / 2, -designH / 2, designW, designH);
        ctx.restore();
      }

      downloadCanvas(exportCanvas, `anrocher-${shirtCode}-${fit}-${designId}-${side}-3000px.png`);
      notifyStatus(`高解像度PNGを書き出しました: ${HIGH_RES_EXPORT_SIZE}px`, { forceAlert: isMobile && !isDesignAdjustAuthed });
    } catch (error) {
      console.error(error);
      notifyStatus("高解像度PNGの書き出しに失敗しました", { forceAlert: true });
    }
  };

  const saveCurrentFavorite = async () => {
    if (!designId || !shirtSrc || !svgDataUrl || !currentPlacement) {
      setStatus("お気に入り保存に必要な表示がまだできていません");
      return;
    }

    let previewDataUrl = "";
    try {
      previewDataUrl = await buildCanonicalFavoritePreview();
    } catch {
      const canvas = canvasRef.current;
      previewDataUrl = buildFavoritePreviewDataUrl(canvas);
    }

    const favorite = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      designId,
      designName: selectedDesign?.name || designId,
      shirtCode,
      shirtName: selectedShirt?.name || "",
      inkColor,
      fit,
      previewDataUrl,
      createdAt: new Date().toISOString(),
    };

    setFavorites((prev) => [favorite, ...prev].slice(0, MAX_FAVORITES));
    setStatus(`お気に入りを保存しました: ${favorite.designName} / ${fit} / ${shirtCode}`);
  };

  const applyFavorite = (favorite) => {
    if (!favorite) return;

    const nextPlacement = getPlacementStateForView(favorite.designId, favorite.fit);
    setIsSwitchingDesign(true);
    setPlacement(nextPlacement);
    setIsDesignSelected(false);
    setDesignId(favorite.designId);
    setShirtCode(favorite.shirtCode);
    setInkColor(favorite.inkColor);
    setFit(favorite.fit);
    setStatus(`お気に入りを反映しました: ${favorite.designName || favorite.designId}`);
  };

  const removeFavorite = (favoriteId) => {
    setFavorites((prev) => prev.filter((item) => item.id !== favoriteId));
    setStatus("お気に入りを削除しました");
  };

  const zoomAtPoint = (deltaY) => {
    const intensity = 0.0015;
    setZoom((prev) => clamp(prev * Math.exp(-deltaY * intensity), MIN_ZOOM, MAX_ZOOM));
  };

  const zoomByButton = (direction) => {
    const factor = direction > 0 ? 1.1 : 1 / 1.1;
    setZoom((prev) => clamp(prev * factor, MIN_ZOOM, MAX_ZOOM));
  };

  const toLogicalPoint = (point, canvas) => {
    const logicalWidth = canvas.clientWidth || canvasSize.width || canvas.width;
    const logicalHeight = canvas.clientHeight || canvasSize.height || canvas.height;
    const activeZoom = Math.max(zoomRef.current, 0.0001);

    return {
      x: (point.x - (logicalWidth / 2 + pan.x)) / activeZoom + logicalWidth / 2,
      y: (point.y - (logicalHeight / 2 + pan.y)) / activeZoom + logicalHeight / 2,
    };
  };

  const startSinglePan = (e) => {
    panRef.current = {
      active: true,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      startOffsetX: pan.x,
      startOffsetY: pan.y,
    };
  };

  const clearInteractionState = () => {
    dragRef.current.active = false;
    dragRef.current.mode = null;
    dragRef.current.pointerId = null;
    panRef.current.active = false;
    panRef.current.pointerId = null;
    touchRef.current.active = false;
    touchRef.current.mode = null;
    touchRef.current.startDistance = 0;
    touchRef.current.startZoom = zoomRef.current;
    pinchRef.current.active = false;
    pinchRef.current.startDistance = 0;
    pinchRef.current.startZoom = zoomRef.current;
  };

  const stopSingleTouchInteraction = () => {
    dragRef.current.active = false;
    dragRef.current.mode = null;
    dragRef.current.pointerId = null;
    panRef.current.active = false;
    panRef.current.pointerId = null;
  };

  const onPointerDown = (e) => {
    const canvas = canvasRef.current;
    if (!canvas || !currentPlacement) return;

    if (isMobile && e.pointerType === "touch") return;

    if (e.shiftKey && !isMobile) {
      startSinglePan(e);
      canvas.setPointerCapture?.(e.pointerId);
      return;
    }

    if (isTouchCapable && interactionMode === "pan") {
      clearInteractionState();
      setIsDesignSelected(false);
      startSinglePan(e);
      canvas.setPointerCapture?.(e.pointerId);
      return;
    }

    const info = renderInfoRef.current;
    if (!info) return;

    const point = getCanvasPoint(e.clientX, e.clientY, canvas);
    const logicalPoint = toLogicalPoint(point, canvas);

    if (canEditActive && hitResizeHandle(logicalPoint, info)) {
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

    if (canEditActive && hitDesignBody(logicalPoint, info)) {
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

    if (isTouchCapable && interactionMode === "design") {
      return;
    }
  };

  const onPointerMove = (e) => {
    const canvas = canvasRef.current;
    const info = renderInfoRef.current;
    if (!canvas || !info) return;

    if (panRef.current.active && panRef.current.pointerId === e.pointerId) {
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
      if (!canEditActive || (isTouchCapable && interactionMode !== "design")) {
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

    if (dragRef.current.pointerId !== e.pointerId) return;

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

  const onTouchStart = (e) => {
    if (!isTouchCapable) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    if (e.touches.length === 2) {
      stopSingleTouchInteraction();
      setIsDesignSelected(false);
      const [t1, t2] = e.touches;
      const startDistance = getTouchDistance(t1, t2);
      touchRef.current.active = true;
      touchRef.current.mode = "pinch";
      touchRef.current.startDistance = startDistance;
      touchRef.current.startZoom = zoomRef.current;
      pinchRef.current = { active: true, startDistance, startZoom: zoomRef.current };
      e.preventDefault();
      return;
    }

    if (e.touches.length !== 1 || pinchRef.current.active || touchRef.current.mode === "pinch") return;

    const info = renderInfoRef.current;
    if (!currentPlacement || !info) return;

    const touch = e.touches[0];
    const point = getCanvasPoint(touch.clientX, touch.clientY, canvas);
    const logicalPoint = toLogicalPoint(point, canvas);

    if (!canEditActive) {
      panRef.current = {
        active: true,
        pointerId: "touch",
        startX: touch.clientX,
        startY: touch.clientY,
        startOffsetX: pan.x,
        startOffsetY: pan.y,
      };
      dragRef.current.active = false;
      setIsDesignSelected(false);
      e.preventDefault();
      return;
    }

    if (hitResizeHandle(logicalPoint, info)) {
      dragRef.current = {
        active: true,
        mode: "resize-se",
        pointerId: "touch",
        startCanvasX: logicalPoint.x,
        startCanvasY: logicalPoint.y,
        startPlacementX: currentPlacement.x,
        startPlacementY: currentPlacement.y,
        startWidthCm: currentPlacement.widthCm,
      };
      panRef.current.active = false;
      setIsDesignSelected(true);
      e.preventDefault();
      return;
    }

    if (hitDesignBody(logicalPoint, info)) {
      dragRef.current = {
        active: true,
        mode: "move",
        pointerId: "touch",
        startCanvasX: logicalPoint.x,
        startCanvasY: logicalPoint.y,
        startPlacementX: currentPlacement.x,
        startPlacementY: currentPlacement.y,
        startWidthCm: currentPlacement.widthCm,
      };
      panRef.current.active = false;
      setIsDesignSelected(true);
      e.preventDefault();
      return;
    }

    panRef.current = {
      active: true,
      pointerId: "touch",
      startX: touch.clientX,
      startY: touch.clientY,
      startOffsetX: pan.x,
      startOffsetY: pan.y,
    };
    dragRef.current.active = false;
    setIsDesignSelected(false);
    e.preventDefault();
  };

  const onTouchMove = (e) => {
    if (!isTouchCapable) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    if (e.touches.length === 2 && !pinchRef.current.active) {
      stopSingleTouchInteraction();
      const [t1, t2] = e.touches;
      const startDistance = getTouchDistance(t1, t2);
      touchRef.current.active = true;
      touchRef.current.mode = "pinch";
      touchRef.current.startDistance = startDistance;
      touchRef.current.startZoom = zoomRef.current;
      pinchRef.current = { active: true, startDistance, startZoom: zoomRef.current };
      e.preventDefault();
      return;
    }

    if (e.touches.length === 2 && pinchRef.current.active) {
      const [t1, t2] = e.touches;
      const currentDistance = getTouchDistance(t1, t2);
      const scale = currentDistance / Math.max(pinchRef.current.startDistance || 1, 1);
      const nextZoom = clamp(pinchRef.current.startZoom * scale, MIN_ZOOM, MAX_ZOOM);
      setZoom(nextZoom);
      zoomRef.current = nextZoom;
      e.preventDefault();
      return;
    }

    if (pinchRef.current.active || touchRef.current.mode === "pinch") {
      e.preventDefault();
      return;
    }

    const info = renderInfoRef.current;
    if (!info || e.touches.length !== 1) return;

    const touch = e.touches[0];

    if (panRef.current.active && panRef.current.pointerId === "touch") {
      const dx = touch.clientX - panRef.current.startX;
      const dy = touch.clientY - panRef.current.startY;
      setPan({
        x: panRef.current.startOffsetX + dx,
        y: panRef.current.startOffsetY + dy,
      });
      e.preventDefault();
      return;
    }

    if (!dragRef.current.active || dragRef.current.pointerId !== "touch") return;

    const point = getCanvasPoint(touch.clientX, touch.clientY, canvas);
    const logicalPoint = toLogicalPoint(point, canvas);

    if (dragRef.current.mode === "move") {
      const dxCanvas = logicalPoint.x - dragRef.current.startCanvasX;
      const dyCanvas = logicalPoint.y - dragRef.current.startCanvasY;
      const deltaXPercent = (dxCanvas / info.drawW) * 100;
      const deltaYPercent = (dyCanvas / info.drawH) * 100;

      updateCurrentPlacement({
        x: clamp(dragRef.current.startPlacementX + deltaXPercent, 0, 100),
        y: clamp(dragRef.current.startPlacementY + deltaYPercent, 0, 100),
      });
      e.preventDefault();
      return;
    }

    if (dragRef.current.mode === "resize-se") {
      const dxCanvas = logicalPoint.x - dragRef.current.startCanvasX;
      const deltaCm = dxCanvas / info.pxPerCm;

      updateCurrentPlacement({
        widthCm: clamp(dragRef.current.startWidthCm + deltaCm, MIN_WIDTH_CM, MAX_WIDTH_CM),
      });
      e.preventDefault();
    }
  };

  const onTouchEnd = (e) => {
    if (!isTouchCapable) return;

    if (e.touches.length < 2) {
      touchRef.current.active = false;
      touchRef.current.mode = null;
      touchRef.current.startDistance = 0;
      touchRef.current.startZoom = zoomRef.current;
      pinchRef.current.active = false;
      pinchRef.current.startDistance = 0;
      pinchRef.current.startZoom = zoomRef.current;
    }

    if (e.touches.length === 0) {
      stopSingleTouchInteraction();
      return;
    }

    if (e.touches.length === 1 && !pinchRef.current.active) {
      const touch = e.touches[0];
      if (!dragRef.current.active) {
        panRef.current = {
          active: true,
          pointerId: "touch",
          startX: touch.clientX,
          startY: touch.clientY,
          startOffsetX: pan.x,
          startOffsetY: pan.y,
        };
      }
    }
  };

  const endDrag = (e) => {
    if (dragRef.current.pointerId === e?.pointerId) {
      dragRef.current.active = false;
      dragRef.current.mode = null;
      dragRef.current.pointerId = null;
    }

    if (panRef.current.pointerId === e?.pointerId) {
      panRef.current.active = false;
      panRef.current.pointerId = null;
    }

    const canvas = canvasRef.current;
    if (canvas && e?.pointerId != null) {
      canvas.releasePointerCapture?.(e.pointerId);
    }
  };

  const toggleSection = (key) => {
    if (key === "designAdjust" && !openSections.designAdjust) {
      if (!ensureDesignAdjustAuth()) return;
    }

    setOpenSections((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  useEffect(() => {
    clearInteractionState();
  }, [interactionMode]);

  const canvasCursor = panRef.current.active
    ? "move"
    : isShiftPressed && !isMobile
    ? "grab"
    : isTouchCapable && interactionMode === "pan"
    ? "grab"
    : !canEditActive
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

  const designsDataSavedBases = getSavedBasePlacements(designId) ?? {};
  const debugDesignsData120Front = roundPlacement(designsDataSavedBases?.front?.["120"] ?? getInitialPlacement(designId)?.front);
  const debugDesignsData120Back = roundPlacement(designsDataSavedBases?.back?.["120"] ?? getInitialPlacement(designId)?.back);

  const saved = loadSavedPlacements();
  const debugStorage120Front = saved?.[designId]?.front?.["120"] ? roundPlacement(saved?.[designId]?.front?.["120"]) : null;
  const debugStorage120Back = saved?.[designId]?.back?.["120"] ? roundPlacement(saved?.[designId]?.back?.["120"]) : null;
  const directSaved = Boolean(EDITABLE_SIZES.includes(fit) && saved?.[designId]?.[side]?.[fit]);
  const sideSavedMap = saved?.[designId]?.[side] || {};
  const sideDesignsDataMap = designsDataSavedBases?.[side] || {};

  const toggleSide = () => {
    setSide((prev) => (prev === "front" ? "back" : "front"));
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: UI_PANEL_STAGE,
        padding: isMobile ? 10 : 16,
        boxSizing: "border-box",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ maxWidth: 1480, margin: "0 auto", display: "grid", gap: 16, minWidth: 0 }}>
        {appView === "order" ? (
          <OrderPanel
            compact={compact}
            isMobile={isMobile}
            isTablet={isTablet}
            draft={orderDraft}
            setDraft={setOrderDraft}
            savedOrders={savedOrders}
            setSavedOrders={setSavedOrders}
            onBackToMaker={() => setAppView("maker")}
            onAddCurrentSelection={addCurrentSelectionToOrder}
            onOpenBaseOrderPage={openBaseOrderPage}
            hasBaseOrderUrl={hasBaseOrderUrl}
            currentSelectionLabel={currentSelectionLabel}
            designs={designs}
            shirts={shirts}
            svgCache={svgCache}
          />
        ) : (
          <div
            style={{
              display: "grid",
              gap: isTablet ? 16 : 24,
              gridTemplateColumns: layoutColumns,
              alignItems: "start",
              minWidth: 0,
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={panelStyle(compact)}>
                <div
                  style={{
                    display: "grid",
                    gap: 12,
                    marginBottom: 16,
                    minWidth: 0,
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <img
                      src="/title.svg"
                      alt="アンロシェカスタムTメーカー"
                      style={{
                        display: "block",
                        width: isMobile ? "100%" : 320,
                        maxWidth: "100%",
                        height: "auto",
                      }}
                    />
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        marginTop: 8,
                        padding: "4px 8px",
                        borderRadius: 999,
                        background: "rgba(65,180,187,0.08)",
                        border: `1px solid ${UI_BORDER}`,
                        fontSize: 11,
                        fontWeight: 800,
                        color: UI_HEAD,
                      }}
                    >
                      <span style={{ color: UI_SUB }}>{DISPLAY_VERSION}</span>
                    </div>
                    {isDesignAdjustAuthed && (
                      <div style={{ fontSize: 11, color: UI_SUB, marginTop: 6 }}>data: {DESIGNS_DATA_VERSION}</div>
                    )}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      alignItems: "center",
                      flexWrap: "wrap",
                      minWidth: 0,
                    }}
                  >
                    <IconButton title="ランダム" ariaLabel="ランダム" compact={compact} onClick={randomizeStyle}>
                      <Dices size={compact ? 16 : 18} strokeWidth={2.25} />
                    </IconButton>
                    <IconButton title="お気に入り保存" ariaLabel="お気に入り保存" compact={compact} onClick={saveCurrentFavorite}>
                      <Star size={compact ? 16 : 18} strokeWidth={2.25} />
                    </IconButton>

                    <button
                      type="button"
                      title={side === "front" ? "裏を見る" : "表を見る"}
                      aria-label={side === "front" ? "裏を見る" : "表を見る"}
                      style={{
                        ...buttonStyle(false, compact),
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                      onClick={toggleSide}
                    >
                      <Repeat2 size={compact ? 15 : 17} strokeWidth={2.25} />
                      <span style={{ color: UI_TEXT, WebkitTextFillColor: UI_TEXT }}>{side === "front" ? "裏" : "表"}</span>
                    </button>

                    <div
                      style={{
                        display: "inline-flex",
                        gap: 4,
                        alignItems: "center",
                        minWidth: 0,
                      }}
                    >
                      <IconButton title="縮小" ariaLabel="縮小" compact={compact} onClick={() => zoomByButton(-1)}>
                        <Minus size={compact ? 16 : 18} strokeWidth={2.25} />
                      </IconButton>
                      <div style={{ minWidth: 50, textAlign: "center", fontWeight: 700, color: UI_TEXT, WebkitTextFillColor: UI_TEXT }}>{Math.round(zoom * 100)}%</div>
                      <IconButton title="拡大" ariaLabel="拡大" compact={compact} onClick={() => zoomByButton(1)}>
                        <Plus size={compact ? 16 : 18} strokeWidth={2.25} />
                      </IconButton>
                    </div>

                    <IconButton title="表示リセット" ariaLabel="表示リセット" compact={compact} onClick={resetView}>
                      <House size={compact ? 16 : 18} strokeWidth={2.25} />
                    </IconButton>
                    <IconButton title="ヘルプ" ariaLabel="ヘルプ" compact={compact} onClick={() => setIsHelpOpen(true)}>
                      <CircleHelp size={compact ? 16 : 18} strokeWidth={2.25} />
                    </IconButton>
                    <IconButton
                      title="高解像度PNG保存 / 共有（3000px）"
                      ariaLabel="高解像度PNG保存 / 共有（3000px）"
                      compact={compact}
                      onClick={exportHighResPng}
                    >
                      <Download size={compact ? 16 : 18} strokeWidth={2.25} />
                    </IconButton>

                    <button
                      type="button"
                      title="発注書"
                      aria-label="発注書"
                      style={{
                        ...buttonStyle(false, compact),
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                      onClick={openOrderWithCurrentSelection}
                    >
                      <FileText size={compact ? 15 : 17} strokeWidth={2.25} />
                      <span>発注書</span>
                    </button>

                    <button
                      type="button"
                      title={hasBaseOrderUrl ? "BASEで注文する" : "このデザインはまだBASE未設定"}
                      aria-label={hasBaseOrderUrl ? "BASEで注文する" : "このデザインはまだBASE未設定"}
                      style={{
                        ...buttonStyle(false, compact),
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        opacity: hasBaseOrderUrl ? 1 : 0.5,
                        cursor: hasBaseOrderUrl ? "pointer" : "not-allowed",
                      }}
                      onClick={openBaseOrderPage}
                      disabled={!hasBaseOrderUrl}
                    >
                      <span>BASEで注文する</span>
                    </button>
                  </div>
                </div>

                <div
                  ref={wrapRef}
                  style={{
                    position: "relative",
                    background: "#ffffff",
                    borderRadius: compact ? 16 : 20,
                    padding: 0,
                    boxShadow: "0 10px 26px rgba(47,59,64,0.08)",
                    border: `1px solid rgba(65,180,187,0.22)`,
                    overflow: "hidden",
                    maxHeight: isTablet ? "none" : "82vh",
                    minWidth: 0,
                    touchAction: "none",
                    overscrollBehavior: "none",
                    WebkitUserSelect: "none",
                    userSelect: "none",
                  }}
                >
                  <canvas
                    ref={canvasRef}
                    style={{
                      width: "100%",
                      maxWidth: "100%",
                      display: "block",
                      borderRadius: compact ? 16 : 20,
                      background: "#ffffff",
                      cursor: canvasCursor,
                      touchAction: "none",
                      opacity: isSwitchingDesign ? 0.96 : 1,
                    }}
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={endDrag}
                    onPointerCancel={endDrag}
                    onPointerLeave={endDrag}
                    onTouchStart={onTouchStart}
                    onTouchMove={onTouchMove}
                    onTouchEnd={onTouchEnd}
                    onTouchCancel={onTouchEnd}
                    onWheel={(e) => {
                      if (!(e.ctrlKey || e.metaKey || e.altKey || e.shiftKey)) return;
                      e.preventDefault();
                      zoomAtPoint(e.deltaY);
                    }}
                  />
                </div>

                {isDesignAdjustAuthed && (
                  <div style={{ marginTop: 10, fontSize: 13, color: UI_SUB }}>
                    状態: {isSwitchingDesign ? "デザイン切替中..." : status}
                  </div>
                )}

                <div
                  style={{
                    marginTop: 14,
                    border: `1px solid ${UI_BORDER}`,
                    borderRadius: 14,
                    background: "#ffffff",
                    padding: 12,
                  }}
                >
                  <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 8 }}>お気に入り</div>
                  {isDesignAdjustAuthed && (
                    <div style={{ fontSize: 12, color: UI_SUB, marginBottom: 10, lineHeight: 1.6 }}>
                      いまの Tカラー / インクカラー / サイズ / デザイン を小さい画像つきで保存します
                    </div>
                  )}

                  {favorites.length === 0 ? (
                    <div
                      style={{
                        border: "1px dashed #d6d3d1",
                        borderRadius: 12,
                        padding: 14,
                        color: UI_SUB,
                        background: UI_PANEL_SOFT,
                        fontSize: 13,
                      }}
                    >
                      まだお気に入りはありません
                    </div>
                  ) : (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: isMobile ? "repeat(3, minmax(0, 1fr))" : isTablet ? "repeat(4, minmax(0, 1fr))" : "repeat(5, minmax(0, 1fr))",
                        gap: 10,
                        minWidth: 0,
                      }}
                    >
                      {favorites.map((favorite) => (
                        <div
                          key={favorite.id}
                          style={{
                            position: "relative",
                            border: `1px solid ${UI_BORDER}`,
                            borderRadius: 12,
                            overflow: "hidden",
                            background: "#ffffff",
                            boxShadow: "0 4px 12px rgba(0,0,0,0.04)",
                            minWidth: 0,
                          }}
                        >
                          <button
                            type="button"
                            aria-label="お気に入りを削除"
                            title="お気に入りを削除"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFavorite(favorite.id);
                            }}
                            style={{
                              position: "absolute",
                              top: 8,
                              right: 8,
                              width: 26,
                              height: 26,
                              borderRadius: 999,
                              border: `1px solid ${UI_BORDER_STRONG}`,
                              background: "rgba(255,255,255,0.92)",
                              color: UI_HEAD,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              cursor: "pointer",
                              zIndex: 2,
                              boxShadow: "0 4px 10px rgba(47,59,64,0.12)",
                              padding: 0,
                              lineHeight: 1,
                            }}
                          >
                            <X size={14} />
                          </button>

                          <button
                            type="button"
                            onClick={() => applyFavorite(favorite)}
                            style={{
                              display: "block",
                              width: "100%",
                              border: "none",
                              background: "#ffffff",
                              padding: 0,
                              cursor: "pointer",
                              textAlign: "left",
                            }}
                          >
                            <div
                              style={{
                                width: "100%",
                                aspectRatio: "1 / 1",
                                background: UI_PANEL_STAGE,
                                overflow: "hidden",
                                borderBottom: "1px solid #f0ede9",
                              }}
                            >
                              {favorite.previewDataUrl ? (
                                <img
                                  src={favorite.previewDataUrl}
                                  alt={favorite.designName || favorite.designId}
                                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                                />
                              ) : (() => {
                                const fallbackDesign = designs.find((item) => item.id === favorite.designId);
                                const fallbackThumb = fallbackDesign?.back || fallbackDesign?.front || "";
                                return fallbackThumb ? (
                                  <img
                                    src={fallbackThumb}
                                    alt={favorite.designName || favorite.designId}
                                    style={{ width: "100%", height: "100%", objectFit: "contain", display: "block", padding: 8, boxSizing: "border-box" }}
                                  />
                                ) : null;
                              })()}
                            </div>

                            <div style={{ padding: 8, display: "grid", gap: 4 }}>
                              <div style={{ fontWeight: 800, fontSize: 12, color: "#1c1917", lineHeight: 1.35, wordBreak: "break-word" }}>
                                {favorite.designName || favorite.designId}
                              </div>
                              <div style={{ fontSize: 11, color: UI_SUB, lineHeight: 1.35 }}>
                                {favorite.shirtCode}
                                {(favorite.shirtName || shirts.find((item) => item.code === favorite.shirtCode)?.name)
                                  ? ` / ${favorite.shirtName || shirts.find((item) => item.code === favorite.shirtCode)?.name}`
                                  : ""}
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <span
                                  style={{
                                    width: 12,
                                    height: 12,
                                    borderRadius: 999,
                                    background: favorite.inkColor,
                                    border: `1px solid ${UI_BORDER}`,
                                    display: "inline-block",
                                    flexShrink: 0,
                                  }}
                                />
                                <span style={{ fontSize: 11, color: UI_SUB }}>{favorite.fit}</span>
                              </div>
                            </div>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {exportText && (
                  <div
                    style={{
                      marginTop: 14,
                      border: `1px solid ${UI_BORDER}`,
                      borderRadius: 14,
                      background: "#ffffff",
                      padding: 12,
                      minWidth: 0,
                    }}
                  >
                    <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 8 }}>patch 完全版</div>
                    <div style={{ fontSize: 12, color: UI_SUB, marginBottom: 10, lineHeight: 1.6 }}>
                      design-placement-patches.cjs を丸ごと置き換える用
                    </div>

                    <textarea
                      value={exportText}
                      readOnly
                      style={{
                        width: "100%",
                        minHeight: isMobile ? 200 : 260,
                        resize: "vertical",
                        border: `1px solid ${UI_BORDER}`,
                        borderRadius: 10,
                        padding: 10,
                        boxSizing: "border-box",
                        fontFamily: "monospace",
                        fontSize: 12,
                        lineHeight: 1.5,
                        background: UI_PANEL_SOFT,
                        minWidth: 0,
                      }}
                    />
                  </div>
                )}
              </div>
            </div>

            {!isMobile && (
              <RightDummyTestPanel compact={compact} isMobile={isMobile} designId={designId} onSelectDesign={(nextDesignId) => { if (nextDesignId === designId) return; setDesignId(nextDesignId); }} designColumns={designColumns} shirts={shirts} shirtCode={shirtCode} setShirtCode={setShirtCode} side={side} fit={fit} setFit={setFit} inkColor={inkColor} setInkColor={setInkColor} selectedInkName={selectedInkName} openSections={openSections} toggleSection={toggleSection} isDesignAdjustAuthed={isDesignAdjustAuthed} toggleDesignAdjustLock={toggleDesignAdjustLock} currentPlacement={currentPlacement} designWidthCm={designWidthCm} currentBodyLengthCm={currentBodyLengthCm} widthPercentOfBody={widthPercentOfBody} directSaved={directSaved} canEditCurrentSize={canEditCurrentSize} isEditMode={isEditMode} ensureDesignAdjustAuth={ensureDesignAdjustAuth} setIsEditMode={setIsEditMode} setIsDesignSelected={setIsDesignSelected} resetPlacement={resetPlacement} exportAllDesignsPatch={exportAllDesignsPatch} />
            )}
          </div>

        )}
      {isMobile && appView === "maker" && (
        <>
          <div
            onClick={() => setIsMobileRightPanelOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(15,23,42,0.28)",
              zIndex: 30,
              opacity: isMobileRightPanelOpen ? 1 : 0,
              pointerEvents: isMobileRightPanelOpen ? "auto" : "none",
              transition: "opacity 220ms ease",
            }}
          />

          <div
            style={{
              position: "fixed",
              top: "calc(env(safe-area-inset-top) + 10px)",
              bottom: "calc(env(safe-area-inset-bottom) + 10px)",
              right: 10,
              width: "min(360px, calc(100vw - 28px))",
              zIndex: 40,
              transition: "transform 320ms cubic-bezier(.22,.8,.24,1), opacity 220ms ease",
              overscrollBehavior: "contain",
              transform: isMobileRightPanelOpen ? "translateX(0)" : "translateX(calc(100% + 18px))",
              opacity: isMobileRightPanelOpen ? 1 : 0,
              pointerEvents: isMobileRightPanelOpen ? "auto" : "none",
            }}
          >
            <div
              style={{
                height: "100%",
                overflowY: "auto",
                overflowX: "hidden",
                paddingRight: 4,
                boxSizing: "border-box",
                overscrollBehavior: "contain",
                WebkitOverflowScrolling: "touch",
                touchAction: "pan-y",
              }}
              onTouchStartCapture={(e) => e.stopPropagation()}
              onTouchMoveCapture={(e) => e.stopPropagation()}
              onPointerDownCapture={(e) => e.stopPropagation()}
            >
              <RightDummyTestPanel compact={compact} isMobile={isMobile} designId={designId} onSelectDesign={(nextDesignId) => { if (nextDesignId === designId) return; setDesignId(nextDesignId); setIsMobileRightPanelOpen(false); }} designColumns={designColumns} shirts={shirts} shirtCode={shirtCode} setShirtCode={setShirtCode} side={side} fit={fit} setFit={setFit} inkColor={inkColor} setInkColor={setInkColor} selectedInkName={selectedInkName} openSections={openSections} toggleSection={toggleSection} isDesignAdjustAuthed={isDesignAdjustAuthed} toggleDesignAdjustLock={toggleDesignAdjustLock} currentPlacement={currentPlacement} designWidthCm={designWidthCm} currentBodyLengthCm={currentBodyLengthCm} widthPercentOfBody={widthPercentOfBody} directSaved={directSaved} canEditCurrentSize={canEditCurrentSize} isEditMode={isEditMode} ensureDesignAdjustAuth={ensureDesignAdjustAuth} setIsEditMode={setIsEditMode} setIsDesignSelected={setIsDesignSelected} resetPlacement={resetPlacement} exportAllDesignsPatch={exportAllDesignsPatch} />
            </div>
          </div>

          {showMobileRightPanelGuide && !isMobileRightPanelOpen && (
            <div
              style={{
                position: "fixed",
                right: 62,
                top: "50%",
                transform: "translateY(-50%)",
                zIndex: 44,
                maxWidth: 148,
                padding: "10px 12px",
                borderRadius: 14,
                background: "rgba(255,255,255,0.96)",
                color: UI_HEAD,
                border: `1px solid ${UI_BORDER_STRONG}`,
                boxShadow: "0 10px 28px rgba(47,59,64,0.12)",
                fontSize: 12,
                fontWeight: 800,
                lineHeight: 1.45,
                pointerEvents: "none",
              }}
            >
              ここから設定できます
              <div
                aria-hidden="true"
                style={{
                  position: "absolute",
                  top: "50%",
                  right: -6,
                  width: 12,
                  height: 12,
                  background: "rgba(255,255,255,0.96)",
                  borderRight: `1px solid ${UI_BORDER_STRONG}`,
                  borderBottom: `1px solid ${UI_BORDER_STRONG}`,
                  transform: "translateY(-50%) rotate(-45deg)",
                }}
              />
            </div>
          )}

          <button
            type="button"
            aria-label={isMobileRightPanelOpen ? "設定パネルを閉じる" : "設定パネルを開く"}
            title={isMobileRightPanelOpen ? "設定を閉じる" : "設定を開く"}
            style={{
              position: "fixed",
              right: -20,
              top: "50%",
              transform: "translateY(-50%)",
              zIndex: 45,
              width: 68,
              height: 192,
              padding: 0,
              border: "none",
              background: "transparent",
              boxShadow: "none",
              overflow: "visible",
              cursor: "pointer",
              WebkitTapHighlightColor: "transparent",
            }}
            onClick={() => {
              setShowMobileRightPanelGuide(false);
              try {
                window.localStorage.setItem(MOBILE_RIGHT_PANEL_GUIDE_STORAGE_KEY, "seen");
              } catch {}
              setIsMobileRightPanelOpen((prev) => !prev);
            }}
          >
            <svg
              viewBox="0 0 86.99 167.99"
              aria-hidden="true"
              style={{
                width: "100%",
                height: "100%",
                display: "block",
                overflow: "visible",
                opacity: isMobileRightPanelOpen ? 0.96 : 1,
              }}
            >
              <path
                d="M62.68,11.31v21.05c0,4.79-2.48,9.24-6.56,11.76l-16.39,10.1c-4.08,2.52-6.56,6.97-6.56,11.76v37.51c0,4.79,2.48,9.24,6.56,11.76l16.39,10.1c4.08,2.52,6.56,6.97,6.56,11.76v24.89H86.99V11.31Z"
                fill="rgba(255,255,255,0.96)"
                stroke="rgba(65,180,187,0.18)"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.2"
              />
              <path
                d="M70.6 44.5c0-2.2 1.8-4 4-4h3.2c2.2 0 4 1.8 4 4v79c0 2.2-1.8 4-4 4h-3.2c-2.2 0-4-1.8-4-4z"
                fill="rgba(65,180,187,0.12)"
              />
              <path
                d="M44.8 60.8c0-1 .8-1.8 1.8-1.8h1.6c1 0 1.8.8 1.8 1.8v46.4c0 1-.8 1.8-1.8 1.8h-1.6c-1 0-1.8-.8-1.8-1.8z"
                fill={isMobileRightPanelOpen ? "rgba(65,180,187,0.84)" : "rgba(65,180,187,0.72)"}
              />
            </svg>
          </button>
        </>
      )}
      {isHelpOpen && <HelpModal open={isHelpOpen} onClose={() => setIsHelpOpen(false)} compact={compact} isMobile={isMobile} />}
      </div>
    </div>
  );
}
