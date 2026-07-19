// ユーザー提供の アイコン.png から、iOS/Android 用の元アセットを生成する（Node標準のみ・外部依存なし）
// 出力: assets/icon-only.png, assets/logo.png (1024) / assets/splash.png, assets/splash-dark.png (2732)
// これらを @capacitor/assets が読み、各サイズのアイコン・起動画面へ自動展開します。
const fs=require('fs'), zlib=require('zlib'), path=require('path');
const ROOT=path.resolve(__dirname,'..');
const SRC=path.join(ROOT,'アイコン.png');
const OUT=path.join(ROOT,'assets'); fs.mkdirSync(OUT,{recursive:true});

// --- PNG 読み込み（8bit RGB / colorType 2 のみ）---
function decodePNG(buf){
  let p=8,W,H,bd,ct; const idat=[];
  while(p<buf.length){ const len=buf.readUInt32BE(p), type=buf.toString('ascii',p+4,p+8), data=buf.slice(p+8,p+8+len);
    if(type==='IHDR'){W=data.readUInt32BE(0);H=data.readUInt32BE(4);bd=data[8];ct=data[9];}
    else if(type==='IDAT') idat.push(data); else if(type==='IEND') break;
    p+=12+len; }
  if(bd!==8||ct!==2) throw new Error('対応外PNG (bitDepth/colorType='+bd+'/'+ct+')。8bit RGBで書き出してください。');
  const raw=zlib.inflateSync(Buffer.concat(idat)), ch=3, stride=W*ch, out=Buffer.alloc(W*H*ch);
  let pos=0, prev=Buffer.alloc(stride);
  for(let y=0;y<H;y++){
    const f=raw[pos++], line=raw.slice(pos,pos+stride); pos+=stride; const cur=Buffer.alloc(stride);
    for(let x=0;x<stride;x++){ const a=x>=ch?cur[x-ch]:0, b=prev[x], c=x>=ch?prev[x-ch]:0; let v=line[x];
      if(f===1)v=(v+a)&255; else if(f===2)v=(v+b)&255; else if(f===3)v=(v+((a+b)>>1))&255;
      else if(f===4){const pp=a+b-c,pa=Math.abs(pp-a),pb=Math.abs(pp-b),pc=Math.abs(pp-c),pr=(pa<=pb&&pa<=pc)?a:(pb<=pc?b:c); v=(v+pr)&255;}
      cur[x]=v; }
    cur.copy(out,y*stride); prev=cur;
  }
  return {W,H,data:out};
}
// --- PNG 書き出し（8bit RGB）---
function encodePNG(W,H,data){
  const raw=Buffer.alloc((W*3+1)*H);
  for(let y=0;y<H;y++){ raw[y*(W*3+1)]=0; data.copy(raw,y*(W*3+1)+1,y*W*3,y*W*3+W*3); }
  const T=(()=>{const t=[];for(let n=0;n<256;n++){let x=n;for(let k=0;k<8;k++)x=x&1?0xEDB88320^(x>>>1):x>>>1;t[n]=x>>>0;}return t;})();
  const crc=b=>{let x=0xFFFFFFFF;for(let i=0;i<b.length;i++)x=T[(x^b[i])&0xFF]^(x>>>8);return (x^0xFFFFFFFF)>>>0;};
  const ck=(ty,d)=>{const l=Buffer.alloc(4);l.writeUInt32BE(d.length);const tt=Buffer.from(ty),c=Buffer.alloc(4);c.writeUInt32BE(crc(Buffer.concat([tt,d]))>>>0);return Buffer.concat([l,tt,d,c]);};
  const ih=Buffer.alloc(13); ih.writeUInt32BE(W,0); ih.writeUInt32BE(H,4); ih[8]=8; ih[9]=2;
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),ck('IHDR',ih),ck('IDAT',zlib.deflateSync(raw,{level:9})),ck('IEND',Buffer.alloc(0))]);
}
const px=(img,x,y)=>{ x=x<0?0:x>=img.W?img.W-1:x; y=y<0?0:y>=img.H?img.H-1:y; const i=(y*img.W+x)*3; return [img.data[i],img.data[i+1],img.data[i+2]]; };
// 縮小（ボックス平均）
function resizeBox(img,W2,H2){
  const out=Buffer.alloc(W2*H2*3), sx=img.W/W2, sy=img.H/H2;
  for(let y=0;y<H2;y++)for(let x=0;x<W2;x++){
    let r=0,g=0,b=0,n=0; const x0=Math.floor(x*sx),x1=Math.max(x0+1,Math.ceil((x+1)*sx)),y0=Math.floor(y*sy),y1=Math.max(y0+1,Math.ceil((y+1)*sy));
    for(let yy=y0;yy<y1;yy++)for(let xx=x0;xx<x1;xx++){const p=px(img,xx,yy);r+=p[0];g+=p[1];b+=p[2];n++;}
    const i=(y*W2+x)*3; out[i]=r/n;out[i+1]=g/n;out[i+2]=b/n;
  }
  return {W:W2,H:H2,data:out};
}

const src=decodePNG(fs.readFileSync(SRC));
console.log('source', src.W+'x'+src.H);

// アイコン 1024（App Store/端末用の元画像・透過なし）
const icon=resizeBox(src,1024,1024);
fs.writeFileSync(path.join(OUT,'icon-only.png'),encodePNG(1024,1024,icon.data));
fs.writeFileSync(path.join(OUT,'logo.png'),encodePNG(1024,1024,icon.data));
console.log('icon-only.png / logo.png : 1024x1024');

// スプラッシュ 2732（背景グラデ＋アイコンを中央に最近傍で配置）
function splash(top,bot,file){
  const S=2732, out=Buffer.alloc(S*S*3);
  for(let y=0;y<S;y++){ const t=y/(S-1), R=Math.round(top[0]+(bot[0]-top[0])*t),G=Math.round(top[1]+(bot[1]-top[1])*t),B=Math.round(top[2]+(bot[2]-top[2])*t);
    for(let x=0;x<S;x++){const i=(y*S+x)*3; out[i]=R;out[i+1]=G;out[i+2]=B;} }
  const D=1200, ox=(S-D)>>1, oy=(S-D)>>1, sc=src.W/D; // アイコンを1200pxで中央に
  for(let y=0;y<D;y++)for(let x=0;x<D;x++){ const p=px(src,Math.floor(x*sc),Math.floor(y*sc)); const i=((oy+y)*S+(ox+x))*3; out[i]=p[0];out[i+1]=p[1];out[i+2]=p[2]; }
  fs.writeFileSync(path.join(OUT,file),encodePNG(S,S,out));
  console.log(file+' : 2732x2732');
}
splash([247,232,206],[241,199,138],'splash.png');       // ライト（アイコンの暖色背景に馴染む）
splash([38,28,18],[24,17,10],'splash-dark.png');         // ダーク
