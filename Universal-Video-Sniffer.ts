// ==UserScript==
// @name         Universal Video Sniffer: Speedster (v9.7 HDR Dynamic + Info)
// @namespace    http://tampermonkey.net/
// @version      9.7
// @description  HDR 100% dinamico. Default Level 3 + Dolby Vision + Nitidezza Media. Info Sviluppatore.
// @author       Carmelo Battiato
// @match        *://*/*
// @grant        GM_setClipboard
// @grant        GM_addStyle
// @grant        GM_download
// @grant        GM_xmlhttpRequest
// @connect      *
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';
    const VER = "9.7";
    const CFG = { ext: /\.(mp4|m3u8|flv|webm|mov|avi|mkv|mpd)(\?|$)/i, ign: /doubleclick|googlead|analytics|adsystem|segment|prebid/i };
    const FOUND = new Set(), ACTIVE = new Set();
    
    GM_addStyle(`
        #uvs-c{position:fixed;top:60px;left:50%;transform:translateX(-50%);width:500px;background:#0f0f0f;color:#ccc;z-index:2147483647;border-radius:8px;box-shadow:0 10px 40px #000;font-family:system-ui,sans-serif;display:none;flex-direction:column;border:1px solid #333;font-size:13px}
        #uvs-h{padding:10px;background:#1a1a1a;border-bottom:1px solid #333;display:flex;justify-content:space-between;font-weight:700;color:#fff}
        #uvs-l{overflow-y:auto;padding:10px;max-height:550px;display:flex;flex-direction:column;gap:10px}
        .uvs-i{background:#161616;padding:10px;border-radius:6px;border:1px solid #2a2a2a}.uvs-u{font-size:10px;color:#666;overflow:hidden;text-overflow:ellipsis;background:#0a0a0a;padding:4px;font-family:monospace;margin:5px 0}
        .uvs-a{display:flex;gap:5px}.uvs-b{border:none;padding:8px;border-radius:4px;cursor:pointer;font-size:10px;font-weight:800;flex:1;color:#fff;text-transform:uppercase}
        .pb{background:#2ea043}.cb{background:#333}.tb{background:#e63946}.db{background:#f39c12}
        .pw{display:none;margin-top:8px;background:#111;padding:8px;border-radius:4px}.bar-c{height:8px;background:#333;border-radius:4px;overflow:hidden;margin-top:4px}.bar{height:100%;background:#e63946;width:0%}
        .bg{position:fixed;top:10px;left:50%;transform:translateX(-50%);background:#141414f2;border:1px solid #444;color:#fff;padding:6px 16px;border-radius:20px;font-weight:600;font-size:13px;cursor:pointer;z-index:2147483646;display:none}
    `);

    const mainUi = document.createElement('div'), badge = document.createElement('div');
    mainUi.id = 'uvs-c'; mainUi.innerHTML = `<div id="uvs-h"><span>Speedster v${VER}</span><div>⚡ <input type="number" id="uvs-th" value="5" min="1" style="width:40px;background:#333;border:none;color:#fff;text-align:center"> <span id="uvs-x" style="cursor:pointer;margin-left:10px">×</span></div></div><div id="uvs-l"></div>`;
    badge.className = 'bg'; badge.innerHTML = 'VIDEO: <span id="bc">0</span>';
    (document.documentElement || document.body).appendChild(mainUi);
    (document.documentElement || document.body).appendChild(badge);

    document.getElementById('uvs-x').onclick = () => { mainUi.style.display = 'none'; if(FOUND.size > 0) badge.style.display = 'block'; };
    badge.onclick = () => { mainUi.style.display = 'flex'; badge.style.display = 'none'; };

    const req = (u, b) => new Promise((ok, no) => GM_xmlhttpRequest({ method: "GET", url: u, responseType: b ? 'arraybuffer' : 'text', onload: r => r.status < 300 ? ok(r.response) : no(r.status), onerror: no }));
    const getTi = () => (document.querySelector('meta[property="og:title"]')?.content || document.title || "Video").replace(/\s[-|]\s?.*/, '').trim();

    async function dl(u, gui, fn, ct) {
        const { bar, txt, th, sb, pb } = gui;
        try {
            txt.innerText = "Analisi...";
            let m = await req(u), base = u.slice(0, u.lastIndexOf('/') + 1);
            if (ct.stop) throw "Stop";
            if (m.includes('#EXT-X-STREAM-INF')) {
                let sub = (m.match(/^(?!#)(.*\.m3u8)$/m) || [])[1];
                return dl(sub.startsWith('http') ? sub : base + sub, gui, fn, ct);
            }
            let seg = m.split('\n').map(l => l.trim()).filter(l => l && l[0] != '#').map(l => l.startsWith('http') ? l : base + l);
            ACTIVE.add(ct);
            let tot = seg.length, chk = new Array(tot), cmp = 0, act = 0, err = 0;
            txt.innerText = "Avvio..."; sb.style.display = pb.style.display = "inline-block"; th.innerText = "T:0";
            return new Promise((ok, no) => {
                ct.res = () => { txt.innerText = "..."; next() };
                ct.kill = () => { ACTIVE.delete(ct); no("Stop") };
                ct.upd = () => next();
                const next = () => {
                    if (ct.stop || ct.pause) return (ct.pause && (txt.innerText = `Pausa ${cmp}/${tot}`));
                    if (err || cmp === tot) return fin();
                    let max = parseInt(document.getElementById('uvs-th').value) || 5;
                    while (act < max && cmp < tot) { if (ct.stop || ct.pause) return; proc(cmp++); }
                };
                const proc = async (i) => {
                    if (ct.stop) { act--; return; } act++; th.innerText = "T:" + act;
                    try {
                        let d = await req(seg[i], 1);
                        if (ct.stop) { act--; return; }
                        chk[i] = new Uint8Array(d); cmp++; act--; th.innerText = "T:" + act;
                        if (cmp % 2 == 0 || cmp == tot) {
                            let p = Math.round(cmp / tot * 100); bar.style.width = p + '%'; if (!ct.pause) txt.innerText = `${p}% (${cmp}/${tot})`;
                        }
                        next();
                    } catch (e) { if (ct.stop) return; err = 1; txt.innerText = "Err"; ACTIVE.delete(ct); no(e); }
                };
                const fin = () => {
                    ACTIVE.delete(ct); if (ct.stop) return;
                    sb.style.display = pb.style.display = "none"; txt.innerText = "Unione...";
                    setTimeout(() => {
                        try {
                            let b = new Blob(chk, { type: 'video/mp4' }), a = document.createElement('a');
                            a.href = URL.createObjectURL(b); a.download = fn; document.body.appendChild(a); a.click(); a.remove();
                            txt.innerText = "Fatto!"; ok();
                        } catch (e) { no(e) }
                    }, 50);
                };
                next();
            });
        } catch (e) { ACTIVE.delete(ct); throw e; }
    }

    function add(u, src) {
        if (FOUND.has(u)) return; FOUND.add(u);
        let ti = getTi(), isH = u.includes('.m3u8'), div = document.createElement('div');
        div.className = 'uvs-i';
        div.innerHTML = `<div style="display:flex;justify-content:space-between;font-size:9px"><span style="color:#4db8ff;font-weight:800">${isH ? 'M3U8' : 'VID'}</span><span>${src}</span></div>
            <div style="font-weight:600;white-space:nowrap;overflow:hidden">${ti}</div><div class="uvs-u">${u}</div><div class="uvs-a"><button class="uvs-b pb">PLAY</button><button class="uvs-b cb">COPY</button><button class="uvs-b ${isH ? 'tb' : 'db'}">${isH ? 'DOWNLOAD' : 'SCARICA'}</button></div>
            <div class="pw"><div class="sr"><span class="st" style="color:#eee">Wait</span><div style="display:flex;gap:10px;align-items:center"><span class="th" style="font-family:monospace;font-size:11px;color:#aaa"></span><button class="uvs-b psb" style="display:none;background:#f39c12;color:#000">PAUSE</button><button class="uvs-b sb" style="display:none;background:#b71c1c;color:#fff">STOP</button></div></div><div class="bar-c"><div class="bar"></div></div></div>`;

        div.querySelector('.pb').onclick = () => openUltimatePlayer(u, ti, isH);
        div.querySelector('.cb').onclick = e => { GM_setClipboard(u); e.target.innerText = "OK"; setTimeout(() => e.target.innerText = "COPY", 1000) };

        if (isH) {
            let tb = div.querySelector('.tb'), sb = div.querySelector('.sb'), pb = div.querySelector('.psb'), ct = { stop: 0, pause: 0 };
            tb.onclick = () => {
                ct.stop = 0; ct.pause = 0; sb.disabled = 0; sb.innerText = "STOP";
                div.querySelector('.pw').style.display = 'block'; div.querySelector('.bar').style.width = '0%'; div.querySelector('.st').innerText = "Attesa..."; tb.disabled = 1;
                let gui = { bar: div.querySelector('.bar'), txt: div.querySelector('.st'), th: div.querySelector('.th'), sb, pb };
                sb.onclick = () => { ct.stop = 1; sb.innerText = "..."; sb.disabled = 1; if(ct.kill) ct.kill(); };
                pb.onclick = () => { ct.pause = !ct.pause; pb.innerText = ct.pause ? "RESUME" : "PAUSE"; pb.style.background = ct.pause ? "#2ea043" : "#f39c12"; if (!ct.pause && ct.res) ct.res() };
                dl(u, gui, ti + ".mp4", ct).then(() => { tb.disabled = 0 }).catch(e => { tb.disabled = 0; if (e == "Stop") { gui.txt.innerText = "Annullato"; gui.bar.style.width = "0%"; sb.style.display = pb.style.display = "none" } else { gui.txt.innerText = "Err"; gui.txt.style.color = "red" } });
            };
        } else { div.querySelector('.db').onclick = () => GM_download({ url: u, name: ti + ".mp4", saveAs: true }); }
        document.getElementById('uvs-l').prepend(div); document.getElementById('bc').innerText = FOUND.size; if (FOUND.size == 1) badge.style.display = 'block';
    }

    function openUltimatePlayer(u, ti, isHls) {
        const html = `<!doctype html><html><head><meta charset="UTF-8"><title>${ti}</title><link rel="stylesheet" href="https://cdn.plyr.io/3.7.8/plyr.css"/><style>
            body{margin:0;background:#000;font-family:system-ui,sans-serif;color:#fff;overflow:hidden;user-select:none}
            #wrapper { position: relative; width: 100%; height: 100vh; display: flex; align-items: center; justify-content: center; background:#000; }
            #ambilight { position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 1; opacity: 0; transition: opacity 1s; filter: blur(100px) saturate(250%); pointer-events: none; }
            #viewport { display: flex; width: 100%; height: 100%; z-index: 10; position: relative; }
            .video-pane { position: relative; height: 100%; overflow: hidden; display: flex; align-items: center; justify-content: center; transition: width 0.3s ease; }
            .pane-full { width: 100%; } .pane-half { width: 50%; border-right: 2px solid #4db8ff; }
            .plyr { width: 100%; height: 100%; }
            video { width: 100% !important; height: 100% !important; object-fit: contain; transition: transform 0.3s; }
            #v_comp_pane { background: #000; position: absolute; right: 0; width: 0; height: 100%; z-index: 11; border-left: 2px solid #4db8ff; transition: width 0.3s ease; display: none; }
            #v_comp { width: 100%; height: 100%; object-fit: contain; }
            .pane-label { position: absolute; top: 20px; right: 20px; background: rgba(0,0,0,0.7); padding: 4px 10px; border-radius: 4px; font-size: 10px; font-weight: 800; color: #4db8ff; z-index: 15; text-transform: uppercase; border: 1px solid #333; }
            .gear-btn{position:absolute;top:20px;left:20px;font-size:24px;cursor:pointer;z-index:2147483647 !important;text-shadow:0 2px 4px #000;opacity:0.7;transition:0.3s}
            .skip-btn { position: absolute; top: 50%; transform: translateY(-50%); width: 42px; height: 42px; background: rgba(0,0,0,0.5); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 17px; cursor: pointer; transition: 0.2s; z-index: 2147483647 !important; border: 1px solid rgba(255,255,255,0.2); }
            .skip-prev { left: 20px; } .skip-next { right: 20px; }
            .feedback { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(0,0,0,0.8); padding: 15px 30px; border-radius: 40px; font-size: 32px; font-weight: 900; z-index: 2147483647; pointer-events: none; opacity: 0; transition: 0.1s; }
            .overlay{position:absolute;top:60px;left:20px;background:rgba(18,18,18,0.98);padding:0;border-radius:12px;z-index:2147483647 !important;width:280px;backdrop-filter:blur(10px);box-shadow:0 10px 30px #000;display:none;animation:fadeIn .2s; border:1px solid #333; overflow:hidden}
            @keyframes fadeIn{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:translateY(0)}}
            .tabs { display:flex; background:#0a0a0a; border-bottom:1px solid #333; }
            .tab { flex:1; text-align:center; padding:10px 0; cursor:pointer; font-size:11px; font-weight:bold; color:#777; transition:0.2s; text-transform:uppercase; }
            .tab.active { color:#4db8ff; border-bottom:2px solid #4db8ff; background:#1a1a1a; }
            .panel-content { padding:15px; display:none; max-height:450px; overflow-y:auto; scrollbar-width: thin; scrollbar-color: #333 transparent; }
            .panel-content.active { display:block; }
            .row { margin-bottom:12px; display:flex; align-items:center; justify-content:space-between; font-size:11px; }
            label { width:90px; color:#aaa; font-weight:bold; }
            input[type=range] { flex:1; height:4px; cursor:pointer; accent-color:#4db8ff }
            select { background:#222; color:#fff; border:1px solid #444; padding:4px; border-radius:4px; font-size:11px; flex:1; outline:none }
            .tit { font-weight:800; margin:15px 0 8px 0; color:#888; border-bottom:1px solid #333; padding-bottom:4px; text-transform:uppercase; font-size:10px; }
            .val-label { width:35px; text-align:right; font-family:monospace; color:#4db8ff; margin-left:5px }
            button#rst_hard { width:100%; background:#b71c1c; border:none; color:#fff; padding:10px; cursor:pointer; font-weight:bold; font-size:11px; text-transform:uppercase; border-radius: 0 0 12px 12px; }
            .fade-out { opacity: 0 !important; pointer-events: none !important; }
            .resume-prompt { position: absolute; bottom: 80px; left: 20px; background: #2ea043; padding: 10px 15px; border-radius: 8px; z-index: 2147483647 !important; display: flex; align-items: center; gap: 10px; box-shadow: 0 4px 15px #000; opacity: 0; transform: translateY(20px); transition: all 0.3s; pointer-events: none; font-weight: 600; }
            .switch { position: relative; display: inline-block; width: 30px; height: 16px; }
            .switch input { opacity: 0; width: 0; height: 0; }
            .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #444; transition: .4s; border-radius: 34px; }
            .slider:before { position: absolute; content: ""; height: 10px; width: 10px; left: 3px; bottom: 3px; background-color: white; transition: .4s; border-radius: 50%; }
            input:checked + .slider { background-color: #4db8ff; }
            input:checked + .slider:before { transform: translateX(14px); }
        </style></head><body>
        <div id="wrapper">
            <canvas id="ambilight"></canvas>
            <div id="viewport">
                <div class="video-pane pane-full" id="v_main_pane"><video id="p" controls crossorigin="anonymous" playsinline></video></div>
                <div id="v_comp_pane"><span class="pane-label" id="comp_lbl">Confronto</span><video id="v_comp" muted playsinline></video></div>
            </div>
            <div class="gear-btn" id="gear">&#9881;</div><div class="skip-btn skip-prev" id="b_prev">⏪</div><div class="skip-btn skip-next" id="b_next">⏩</div><div class="feedback" id="feedback"></div>
            <div class="resume-prompt" id="resume_box"><span id="resume_txt">Riprendere?</span><button style="background:#fff;color:#2ea043;border:none;padding:5px 10px;border-radius:4px;cursor:pointer;font-weight:bold" id="resume_yes">Sì</button><span style="cursor:pointer;margin-left:8px" id="resume_no">×</span></div>
            <div class="overlay" id="panel">
                <div class="tabs"><div class="tab active" data-tab="vid">Video</div><div class="tab" data-tab="aud">Audio</div><div class="tab" data-tab="inf">Info</div></div>
                <div class="panel-content active" id="tab-vid">
                    <div class="tit">HDR Engine (100% Dynamic Master)</div>
                    <div class="row"><label>Standard</label><select id="hdr_mode">
                        <option value="custom">Custom (Libero)</option>
                        <option value="hdr_std">HDR Standard (Dyn)</option>
                        <option value="hdr_10">HDR10 (Dyn)</option>
                        <option value="hdr_plus">HDR10+ (Global Dyn)</option>
                        <option value="hdr_dv" selected>Dolby Vision (Granular)</option>
                    </select></div>
                    <div class="row"><label>Intensità</label><select id="hdr_lv">
                        <option value="1">Livello 1 (±10%)</option>
                        <option value="2">Livello 2 (±20%)</option>
                        <option value="3" selected>Livello 3 (±30%)</option>
                        <option value="4">Livello 4 (±40%)</option>
                        <option value="5">Livello 5 (±50%)</option>
                    </select></div>

                    <div class="tit">Cinema Grading</div>
                    <div class="row"><label>Luce (Gain)</label><input type="range" id="bri" min="0.5" max="1.5" step="0.01" value="1"><span class="val-label" id="lbl_bri">100%</span></div>
                    <div class="row"><label>Ombre (Lift)</label><input type="range" id="sha" min="0.5" max="1.5" step="0.01" value="1"><span class="val-label" id="lbl_sha">100%</span></div>
                    <div class="row"><label>Scuri (Gamma)</label><input type="range" id="gam" min="0.5" max="1.5" step="0.01" value="1"><span class="val-label" id="lbl_gam">100%</span></div>
                    <div class="row"><label>Highlights</label><input type="range" id="hig" min="0.5" max="1.5" step="0.01" value="1"><span class="val-label" id="lbl_hig">100%</span></div>
                    <div class="row"><label>Contrasto</label><input type="range" id="con" min="0.5" max="1.5" step="0.01" value="1"><span class="val-label" id="lbl_con">100%</span></div>
                    <div class="row"><label>Saturazione</label><input type="range" id="sat" min="0" max="2" step="0.01" value="1"><span class="val-label" id="lbl_sat">100%</span></div>
                    <div class="row"><label>Vibrance</label><input type="range" id="vib" min="0.5" max="1.5" step="0.01" value="1"><span class="val-label" id="lbl_vib">100%</span></div>

                    <div class="tit">Display & Dettaglio</div>
                    <div class="row"><label>Confronto</label><select id="comp_sel"><option value="none">Nessuno</option><option value="orig">Originale</option><option value="hdr_std">HDR Standard</option><option value="hdr_10">HDR10</option><option value="hdr_plus">HDR10+</option><option value="hdr_dv">Dolby Vision</option></select></div>
                    <div class="row"><label>Nitidezza</label><select id="us_sel">
                        <option value="none">Off</option><option value="sh-low">Bassa</option><option value="sh-soft">Soft</option><option value="sh-med" selected>Media</option><option value="sh-hard">Alta</option><option value="sh-ultra">Ultra</option>
                    </select></div>
                    <div class="row"><label>Ambilight</label><label class="switch"><input type="checkbox" id="ambi_chk"><span class="slider"></span></label></div>
                    <div class="row"><label>Formato</label><select id="ar_sel"><option value="contain">Adatta</option><option value="cover">Riempi</option><option value="fill">Stretch</option><option value="scale_1.25">Zoom 125%</option><option value="scale_1.5">Zoom 150%</option></select></div>
                </div>
                <div class="panel-content" id="tab-aud">
                    <div class="tit">Master & Sync</div>
                    <div class="row"><label>Gain Boost</label><input type="range" id="vol" min="0" max="5" step="0.1" value="1"><span id="lbl_vol" class="val-label">100%</span></div>
                    <div class="row"><label>Sync (ms)</label><input type="range" id="sync" min="0" max="2" step="0.05" value="0"><span id="lbl_sync" class="val-label">0</span></div>
                    <div class="row"><label>Night Mode</label><label class="switch"><input type="checkbox" id="night_chk"><span class="slider"></span></label></div>

                    <div class="tit">Equalizzatore 5 Bande</div>
                    <div class="row"><label>Bassi (60Hz)</label><input type="range" id="eq_b" min="-12" max="12" step="1" value="0"><span id="lbl_eq_b" class="val-label">0dB</span></div>
                    <div class="row"><label>M-Bassi (250Hz)</label><input type="range" id="eq_lb" min="-12" max="12" step="1" value="0"><span id="lbl_eq_lb" class="val-label">0dB</span></div>
                    <div class="row"><label>Medi (1kHz)</label><input type="range" id="eq_m" min="-12" max="12" step="1" value="0"><span id="lbl_eq_m" class="val-label">0dB</span></div>
                    <div class="row"><label>M-Alti (4kHz)</label><input type="range" id="eq_mh" min="-12" max="12" step="1" value="0"><span id="lbl_eq_mh" class="val-label">0dB</span></div>
                    <div class="row"><label>Alti (12kHz)</label><input type="range" id="eq_h" min="-12" max="12" step="1" value="0"><span id="lbl_eq_h" class="val-label">0dB</span></div>
                </div>
                <div class="panel-content" id="tab-inf">
                    <div class="tit">Software Info</div>
                    <div class="row"><span>Versione</span><span class="info-val">v${VER} Master</span></div>
                    <div class="row"><span>Sviluppatore</span><span class="info-val">Carmelo Battiato</span></div>
                    <div class="row"><span>Email</span><span class="info-val" style="font-size:11px">b84car@yahoo.it</span></div>
                    
                    <div class="tit">Metadata Realtime</div>
                    <div class="row"><span>MaxCLL (Peak)</span><span class="info-val" id="i_cll">- nits</span></div>
                    <div class="row"><span>MaxFALL (Avg)</span><span class="info-val" id="i_fall">- nits</span></div>
                    
                    <div class="tit">Stream Stats</div>
                    <div class="row"><span>Risoluzione</span><span class="info-val" id="i_res">-</span></div>
                    <div class="row"><span>Buffer</span><span class="info-val" id="i_buf">0.0s</span></div>
                    <div class="row"><span>FPS Realtime</span><span class="info-val" id="i_fps">0</span></div>
                </div>
                <button id="rst_hard">RESET TOTALE</button>
            </div>
        </div>

        <script src="https://cdn.jsdelivr.net/npm/hls.js"></script><script src="https://cdn.plyr.io/3.7.8/plyr.polyfilled.js"></script>
        <script>
            const v = document.getElementById('p'), vComp = document.getElementById('v_comp'), canvas = document.getElementById('ambilight'), ctx = canvas.getContext('2d');
            const panel = document.getElementById('panel'), gear = document.getElementById('gear');
            const b_prev = document.getElementById('b_prev'), b_next = document.getElementById('b_next'), fb = document.getElementById('feedback');
            const vMainPane = document.getElementById('v_main_pane'), vCompPane = document.getElementById('v_comp_pane');
            const hiddenCanvas = document.createElement('canvas'); const hCtx = hiddenCanvas.getContext('2d', {willReadFrequently:true});
            let ac, src, gain, delayNode, idleTimer, eqFilters = [];
            const storeKey = 'uvs_pos_' + encodeURIComponent("${u}").substring(0, 50);

            let lastFPSUpdate = performance.now();
            let lastFrameCount = 0;

            if(Hls.isSupported() && ${isHls}) {
                const h = new Hls({maxBufferLength:300, maxMaxBufferLength:600}); h.loadSource("${u}"); h.attachMedia(v);
                const hc = new Hls(); hc.loadSource("${u}"); hc.attachMedia(vComp);
            } else { v.src = vComp.src = "${u}"; }
            
            const player = new Plyr(v, { autoplay:1, controls:['play-large','play','progress','current-time','mute','volume','settings','pip','fullscreen'], settings:['quality','speed','loop'], fullscreen: { container: '#wrapper' } });
            v.onplay = () => vComp.play(); v.onpause = () => vComp.pause(); 
            v.onseeking = () => { vComp.currentTime = v.currentTime; };
            v.onseeked = () => { vComp.currentTime = v.currentTime; };
            setInterval(() => { if(!v.paused && Math.abs(v.currentTime - vComp.currentTime) > 0.25) vComp.currentTime = v.currentTime; }, 500);

            v.addEventListener('ready', () => { const pDiv = document.querySelector('.plyr'); if(pDiv) { [gear, b_prev, b_next, fb, panel, document.getElementById('resume_box')].forEach(el => pDiv.appendChild(el)); } });

            const inputs = { 
                comp: document.getElementById('comp_sel'), hdr: document.getElementById('hdr_mode'), lv: document.getElementById('hdr_lv'),
                bri: document.getElementById('bri'), sha: document.getElementById('sha'), gam: document.getElementById('gam'), 
                hig: document.getElementById('hig'), con: document.getElementById('con'), sat: document.getElementById('sat'), 
                vib: document.getElementById('vib'), ar: document.getElementById('ar_sel'), ambi: document.getElementById('ambi_chk'), 
                sh: document.getElementById('us_sel'), vol: document.getElementById('vol'), sync: document.getElementById('sync'), night: document.getElementById('night_chk'),
                eq_b: document.getElementById('eq_b'), eq_lb: document.getElementById('eq_lb'), eq_m: document.getElementById('eq_m'), eq_mh: document.getElementById('eq_mh'), eq_h: document.getElementById('eq_h')
            };

            function initAudio() {
                if(ac) return; try {
                    const AC = window.AudioContext || window.webkitAudioContext; ac = new AC(); src = ac.createMediaElementSource(v);
                    const freqs = [60, 250, 1000, 4000, 12000]; const types = ['lowshelf', 'peaking', 'peaking', 'peaking', 'highshelf'];
                    let lastNode = src;
                    eqFilters = freqs.map((f, i) => { const filter = ac.createBiquadFilter(); filter.type = types[i]; filter.frequency.value = f; filter.Q.value = 1; filter.gain.value = 0; lastNode.connect(filter); lastNode = filter; return filter; });
                    delayNode = ac.createDelay(5.0); gain = ac.createGain(); lastNode.connect(delayNode); delayNode.connect(gain); gain.connect(ac.destination);
                } catch(e) {}
            }
            v.addEventListener('play', () => { initAudio(); if(ac && ac.state==='suspended') ac.resume(); });

            function updateFPS() {
                const fpsEl = document.getElementById('i_fps');
                if (v.paused || v.ended) { fpsEl.innerText = "0"; } else {
                    const now = performance.now(); const quality = v.getVideoPlaybackQuality(); const currentFrames = quality.totalVideoFrames;
                    if (now - lastFPSUpdate >= 500) { const deltaFrames = currentFrames - lastFrameCount; const deltaTime = (now - lastFPSUpdate) / 1000; fpsEl.innerText = Math.round(deltaFrames / deltaTime); lastFrameCount = currentFrames; lastFPSUpdate = now; }
                }
                requestAnimationFrame(updateFPS);
            }
            updateFPS();

            function processAdaptiveHDR() {
                const mode = inputs.hdr.value; if(mode === 'custom') return;
                try {
                    if(hiddenCanvas.width !== 16) { hiddenCanvas.width = 16; hiddenCanvas.height = 16; }
                    hCtx.drawImage(v, 0, 0, 16, 16); const d = hCtx.getImageData(0, 0, 16, 16).data;
                    let maxL = 0, avgL = 0;
                    for(let i=0; i<d.length; i+=4) { 
                        let l = (0.2126*d[i] + 0.7152*d[i+1] + 0.0722*d[i+2]); 
                        if(l > maxL) maxL = l; avgL += l;
                    }
                    const avg = (avgL / 256) / 255;
                    const linearFactor = parseInt(inputs.lv.value) * 0.1;
                    const delta = (0.5 - avg);

                    document.getElementById('i_cll').innerText = Math.round((maxL/255) * 4000) + " nits";
                    document.getElementById('i_fall').innerText = Math.round(avg * 1000) + " nits";

                    let tBri = 1.0, tSha = 1.0, tGam = 1.0, tHig = 1.0, tCon = 1.0, tSat = 1.0, tVib = 1.0;

                    if(mode === 'hdr_plus' || mode === 'hdr_std' || mode === 'hdr_10') {
                        tBri = 1.0 + (delta * linearFactor * 3.5);
                        tSha = 1.0 - (delta * linearFactor * 0.8);
                        tGam = 1.0 + (delta * linearFactor * 1.5);
                        tHig = 1.0 - (delta * linearFactor * 1.0);
                        tCon = 1.0 + (Math.abs(delta) * linearFactor * 0.6);
                        tSat = 1.0 + (delta * linearFactor * 0.15);
                        tVib = 1.0 + (delta * linearFactor * 0.3);
                    } else if(mode === 'hdr_dv') {
                        tBri = 1.0 + (delta * linearFactor * 1.8);
                        tSha = 1.0 - (delta * linearFactor * 1.5);
                        tGam = 1.0 + (delta * linearFactor * 2.0);
                        tHig = 1.0 - (delta * linearFactor * 0.8);
                        tCon = 1.0 + (linearFactor * 0.4);
                        tSat = 1.0 + (delta * linearFactor * 0.12);
                        tVib = 1.0 + (delta * linearFactor * 0.4);
                    }

                    const lerp = (cur, tar) => parseFloat(cur) * 0.85 + tar * 0.15;
                    inputs.bri.value = lerp(inputs.bri.value, tBri);
                    inputs.sha.value = lerp(inputs.sha.value, tSha);
                    inputs.hig.value = lerp(inputs.hig.value, tHig);
                    inputs.con.value = lerp(inputs.con.value, tCon);
                    inputs.gam.value = lerp(inputs.gam.value, tGam);
                    inputs.sat.value = lerp(inputs.sat.value, tSat);
                    inputs.vib.value = lerp(inputs.vib.value, tVib);
                    
                    upd(true);
                } catch(e) {}
            }

            function upd(isAuto = false) {
                const comp = inputs.comp.value;
                if(comp !== 'none') { vMainPane.className = 'video-pane pane-half'; vCompPane.style.display = 'block'; vCompPane.style.width = '50%'; } 
                else { vMainPane.className = 'video-pane pane-full'; vCompPane.style.display = 'none'; vCompPane.style.width = '0'; }
                const ar = inputs.ar.value; if(ar.startsWith('scale')) { v.style.objectFit = 'contain'; v.style.transform = "scale("+ar.split('_')[1]+")"; } 
                else { v.style.objectFit = ar; v.style.transform = 'scale(1)'; }
                canvas.style.opacity = inputs.ambi.checked ? 1 : 0;
                
                const sha = (parseFloat(inputs.sha.value) - 1) * 45; 
                const gam = (parseFloat(inputs.gam.value) - 1) * 35;
                const hig = (parseFloat(inputs.hig.value) - 1) * 55;
                const vib = (parseFloat(inputs.vib.value) - 1) * 65;

                let f = "brightness("+inputs.bri.value+") contrast("+inputs.con.value+") saturate("+inputs.sat.value+") contrast("+(1 + (sha/100))+") brightness("+(1 - (hig/200))+") hue-rotate("+(gam/5)+"deg)";
                if(vib > 0) f += " saturate("+(1 + (vib/100))+")";
                if(inputs.sh.value !== 'none') f += " url(#"+inputs.sh.value+")";
                v.style.filter = f;
                
                ['bri','sha','gam','hig','con','sat','vib'].forEach(k => document.getElementById('lbl_'+k).innerText = Math.round(inputs[k].value * 100) + '%');
                if(gain) gain.gain.value = inputs.vol.value; document.getElementById('lbl_vol').innerText = Math.round(inputs.vol.value*100)+'%';
                if(delayNode) delayNode.delayTime.value = parseFloat(inputs.sync.value); document.getElementById('lbl_sync').innerText = Math.round(inputs.sync.value * 1000) + 'ms';
                if(eqFilters.length) { const eqKeys = ['eq_b', 'eq_lb', 'eq_m', 'eq_mh', 'eq_h']; eqFilters.forEach((filter, i) => { filter.gain.value = inputs[eqKeys[i]].value; document.getElementById('lbl_'+eqKeys[i]).innerText = inputs[eqKeys[i]].value + 'dB'; }); }
            }
            
            Object.values(inputs).forEach(i => i.oninput = () => upd(false));
            setInterval(processAdaptiveHDR, 100);
            document.querySelectorAll('.tab').forEach(t => t.onclick = () => { document.querySelectorAll('.tab, .panel-content').forEach(x => x.classList.remove('active')); t.classList.add('active'); document.getElementById('tab-'+t.dataset.tab).classList.add('active'); });
            gear.onclick = (e) => { e.stopPropagation(); panel.style.display = (panel.style.display == 'block' ? 'none' : 'block'); };
            
            document.getElementById('rst_hard').onclick = () => {
                localStorage.removeItem(storeKey); inputs.hdr.value = 'hdr_dv'; inputs.lv.value = '3'; inputs.comp.value = 'none'; inputs.sh.value = 'sh-med'; inputs.ar.value = 'contain';
                inputs.ambi.checked = inputs.night.checked = false; ['bri','sha','gam','hig','con','sat','vib','vol'].forEach(k => inputs[k].value = 1); ['eq_b', 'eq_lb', 'eq_m', 'eq_mh', 'eq_h'].forEach(k => inputs[k].value = 0);
                inputs.sync.value = 0; upd(false);
            };

            function doSkip(n) { v.currentTime += n; accSkip += n; fb.innerText = (accSkip > 0 ? '+' : '') + accSkip + 's'; fb.style.opacity = 1; clearTimeout(skipTimer); skipTimer = setTimeout(() => { accSkip = 0; fb.style.opacity = 0; }, 800); }
            let accSkip = 0, skipTimer;
            [b_prev, b_next].forEach(b => { b.onclick = (e) => { e.stopPropagation(); doSkip(b == b_prev ? -10 : 10); }; b.ondblclick = (e) => e.stopPropagation(); });
            function loopAmbi() { if(!v.paused && document.getElementById('ambi_chk').checked) { try { if(canvas.width!==64) { canvas.width=64; canvas.height=36; } ctx.drawImage(v, 0, 0, 64, 36); } catch(e){} } requestAnimationFrame(loopAmbi); }
            loopAmbi();
            v.addEventListener('timeupdate', () => { if(v.currentTime > 5) localStorage.setItem(storeKey, v.currentTime); document.getElementById('i_buf').innerText = (v.buffered.length ? (v.buffered.end(v.buffered.length-1)-v.currentTime).toFixed(1) : 0) + "s"; document.getElementById('i_res').innerText = v.videoWidth + "x" + v.videoHeight; });
            v.addEventListener('loadedmetadata', () => { const t = localStorage.getItem(storeKey); if(t && t > 10 && t < v.duration-30) { document.getElementById('resume_box').classList.add('visible'); document.getElementById('resume_yes').onclick = () => { v.currentTime = t; v.play(); document.getElementById('resume_box').classList.remove('visible'); }; document.getElementById('resume_no').onclick = () => document.getElementById('resume_box').classList.remove('visible'); } });
            document.addEventListener('mousemove', () => { clearTimeout(idleTimer); gear.classList.remove('fade-out'); b_prev.classList.remove('fade-out'); b_next.classList.remove('fade-out'); document.body.style.cursor = 'default'; idleTimer = setTimeout(() => { if(panel.style.display == 'block') return; gear.classList.add('fade-out'); b_prev.classList.add('fade-out'); b_next.classList.add('fade-out'); if(!v.paused) document.body.style.cursor = 'none'; }, 2000); });
        </script></body></html>`;
        window.open(URL.createObjectURL(new Blob([html], { type: 'text/html' })), '_blank');
    }

    const X = XMLHttpRequest.prototype, op = X.open, se = X.send;
    X.open = function(m, u) { this._u = u; return op.apply(this, arguments) };
    X.send = function() { if (this._u && CFG.ext.test(this._u) && !CFG.ign.test(this._u)) add(this._u, 'XHR'); return se.apply(this, arguments) };
    const oF = window.fetch; window.fetch = async (i, c) => { let u = i.url || i; if (u && CFG.ext.test(u) && !CFG.ign.test(u)) add(u, 'FETCH'); return oF(i, c) };
})();
