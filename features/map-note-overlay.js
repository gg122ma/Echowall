(function () {
  "use strict";

  const STYLE_ID = "echo-map-note-overlay-style";
  const MAX_PUBLIC_NOTES = 5;
  const CATEGORY_ICONS = Object.freeze({ academic:"📚", koko:"🎖️", campus_life:"🏫", emotional:"💛" });
  const PLACEMENT_STYLES = Object.freeze({
    hover:Object.freeze({ color:'#c26708', weight:2.5, opacity:.78, fillColor:'#fbbf24', fillOpacity:.09 }),
    selected:Object.freeze({ color:'#b45309', weight:4, opacity:1, fillColor:'#f59e0b', fillOpacity:.24 }),
  });
  const state = {
    map:null, publicLayer:null, privateLayer:null, controlElement:null,
    toggleButton:null, visible:true, getFitCampusZoom:null, buildingZoom:null,
    hideAtZoom:null, listeners:[], placementActive:false, placementSelection:null,
    placementLayers:[], placementHandlers:[], composeButton:null, cancelButton:null,
    placementPanel:null, placementMarker:null, visibleBeforePlacement:true, formOverlay:null, pendingFormOpen:false,
    toastElement:null, previousShowToast:null, serviceUnsubscribe:null, refreshToken:0,
    pendingImageDataUrl:'', pendingImageName:'',
  };

  const composeCopy = {
    en:{ postHere:"Post here", eyebrow:"Building note", title:"Post to this building", location:"Selected location", content:"Message", contentHint:"Maximum 500 characters", category:"Category", shape:"Shape", identity:"Publish as", named:"Show my name", namedHint:"Use your account display name", anonymous:"Post anonymously", anonymousHint:"Your name stays private", submit:"Publish note", close:"Close", success:"Note published on the map.", empty:"Write a message before publishing.", tooLong:"The message must be 500 characters or fewer.", invalid:"The selected building wall is unavailable.", failed:"The note could not be published." },
    ms:{ postHere:"Tinggalkan nota di sini", eyebrow:"Nota bangunan", title:"Hantar ke bangunan ini", location:"Lokasi dipilih", content:"Mesej", contentHint:"Maksimum 500 aksara", category:"Kategori", shape:"Bentuk", identity:"Terbitkan sebagai", named:"Paparkan nama saya", namedHint:"Gunakan nama paparan akaun anda", anonymous:"Terbit tanpa nama", anonymousHint:"Nama anda kekal peribadi", submit:"Terbitkan nota", close:"Tutup", success:"Nota berjaya diterbitkan pada peta.", empty:"Tulis mesej sebelum menerbitkan.", tooLong:"Mesej mesti 500 aksara atau kurang.", invalid:"Dinding bangunan yang dipilih tidak tersedia.", failed:"Nota tidak dapat diterbitkan." },
    zh:{ postHere:"在此留言", eyebrow:"建筑留言", title:"发布到此建筑", location:"已选位置", content:"留言正文", contentHint:"最多500字", category:"分类", shape:"形状", identity:"发布身份", named:"显示姓名", namedHint:"使用当前账号显示名称", anonymous:"匿名发布", anonymousHint:"不会公开显示你的姓名", submit:"发布留言", close:"关闭", success:"留言已发布到地图。", empty:"请先填写留言正文。", tooLong:"留言正文不能超过500字。", invalid:"所选建筑留言墙无效。", failed:"留言发布失败。" },
  };
  const composeShapeCopy = {
    en:{ rounded:"Rounded", square:"Square", rect:"Rectangle", circle:"Circle", envelope:"Envelope", torn:"Torn paper", speech:"Speech bubble", polaroid:"Polaroid", ticket:"Ticket", hexagon:"Hexagon" },
    ms:{ rounded:"Bulat lembut", square:"Segi empat", rect:"Segi panjang", circle:"Bulatan", envelope:"Sampul surat", torn:"Kertas koyak", speech:"Gelembung kata", polaroid:"Polaroid", ticket:"Tiket", hexagon:"Heksagon" },
    zh:{ rounded:"圆角", square:"方形", rect:"长方形", circle:"圆形", envelope:"信封", torn:"撕纸", speech:"对话框", polaroid:"拍立得", ticket:"票券", hexagon:"六边形" },
  };
  const composeMediaCopy = {
    en:{ photo:'Photo', photoHint:'Optional JPG, PNG, or WebP (up to 450 KB stored)', color:'Color' },
    ms:{ photo:'Foto', photoHint:'JPG, PNG atau WebP pilihan (sehingga 450 KB disimpan)', color:'Warna' },
    zh:{ photo:'照片', photoHint:'可选 JPG、PNG 或 WebP（存储上限 450 KB）', color:'颜色' },
  };

  function composeText(key) {
    const language = window.I18n?.getLanguage?.() || "en";
    return composeCopy[language]?.[key] || composeCopy.en[key] || key;
  }

  function postTypeText(value) {
    const key = value === 'question' ? 'form.postTypeQuestion' : 'form.postTypeDiscussion';
    const translated = window.I18n?.t?.(key);
    return translated && translated !== key ? translated : (value === 'question' ? 'Question' : 'Discussion');
  }

  function mediaText(key) {
    const language = window.I18n?.getLanguage?.() || 'en';
    return composeMediaCopy[language]?.[key] || composeMediaCopy.en[key] || key;
  }

  function readComposeImage(file) {
    return new Promise((resolve,reject) => {
      if (!file) return resolve({ dataUrl:'', name:'' });
      if (!['image/jpeg','image/png','image/webp'].includes(file.type)) return reject(new Error('Choose a JPG, PNG, or WebP image.'));
      if (file.size > 450 * 1024) return reject(new Error(mediaText('photoHint')));
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = String(reader.result || '');
        if (!/^data:image\/(?:png|jpe?g|webp);base64,[a-z0-9+/=]+$/i.test(dataUrl)) return reject(new Error('The selected photo is invalid.'));
        resolve({ dataUrl, name:String(file.name || 'photo').slice(0,120) });
      };
      reader.onerror = () => reject(new Error('The selected photo could not be read.'));
      reader.readAsDataURL(file);
    });
  }

  function composeShapeText(value) {
    const language = window.I18n?.getLanguage?.() || "en";
    return composeShapeCopy[language]?.[value] || composeShapeCopy.en[value] || value;
  }

  const copy = {
    en:{ show:"Show note labels", hide:"Hide note labels", compose:"Post directly", placementHelp:"Choose a point inside a highlighted focus building.", cancel:"Cancel", selected:"Selected building", coordinates:"Coordinates", next:"Next step — available later", hot:"Popular note", private:"Only visible to you", author:"Author", anonymous:"Anonymous", user:"User", category:"Category", heat:"Heat", view:"View note wall", closeZoom:"Labels are hidden at close building zoom.", categories:{ academic:"Academic Advice", koko:"Co-curricular Activity", campus_life:"Campus Life", emotional:"Emotional Support" } },
    ms:{ show:"Tunjuk label nota", hide:"Sembunyi label nota", compose:"Tinggalkan nota terus", placementHelp:"Pilih satu titik dalam bangunan fokus yang diserlahkan.", cancel:"Batal", selected:"Bangunan dipilih", coordinates:"Koordinat", next:"Langkah seterusnya — akan datang", hot:"Nota popular", private:"Hanya anda boleh lihat", author:"Penulis", anonymous:"Tanpa nama", user:"Pengguna", category:"Kategori", heat:"Populariti", view:"Lihat dinding nota", closeZoom:"Label disembunyikan pada zum dekat bangunan.", categories:{ academic:"Nasihat Akademik", koko:"Aktiviti Kokurikulum", campus_life:"Kehidupan Kampus", emotional:"Sokongan Emosi" } },
    zh:{ show:"显示留言标签", hide:"隐藏留言标签", compose:"直接留言", placementHelp:"请在高亮的重点建筑范围内选择位置。", cancel:"取消", selected:"已选建筑", coordinates:"坐标", next:"下一步 — 后续阶段实现", hot:"热门留言", private:"仅自己可见", author:"作者", anonymous:"匿名", user:"用户", category:"类别", heat:"热度", view:"查看留言墙", closeZoom:"建筑近距离视图会自动隐藏标签。", categories:{ academic:"学术建议", koko:"课外活动", campus_life:"校园生活", emotional:"情绪支持" } },
  };
  function currentCopy() {
    const language = window.I18n?.getLanguage?.() || "en";
    return copy[language] || copy.en;
  }

  function text(key) {
    return currentCopy()[key] || copy.en[key] || key;
  }

  function categoryText(category) {
    const normalized = Object.prototype.hasOwnProperty.call(CATEGORY_ICONS, category) ? category : "academic";
    return currentCopy().categories[normalized] || copy.en.categories[normalized];
  }

  function truncate(value, length = 120) {
    const content = String(value || "").trim();
    return content.length > length ? content.slice(0, length - 1).trimEnd() + "…" : content;
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').split(String.fromCharCode(34)).join('&quot;').replace(/'/g,'&#039;');
  }

  function addListener(target, type, listener, options) {
    target?.addEventListener?.(type, listener, options);
    state.listeners.push(() => target?.removeEventListener?.(type, listener, options));
  }

  function addMapListener(type, listener) {
    state.map?.on?.(type, listener);
    state.listeners.push(() => state.map?.off?.(type, listener));
  }
  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .map-floating-controls{flex-direction:column;align-items:flex-start;pointer-events:none}
      .map-floating-controls button{pointer-events:auto}
      .echo-map-note-controls{display:flex;max-width:100%;flex-direction:column;gap:8px;font-family:Inter,sans-serif}
      .echo-map-note-control{appearance:none;min-height:38px;display:flex;align-items:center;gap:8px;padding:8px 11px;border:1px solid var(--border,#e2d7cc);border-radius:12px;background:var(--card-bg,#fff);color:var(--text,#2c1f14);box-shadow:var(--shadow,0 8px 24px rgba(44,31,20,.12));cursor:pointer;font:inherit;font-size:12px;font-weight:800}
      .echo-map-note-control:hover,.echo-map-note-control:focus-visible{border-color:var(--primary,#8b5e3c);outline:3px solid color-mix(in srgb,var(--primary,#8b5e3c) 22%,transparent);outline-offset:2px;background:var(--secondary,#f4e8dc)}
      .echo-map-note-control[aria-pressed=true]{color:var(--primary,#8b5e3c)}
      .echo-map-note-control:disabled{cursor:not-allowed;opacity:.62}
      .echo-map-placement-panel{pointer-events:auto;width:min(280px,calc(100vw - 28px));padding:11px;border:1px solid var(--border,#e2d7cc);border-radius:12px;background:var(--card-bg,#fff);color:var(--text,#2c1f14);box-shadow:var(--shadow,0 8px 24px rgba(44,31,20,.12));font-family:Inter,sans-serif}
      .echo-map-placement-panel[hidden]{display:none}.echo-map-placement-help{margin:0;color:var(--text-muted,#7a6657);font-size:11px;font-weight:650;line-height:1.45}
      .echo-map-placement-cancel{margin-top:9px;border:0;background:transparent;color:var(--primary,#8b5e3c);cursor:pointer;font:inherit;font-size:11px;font-weight:850;padding:0}
      .echo-map-placement-result{margin-top:10px;padding-top:10px;border-top:1px solid var(--border,#e2d7cc);font-size:11px;line-height:1.5}.echo-map-placement-result[hidden]{display:none}
      .echo-map-placement-result strong,.echo-map-placement-result code,.echo-map-placement-result span{display:block;overflow-wrap:anywhere}.echo-map-placement-result code{margin:3px 0;color:var(--text-muted,#7a6657);font-size:10px}
      .echo-map-placement-next{width:100%;margin-top:9px;justify-content:center}
      .echo-map-compose-overlay{position:fixed;inset:0;z-index:1450;display:grid;place-items:center;padding:18px;background:rgba(28,19,12,.62);backdrop-filter:blur(9px);pointer-events:auto}.echo-map-compose-overlay[hidden]{display:none}
      .echo-map-compose-shell{width:min(740px,100%);max-height:min(860px,calc(100vh - 36px));overflow:auto;padding:clamp(18px,3vw,28px);border:1px solid var(--border,#e2d7cc);border-radius:26px;background:linear-gradient(145deg,color-mix(in srgb,var(--card-bg,#fff) 94%,#f5e4d2 6%),var(--card-bg,#fff));color:var(--text,#2c1f14);box-shadow:0 30px 80px rgba(24,14,8,.38);font-family:Inter,sans-serif;scrollbar-width:thin}
      .echo-map-compose-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;margin-bottom:13px}.echo-map-compose-eyebrow{margin:0 0 3px;color:var(--primary,#8b5e3c);font-size:10px;font-weight:900;letter-spacing:.16em;text-transform:uppercase}.echo-map-compose-head h2{margin:0;font:700 clamp(25px,4vw,34px)/1.05 Caveat,cursive;color:var(--text,#2c1f14)}.echo-map-compose-close{display:grid;flex:0 0 36px;width:36px;height:36px;place-items:center;border:1px solid var(--border,#e2d7cc);border-radius:50%;background:var(--card-bg,#fff);color:var(--text-muted,#7a6657);box-shadow:0 5px 14px rgba(44,31,20,.1);cursor:pointer;font-size:17px}.echo-map-compose-close:hover,.echo-map-compose-close:focus-visible{border-color:var(--primary,#8b5e3c);color:var(--primary,#8b5e3c);outline:3px solid color-mix(in srgb,var(--primary,#8b5e3c) 18%,transparent)}
      .echo-map-compose-location{display:flex;gap:8px;align-items:center;margin:0 0 16px;padding:10px 12px;border:1px dashed var(--border-strong,#c9b9a9);border-radius:13px;background:color-mix(in srgb,var(--secondary,#f4e8dc) 72%,transparent);color:var(--text-muted,#7a6657);font-size:11px;font-weight:700;line-height:1.4}.echo-map-compose-location::before{content:'⌖';color:var(--primary,#8b5e3c);font-size:17px}
      .echo-map-compose-field{display:grid;gap:9px;margin:13px 0;padding:14px;border:1px solid var(--border,#e2d7cc);border-radius:17px;background:color-mix(in srgb,var(--card-bg,#fff) 84%,var(--secondary,#f4e8dc) 16%)}.echo-map-compose-field>span,.echo-map-compose-field>legend{padding:0;color:var(--text,#2c1f14);font-size:12px;font-weight:900}.echo-map-compose-field small{color:var(--text-muted,#7a6657);font-size:10px;text-align:right}
      .echo-map-compose-field textarea{box-sizing:border-box;width:100%;min-height:112px;resize:vertical;border:1px solid var(--border-strong,#c9b9a9);border-radius:13px;background:var(--card-bg,#fff);color:var(--text,#2c1f14);padding:12px 13px;font:inherit;line-height:1.55;outline:none}.echo-map-compose-field textarea:focus{border-color:var(--primary,#8b5e3c);box-shadow:0 0 0 3px color-mix(in srgb,var(--primary,#8b5e3c) 18%,transparent)}
      .echo-map-compose-field input[type=file]{max-width:100%;color:var(--text-muted,#7a6657);font:inherit;font-size:11px}.echo-map-compose-field input[type=color]{width:54px;height:38px;padding:3px;border:1px solid var(--border-strong,#c9b9a9);border-radius:10px;background:var(--card-bg,#fff);cursor:pointer}.echo-map-compose-field>label{display:flex;align-items:center;justify-content:space-between;gap:12px;color:var(--text,#2c1f14);font-size:12px;font-weight:900}
      .echo-map-compose-fieldset{min-width:0}.echo-map-compose-options{display:grid;gap:8px}.echo-map-compose-options[data-role=postTypes],.echo-map-compose-options[data-role=categories],.echo-map-compose-options[data-role=identities]{grid-template-columns:repeat(2,minmax(0,1fr))}.echo-map-compose-options[data-role=shapes]{grid-template-columns:repeat(5,minmax(0,1fr))}
      .echo-map-compose-choice{position:relative;min-width:0}.echo-map-compose-choice input{position:absolute;width:1px;height:1px;opacity:0;pointer-events:none}.echo-map-compose-card{position:relative;box-sizing:border-box;display:flex;height:100%;min-height:50px;align-items:center;gap:9px;padding:10px;border:1px solid var(--border,#e2d7cc);border-radius:13px;background:var(--card-bg,#fff);color:var(--text,#2c1f14);cursor:pointer;font-size:11px;font-weight:780;transition:border-color .14s ease,background .14s ease,transform .14s ease,box-shadow .14s ease}.echo-map-compose-card:hover{border-color:var(--border-strong,#c9b9a9);transform:translateY(-1px)}.echo-map-compose-choice input:focus-visible+.echo-map-compose-card{outline:3px solid color-mix(in srgb,var(--primary,#8b5e3c) 22%,transparent);outline-offset:2px}.echo-map-compose-choice input:checked+.echo-map-compose-card{border-color:var(--primary,#8b5e3c);background:color-mix(in srgb,var(--secondary,#f4e8dc) 80%,var(--card-bg,#fff));color:var(--primary,#8b5e3c);box-shadow:0 0 0 2px color-mix(in srgb,var(--primary,#8b5e3c) 13%,transparent)}.echo-map-compose-check{position:absolute;right:7px;top:6px;display:grid;width:16px;height:16px;place-items:center;border-radius:50%;background:var(--primary,#8b5e3c);color:#fff;font-size:10px;opacity:0;transform:scale(.7);transition:.14s}.echo-map-compose-choice input:checked+.echo-map-compose-card .echo-map-compose-check{opacity:1;transform:scale(1)}
      .echo-map-compose-category-icon{font-size:20px;line-height:1}.echo-map-compose-category-name{padding-right:14px;line-height:1.25}.echo-map-compose-shape-card{min-height:76px;flex-direction:column;justify-content:center;text-align:center}.echo-map-compose-shape-name{overflow:hidden;width:100%;text-overflow:ellipsis;white-space:nowrap;font-size:9px}
      .echo-map-compose-shape{position:relative;display:block;flex:0 0 auto;width:35px;height:27px;border:2px solid var(--primary,#8b5e3c);background:color-mix(in srgb,var(--primary,#8b5e3c) 22%,var(--card-bg,#fff));box-shadow:0 3px 7px rgba(44,31,20,.12)}.echo-map-compose-shape-rounded{border-radius:9px}.echo-map-compose-shape-square{width:29px;height:29px}.echo-map-compose-shape-rect{width:42px;height:23px;border-radius:2px}.echo-map-compose-shape-circle{width:29px;height:29px;border-radius:50%}.echo-map-compose-shape-envelope{background:linear-gradient(32deg,transparent 48%,var(--primary,#8b5e3c) 49% 52%,transparent 53%),linear-gradient(-32deg,transparent 48%,var(--primary,#8b5e3c) 49% 52%,transparent 53%),color-mix(in srgb,var(--primary,#8b5e3c) 15%,var(--card-bg,#fff));border-radius:3px}.echo-map-compose-shape-torn{clip-path:polygon(0 7%,8% 0,17% 7%,27% 0,38% 7%,50% 0,62% 7%,73% 0,83% 7%,93% 0,100% 7%,97% 94%,88% 100%,76% 93%,64% 100%,52% 93%,40% 100%,28% 93%,16% 100%,5% 93%)}.echo-map-compose-shape-speech{border-radius:8px}.echo-map-compose-shape-speech::after{content:'';position:absolute;left:6px;top:100%;border:5px solid transparent;border-top-color:var(--primary,#8b5e3c);border-left-color:var(--primary,#8b5e3c)}.echo-map-compose-shape-polaroid{box-sizing:border-box;height:34px;border:4px solid var(--card-bg,#fff);border-bottom-width:9px;border-radius:1px;outline:2px solid var(--primary,#8b5e3c);background:color-mix(in srgb,var(--primary,#8b5e3c) 30%,var(--card-bg,#fff))}.echo-map-compose-shape-ticket{border-radius:4px;clip-path:polygon(0 0,100% 0,100% 35%,91% 50%,100% 65%,100% 100%,0 100%,0 65%,9% 50%,0 35%)}.echo-map-compose-shape-hexagon{clip-path:polygon(25% 0,75% 0,100% 50%,75% 100%,25% 100%,0 50%)}
      .echo-map-compose-identity-card{min-height:72px;align-items:flex-start;padding:12px 34px 12px 12px}.echo-map-compose-identity-icon{font-size:20px}.echo-map-compose-identity-copy{display:grid;gap:3px;min-width:0}.echo-map-compose-identity-copy strong{overflow:hidden;color:var(--text,#2c1f14);font-size:11px;text-overflow:ellipsis;white-space:nowrap}.echo-map-compose-identity-copy small{color:var(--text-muted,#7a6657);font-size:9px;text-align:left;line-height:1.35}
      .echo-map-compose-error{min-height:18px;margin:8px 2px;color:#b42318;font-size:11px;font-weight:750}.echo-map-compose-submit{width:100%;min-height:50px;justify-content:center;border-color:var(--primary,#8b5e3c);border-radius:999px;background:var(--primary,#8b5e3c);color:#fff;box-shadow:0 12px 24px color-mix(in srgb,var(--primary,#8b5e3c) 28%,transparent);font-size:13px}.echo-map-compose-submit:hover,.echo-map-compose-submit:focus-visible{background:color-mix(in srgb,var(--primary,#8b5e3c) 88%,#000);color:#fff}
      .echo-map-toast{position:fixed;left:50%;bottom:24px;z-index:1600;max-width:min(420px,calc(100vw - 28px));padding:11px 15px;border-radius:999px;background:#245c3a;color:#fff;box-shadow:0 14px 36px rgba(0,0,0,.28);font:750 12px/1.4 Inter,sans-serif;transform:translateX(-50%)}
      :root[data-theme=dark] .echo-map-compose-shell{border-color:var(--border-strong);background:linear-gradient(145deg,color-mix(in srgb,var(--card-bg) 92%,#5d412c 8%),var(--card-bg));color:var(--text)}:root[data-theme=dark] .echo-map-compose-card,:root[data-theme=dark] .echo-map-compose-field textarea{background:var(--card-bg);color:var(--text)}
      @media(max-width:620px){.echo-map-compose-overlay{padding:8px}.echo-map-compose-shell{max-height:calc(100vh - 16px);padding:17px;border-radius:20px}.echo-map-compose-options[data-role=shapes]{grid-template-columns:repeat(2,minmax(0,1fr))}.echo-map-compose-options[data-role=identities]{grid-template-columns:1fr}.echo-map-compose-field{padding:12px}.echo-map-compose-head h2{font-size:27px}}
      @media(max-height:650px){.echo-map-compose-shell{max-height:calc(100vh - 12px)}.echo-map-compose-field textarea{min-height:82px}.echo-map-compose-shape-card{min-height:66px}}
      .echo-map-note-label-icon{width:1px!important;height:1px!important;margin:0!important;border:0!important;background:transparent!important;overflow:visible!important}
      .echo-map-note-label{appearance:none;position:absolute;left:0;top:0;display:inline-flex;align-items:center;gap:5px;min-height:28px;padding:5px 8px;border:1px solid var(--border-strong,#c9b9a9);border-radius:999px;background:var(--card-bg,#fff);color:var(--text,#2c1f14);box-shadow:0 7px 18px rgba(44,31,20,.2);font-family:Inter,sans-serif;font-size:10px;font-weight:850;line-height:1;white-space:nowrap;text-decoration:none;transform:translate(-50%,-50%);pointer-events:auto;cursor:pointer}
      .echo-map-note-label:hover,.echo-map-note-label:focus-visible{z-index:2;border-color:var(--primary,#8b5e3c);outline:3px solid color-mix(in srgb,var(--primary,#8b5e3c) 24%,transparent);outline-offset:2px;color:var(--primary,#8b5e3c)}
      .echo-map-note-label.is-private{border-style:dashed;background:var(--secondary,#f4e8dc);transform:translate(-50%,calc(-50% + 32px))}
      .echo-map-note-detail{position:absolute;left:50%;bottom:calc(100% + 10px);width:248px;padding:13px;border:1px solid var(--border,#e2d7cc);border-radius:14px;background:var(--card-bg,#fff);color:var(--text,#2c1f14);box-shadow:0 18px 42px rgba(44,31,20,.25);font-size:11px;font-weight:500;line-height:1.45;white-space:normal;transform:translate(-50%,5px);opacity:0;visibility:hidden;pointer-events:none;transition:opacity .14s ease,transform .14s ease,visibility .14s ease}
      .echo-map-note-detail::after{content:'';position:absolute;left:50%;top:100%;width:10px;height:10px;border-right:1px solid var(--border,#e2d7cc);border-bottom:1px solid var(--border,#e2d7cc);background:var(--card-bg,#fff);transform:translate(-50%,-5px) rotate(45deg)}
      .echo-map-note-label:hover .echo-map-note-detail,.echo-map-note-label:focus .echo-map-note-detail{opacity:1;visibility:visible;transform:translate(-50%,0);pointer-events:auto}
      .echo-map-note-detail strong{display:block;margin:0 0 7px;color:var(--primary,#8b5e3c);font-size:11px}
      .echo-map-note-summary{display:-webkit-box;margin:0 0 10px;overflow:hidden;color:var(--text,#2c1f14);font-size:12px;font-weight:650;line-height:1.5;-webkit-box-orient:vertical;-webkit-line-clamp:3}
      .echo-map-note-meta{display:grid;grid-template-columns:auto minmax(0,1fr);gap:4px 8px;margin:0;color:var(--text-muted,#7a6657)}
      .echo-map-note-meta dt{font-weight:750}.echo-map-note-meta dd{min-width:0;margin:0;overflow-wrap:anywhere}
      .echo-map-note-link{display:block;margin-top:10px;padding-top:9px;border-top:1px solid var(--border,#e2d7cc);color:var(--primary,#8b5e3c);font-weight:850}
      :root[data-theme=dark] .echo-map-note-control,:root[data-theme=dark] .echo-map-note-label,:root[data-theme=dark] .echo-map-note-detail{border-color:var(--border-strong);background:var(--card-bg);color:var(--text);box-shadow:0 16px 34px rgba(0,0,0,.55)}
      :root[data-theme=dark] .echo-map-note-label.is-private{background:var(--secondary)}
      :root[data-theme=dark] .echo-map-note-detail::after{border-color:var(--border-strong);background:var(--card-bg)}
      @media(max-width:390px){.map-floating-controls{align-items:stretch}.map-floating-controls button{width:100%;min-width:0;max-width:100%;flex:none}.echo-map-note-controls{width:100%}.echo-map-note-control{padding:7px 9px;font-size:11px}.echo-map-note-detail{width:min(224px,calc(100vw - 48px))}}`;
    document.head.appendChild(style);
  }
  function getBuildings() {
    return new Map((window.CAMPUS_BUILDINGS || [])
      .filter(building => Number.isFinite(Number(building?.mapTarget?.lat)) && Number.isFinite(Number(building?.mapTarget?.lng)))
      .map(building => [building.id, building]));
  }

  function getPublicNotes(notes, buildings) {
    const seenBuildings = new Set();
    return notes
      .filter(note => note && note.isHidden !== true && buildings.has(note.placeId) && Number.isFinite(Number(note.lat)) && Number.isFinite(Number(note.lng)))
      .sort((a,b) => Number(b.score || 0) - Number(a.score || 0))
      .filter(note => {
        if (seenBuildings.has(note.placeId)) return false;
        seenBuildings.add(note.placeId);
        return true;
      })
      .slice(0, MAX_PUBLIC_NOTES);
  }

  function detailHtml(note, labelTitle) {
    const category = Object.prototype.hasOwnProperty.call(CATEGORY_ICONS, note.category) ? note.category : 'academic';
    const score = Number(note.score || 0);
    const content = note.content ?? note.text ?? '';
    const author = note.isAnonymous ? text('anonymous') : String(note.authorNickname ?? note.author ?? text('user'));
    const postType = window.EchoPostTypeContract.normalize(note.postType);
    return `<span class="echo-map-note-detail" role="tooltip">
      <strong>${escapeHtml(labelTitle)}</strong>
      <span class="echo-map-note-summary">${escapeHtml(truncate(content))}</span>
      <dl class="echo-map-note-meta">
        <dt>${escapeHtml(text('author'))}</dt><dd>${escapeHtml(author)}</dd>
        <dt>${escapeHtml(window.I18n?.t?.('form.postType') || 'Post Type')}</dt><dd>${escapeHtml(postTypeText(postType))}</dd>
        <dt>${escapeHtml(text('category'))}</dt><dd>${CATEGORY_ICONS[category]} ${escapeHtml(categoryText(category))}</dd>
        <dt>${escapeHtml(text('heat'))}</dt><dd>👍 ${escapeHtml(String(score))}</dd>
      </dl>
      <span class="echo-map-note-link">${escapeHtml(text('view'))} →</span>
    </span>`;
  }

  function createLabel(note, building) {
    const score = Number(note.score || 0);
    const labelTitle = text('hot');
    const ariaLabel = labelTitle + ': ' + truncate(note.content ?? note.text ?? '', 80) + '. ' + text('view');
    const html = `<button class="echo-map-note-label" type="button" aria-label="${escapeHtml(ariaLabel)}">
      <span aria-hidden="true">🔥</span><span>${escapeHtml(String(score))}</span>
      ${detailHtml(note, labelTitle)}
    </button>`;
    const icon = L.divIcon({ className:'echo-map-note-label-icon', html, iconSize:[1,1], iconAnchor:[0,0] });
    const marker = L.marker([Number(note.lat),Number(note.lng)], {
      icon, pane:'markerPane', keyboard:false, interactive:true,
    });
    marker.on('add', () => {
      const element = marker.getElement();
      const button = element?.querySelector('.echo-map-note-label');
      if (!element || !button) return;
      L.DomEvent.disableClickPropagation(element);
      if (button.dataset.wallNavigationBound === 'true') return;
      button.dataset.wallNavigationBound = 'true';
      button.addEventListener('click', () => window.navigateToBuildingWall?.(building.id));
    });
    return marker;
  }
  function getHideAtZoom() {
    const configured = state.hideAtZoom == null ? NaN : Number(state.hideAtZoom);
    if (Number.isFinite(configured)) return configured;
    const fitCampusZoom = Number(state.getFitCampusZoom?.());
    const buildingZoom = state.buildingZoom == null ? NaN : Number(state.buildingZoom);
    if (Number.isFinite(fitCampusZoom) && Number.isFinite(buildingZoom)) return Math.max(fitCampusZoom + 1, buildingZoom);
    if (Number.isFinite(buildingZoom)) return buildingZoom;
    if (Number.isFinite(fitCampusZoom)) return fitCampusZoom + 1;
    return Infinity;
  }

  function labelsAllowedAtCurrentZoom() {
    const zoom = Number(state.map?.getZoom?.());
    return Number.isFinite(zoom) && zoom >= getHideAtZoom();
  }

  function syncLayerVisibility() {
    if (!state.map) return;
    const allowedAtZoom = labelsAllowedAtCurrentZoom();
    const shouldShow = state.visible && allowedAtZoom && !state.placementActive;
    [state.publicLayer,state.privateLayer].forEach(layer => {
      if (!layer) return;
      if (shouldShow && !state.map.hasLayer(layer)) layer.addTo(state.map);
      if (!shouldShow && state.map.hasLayer(layer)) state.map.removeLayer(layer);
    });
    if (state.toggleButton) {
      state.toggleButton.setAttribute('aria-pressed', String(state.visible));
      state.toggleButton.disabled = state.placementActive;
      state.toggleButton.setAttribute('title', allowedAtZoom ? '' : text('closeZoom'));
      state.toggleButton.innerHTML = '<span aria-hidden="true">🏷️</span>' + escapeHtml(text(state.visible ? 'hide' : 'show'));
    }
  }

  function getPlacementBuildingName(entry) {
    const name = entry?.building?.name ?? entry?.name;
    if (typeof name === 'string' && name.trim()) return name.trim();
    const language = window.I18n?.getLanguage?.() || 'en';
    return String(name?.[language] || name?.en || entry?.placeId || '');
  }

  function snapshotLayerStyle(layer) {
    const keys = ['stroke','color','weight','opacity','lineCap','lineJoin','dashArray','dashOffset','fill','fillColor','fillOpacity','fillRule'];
    return Object.fromEntries(keys.map(key => [key, layer.options?.[key]]));
  }

  function renderPlacementPanel() {
    if (!state.placementPanel) return;
    const help = state.placementPanel.querySelector('.echo-map-placement-help');
    const result = state.placementPanel.querySelector('.echo-map-placement-result');
    if (help) help.textContent = text('placementHelp');
    if (state.cancelButton) state.cancelButton.textContent = text('cancel');
    state.placementPanel.hidden = !state.placementActive;
    if (!result) return;
    result.replaceChildren();
    result.hidden = !state.placementSelection;
    if (!state.placementSelection) return;
    const entry = state.placementLayers.find(item => item.placeId === state.placementSelection.placeId);
    const heading = document.createElement('strong');
    heading.textContent = text('selected') + ': ' + getPlacementBuildingName(entry);
    const placeId = document.createElement('code');
    placeId.textContent = state.placementSelection.placeId;
    const coordinates = document.createElement('span');
    coordinates.textContent = text('coordinates') + ': ' + state.placementSelection.lat.toFixed(6) + ', ' + state.placementSelection.lng.toFixed(6);
    const next = document.createElement('button');
    next.className = 'echo-map-note-control echo-map-placement-next';
    next.type = 'button';
    next.textContent = composeText('postHere');
    next.addEventListener('click',openComposeForm);
    result.append(heading, placeId, coordinates, next);
  }

  function syncControlCopy() {
    if (state.composeButton) {
      state.composeButton.textContent = '✍️ ' + text('compose');
      state.composeButton.setAttribute('aria-pressed', String(state.placementActive));
    }
    renderPlacementPanel();
    updateComposeFormCopy();
  }

  function setComposeError(message = '') {
    const target = state.formOverlay?.querySelector('.echo-map-compose-error');
    if (target) target.textContent = message;
  }

  function updateComposeFormCopy() {
    const form = state.formOverlay;
    if (!form) return;
    const setCopy = key => {
      const target = form.querySelector('[data-copy=' + key + ']');
      if (target) target.textContent = composeText(key);
    };
    ['eyebrow','title','content','contentHint','category','shape','identity','named','namedHint','anonymous','anonymousHint','submit'].forEach(setCopy);
    const postTypeLegend = form.querySelector('[data-role=post-type-legend]');
    if (postTypeLegend) postTypeLegend.textContent = window.I18n?.t?.('form.postType') || 'Post Type';
    form.querySelectorAll('[data-post-type]').forEach(option => { option.textContent = postTypeText(option.dataset.postType); });
    const photoLabel = form.querySelector('[data-role=photo-label]');
    const photoHint = form.querySelector('[data-role=photo-hint]');
    const colorLabel = form.querySelector('[data-role=color-label]');
    if (photoLabel) photoLabel.textContent = mediaText('photo');
    if (photoHint) photoHint.textContent = mediaText('photoHint');
    if (colorLabel) colorLabel.textContent = mediaText('color');
    form.querySelector('[data-copy=close]').setAttribute('aria-label', composeText('close'));
    form.querySelectorAll('[data-category]').forEach(option => {
      option.textContent = categoryText(option.dataset.category);
    });
    form.querySelectorAll('[data-shape]').forEach(option => {
      option.textContent = composeShapeText(option.dataset.shape);
    });
    const user = window.AuthService?.getCurrentUser?.();
    const namedDisplay = form.querySelector('[data-role=namedDisplay]');
    if (namedDisplay) namedDisplay.textContent = user?.displayName || '';
    const location = form.querySelector('[data-role=location]');
    const entry = state.placementLayers.find(item => item.placeId === state.placementSelection?.placeId);
    if (location && state.placementSelection) {
      location.textContent = composeText('location') + ': ' + getPlacementBuildingName(entry) + ' · '
        + state.placementSelection.lat.toFixed(6) + ', ' + state.placementSelection.lng.toFixed(6);
    }
  }

  function closeComposeForm(clearDraft = false) {
    if (!state.formOverlay) return;
    state.formOverlay.hidden = true;
    state.pendingFormOpen = false;
    setComposeError('');
    if (clearDraft) {
      state.formOverlay.querySelector('form')?.reset();
      state.pendingImageDataUrl = '';
      state.pendingImageName = '';
      const count = state.formOverlay.querySelector('[data-role=count]');
      if (count) count.textContent = '0 / 500';
    }
    if (document.getElementById('auth-overlay')?.classList.contains('hidden') !== false) document.body.classList.remove('overlay-open');
  }

  function openComposeForm() {
    if (!state.placementSelection || !state.formOverlay) return;
    const user = window.AuthService?.getCurrentUser?.();
    if (!user) {
      state.pendingFormOpen = true;
      window.AuthUI?.open?.('login');
      return;
    }
    state.pendingFormOpen = false;
    updateComposeFormCopy();
    state.formOverlay.hidden = false;
    document.body.classList.add('overlay-open');
    requestAnimationFrame(() => state.formOverlay.querySelector('textarea')?.focus());
  }

  function showPluginToast(message) {
    state.toastElement?.remove?.();
    const toast = document.createElement('div');
    toast.className = 'echo-map-toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    state.toastElement = toast;
    setTimeout(() => {
      if (state.toastElement === toast) state.toastElement = null;
      toast.remove();
    }, 2800);
  }

  async function submitComposeForm(event) {
    event.preventDefault();
    const user = window.AuthService?.getCurrentUser?.();
    if (!user) {
      window.AuthUI?.open?.('login');
      return;
    }
    const form = event.currentTarget;
    const content = String(form.elements.content?.value || '').trim();
    if (!content) return setComposeError(composeText('empty'));
    if (content.length > 500) return setComposeError(composeText('tooLong'));
    const entry = state.placementLayers.find(item => item.placeId === state.placementSelection?.placeId);
    const wallKey = String(entry?.building?.wallKey || '');
    if (!entry || wallKey !== 'building:' + entry.placeId) return setComposeError(composeText('invalid'));
    const isAnonymous = form.elements.identity?.value !== 'named';
    const submit = form.querySelector('[data-copy=submit]');
    submit.disabled = true;
    setComposeError('');
    try {
      await window.MapNoteService.ready();
      await window.MapNoteService.create({
        placeId:entry.placeId,
        lat:state.placementSelection.lat,
        lng:state.placementSelection.lng,
        wallKey,
        postType:window.EchoPostTypeContract.normalize(form.elements.postType?.value),
        content,
        category:form.elements.category?.value,
        shape:form.elements.shape?.value,
        color:form.elements.color?.value,
        imageDataUrl:state.pendingImageDataUrl,
        imageName:state.pendingImageName,
        isAnonymous,
        authorNickname:isAnonymous ? null : user.displayName,
        authorUserId:user.id,
      });
      exitPlacementMode();
      showPluginToast(composeText('success'));
    } catch {
      setComposeError(composeText('failed'));
    } finally {
      submit.disabled = false;
    }
  }

  function createComposeForm() {
    const overlay = document.createElement('div');
    overlay.className = 'echo-map-compose-overlay';
    overlay.hidden = true;
    overlay.innerHTML = '<section class="echo-map-compose-shell" role="dialog" aria-modal="true"><header class="echo-map-compose-head"><div><p class="echo-map-compose-eyebrow" data-copy="eyebrow"></p><h2 data-copy="title"></h2></div><button class="echo-map-compose-close" data-copy="close" type="button">✕</button></header><div class="echo-map-compose-location" data-role="location"></div><form><label class="echo-map-compose-field"><span data-copy="content"></span><textarea name="content" maxlength="500" required></textarea><small><span data-copy="contentHint"></span> · <span data-role="count">0 / 500</span></small></label><fieldset class="echo-map-compose-field echo-map-compose-fieldset"><legend data-copy="category"></legend><div class="echo-map-compose-options" data-role="categories"></div></fieldset><fieldset class="echo-map-compose-field echo-map-compose-fieldset"><legend data-copy="shape"></legend><div class="echo-map-compose-options" data-role="shapes"></div></fieldset><fieldset class="echo-map-compose-field echo-map-compose-fieldset"><legend data-copy="identity"></legend><div class="echo-map-compose-options" data-role="identities"></div></fieldset><p class="echo-map-compose-error" role="alert"></p><button class="echo-map-note-control echo-map-compose-submit" data-copy="submit" type="submit"></button></form></section>';
    const addChoices = (role, name, values, defaultValue, renderCard) => {
      const host = overlay.querySelector('[data-role=' + role + ']');
      values.forEach(value => {
        const label = document.createElement('label');
        label.className = 'echo-map-compose-choice';
        const input = document.createElement('input');
        input.type = 'radio'; input.name = name; input.value = value; input.checked = value === defaultValue;
        const card = document.createElement('span');
        card.className = 'echo-map-compose-card';
        renderCard(card,value);
        const check = document.createElement('i');
        check.className = 'echo-map-compose-check';
        check.setAttribute('aria-hidden','true');
        check.textContent = '✓';
        card.appendChild(check);
        label.append(input,card); host.append(label);
      });
    };
    const postTypeField = document.createElement('fieldset');
    postTypeField.className = 'echo-map-compose-field echo-map-compose-fieldset';
    postTypeField.innerHTML = '<legend data-role="post-type-legend"></legend><div class="echo-map-compose-options" data-role="postTypes"></div>';
    const composeForm = overlay.querySelector('form');
    composeForm.insertBefore(postTypeField, composeForm.children[1]);
    const mediaField = document.createElement('fieldset');
    mediaField.className = 'echo-map-compose-field echo-map-compose-fieldset';
    mediaField.innerHTML = '<legend data-role="photo-label"></legend><input name="photo" type="file" accept="image/jpeg,image/png,image/webp"><small data-role="photo-hint"></small><label><span data-role="color-label"></span><input name="color" type="color" value="#BFDBFE"></label><small data-role="photo-status" aria-live="polite"></small>';
    composeForm.insertBefore(mediaField, composeForm.children[2]);
    addChoices('postTypes','postType',window.EchoPostTypeContract.values,'discussion',(card,value) => {
      const name = document.createElement('span');
      name.className = 'echo-map-compose-category-name';
      name.dataset.postType = value;
      card.appendChild(name);
    });
    addChoices('categories','category',window.EchoNoteStore.categories,'academic',(card,value) => {
      const icon = document.createElement('span');
      icon.className = 'echo-map-compose-category-icon';
      icon.setAttribute('aria-hidden','true');
      icon.textContent = CATEGORY_ICONS[value] || '•';
      const name = document.createElement('span');
      name.className = 'echo-map-compose-category-name';
      name.dataset.category = value;
      card.append(icon,name);
    });
    addChoices('shapes','shape',window.EchoNoteStore.shapes,'rounded',(card,value) => {
      card.classList.add('echo-map-compose-shape-card');
      const swatch = document.createElement('i');
      swatch.className = 'echo-map-compose-shape echo-map-compose-shape-' + value;
      swatch.setAttribute('aria-hidden','true');
      const name = document.createElement('span');
      name.className = 'echo-map-compose-shape-name';
      name.dataset.shape = value;
      card.append(swatch,name);
    });
    addChoices('identities','identity',['named','anonymous'],'anonymous',(card,value) => {
      card.classList.add('echo-map-compose-identity-card');
      const icon = document.createElement('span');
      icon.className = 'echo-map-compose-identity-icon';
      icon.setAttribute('aria-hidden','true');
      icon.textContent = value === 'named' ? '👤' : '◌';
      const copy = document.createElement('span');
      copy.className = 'echo-map-compose-identity-copy';
      const title = document.createElement('span');
      title.dataset.copy = value;
      copy.appendChild(title);
      if (value === 'named') {
        const displayName = document.createElement('strong');
        displayName.dataset.role = 'namedDisplay';
        copy.appendChild(displayName);
      }
      const hint = document.createElement('small');
      hint.dataset.copy = value + 'Hint';
      copy.appendChild(hint);
      card.append(icon,copy);
    });
    document.body.appendChild(overlay);
    state.formOverlay = overlay;
    addListener(overlay.querySelector('form'),'submit',submitComposeForm);
    addListener(overlay.querySelector('[data-copy=close]'),'click',() => closeComposeForm(false));
    addListener(overlay,'click',event => { if (event.target === overlay) closeComposeForm(false); });
    addListener(overlay.querySelector('textarea'),'input',event => {
      overlay.querySelector('[data-role=count]').textContent = event.target.value.length + ' / 500';
    });
    addListener(overlay.querySelector('input[name=photo]'),'change',async event => {
      const status = overlay.querySelector('[data-role=photo-status]');
      state.pendingImageDataUrl = '';
      state.pendingImageName = '';
      try {
        const image = await readComposeImage(event.target.files?.[0]);
        state.pendingImageDataUrl = image.dataUrl;
        state.pendingImageName = image.name;
        if (status) status.textContent = image.name;
      } catch (error) {
        event.target.value = '';
        if (status) status.textContent = error instanceof Error ? error.message : mediaText('photoHint');
      }
    });
    updateComposeFormCopy();
  }

  function syncPlacementLayerStyles() {
    const selectedPlaceId = state.placementSelection?.placeId || '';
    state.placementHandlers.forEach(record => {
      record.layer.setStyle(record.entry.placeId === selectedPlaceId
        ? PLACEMENT_STYLES.selected
        : record.style);
    });
  }

  function setPlacementHover(placeId) {
    if (!state.placementActive || state.placementSelection?.placeId === placeId) return;
    state.placementHandlers
      .filter(record => record.entry.placeId === placeId)
      .forEach(record => record.layer.setStyle(PLACEMENT_STYLES.hover));
  }

  function clearPlacementMarker() {
    if (!state.placementMarker) return;
    if (state.map?.hasLayer?.(state.placementMarker)) state.map.removeLayer(state.placementMarker);
    else state.placementMarker.remove?.();
    state.placementMarker = null;
  }

  function updatePlacementMarker(lat, lng) {
    if (!state.map || !window.L?.circleMarker) return;
    if (state.placementMarker) {
      state.placementMarker.setLatLng([lat,lng]);
      state.placementMarker.bringToFront?.();
      return;
    }
    state.placementMarker = L.circleMarker([lat,lng],{
      radius:6,
      color:'#fffaf2',
      weight:3,
      opacity:1,
      fillColor:'#b7791f',
      fillOpacity:1,
      interactive:false,
      bubblingMouseEvents:false,
    }).addTo(state.map);
    state.placementMarker.bringToFront?.();
  }

  function selectPlacement(entry, event) {
    if (!state.placementActive || !event?.latlng) return;
    if (event.originalEvent) L.DomEvent.stopPropagation(event.originalEvent);
    const lat = Number(event.latlng.lat);
    const lng = Number(event.latlng.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    state.placementSelection = { placeId:entry.placeId, lat, lng };
    updatePlacementMarker(lat,lng);
    syncPlacementLayerStyles();
    renderPlacementPanel();
  }

  function enterPlacementMode() {
    if (state.placementActive || !state.placementLayers.length) return;
    state.placementActive = true;
    clearPlacementMarker();
    state.placementSelection = null;
    state.visibleBeforePlacement = state.visible;
    state.placementLayers.forEach(entry => {
      const layer = entry.layer;
      const record = {
        entry, layer, style:snapshotLayerStyle(layer),
        hadPlacementFlag:Object.prototype.hasOwnProperty.call(layer.options || {}, 'echoPlacementActive'),
        placementFlag:layer.options?.echoPlacementActive,
        handlers:{
          mouseover:() => setPlacementHover(entry.placeId),
          mouseout:syncPlacementLayerStyles,
          click:event => selectPlacement(entry, event),
        },
      };
      layer.options.echoPlacementActive = true;
      layer.on('mouseover', record.handlers.mouseover);
      layer.on('mouseout', record.handlers.mouseout);
      layer.on('click', record.handlers.click);
      state.placementHandlers.push(record);
    });
    syncLayerVisibility();
    syncControlCopy();
  }

  function exitPlacementMode() {
    if (!state.placementActive && !state.placementHandlers.length && !state.placementMarker && !state.placementSelection) return;
    closeComposeForm(true);
    clearPlacementMarker();
    state.placementHandlers.splice(0).forEach(record => {
      record.layer.off('mouseover', record.handlers.mouseover);
      record.layer.off('mouseout', record.handlers.mouseout);
      record.layer.off('click', record.handlers.click);
      if (record.hadPlacementFlag) record.layer.options.echoPlacementActive = record.placementFlag;
      else delete record.layer.options.echoPlacementActive;
      record.layer.setStyle(record.style);
    });
    state.placementActive = false;
    state.placementSelection = null;
    state.visible = state.visibleBeforePlacement;
    syncLayerVisibility();
    syncControlCopy();
  }

  function createControl() {
    const host = document.querySelector('.map-floating-controls');
    if (!host) return false;
    const container = document.createElement('div');
    container.className = 'echo-map-note-controls';
    const toggle = document.createElement('button');
    toggle.className = 'echo-map-note-control';
    toggle.type = 'button';
    addListener(toggle,'click',() => {
      state.visible = !state.visible;
      syncLayerVisibility();
    });
    container.append(toggle);
    const compose = document.createElement('button');
    compose.className = 'echo-map-note-control';
    compose.type = 'button';
    addListener(compose,'click',enterPlacementMode);
    container.append(compose);
    const panel = document.createElement('div');
    panel.className = 'echo-map-placement-panel';
    panel.hidden = true;
    const help = document.createElement('p');
    help.className = 'echo-map-placement-help';
    const cancel = document.createElement('button');
    cancel.className = 'echo-map-placement-cancel';
    cancel.type = 'button';
    addListener(cancel,'click',exitPlacementMode);
    const result = document.createElement('div');
    result.className = 'echo-map-placement-result';
    result.hidden = true;
    panel.append(help, cancel, result);
    container.append(panel);
    const fitCampusButton = host.querySelector('#fit-campus');
    if (fitCampusButton) fitCampusButton.insertAdjacentElement('afterend',container);
    else host.append(container);
    state.controlElement = container;
    state.toggleButton = toggle;
    state.composeButton = compose;
    state.cancelButton = cancel;
    state.placementPanel = panel;
    syncControlCopy();
    return true;
  }
  async function refresh({ serviceReady = false } = {}) {
    if (!state.map || !state.publicLayer || !state.privateLayer) return;
    const requestToken = ++state.refreshToken;
    try {
      if (!serviceReady) await window.MapNoteService.ready();
      const notes = await window.MapNoteService.list({ visibility:'visible' });
      if (requestToken !== state.refreshToken || !state.map) return;
      const buildings = getBuildings();
      const publicNotes = getPublicNotes(notes, buildings);
      state.publicLayer.clearLayers();
      state.privateLayer.clearLayers();
      publicNotes.forEach(note => state.publicLayer.addLayer(createLabel(note, buildings.get(note.placeId))));
      syncLayerVisibility();
      syncControlCopy();
    } catch {
      if (requestToken !== state.refreshToken) return;
      state.publicLayer.clearLayers();
      state.privateLayer.clearLayers();
      console.warn('Map note labels could not be refreshed.');
    }
  }

  async function connectService() {
    const activeMap = state.map;
    try {
      await window.MapNoteService.ready();
      await refresh({ serviceReady:true });
      if (state.map !== activeMap || state.serviceUnsubscribe) return;
      state.serviceUnsubscribe = window.MapNoteService.subscribe(() => { void refresh({ serviceReady:true }); });
    } catch {
      console.warn('Map note service could not be initialized.');
    }
  }

  function disconnectService() {
    state.refreshToken += 1;
    state.serviceUnsubscribe?.();
    state.serviceUnsubscribe = null;
  }

  function init(options = {}) {
    if (!options.map || !window.L) return false;
    if (state.map) destroy();
    state.map = options.map;
    state.getFitCampusZoom = typeof options.getFitCampusZoom === 'function' ? options.getFitCampusZoom : null;
    state.buildingZoom = options.buildingZoom;
    state.hideAtZoom = options.hideAtZoom;
    state.previousShowToast = window.showToast;
    if (typeof window.showToast !== 'function') window.showToast = showPluginToast;
    state.placementLayers = Array.isArray(options.buildingPolygons)
      ? options.buildingPolygons.filter(entry => entry?.placeId && entry?.layer?.on && entry?.layer?.off && entry?.layer?.setStyle)
      : [];
    injectStyles();
    state.publicLayer = L.layerGroup();
    state.privateLayer = L.layerGroup();
    createControl();
    createComposeForm();
    addMapListener('zoomend', syncLayerVisibility);
    addListener(window,'pageshow',() => { void refresh(); });
    addListener(window,'echo:authchange',() => {
      void refresh();
      if (state.pendingFormOpen && window.AuthService?.getCurrentUser?.()) openComposeForm();
      else updateComposeFormCopy();
    });
    addListener(window,'echo:languagechange',() => { void refresh({ serviceReady:true }); });
    addListener(window,'pagehide',exitPlacementMode);
    addListener(window,'beforeunload',disconnectService);
    void connectService();
    return true;
  }

  function destroy() {
    disconnectService();
    exitPlacementMode();
    clearPlacementMarker();
    state.listeners.splice(0).forEach(remove => remove());
    [state.publicLayer,state.privateLayer].forEach(layer => {
      if (layer && state.map?.hasLayer(layer)) state.map.removeLayer(layer);
      layer?.clearLayers?.();
    });
    state.controlElement?.remove?.();
    state.formOverlay?.remove?.();
    state.toastElement?.remove?.();
    if (window.showToast === showPluginToast) {
      if (typeof state.previousShowToast === 'function') window.showToast = state.previousShowToast;
      else delete window.showToast;
    }
    document.getElementById(STYLE_ID)?.remove();
    Object.assign(state,{
      map:null, publicLayer:null, privateLayer:null, controlElement:null,
      toggleButton:null, visible:true, getFitCampusZoom:null, buildingZoom:null, hideAtZoom:null,
      placementActive:false, placementSelection:null, placementLayers:[], placementHandlers:[],
      composeButton:null, cancelButton:null, placementPanel:null, placementMarker:null, visibleBeforePlacement:true,
      formOverlay:null, pendingFormOpen:false, toastElement:null, previousShowToast:null,
      serviceUnsubscribe:null, refreshToken:state.refreshToken,
    });
  }

  window.EchoMapNoteOverlay = { init, refresh, destroy };
})();
