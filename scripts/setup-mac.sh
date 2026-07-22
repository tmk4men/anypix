#!/usr/bin/env bash
# AnyPix iOS セットアップ（Mac）。clone 後にこれ1つ実行すればXcodeが開くところまで進む。
# 使い方: bash scripts/setup-mac.sh    （または chmod +x 後 ./scripts/setup-mac.sh）
set -euo pipefail
cd "$(dirname "$0")/.."

echo "▶ 環境確認"
command -v node >/dev/null || { echo "Node が必要です → https://nodejs.org"; exit 1; }
command -v xcodebuild >/dev/null || { echo "Xcode が必要です（App Store から）"; exit 1; }
echo "  node $(node -v)"

echo "▶ 依存を取得（npm install）"
npm install

echo "▶ web資産を www/ に束ねる"
node scripts/build-web.js

if [ ! -d ios ]; then
  echo "▶ iOS プラットフォームを追加"
  npx cap add ios
else
  echo "▶ iOS は既存 → スキップ"
fi

echo "▶ 暗号化(輸出)質問を回避（Info.plist）"
node scripts/patch-ios-plist.js

echo "▶ アイコン/スプラッシュを生成（assets/ から全サイズ）"
npx @capacitor/assets generate --ios || echo "  ⚠ assets 生成でエラー。手動で 'npx @capacitor/assets generate --ios' を試してください。"

echo "▶ 同期"
npx cap sync ios

echo "▶ Xcode を開く"
npx cap open ios

echo ""
echo "✅ 完了。Xcode で: Team選択 → In-App Purchase capability → Product > Archive → Upload"
echo "   ※ 再提出はビルド番号を上げる: npm run ios:bump"
echo "   ── 広告(AdMob) ──"
echo "   ・実機テスト中は lib/native-bridge.js の AD_TESTING=true（テスト広告）→ 公開前に false に戻す"
echo "   ・初回起動でATT許可ダイアログが出る。視聴完了→保存/スキップ→保存されない/Pro=広告なし を確認"
echo "   ・App Store Connect の「App のプライバシー」で第三者広告(Identifiers/Usage Data)を申告"
echo "   App Store Connect 側は BUILD-iOS.md と scripts/asc/ を参照。"
