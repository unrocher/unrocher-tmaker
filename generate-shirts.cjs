const fs = require("fs");
const path = require("path");

const SHIRTS_DIR = path.join(__dirname, "public", "shirts");
const OUTPUT_FILE = path.join(__dirname, "src", "shirts-data.js");

const shirtColorNames = {
  "001": "ホワイト",
  "003": "杢グレー",
  "005": "ブラック",
  "010": "レッド",
  "011": "ピンク",
  "014": "パープル",
  "015": "オレンジ",
  "020": "イエロー",
  "024": "ライトグリーン",
  "025": "グリーン",
  "031": "ネイビー",
  "032": "ロイヤルブルー",
  "034": "ターコイズ",
  "035": "ガーネットレッド",
  "037": "アーミーグリーン",
  "038": "サンセットオレンジ",
  "039": "オートミール",
  "044": "アッシュ",
  "073": "アイボリー",
  "095": "アクア",
  "097": "インディゴ",
  "106": "ナチュラル",
  "109": "デニム",
  "112": "バーガンディ",
  "128": "オリーブ",
  "129": "チャコール",
  "131": "フォレスト",
  "132": "ライトピンク",
  "133": "ライトブルー",
  "134": "ライトイエロー",
  "136": "サファリ",
  "138": "アイビーグリーン",
  "141": "ソルト",
  "146": "ホットピンク",
  "151": "セメント",
  "153": "シルバーグレー",
  "155": "ライム",
  "165": "デイジー",
  "167": "メトロブルー",
  "169": "イタリアンレッド",
  "171": "ジャパンブルー",
  "188": "ライトパープル",
  "194": "ブライトグリーン",
  "195": "アイスグリーン",
  "196": "ミント",
  "198": "ミディアムブルー",
  "206": "ティールグリーン",
  "207": "ココアブラウン",
  "213": "スモークイエロー",
  "223": "スモークブラック",
  "236": "コヨーテ",
  "400": "ダスティピンク",
  "422": "フロスティコーラル",
  "423": "ライトセージ",
  "424": "モスグレー",
  "426": "アシッドブルー",
  "427": "ラベンダーミスト",
  "453": "ダークブラウン",
  "455": "ライトベージュ",
  "463": "ダスティブルー",
  "705": "ホワイト×ブラック",
  "710": "ホワイト×レッド",
  "731": "ホワイト×ネイビー",
};

function isImageFile(fileName) {
  return /\.(jpg|jpeg|png|webp)$/i.test(fileName);
}

function parseShirtFileName(fileName) {
  const ext = path.extname(fileName);
  const base = path.basename(fileName, ext);

  const match = base.match(/^00085-CVT-(\d{3})_(WM|M)(-URA)?$/i);
  if (!match) return null;

  const [, code, size, ura] = match;
  const side = ura ? "back" : "front";

  return {
    code,
    size: size.toUpperCase(),
    side,
    fileName,
  };
}

function buildShirtsData() {
  if (!fs.existsSync(SHIRTS_DIR)) {
    throw new Error(`shirts フォルダが見つかりません: ${SHIRTS_DIR}`);
  }

  const files = fs.readdirSync(SHIRTS_DIR).filter(isImageFile);
  const shirtMap = new Map();

  for (const file of files) {
    const parsed = parseShirtFileName(file);
    if (!parsed) continue;

    const { code, size, side, fileName } = parsed;

    if (!shirtMap.has(code)) {
      shirtMap.set(code, {
        code,
        name: shirtColorNames[code] || code,
        variants: {},
      });
    }

    const shirt = shirtMap.get(code);

    if (!shirt.variants[size]) {
      shirt.variants[size] = {};
    }

    shirt.variants[size][side] = `/shirts/${fileName}`;
  }

  return Array.from(shirtMap.values())
    .sort((a, b) => a.code.localeCompare(b.code))
    .map((shirt) => {
      const orderedVariants = {};
      if (shirt.variants.M) orderedVariants.M = shirt.variants.M;
      if (shirt.variants.WM) orderedVariants.WM = shirt.variants.WM;

      return {
        code: shirt.code,
        name: shirt.name,
        variants: orderedVariants,
      };
    });
}

function generateFileContent(shirts) {
  return `export const shirts = ${JSON.stringify(shirts, null, 2)};\n`;
}

function main() {
  const shirts = buildShirtsData();
  const content = generateFileContent(shirts);

  fs.writeFileSync(OUTPUT_FILE, content, "utf8");

  console.log(`shirts-data.js を生成しました: ${OUTPUT_FILE}`);
  console.log(`件数: ${shirts.length}色`);
}

main();