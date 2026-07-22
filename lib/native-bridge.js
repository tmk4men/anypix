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

  /* ---------- リワード広告（@capacitor-community/admob）----------
   * アプリ側は window.AnyPixAds.showRewarded() を呼ぶだけ。
   *   戻り値(Promise<boolean>): 動画を最後まで見て報酬獲得=true / スキップ=false /
   *   広告の読込・表示に失敗=true（フェイルオープン：広告都合で保存を塞がない）。
   * ・App ID / リワード広告ユニットIDは AdMob 管理画面で発行済み。
   * ・iOS では Info.plist に GADApplicationIdentifier とATT(NSUserTrackingUsageDescription)が必要
   *   （scripts/patch-ios-plist.js で自動付与）。
   * ・初回起動時に initialize() で ATT（トラッキング許可）ダイアログを表示。
   * ※ 要実機テスト。テスト中は AD_TESTING=true（テスト広告）、公開時は false。
   */
  var AdMob = P.AdMob;
  if(AdMob){
    var REWARD_AD_ID = 'ca-app-pub-2783540275927131/1390607865'; // AdMob「画像」リワード
    var AD_TESTING = false; // ← 実機テスト中は true にしてテスト広告を出す。公開前に false へ。

    // 初期化＋ATT許可要求（失敗しても保存フローは止めない）
    var adsReady = AdMob.initialize({ requestTrackingAuthorization: true })
      .catch(function(){});

    window.AnyPixAds = {
      showRewarded: function(){
        return adsReady.then(function(){
          return new Promise(function(resolve){
            var rewarded = false, handles = [];
            function cleanup(){
              handles.forEach(function(h){ try{ h && h.remove && h.remove(); }catch(e){} });
              handles = [];
            }
            // 報酬獲得イベント（イベント名は @capacitor-community/admob の RewardAdPluginEvents.Rewarded）
            Promise.resolve(AdMob.addListener('onRewardedVideoAdReward', function(){ rewarded = true; }))
              .then(function(h){ handles.push(h); }).catch(function(){})
              .then(function(){
                return AdMob.prepareRewardVideoAd({ adId: REWARD_AD_ID, isTesting: AD_TESTING });
              })
              .then(function(){ return AdMob.showRewardVideoAd(); })
              .then(function(item){
                // 版により showRewardVideoAd の戻り値で報酬を返すものもある
                if(item && (item.type!=null || item.amount!=null)) rewarded = true;
                cleanup(); resolve(rewarded);
              })
              .catch(function(){
                // 読込・表示に失敗（在庫なし等）→ 保存は塞がない
                cleanup(); resolve(true);
              });
          });
        }).catch(function(){ return true; });
      }
    };
  }
})();
