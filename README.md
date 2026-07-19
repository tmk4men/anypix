# AnyPix — 画像変換・圧縮コンバータ / Image Converter & Compressor

端末内だけで画像形式を相互変換・圧縮するアプリ。画像は外部に送信されず、オフラインで動作します。

All conversion runs on‑device. Images are never uploaded; works offline.

## 特長 / Features
- HEIC・JPG・PNG・WEBP・GIF・TIFF・BMP・AVIF などの入力に対応
- 出力: PNG / JPG / WEBP / AVIF（PNGは減色による圧縮に対応）
- 画質 / 圧縮率スライダー、複数一括変換
- 多言語: 日本語 / English / 한국어（端末言語に自動追従）
- ドット絵の工房アニメーション、ライト/ダーク対応

## 構成 / Structure
- `index.html` — アプリ本体（単一ファイル + `lib/`）
- `lib/` — オフライン同梱ライブラリ（HEIC/TIFF デコード、PNG量子化、ドット絵フォント 等）
- `PRIVACY.md` — プライバシーポリシー / Privacy Policy
- `TERMS.md` — 利用規約 / Terms of Service

## 課金 / Monetization
買い切りの **AnyPix Pro** で、透かし除去・圧縮調整・複数一括・最短変換・1日の回数制限解除。
購入・復元は各ストア（App Store / Google Play）経由。詳細は `TERMS.md` を参照。

## ライセンス表記 / Third‑party
`lib/` 配下に同梱するライブラリ（heic2any, UTIF, pako, UPNG, DotGothic16 フォント）は、
それぞれの原ライセンスに従います。配布時は各ライセンス表記を同梱してください。
