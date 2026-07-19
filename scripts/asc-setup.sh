#!/usr/bin/env bash
# App Store Connect に 課金(anypix_pro/¥300) と 掲載文 を投入する（確認付き）。
# 前提: ~/.asc/config.json に APIキー、asc.config.json の appId と urls.baseUrl を記入済み。
# 使い方: bash scripts/asc-setup.sh
set -euo pipefail
cd "$(dirname "$0")/.."
CFG=./asc.config.json

[ -f "$HOME/.asc/config.json" ] || { echo "先に ~/.asc/config.json を用意（App Store Connect API キー）。BUILD-iOS.md 参照"; exit 1; }
grep -q '"0000000000"' "$CFG" && { echo "先に asc.config.json の appId を実値に（確認: node scripts/asc/asc.mjs apps）"; exit 1; }
grep -q 'REPLACE-ME' "$CFG" && { echo "先に asc.config.json の urls.baseUrl を公開URLに書き換え"; exit 1; }

echo "▶ ドライラン（送信内容の確認だけ・作成しません）"
node scripts/asc/setup-iap.mjs "$CFG"
node scripts/asc/setup-metadata.mjs "$CFG"

echo ""
read -r -p "上の内容で App Store Connect に反映しますか？ (y/N) " a
[ "$a" = "y" ] || { echo "中止しました。"; exit 0; }

node scripts/asc/setup-iap.mjs "$CFG" --yes
node scripts/asc/setup-metadata.mjs "$CFG" --yes
echo "✅ 反映しました。あとは画面でスクショ添付・プライバシーURL確認・提出。"
