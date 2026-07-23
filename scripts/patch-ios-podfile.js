// ios/App/Podfile に UMP(GoogleUserMessagingPlatform) のバージョン上限を固定する。
//
// なぜ必要か:
//   @capacitor-community/admob 6.x の podspec は Google-Mobile-Ads-SDK を「11.3.0」で
//   厳密固定するが、UMP は GMA 側が「>= 2.1」という緩い依存で参照するだけなので、
//   CocoaPods は最新の UMP 3.x を解決してしまう。
//   UMP 3.0 でクラス名の UMP プレフィックスが全廃され（UMPConsentInformation →
//   ConsentInformation、UMPFormStatus → FormStatus、sharedInstance → shared 等）、
//   プラグイン同梱の ios/Sources/AdMobPlugin/Consent/ConsentExecutor.swift が
//   コンパイルエラーになり **Xcode の Archive が失敗する**（同意フォームを使っていなくても、
//   このファイルはターゲットに含まれるためビルドされる）。
//   → UMP を 2.x に固定して回避する。
//
// 将来 Capacitor 7 + @capacitor-community/admob 7.x（GMA 12.x / UMP 3.x 対応）へ上げたら、
// この固定は不要になるので Podfile から削除すること。
//
// 実行タイミング: `npx cap sync ios`（= pod install）の **前**。
// npm run ios:setup / ios:sync に組み込み済み。単体実行も可: node scripts/patch-ios-podfile.js
const fs = require('fs'), path = require('path');
const podfile = path.resolve(__dirname, '..', 'ios', 'App', 'Podfile');
const LINE = "  pod 'GoogleUserMessagingPlatform', '< 3.0'";

if (!fs.existsSync(podfile)) {
  console.log('Podfile が見つかりません。先に `npx cap add ios` を実行してください。');
  process.exit(0);
}

let s = fs.readFileSync(podfile, 'utf8');

if (/GoogleUserMessagingPlatform/.test(s)) {
  console.log('Podfile: UMP のバージョン固定は既に入っています。');
  process.exit(0);
}

// target 'App' do ... end のブロック内、capacitor_pods の直後に差し込む。
// （def capacitor_pods ブロックは `cap sync` が再生成するので触らない）
const targetRe = /^(\s*target\s+['"]App['"]\s+do\s*\n)/m;
const mTarget = s.match(targetRe);
if (!mTarget) {
  console.log("Podfile に target 'App' が見つかりません。次の行を手動で追加してください:\n" + LINE);
  process.exit(1);
}

const start = s.indexOf(mTarget[0]) + mTarget[0].length;
const rest = s.slice(start);
// ブロック先頭の capacitor_pods 呼び出し（あればその直後、無ければブロック先頭）に挿入
const mPods = rest.match(/^\s*capacitor_pods\s*$/m);
const at = mPods ? start + rest.indexOf(mPods[0]) + mPods[0].length + 1 : start;

s = s.slice(0, at) + LINE + '\n' + s.slice(at);
fs.writeFileSync(podfile, s);
console.log("✅ Podfile に追加: pod 'GoogleUserMessagingPlatform', '< 3.0'（UMP 3.x のリネームによるビルド失敗を回避）");
