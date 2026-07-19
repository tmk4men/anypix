/* AnyPix ネイティブ連携ブリッジ（Capacitor）
 * - 保存: @capacitor/filesystem + @capacitor/share
 * - 課金: cordova-plugin-purchase (CdvPurchase / StoreKit)
 * Web/開発では何もしない（アプリはブラウザ機能のまま動く）。
 * ※ 実機（iOS）での動作確認が必要。プラグイン導入とApp内課金Capabilityが前提。
 */
(function(){
  var Cap = window.Capacitor;
  if(!Cap || typeof Cap.isNativePlatform!=='function' || !Cap.isNativePlatform()) return; // Webでは無効
  var P = Cap.Plugins || {};
  var PRODUCT = 'anypix_pro';

  /* ---------- 保存（Filesystem に書き出して共有シート）---------- */
  var Filesystem = P.Filesystem, Share = P.Share;
  function blobToBase64(blob){
    return new Promise(function(res,rej){
      var r=new FileReader();
      r.onload=function(){ res(String(r.result).split(',')[1]); };
      r.onerror=rej; r.readAsDataURL(blob);
    });
  }
  if(Filesystem && Share){
    window.AnyPixNativeSave = async function(files){
      var uris=[];
      for(var i=0;i<files.length;i++){
        var f=files[i];
        var data=await blobToBase64(f.blob);
        await Filesystem.writeFile({ path:f.name, data:data, directory:'CACHE', recursive:true });
        var u=await Filesystem.getUri({ path:f.name, directory:'CACHE' });
        uris.push(u.uri);
      }
      // 共有シートから「画像を保存」「ファイルに保存」等が選べる
      await Share.share({ title:'AnyPix', files:uris });
    };
  }

  /* ---------- App内課金（cordova-plugin-purchase）----------
   * アプリ側の課金層は window.AnyPixIAP.{purchase, owned} を呼ぶだけ。
   * owned() は「検証済み所有権」を返す。purchase() はキャンセルで {cancelled:true} を投げる。
   */
  function setupIAP(){
    var CdvPurchase = window.CdvPurchase;
    if(!CdvPurchase || !CdvPurchase.store) return;
    var store = CdvPurchase.store, ProductType = CdvPurchase.ProductType, Platform = CdvPurchase.Platform;
    var APPLE = Platform.APPLE_APPSTORE;
    var pending = null; // {resolve,reject}

    store.register([{ id:PRODUCT, type:ProductType.NON_CONSUMABLE, platform:APPLE }]);

    store.when()
      .approved(function(tr){ return tr.verify(); })
      .verified(function(rc){
        rc.finish();
        if(window.anypixRefreshEntitlement) window.anypixRefreshEntitlement();
        if(pending){ pending.resolve(true); pending=null; }
      });

    store.error(function(err){
      // ユーザーキャンセルは購入失敗として扱わない（解放もしない）
      var cancelled = err && (err.code===CdvPurchase.ErrorCode.PAYMENT_CANCELLED || /cancel/i.test(err.message||''));
      if(pending){ pending.reject(Object.assign(new Error(err&&err.message||'iap error'), {cancelled:!!cancelled, code:err&&err.code})); pending=null; }
    });

    store.initialize([APPLE]).then(function(){
      if(window.anypixRefreshEntitlement) window.anypixRefreshEntitlement(); // 起動時に所有権反映
    });

    window.AnyPixIAP = {
      owned: async function(){ var p=store.get(PRODUCT, APPLE); return !!(p && p.owned); },
      purchase: function(){
        return new Promise(function(resolve,reject){
          var p=store.get(PRODUCT, APPLE);
          var offer = p && p.getOffer && p.getOffer();
          if(!offer){ reject(new Error('product not ready')); return; }
          pending={resolve:resolve, reject:reject};
          offer.order().then(function(err){
            if(err){
              var cancelled = err.code===CdvPurchase.ErrorCode.PAYMENT_CANCELLED || /cancel/i.test(err.message||'');
              if(pending){ pending.reject(Object.assign(new Error(err.message||'order failed'),{cancelled:!!cancelled,code:err.code})); pending=null; }
            }
          });
        });
      },
      restore: function(){ return store.restorePurchases(); }
    };
  }

  if(window.CdvPurchase) setupIAP();
  else {
    document.addEventListener('deviceready', setupIAP, {once:true});
    window.addEventListener('load', function(){ setTimeout(setupIAP, 600); });
  }
})();
