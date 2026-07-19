// iOS Info.plist に ITSAppUsesNonExemptEncryption=false を追加する。
// これにより、アップロード/申請時の「暗号化（輸出コンプライアンス）」の質問を毎回スキップできる。
// AnyPix は標準的な通信のみ（非対象の暗号化を使用しない）ため false でよい。
// `npx cap add ios` の後に自動実行される（package.json の ios:setup）。
const fs = require('fs'), path = require('path');
const plist = path.resolve(__dirname, '..', 'ios', 'App', 'App', 'Info.plist');
if (!fs.existsSync(plist)) {
  console.log('Info.plist が見つかりません。先に `npx cap add ios` を実行してください。');
  process.exit(0);
}
let s = fs.readFileSync(plist, 'utf8');
if (s.includes('ITSAppUsesNonExemptEncryption')) {
  console.log('ITSAppUsesNonExemptEncryption は既に設定済みです。');
  process.exit(0);
}
const insert = '\t<key>ITSAppUsesNonExemptEncryption</key>\n\t<false/>\n';
const idx = s.lastIndexOf('</dict>');
if (idx < 0) { console.log('Info.plist の形式が想定外です。手動で ITSAppUsesNonExemptEncryption=NO を追加してください。'); process.exit(0); }
s = s.slice(0, idx) + insert + s.slice(idx);
fs.writeFileSync(plist, s);
console.log('✅ ITSAppUsesNonExemptEncryption=false を Info.plist に追加（暗号化の輸出コンプライアンス質問を回避）');
