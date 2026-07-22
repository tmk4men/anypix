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

// 3) 広告（AdMob / Google Mobile Ads SDK）用のキー
//    GADApplicationIdentifier … AdMob の App ID（未設定だと iOS 起動時にクラッシュする）。
//    NSUserTrackingUsageDescription … ATT（トラッキング許可）ダイアログの説明文。
//    SKAdNetworkItems … iOS の広告アトリビューション用ネットワークID一覧（Google 他）。
const SKAN_IDS = [
  'cstr6suwn9', // Google（必須）
  'v72qych5uu','ludvb6z3bs','cp8zw746q7','3sh42y64q3','c6k4g5qg8m','s39g8k73mm',
  '3qy4746246','f38h382jlk','hs6bdukanm','v4nxqhlyqp','wzmmz9fp6w','yclnxrl5pm',
  't38b2kh725','7ug5zh24hu','9rd848q2bz','n6fk4nfna4','kbd757ywx3','9t245vhmpl',
  'a2p9lx4jpn','22mmun2rn5','4468km3ulz','2u9pt9hc89','8s468mfl3y','klf5c3l5u5',
  'ppxm28t8ap','424m5254lk','uw77j35x4d','578prtvx9j','4dzt52r2t5','e5fvkxwrpn',
  'zq492l623r','3rd42ekr43','3qcr597p9d'
].map(id => id.indexOf('.') >= 0 ? id : id + '.skadnetwork');

// 追加するキー（bool / string / skadnetwork をサポート）。既存キーはスキップ（冪等）。
const entries = [
  { key: 'ITSAppUsesNonExemptEncryption', bool: false },
  { key: 'NSCameraUsageDescription',
    value: '撮影した写真をその場で画像形式の変換・圧縮に使うためにカメラを使用します。画像は端末内でのみ処理され、外部には送信されません。' },
  { key: 'GADApplicationIdentifier', value: 'ca-app-pub-2783540275927131~7520901941' },
  { key: 'NSUserTrackingUsageDescription',
    value: '無料版で表示する広告をあなたに合わせて最適化するために使用します。許可しなくてもアプリは通常どおり利用できます。' },
  { key: 'SKAdNetworkItems', skan: SKAN_IDS },
];

const added = [];
for (const e of entries) {
  if (new RegExp('<key>\\s*' + e.key + '\\s*</key>').test(s)) continue; // 既存はスキップ
  const idx = s.lastIndexOf('</dict>');
  if (idx < 0) {
    console.log('Info.plist の形式が想定外です。手動でキーを追加してください: ' + e.key);
    process.exit(0);
  }
  let body;
  if ('bool' in e) {
    body = '\t<key>' + e.key + '</key>\n\t<' + (e.bool ? 'true' : 'false') + '/>\n';
  } else if ('skan' in e) {
    const items = e.skan.map(id =>
      '\t\t<dict>\n\t\t\t<key>SKAdNetworkIdentifier</key>\n\t\t\t<string>' + id + '</string>\n\t\t</dict>'
    ).join('\n');
    body = '\t<key>' + e.key + '</key>\n\t<array>\n' + items + '\n\t</array>\n';
  } else {
    body = '\t<key>' + e.key + '</key>\n\t<string>' + e.value + '</string>\n';
  }
  s = s.slice(0, idx) + body + s.slice(idx);
  added.push(e.key);
}

if (added.length === 0) {
  console.log('必要なキーは既に設定済みです。');
  process.exit(0);
}
fs.writeFileSync(plist, s);
console.log('✅ Info.plist に追加: ' + added.join(', '));
