// ==UserScript==
// @name         Universal Video Sniffer: Speedster (v4.3)
// @namespace    http://tampermonkey.net/
// @version      4.3
// @description  Versione compatta v4.2: Buffer Player esteso a 300s.
// @author       Tu
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
    const CFG = { ext: /\.(mp4|m3u8|flv|webm|mov|avi|mkv|mpd)(\?|$)/i, ign: /doubleclick|googlead|analytics|adsystem|segment|prebid/i };
    const FOUND = new Set(), ACTIVE = new Set();
    
    GM_addStyle(`#uvs-c{position:fixed;top:60px;left:50%;transform:translateX(-50%);width:500px;background:#0f0f0f;color:#ccc;z-index:2147483647;border-radius:8px;box-shadow:0 10px 40px #000;font-family:sans-serif;display:none;flex-direction:column;border:1px solid #333;font-size:13px}#uvs-h{padding:10px;background:#1a1a1a;border-bottom:1px solid #333;display:flex;justify-content:space-between;font-weight:700;color:#fff}#uvs-th{background:#333;border:1px solid #444;color:#fff;width:40px;text-align:center}#uvs-l{overflow-y:auto;padding:10px;max-height:550px;display:flex;flex-direction:column;gap:10px}.uvs-i{background:#161616;padding:10px;border-radius:6px;border:1px solid #2a2a2a}.uvs-u{font-size:10px;color:#666;overflow:hidden;text-overflow:ellipsis;background:#0a0a0a;padding:4px;font-family:monospace;margin:5px 0}.uvs-a{display:flex;gap:5px}.uvs-b{border:none;padding:6px;border-radius:4px;cursor:pointer;font-size:10px;font-weight:700;flex:1;color:#fff}.uvs-b:hover{filter:brightness(1.2)}.uvs-b:disabled{opacity:.5}.pb{background:#2ea043}.cb{background:#333}.tb{background:#e63946}.db{background:#f39c12}.pw{display:none;margin-top:8px;background:#111;padding:8px}.sr{display:flex;justify-content:space-between;font-size:10px;color:#aaa;align-items:center}.bar-c{height:8px;background:#333;border-radius:4px;overflow:hidden;margin-top:4px}.bar{height:100%;background:#e63946;width:0%}.bg{position:fixed;top:10px;left:50%;transform:translateX(-50%);background:#141414f2;border:1px solid #444;color:#fff;padding:6px 16px;border-radius:20px;font-weight:600;font-size:13px;cursor:pointer;z-index:2147483646;display:none}.sb{background:#b71c1c;padding:2px 6px}.psb{background:#f39c12;color:#000;padding:2px 6px}`);

    const ui = document.createElement('div'), badge = document.createElement('div');
    ui.id = 'uvs-c'; ui.innerHTML = `<div id="uvs-h"><span>Speedster v4.3</span><div>⚡ <input type="number" id="uvs-th" value="5" min="1"> <span id="uvs-x" style="cursor:pointer;margin-left:10px">×</span></div></div><div id="uvs-l"></div>`;
    badge.className = 'bg'; badge.innerHTML = 'VIDEO: <span id="bc">0</span>';
    
    (document.documentElement || document.body).appendChild(ui);
    (document.documentElement || document.body).appendChild(badge);

    document.getElementById('uvs-x').onclick = () => { ui.style.display = 'none'; if(FOUND.size) badge.style.display = 'block'; };
    badge.onclick = () => { ui.style.display = 'flex'; badge.style.display = 'none'; };
    document.getElementById('uvs-th').oninput = () => ACTIVE.forEach(c => c.upd && c.upd());

    const req = (u, b) => new Promise((ok, no) => GM_xmlhttpRequest({ method: "GET", url: u, responseType: b ? 'arraybuffer' : 'text', onload: r => r.status < 300 ? ok(r.response) : no(r.status), onerror: no }));
    const getTi = () => (document.querySelector('meta[property="og:title"]')?.content || document.title || "Video").replace(/\s[-|]\s?.*/, '').trim();

    async function dl(u, gui, fn, ct) {
        const { bar, txt, spd, th, sb, pb } = gui;
        try {
            txt.innerText = "Analisi...";
            let m = await req(u), base = u.slice(0, u.lastIndexOf('/') + 1);
            if (ct.stop) throw "Stop";
            if (m.includes('#EXT-X-STREAM-INF')) {
                let sub = (m.match(/^(?!#)(.*\.m3u8)$/m) || [])[1];
                return dl(sub.startsWith('http') ? sub : base + sub, gui, fn, ct);
            }
            let seg = m.split('\n').map(l => l.trim()).filter(l => l && l[0] != '#').map(l => l.startsWith('http') ? l : base + l);
            if (!seg.length) throw "No Segments";

            ACTIVE.add(ct);
            let tot = seg.length, chk = new Array(tot), cmp = 0, cur = 0, act = 0, err = 0, ld = 0, st = Date.now();
            txt.innerText = "Avvio..."; sb.style.display = pb.style.display = "inline-block"; th.innerText = "T:0";

            return new Promise((ok, no) => {
                ct.res = () => { txt.innerText = "..."; next() };
                ct.kill = () => { ACTIVE.delete(ct); no("Stop") };
                ct.upd = () => next();
                
                const next = () => {
                    if (ct.stop || ct.pause) return (ct.pause && (txt.innerText = `Pausa ${cmp}/${tot}`));
                    if (err || cmp === tot) return fin();
                    let max = parseInt(document.getElementById('uvs-th').value) || 5;
                    while (act < max && cur < tot) { if (ct.stop || ct.pause) return; proc(cur++); }
                };
                
                const proc = async (i, att = 0) => {
                    if (ct.stop) { act--; return; } act++; th.innerText = "T:" + act;
                    try {
                        let d = await req(seg[i], 1);
                        if (ct.stop) { act--; return; }
                        chk[i] = new Uint8Array(d); ld += d.byteLength; cmp++; act--; th.innerText = "T:" + act;
                        if (cmp % 2 == 0 || cmp == tot) {
                            let p = Math.round(cmp / tot * 100); bar.style.width = p + '%'; if (!ct.pause) txt.innerText = `${p}%`;
                            if ((Date.now() - st) > 500) spd.innerText = ((ld / 1048576) / ((Date.now() - st) / 1000)).toFixed(1) + " MB/s";
                        }
                        next();
                    } catch (e) {
                        if (ct.stop) return;
                        if (att < 3) setTimeout(() => proc(i, att + 1), 1000);
                        else { err = 1; txt.innerText = "Err " + i; ACTIVE.delete(ct); no(e); }
                    }
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
        let c = FOUND.size, ti = getTi(), isH = u.includes('.m3u8'),
            div = document.createElement('div');
        div.className = 'uvs-i';
        div.innerHTML = `<div style="display:flex;justify-content:space-between;font-size:9px"><span style="color:#4db8ff;font-weight:800">${isH ? 'M3U8' : 'VID'}</span><span>${src}</span></div>
            <div style="font-weight:600;white-space:nowrap;overflow:hidden">${ti} <span id="r-${c}" style="color:#2ea043;font-size:9px">...</span></div>
            <div class="uvs-u">${u}</div><div class="uvs-a"><button class="uvs-b pb">PLAY</button><button class="uvs-b cb">COPY</button>
            <button class="uvs-b ${isH ? 'tb' : 'db'}">${isH ? 'TURBO' : 'SCARICA'}</button></div>
            <div class="pw"><div class="sr"><span class="st">Wait</span><div style="display:flex;gap:4px;align-items:center"><span class="th"></span><span class="sp"></span>
            <button class="uvs-b psb" style="display:none">||</button><button class="uvs-b sb" style="display:none">X</button></div></div><div class="bar-c"><div class="bar"></div></div></div>`;

        div.querySelector('.pb').onclick = () => {
            // Increased Buffer Config: maxBufferLength 300s, maxMaxBufferLength 600s, maxBufferSize 500MB
            let h = `<!doctype html><html><head><link rel="stylesheet" href="https://cdn.plyr.io/3.7.8/plyr.css"/><style>.m{position:absolute;top:10px;left:10px;background:#0009;color:#fff;padding:5px;z-index:9;font-family:mono;pointer-events:none}</style></head><body style="margin:0;background:#000"><div class="m">BUF: <span id="b">0s</span></div><video id="p" controls style="width:100%;height:100vh"></video><script src="https://cdn.jsdelivr.net/npm/hls.js"></script><script src="https://cdn.plyr.io/3.7.8/plyr.polyfilled.js"></script><script>const v=document.getElementById('p'),b=document.getElementById('b'),s="${u}";if(Hls.isSupported()&&${isH}){const h=new Hls({maxBufferLength:300,maxMaxBufferLength:600,maxBufferSize:500*1000*1000});h.loadSource(s);h.attachMedia(v)}else{v.src=s}new Plyr(v,{autoplay:1});setInterval(()=>{try{let t=v.currentTime,r=v.buffered,a=0;for(let i=0;i<r.length;i++)if(r.start(i)<=t+0.5&&r.end(i)>=t)a=r.end(i)-t;b.innerText=a.toFixed(1)+'s';b.style.color=a>300?'#0f0':(a>30?'#ff0':'#f00')}catch(e){}},500)</script></body></html>`;
            window.open(URL.createObjectURL(new Blob([h], { type: 'text/html' })), '_blank');
        };
        div.querySelector('.cb').onclick = e => { GM_setClipboard(u); e.target.innerText = "OK"; setTimeout(() => e.target.innerText = "COPY", 1000) };

        if (isH) {
            let tb = div.querySelector('.tb'), sb = div.querySelector('.sb'), pb = div.querySelector('.psb'), ct = { stop: 0, pause: 0 };
            tb.onclick = () => {
                tb.disabled = 1; div.querySelector('.pw').style.display = 'block';
                let gui = { bar: div.querySelector('.bar'), txt: div.querySelector('.st'), spd: div.querySelector('.sp'), th: div.querySelector('.th'), sb, pb };
                sb.onclick = () => { ct.stop = 1; sb.innerText = "..."; sb.disabled = 1; ct.kill && ct.kill() };
                pb.onclick = () => { ct.pause = !ct.pause; pb.innerText = ct.pause ? ">" : "||"; pb.style.background = ct.pause ? "#2ea043" : "#f39c12"; if (!ct.pause && ct.res) ct.res() };
                dl(u, gui, ti + ".mp4", ct).then(() => { tb.disabled = 0 }).catch(e => {
                    tb.disabled = 0;
                    if (e == "Stop") { gui.txt.innerText = "Annullato"; gui.txt.style.color = "#f55"; gui.bar.style.width = "0%"; gui.spd.innerText = gui.th.innerText = ""; sb.style.display = pb.style.display = "none" }
                    else { gui.txt.innerText = "Err"; gui.txt.style.color = "red" }
                });
            };
            req(u).then(t => { let m = t.match(/RES.*=(\d+x\d+)/); div.querySelector(`#r-${c}`).innerText = m ? m[1] : 'Auto' });
        } else {
            div.querySelector('.db').onclick = () => GM_download({ url: u, name: ti + ".mp4", saveAs: true });
            div.querySelector(`#r-${c}`).innerText = 'VID';
        }
        document.getElementById('uvs-l').prepend(div); document.getElementById('bc').innerText = c; if (c == 1) badge.style.display = 'block';
    }

    const X = XMLHttpRequest.prototype, op = X.open, se = X.send;
    X.open = function(m, u) { this._u = u; return op.apply(this, arguments) };
    X.send = function() { if (this._u && CFG.ext.test(this._u) && !CFG.ign.test(this._u)) add(this._u, 'XHR'); return se.apply(this, arguments) };
    const oF = window.fetch; window.fetch = async (i, c) => { let u = i.url || i; if (u && CFG.ext.test(u) && !CFG.ign.test(u)) add(u, 'FETCH'); return oF(i, c) };
})();
