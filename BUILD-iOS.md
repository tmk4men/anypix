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

## 残りのコード連携（申請前に要対応）
本アプリはブラウザ機能で動きますが、iOS(WKWebView) で完全に動かすには次の2点の実装が必要です。
（依頼あれば実装します）

1. **保存の iOS 対応** — WKWebView では `<a download>` が効きません。
   `@capacitor/filesystem` + `@capacitor/share`（または写真保存）へ切替。
   `index.html` の `download()` を Capacitor 検出時に差し替える形が最小変更です。

2. **App内課金(IAP)の結線** — 課金層は実装済みで、`window.AnyPixIAP.{purchase, owned}` を
   ネイティブから注入するだけです。StoreKit 連携プラグイン（`@capacitor-community/in-app-purchases`
   や RevenueCat）で以下を実装：
   - `purchase(productId)`：購入完了で解決／キャンセルで `{cancelled:true}` を投げる
   - `owned(productId)`：**検証済みの所有権**を返す（購入を試みた=true にしない）
   ※ この2点を守れば「遅延で失敗誤判定」「キャンセルで誤解放」は既存ロジックが防ぎます。

初回リリースは**広告なし**でOK（iOSは広告反映に時間がかかるため、まず買い切りProで出す方針）。
