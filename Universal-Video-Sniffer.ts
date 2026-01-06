// ==UserScript==
// @name         Universal Video Sniffer: Metadata & Probe
// @namespace    http://tampermonkey.net/
// @version      3.2
// @description  Intercetta video, recupera metadati (titolo) dalla pagina, analizza risoluzione M3U8 e scarica con nome corretto.
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

    // --- CONFIGURAZIONE ---
    const VALID_EXTENSIONS = ['.mp4', '.m3u8', '.flv', '.webm', '.mov', '.avi', '.mkv', '.mpd'];
    const IGNORE_PATTERNS = ['doubleclick', 'googlead', 'analytics', 'adsystem', 'segment', '.jpg', '.png', '.gif', 'prebid'];
    const FOUND_URLS = new Set();

    // --- STILI CSS ---
    GM_addStyle(`
        #uvs-container {
            position: fixed;
            top: 60px;
            left: 50%;
            transform: translateX(-50%);
            width: 480px;
            max-height: 600px;
            background-color: #0f0f0f;
            color: #e0e0e0;
            z-index: 2147483647;
            border-radius: 8px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.9);
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            display: none;
            flex-direction: column;
            border: 1px solid #333;
            overflow: hidden;
            font-size: 13px;
        }
        #uvs-header {
            padding: 12px 15px;
            background-color: #1a1a1a;
            border-bottom: 1px solid #333;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-weight: 700;
            color: #fff;
        }
        #uvs-close { cursor: pointer; color: #aaa; font-size: 20px; line-height: 1; }
        #uvs-close:hover { color: #fff; }
        #uvs-list { overflow-y: auto; padding: 10px; display: flex; flex-direction: column; gap: 12px; }
        
        .uvs-item {
            background-color: #161616;
            padding: 12px;
            border-radius: 6px;
            border: 1px solid #2a2a2a;
            display: flex;
            flex-direction: column;
            gap: 6px;
            position: relative;
        }
        .uvs-meta-header { display: flex; justify-content: space-between; align-items: center; }
        .uvs-type { font-size: 9px; color: #000; background: #4db8ff; padding: 2px 5px; border-radius: 3px; font-weight: 800; text-transform: uppercase; }
        
        /* Nuova sezione Info */
        .uvs-info-row {
            font-size: 11px;
            color: #aaa;
            display: flex;
            align-items: center;
            gap: 10px;
            border-bottom: 1px solid #333;
            padding-bottom: 5px;
            margin-bottom: 2px;
        }
        .uvs-info-title { color: #fff; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 250px; }
        .uvs-info-res { color: #2ea043; background: rgba(46, 160, 67, 0.1); padding: 1px 4px; border-radius: 3px; }

        .uvs-url {
            font-size: 10px; color: #666; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
            background: #0a0a0a; padding: 4px; border-radius: 4px; font-family: monospace;
        }
        .uvs-actions { display: flex; gap: 8px; margin-top: 5px; }
        .uvs-btn {
            border: none; padding: 8px 0; border-radius: 4px; cursor: pointer;
            font-size: 11px; font-weight: 700; flex: 1; transition: all 0.2s;
            display: flex; align-items: center; justify-content: center; gap: 5px; color: #fff; text-transform: uppercase;
        }
        .uvs-btn:hover { filter: brightness(1.2); }
        .uvs-copy-btn { background-color: #333; border: 1px solid #555; }
        .uvs-play-btn { background-color: #2ea043; } 
        .uvs-turbo-btn { background-color: #e63946; box-shadow: 0 2px 5px rgba(230, 57, 70, 0.4); } 
        .uvs-dl-btn { background-color: #f39c12; } 

        .uvs-progress-wrapper { display: none; margin-top: 8px; background: #111; padding: 8px; border-radius: 4px; }
        .uvs-status-text { font-size: 10px; color: #aaa; margin-bottom: 4px; display: block; }
        .uvs-progress-container {
            height: 10px; background: #333; border-radius: 5px; overflow: hidden; position: relative;
        }
        .uvs-progress-bar {
            height: 100%; background: linear-gradient(90deg, #e63946, #ff4757); width: 0%; transition: width 0.1s;
        }

        .uvs-badge {
            position: fixed;
            top: 10px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(20, 20, 20, 0.95);
            border: 1px solid #444;
            color: #fff;
            padding: 6px 16px;
            border-radius: 20px;
            display: flex;
            justify-content: center;
            align-items: center;
            font-weight: 600;
            font-size: 13px;
            cursor: pointer;
            z-index: 2147483646;
            box-shadow: 0 4px 15px rgba(0,0,0,0.5);
            display: none;
            backdrop-filter: blur(5px);
            transition: top 0.3s;
        }
        .uvs-badge:hover { background: #333; top: 12px; }
        .uvs-badge span { color: #e63946; margin-left: 5px; font-weight: 800; }
        
        #uvs-list::-webkit-scrollbar { width: 6px; }
        #uvs-list::-webkit-scrollbar-track { background: #0f0f0f; }
        #uvs-list::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }
    `);

    // --- UI CREATION ---
    const container = document.createElement('div');
    container.id = 'uvs-container';
    container.innerHTML = `
        <div id="uvs-header">
            <span>Video Sniffer Ultimate</span>
            <span id="uvs-close">×</span>
        </div>
        <div id="uvs-list"></div>
    `;
    document.documentElement.appendChild(container);

    const badge = document.createElement('div');
    badge.className = 'uvs-badge';
    badge.innerHTML = 'VIDEO: <span id="uvs-badge-count">0</span>';
    document.documentElement.appendChild(badge);

    // Event Listeners
    document.getElementById('uvs-close').addEventListener('click', () => {
        container.style.display = 'none';
        if (FOUND_URLS.size > 0) badge.style.display = 'flex';
    });

    badge.addEventListener('click', () => {
        container.style.display = 'flex';
        badge.style.display = 'none';
    });

    // --- METADATA EXTRACTION ---
    function getPageMetadata() {
        // 1. Cerca Open Graph Title (spesso il più accurato)
        let title = document.querySelector('meta[property="og:title"]')?.content;
        
        // 2. Se manca, cerca H1
        if (!title) {
            const h1 = document.querySelector('h1');
            if (h1) title = h1.innerText;
        }

        // 3. Fallback sul titolo pagina
        if (!title) title = document.title;

        // Pulizia (Rimuove suffissi comuni di siti streaming)
        if (title) {
            title = title.replace(/\s[-|]\s?(Guarda|Streaming|Watch).*/i, '')
                         .replace(/\s[-|]\s?Community.*/i, '')
                         .trim();
        }

        return title || "Video";
    }

    // --- PROBE URL (Analisi tecnica) ---
    async function probeUrl(url, type) {
        if (type !== 'M3U8' && type !== 'HLS') return { resolution: null, ext: 'mp4' };

        return new Promise(resolve => {
            GM_xmlhttpRequest({
                method: "GET",
                url: url,
                onload: (res) => {
                    const text = res.responseText;
                    let info = { resolution: null, ext: 'ts' };
                    
                    // Cerca la risoluzione più alta nel Master Playlist
                    if (text.includes('RESOLUTION=')) {
                        const resolutions = text.match(/RESOLUTION=(\d+x\d+)/g);
                        if (resolutions) {
                            // Prendi l'ultima (spesso la più alta) o parsa
                            const lastRes = resolutions[resolutions.length - 1].split('=')[1];
                            info.resolution = lastRes;
                        }
                    }
                    resolve(info);
                },
                onerror: () => resolve({ resolution: null })
            });
        });
    }

    // --- FUNZIONI UTILI ---
    function gmFetch(url, isBinary = false) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: "GET",
                url: url,
                responseType: isBinary ? 'arraybuffer' : 'text',
                onload: (res) => {
                    if (res.status >= 200 && res.status < 300) resolve(res.response);
                    else reject(new Error(res.statusText));
                },
                onerror: (err) => reject(err)
            });
        });
    }

    async function downloadHLS(url, progressBar, statusText, filename) {
        try {
            statusText.innerText = "Analisi playlist...";
            let manifestText = await gmFetch(url);
            let baseUrl = url.substring(0, url.lastIndexOf('/') + 1);

            if (manifestText.includes('#EXT-X-STREAM-INF')) {
                const streamMatch = manifestText.match(/^(?!#)(.*\.m3u8)$/m);
                if (streamMatch) {
                    let subUrl = streamMatch[1].trim();
                    if (!subUrl.startsWith('http')) subUrl = baseUrl + subUrl;
                    return downloadHLS(subUrl, progressBar, statusText, filename);
                }
            }

            const lines = manifestText.split('\n');
            let segments = [];
            lines.forEach(line => {
                line = line.trim();
                if (line && !line.startsWith('#')) {
                    if (line.startsWith('http')) segments.push(line);
                    else segments.push(baseUrl + line);
                }
            });

            if (segments.length === 0) throw new Error("Nessun segmento trovato");

            statusText.innerText = `Download di ${segments.length} segmenti...`;
            const totalSegments = segments.length;
            let downloadedCount = 0;
            const chunks = new Array(totalSegments);
            
            const downloadSegment = async (index) => {
                try {
                    const buffer = await gmFetch(segments[index], true);
                    chunks[index] = new Uint8Array(buffer);
                    downloadedCount++;
                    const percent = Math.round((downloadedCount / totalSegments) * 100);
                    progressBar.style.width = percent + '%';
                    statusText.innerText = `Download: ${percent}% (${downloadedCount}/${totalSegments})`;
                } catch (e) { }
            };

            const concurrency = 6;
            for (let i = 0; i < totalSegments; i += concurrency) {
                const batch = [];
                for (let j = 0; j < concurrency && (i + j) < totalSegments; j++) {
                    batch.push(downloadSegment(i + j));
                }
                await Promise.all(batch);
            }

            statusText.innerText = "Unione file...";
            let totalLength = 0;
            chunks.forEach(chunk => { if(chunk) totalLength += chunk.length; });
            const mergedArray = new Uint8Array(totalLength);
            let offset = 0;
            chunks.forEach(chunk => {
                if (chunk) {
                    mergedArray.set(chunk, offset);
                    offset += chunk.length;
                }
            });

            const blob = new Blob([mergedArray], { type: 'video/mp4' });
            const blobUrl = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = filename; // Usa il nome pulito
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(blobUrl);

            statusText.innerText = "Fatto! File salvato.";
            statusText.style.color = "#2ea043";

        } catch (e) {
            statusText.innerText = "Errore: " + e.message;
            statusText.style.color = "#e63946";
        }
    }

    // --- UI LOGIC ---
    async function addVideoToUI(url, sourceMethod) {
        if (FOUND_URLS.has(url)) return;
        FOUND_URLS.add(url);

        const badgeCount = document.getElementById('uvs-badge-count');
        badgeCount.innerText = FOUND_URLS.size;
        if (FOUND_URLS.size === 1) document.querySelector('.uvs-badge').style.display = 'flex';

        let type = getExtension(url);
        const isHls = url.includes('.m3u8') || type === 'HLS' || type === 'M3U8';
        
        // RECUPERA METADATI
        const pageTitle = getPageMetadata();
        let displayRes = "";

        const item = document.createElement('div');
        item.className = 'uvs-item';

        // Placeholder UI
        let actionsHtml = `
            <button class="uvs-btn uvs-play-btn"><span>&#9658;</span> PLAY</button>
            <button class="uvs-btn uvs-copy-btn"><span>&#128203;</span> COPIA</button>
        `;

        if (isHls) {
            actionsHtml += `<button class="uvs-btn uvs-turbo-btn"><span>&#9889;</span> SCARICA (Turbo)</button>`;
        } else {
            actionsHtml += `<button class="uvs-btn uvs-dl-btn"><span>&#11015;</span> SCARICA</button>`;
        }

        item.innerHTML = `
            <div class="uvs-meta-header">
                <span class="uvs-type">${isHls ? 'M3U8 / HLS' : type}</span>
                <span style="font-size:9px; color:#555;">${sourceMethod}</span>
            </div>
            
            <!-- INFO ROW (Metadata) -->
            <div class="uvs-info-row">
                <span class="uvs-info-title" title="${pageTitle}">${pageTitle}</span>
                <span class="uvs-info-res" id="res-${FOUND_URLS.size}">...</span>
            </div>

            <div class="uvs-url" title="${url}">${url}</div>
            <div class="uvs-actions">${actionsHtml}</div>
            
            <div class="uvs-progress-wrapper">
                <span class="uvs-status-text">In attesa...</span>
                <div class="uvs-progress-container"><div class="uvs-progress-bar"></div></div>
            </div>
        `;

        // ACTIONS
        const playBtn = item.querySelector('.uvs-play-btn');
        playBtn.onclick = () => openAdvancedPlayer(url, isHls);

        const copyBtn = item.querySelector('.uvs-copy-btn');
        copyBtn.onclick = () => { GM_setClipboard(url); const t=copyBtn.innerHTML; copyBtn.innerText="OK!"; setTimeout(()=>copyBtn.innerHTML=t, 1000); };

        const turboBtn = item.querySelector('.uvs-turbo-btn');
        if (turboBtn) {
            turboBtn.onclick = () => {
                const wrapper = item.querySelector('.uvs-progress-wrapper');
                const bar = item.querySelector('.uvs-progress-bar');
                const stat = item.querySelector('.uvs-status-text');
                wrapper.style.display = 'block';
                turboBtn.disabled = true;
                turboBtn.style.opacity = '0.5';
                downloadHLS(url, bar, stat, `${pageTitle}.mp4`);
            };
        }

        const dlBtn = item.querySelector('.uvs-dl-btn');
        if (dlBtn) {
            dlBtn.onclick = () => {
                const finalName = `${pageTitle}.mp4`;
                if (typeof GM_download !== 'undefined') {
                    GM_download({ url: url, name: finalName, saveAs: true });
                } else {
                    const a = document.createElement('a');
                    a.href = url; a.download = finalName; a.target = '_blank';
                    document.body.appendChild(a); a.click(); document.body.removeChild(a);
                }
            };
        }

        document.getElementById('uvs-list').prepend(item);

        // PROBE ASYNC (Aggiorna UI dopo)
        if(isHls) {
            probeUrl(url, 'M3U8').then(info => {
                const resSpan = item.querySelector('.uvs-info-res');
                if(info.resolution) resSpan.innerText = info.resolution;
                else resSpan.innerText = 'Auto';
            });
        } else {
            item.querySelector('.uvs-info-res').innerText = type;
        }
    }

    function openAdvancedPlayer(url, isHls) {
        const playerHtml = `<!DOCTYPE html><html lang="it"><head><meta charset="UTF-8"><title>Player</title><link rel="stylesheet" href="https://cdn.plyr.io/3.7.8/plyr.css" /><style>html,body{margin:0;width:100%;height:100vh;background:#000;overflow:hidden;font-family:sans-serif}.container{width:100vw;height:100vh;display:flex;align-items:center;justify-content:center}.plyr{width:100%!important;height:100%!important}video{width:100%!important;height:100%!important;object-fit:contain!important}.buffer-monitor{position:absolute;top:15px;left:15px;z-index:100;background:rgba(0,0,0,0.6);padding:5px 10px;border-radius:5px;color:#fff;font-size:14px;font-weight:bold;font-family:monospace;border:1px solid rgba(255,255,255,0.2);pointer-events:none}.buffer-monitor span{color:#4db8ff}</style></head><body><div class="buffer-monitor">BUFFER: <span id="buf-val">0s</span></div><div class="container"><video id="player" controls crossorigin playsinline autoplay><source src="${url}" type="${isHls?'application/x-mpegURL':'video/mp4'}"/></video></div><script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script><script src="https://cdn.plyr.io/3.7.8/plyr.polyfilled.js"></script><script>document.addEventListener('DOMContentLoaded',()=>{const v=document.getElementById('player');const b=document.getElementById('buf-val');const s="${url}";const o={autoplay:true,ratio:null};setInterval(()=>{if(!v)return;const t=v.currentTime,f=v.buffered;let a=0;for(let i=0;i<f.length;i++)if(f.start(i)<=t+0.5&&f.end(i)>=t)a=f.end(i)-t;b.innerText=a.toFixed(1)+'s';b.style.color=a>30?'#2ea043':(a>5?'#f1c40f':'#e74c3c')},500);if(Hls.isSupported()&&(${isHls}||s.includes('.m3u8'))){const h=new Hls({maxBufferLength:1800,maxMaxBufferLength:3600,maxBufferSize:3000*1000*1000});h.loadSource(s);h.attachMedia(v);h.on(Hls.Events.MANIFEST_PARSED,()=>new Plyr(v,o));}else{new Plyr(v,o);}});</script></body></html>`;
        const blob = new Blob([playerHtml], { type: 'text/html' });
        window.open(URL.createObjectURL(blob), '_blank');
    }

    function getExtension(url) {
        try {
            const path = new URL(url).pathname;
            const ext = path.split('.').pop();
            if (ext && ext.length < 5) return ext.toUpperCase();
            if (url.includes('.m3u8')) return 'HLS';
            return 'VIDEO';
        } catch (e) { return 'VIDEO'; }
    }

    // --- SNIFFER ENGINE ---
    const originalOpen = XMLHttpRequest.prototype.open;
    const originalSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open = function(method, url) { this._uvs_url = url; return originalOpen.apply(this, arguments); };
    XMLHttpRequest.prototype.send = function() {
        if (this._uvs_url && isValidVideoUrl(this._uvs_url)) addVideoToUI(this._uvs_url, 'XHR');
        this.addEventListener('load', function() {
            if (this._uvs_url && (this._uvs_url.includes('api') || this._uvs_url.includes('graphql'))) {
                try {
                    const urls = this.responseText.match(/https?:\/\/[^"']+\.(mp4|m3u8)[^"']*/g);
                    if (urls) urls.forEach(u => addVideoToUI(u.replace(/\\u0026/g, '&').replace(/\\/g, ''), 'API'));
                } catch(e) {}
            }
        });
        return originalSend.apply(this, arguments);
    };

    const originalFetch = window.fetch;
    window.fetch = async function(...args) {
        const url = args[0] instanceof Request ? args[0].url : args[0];
        if (url && isValidVideoUrl(url)) addVideoToUI(url, 'FETCH');
        return originalFetch(...args);
    };

    function isValidVideoUrl(url) {
        if (!url || typeof url !== 'string' || url.startsWith('blob:') || url.length > 2000) return false;
        if (IGNORE_PATTERNS.some(pattern => url.includes(pattern))) return false;
        return VALID_EXTENSIONS.some(ext => url.includes(ext)) || url.includes('master.m3u8') || url.includes('manifest') || url.includes('.m3u8');
    }

    const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            mutation.addedNodes.forEach(node => {
                if (node.tagName === 'VIDEO' && node.src) addVideoToUI(node.src, 'DOM');
            });
        });
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });

})();
