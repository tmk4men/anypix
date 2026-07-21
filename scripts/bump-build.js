// iOS のビルド番号（CFBundleVersion / CURRENT_PROJECT_VERSION）を +1 する。
// App Store は「同一バージョンの再申請でもビルド番号は必ず更新」を要求するため、
// 再提出前に一度だけ実行する:  npm run ios:bump
//
// Capacitor の新しめのテンプレートはビルド番号を project.pbxproj の
// CURRENT_PROJECT_VERSION で管理し、Info.plist は $(CURRENT_PROJECT_VERSION) を参照する。
// 古いテンプレートや手書きの場合は Info.plist に数値が直書きされる。両方に対応する。
const fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');
const pbxproj = path.join(root, 'ios', 'App', 'App.xcodeproj', 'project.pbxproj');
const plist = path.join(root, 'ios', 'App', 'App', 'Info.plist');

let bumped = false;

// 1) project.pbxproj の CURRENT_PROJECT_VERSION = N; を +1（全ビルド構成をまとめて）
if (fs.existsSync(pbxproj)) {
  let s = fs.readFileSync(pbxproj, 'utf8');
  const nums = [...s.matchAll(/CURRENT_PROJECT_VERSION\s*=\s*(\d+)\s*;/g)].map(m => parseInt(m[1], 10));
  if (nums.length) {
    const next = Math.max(...nums) + 1;                       // 構成間で番号を揃える
    s = s.replace(/CURRENT_PROJECT_VERSION\s*=\s*\d+\s*;/g, 'CURRENT_PROJECT_VERSION = ' + next + ';');
    fs.writeFileSync(pbxproj, s);
    console.log('✅ project.pbxproj: CURRENT_PROJECT_VERSION → ' + next);
    bumped = true;
  }
}

// 2) Info.plist に CFBundleVersion が「数値の直値」で書かれている場合のみ +1
//    （$(CURRENT_PROJECT_VERSION) のような変数参照は 1) で処理済みなので触らない）
if (fs.existsSync(plist)) {
  let s = fs.readFileSync(plist, 'utf8');
  const m = s.match(/(<key>\s*CFBundleVersion\s*<\/key>\s*<string>)(\d+)(<\/string>)/);
  if (m) {
    const next = parseInt(m[2], 10) + 1;
    s = s.replace(m[0], m[1] + next + m[3]);
    fs.writeFileSync(plist, s);
    console.log('✅ Info.plist: CFBundleVersion → ' + next);
    bumped = true;
  }
}

if (!bumped) {
  if (!fs.existsSync(pbxproj) && !fs.existsSync(plist)) {
    console.log('iOS プロジェクトが見つかりません。先に Mac で `npx cap add ios` を実行してください。');
  } else {
    console.log('ビルド番号のフィールドが見つかりませんでした。Xcode の Target → General → Build で手動更新してください。');
  }
  process.exit(0);
}
