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

> **暗号化（輸出コンプライアンス）の質問は自動回避済み**：`ios:setup` が `Info.plist` に
> `ITSAppUsesNonExemptEncryption = NO` を追加します（AnyPix は非対象の暗号化を使わないため）。
> 手動で入れ直したいときは `npm run ios:noencrypt`。これでアップロード毎の質問が出ません。

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

## （オプション）App Store Connect をコマンドで自動化
掲載文（説明・キーワード・サブタイトル・カテゴリ・審査メモ）と**買い切り課金 `anypix_pro`（¥300）**は、
同梱の CLI（`scripts/asc/`・Node標準のみ）で流し込めます。手クリックを減らせます。

**初回のみ（Appleアカウント単位で1回）**：App Store Connect →「ユーザーとアクセス → Integrations → App Store Connect API」で
チーム用キーを作成し、`~/.asc/config.json` を用意（`~` は Mac のホーム）：
```json
{ "keyId": "XXXXXXXXXX", "issuerId": "....", "keyPath": "AuthKey_XXXXXXXXXX.p8" }
```
`.p8` は `~/.asc/` に置く（**リポジトリには絶対に入れない**。`.gitignore` 済み）。
※ 姿勢アプリ等、同じアカウントで既に鍵を作っていれば**それをそのまま使える**（アプリ横断で共有）。

**AnyPix 用の値**は `asc.config.json`（このフォルダ直下）に記入済み。公開後に埋める箇所：
- `appId`（`node scripts/asc/asc.mjs apps` で確認）
- `urls.baseUrl`（PRIVACY/TERMS を公開したページ元）／`urls.contactEmail`（審査連絡先）

```bash
node scripts/asc/asc.mjs apps                         # appId 確認
node scripts/asc/setup-iap.mjs ./asc.config.json      # 課金：ドライラン（作成しない）
node scripts/asc/setup-iap.mjs ./asc.config.json --yes   # 課金 anypix_pro を作成
node scripts/asc/setup-metadata.mjs ./asc.config.json --yes  # 掲載文を反映
```
> スクショ画像のアップロードは API でも可能だが、まずは App Store Connect 画面での添付が確実
> （`store/screenshots/` の ja/en/ko × 4）。英語/韓国語の掲載文が必要なら
> `asc.config.json` を `locale` 違いで複製して `setup-metadata.mjs` を各回実行。

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

3. **リワード広告（実装済み）** — `@capacitor-community/admob` で `window.AnyPixAds.showRewarded()` を注入。
   - **無料版のみ**：保存（ダウンロード）時に動画広告を1回視聴 → 完了で保存を解放（90秒は再視聴不要）。**Pro は広告なし**。広告の読込・表示に失敗した場合は保存を塞がない（フェイルオープン）。
   - IDは発行済み：App ID `ca-app-pub-2783540275927131~7520901941`／リワード広告ユニット `ca-app-pub-2783540275927131/1390607865`（`lib/native-bridge.js` に記載）。
   - `npm run ios:setup`（＝`scripts/patch-ios-plist.js`）が Info.plist に **`GADApplicationIdentifier`／`NSUserTrackingUsageDescription`（ATT）／`SKAdNetworkItems`** を自動付与。
   - **テスト中は `lib/native-bridge.js` の `AD_TESTING = true`** にしてテスト広告で確認 → 公開前に **`false`** に戻す（本番IDに実広告が付くのは審査/公開後）。
   - 初回起動で **ATT（トラッキング許可）ダイアログ** が出る。拒否でもアプリは通常動作（非パーソナライズ広告）。
     - 実装は「WebView が可視 → 0.5秒待つ → `trackingAuthorizationStatus()` が `notDetermined` なら `requestTrackingAuthorization()` → AdMob 初期化」の順（`lib/native-bridge.js`）。**アプリが active になる前に ATT を呼ぶと iOS はダイアログを出さずに拒否扱いで返す**ため、この待ちは必須。
     - 実機確認は **アプリを削除して再インストール**（ATTは一度答えると再表示されない）＋ 設定 > プライバシーとセキュリティ > トラッキング > 「Appからのトラッキング要求を許可」が **オン** であること。
   - App Store Connect の **App プライバシー（Nutrition Label）** で「サードパーティ広告（Identifiers/Usage Data）」の申告が必要。
     - **トラッキングありで申告するなら、その申告を含むバイナリが必ず ATT を出すこと**。申告だけ先行させると **ガイドライン 5.1.2(i) でリジェクト**される（1.0(4) の指摘がこれ。広告未実装のビルドにトラッキング申告が付いていた）。
   - **app-ads.txt**（配信済み）：`https://tmk4men.github.io/app-ads.txt` に既に `google.com, pub-2783540275927131, DIRECT, f08c47fec0942fa0` を配信済み（root配信・別repo `tmk4men.github.io`）。AdMobで「確認済み」になる残条件は **①アプリ公開 ②ASCのマーケティングURL＝`https://tmk4men.github.io/anypix/`** の2点。設定後にAdMobが再巡回（24〜48h）して検証が通る。**未公開の間は未検証でも広告表示に影響なし**。

> **要実機確認**: 広告は実機で「視聴完了→保存解放」「スキップ→保存されない」「Pro=広告なし」を必ずテスト。

## 変換の実体（補足）
- 変換・圧縮はすべて端末内（Canvas/WebAssembly）。HEIC=heic2any、TIFF=UTIF+pako、PNG減色=UPNG、いずれも `lib/` に同梱しオフライン動作。
