【差し替え / 追加手順】

1) まず追加インストール
npm install -D vite-plugin-pwa

2) 差し替えするファイル
- vite.config.js → プロジェクト直下へ差し替え
- src/main.jsx → src/main.jsx を差し替え

3) 新規追加するファイル
- src/pwa-register.js
- public/icons/icon-192.png
- public/icons/icon-512.png
- public/icons/icon-512-maskable.png
- public/apple-touch-icon.png
- public/favicon.svg

4) index.html は差し替えではなく、head に index.html.head-add.txt の中身を追記

5) index.css は今回変更なし

6) 確認
npm run build
