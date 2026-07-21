// iOS Info.plist に必要なキーを追加する（`npx cap add ios` / `cap sync` 後に自動実行）。
//
// 1) ITSAppUsesNonExemptEncryption=false
//    アップロード/申請時の「暗号化（輸出コンプライアンス）」の質問を毎回スキップ。
//    AnyPix は標準的な通信のみ（非対象の暗号化を使用しない）ため false でよい。
//
// 2) NSCameraUsageDescription（カメラ利用目的の説明文）
//    index.html の <input type="file" accept="image/*"> をタップすると、iOS の WKWebView は
//    画像入力に対して必ず「写真を撮る（Take Photo）」をアクションシートに表示する
//    （WebKit の WKFileUploadPanel.mm: accept に画像型が1つでも含まれるとカメラ項目が出る。
//     accept を具体的な MIME に変えても・空にしても消せない）。
//    ユーザーが「写真を撮る」を選ぶとカメラ API が呼ばれるが、この説明文が Info.plist に
//    無いと iOS が **アプリを即クラッシュ** させる（App Store レビュー 2.1(a) の指摘の原因）。
//    → 説明文を追加してカメラ起動を許可し、クラッシュを解消する。
//    ※ 写真ライブラリ側は WebKit が PHPicker（プロセス外）を使うため NSPhotoLibraryUsageDescription は不要。
//    ※ 画像のみ（動画なし）の入力なのでマイク権限も不要。
const fs = require('fs'), path = require('path');
const plist = path.resolve(__dirname, '..', 'ios', 'App', 'App', 'Info.plist');
if (!fs.existsSync(plist)) {
  console.log('Info.plist が見つかりません。先に `npx cap add ios` を実行してください。');
  process.exit(0);
}

let s = fs.readFileSync(plist, 'utf8');

// 追加するキー（bool と string の両方をサポート）。既存キーはスキップ（冪等）。
const entries = [
  { key: 'ITSAppUsesNonExemptEncryption', bool: false },
  { key: 'NSCameraUsageDescription',
    value: '撮影した写真をその場で画像形式の変換・圧縮に使うためにカメラを使用します。画像は端末内でのみ処理され、外部には送信されません。' },
];

const added = [];
for (const e of entries) {
  if (new RegExp('<key>\\s*' + e.key + '\\s*</key>').test(s)) continue; // 既存はスキップ
  const idx = s.lastIndexOf('</dict>');
  if (idx < 0) {
    console.log('Info.plist の形式が想定外です。手動でキーを追加してください: ' + e.key);
    process.exit(0);
  }
  const body = ('bool' in e)
    ? '\t<key>' + e.key + '</key>\n\t<' + (e.bool ? 'true' : 'false') + '/>\n'
    : '\t<key>' + e.key + '</key>\n\t<string>' + e.value + '</string>\n';
  s = s.slice(0, idx) + body + s.slice(idx);
  added.push(e.key);
}

if (added.length === 0) {
  console.log('必要なキーは既に設定済みです。');
  process.exit(0);
}
fs.writeFileSync(plist, s);
console.log('✅ Info.plist に追加: ' + added.join(', '));
