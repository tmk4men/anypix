// web 資産（index.html + lib）を Capacitor の webDir (www/) にまとめる。
// Mac でも Windows でも動く（Node標準のみ）。
const fs=require('fs'), path=require('path');
const root=path.resolve(__dirname,'..'), www=path.join(root,'www');
fs.rmSync(www,{recursive:true,force:true});
fs.mkdirSync(www,{recursive:true});
fs.copyFileSync(path.join(root,'index.html'), path.join(www,'index.html'));
fs.cpSync(path.join(root,'lib'), path.join(www,'lib'), {recursive:true});
console.log('www/ を生成しました（index.html + lib）');
