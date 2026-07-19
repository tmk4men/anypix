#!/usr/bin/env bash
# App Store Connect に 課金(anypix_pro/¥300) と 掲載文 を1発で反映する。
# appId は自動取得。鍵は ~/.asc/config.json（姿勢アプリと共有）を使用。
set -euo pipefail
cd "$(dirname "$0")/.."

[ -f "$HOME/.asc/config.json" ] || { echo "❌ 鍵がありません: ~/.asc/config.json（姿勢アプリで作った鍵）を確認してください。"; exit 1; }

echo "▶ AnyPix を検索…"
APPID=$(node scripts/asc/asc.mjs apps | grep -i anypix | head -1 | cut -f1 | tr -d ' ')
if ! printf '%s' "${APPID:-}" | grep -qE '^[0-9]+$'; then
  echo "❌ App Store Connect に AnyPix が見つかりません。登録済みアプリ一覧↓"
  node scripts/asc/asc.mjs apps || true
  echo "→ まだなら『新規App』で AnyPix を作成し、もう一度これを実行してください。"
  exit 1
fi
echo "  appId=$APPID"

echo "▶ 課金 anypix_pro を作成…"
node scripts/asc/setup-iap.mjs ./asc.config.json "$APPID" --yes

echo "▶ 掲載文（説明・キーワード・サブタイトル・審査メモ・カテゴリ）を反映…"
node scripts/asc/setup-metadata.mjs ./asc.config.json "$APPID" --yes

echo ""
echo "✅ 完了。App Store Connect で内容を確認 → スクショ添付 → プライバシーURL入力 → 提出。"
