# AnyPix — iOS ビルド／申請手順（Mac）

ターミナル → Xcode → App Store Connect の3つで完結するようにしています。
アイコン・スプラッシュ・スクショは同梱済み（`assets/` と `store/screenshots/`）。

## 前提
- Mac（Xcode インストール済み）／ Apple Developer 登録済み（課金済み）
- Node.js（`node -v` で確認）
- このフォルダ一式（git clone でも zip でも可）

## 1. ターミナル（プロジェクト直下で実行）
```bash
npm install                 # Capacitor 一式を取得
npm run ios:setup           # www生成 → iOS追加 → アイコン/スプラッシュ生成 → 同期
npm run ios:open            # Xcode で開く
```
> アイコン/スプラッシュは `assets/`（`icon-only.png` / `logo.png` / `splash.png` / `splash-dark.png`）から
> `@capacitor/assets` が全サイズを自動生成します。元絵を変えたら `npm run prep:icon` で作り直せます。
>
> Bundle ID を変えたい場合は先に `capacitor.config.json` の `appId`（既定 `com.anypix.app`）を編集。

## 2. Xcode
1. 左の **App** ターゲット → **Signing & Capabilities**
   - **Team** を自分の Apple Developer チームに設定（自動署名でOK）
   - **Bundle Identifier** を一意なものに（例 `com.<あなた>.anypix`）
   - **Display Name** を `AnyPix`
2. **General** で Version（例 1.0.0）／Build（1）を設定
3.（課金を出すなら）**+ Capability** → **In-App Purchase** を追加
4. 上部のデバイス選択を **Any iOS Device (arm64)** に
5. メニュー **Product → Archive** → 完了後 **Distribute App → App Store Connect → Upload**

## 3. App Store Connect
1. **My Apps → +（新規App）**：プラットフォーム iOS、名前 `AnyPix`、Bundle ID を選択、SKU 任意
2. **スクリーンショット（6.5インチ）**：`store/screenshots/` の画像をアップロード
   - 日本語: `ja-01`〜`ja-04` ／ English: `en-01`〜`en-04` ／ 한국어: `ko-01`〜`ko-04`
   - 各言語のローカリゼーションに対応する言語の画像を割り当て
3. **App のプライバシー**：`PRIVACY.md` を公開（例: GitHub Pages）し、その URL を「プライバシーポリシー URL」に設定。
   データ収集は基本「収集しない（Data Not Collected）」で申請可（本アプリは個人情報を収集しません）
4. **App内課金（買い切り／非消耗型）**：
   - 参照名 `AnyPix Pro`、**製品ID `anypix_pro`**（コードの `PRODUCT_ID` と一致）、価格 **¥300 の Tier**
   - 審査用スクショ・説明を添付
5. 情報（説明・キーワード・サポートURL・利用規約）を入力し、**審査に提出**

---

## ネイティブ連携（実装済み・実機で要動作確認）
保存とIAPは `lib/native-bridge.js` に実装済みで、`npm install`（`package.json` に依存を記載）→
`npm run ios:setup` で自動的に組み込まれます。Web/開発ではブリッジは無効（従来通り）。

1. **保存（実装済み）** — WKWebView の `<a download>` 不可に対応。
   `@capacitor/filesystem` に書き出し `@capacitor/share` の共有シートで「画像を保存／ファイルに保存」。
   キャッシュ経由なので写真ライブラリ権限は不要。アプリ側の保存はネイティブ検出時に自動でこちらを使用。

2. **App内課金（実装済み）** — `cordova-plugin-purchase`(StoreKit) で `window.AnyPixIAP.{purchase, owned, restore}` を注入。
   - `owned()`：検証済み所有権を返す ／ `purchase()`：キャンセルは `{cancelled:true}`。
   - 「遅延で失敗誤判定」「キャンセルで誤解放」は既存の課金層が防止（購入は所有権でのみ解放）。
   - **Xcode で In-App Purchase Capability を追加**、App Store Connect で製品ID **`anypix_pro`**（非消耗・¥300）を用意。
   - ※ 別案として RevenueCat(`@revenuecat/purchases-capacitor`) でも可。その場合は `lib/native-bridge.js` の IAP 部を差し替え。

> **要実機確認**: 課金はサンドボックス（Sandbox Apple ID）で購入・復元・キャンセルを必ずテストしてください。

初回リリースは**広告なし**でOK（iOSは広告反映に時間がかかるため、まず買い切りProで出す方針）。

## 変換の実体（補足）
- 変換・圧縮はすべて端末内（Canvas/WebAssembly）。HEIC=heic2any、TIFF=UTIF+pako、PNG減色=UPNG、いずれも `lib/` に同梱しオフライン動作。
