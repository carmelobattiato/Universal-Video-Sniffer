# 📺 Universal Video Sniffer


**Universal Video Sniffer** is an advanced **Tampermonkey UserScript** designed to intercept, play, and download video streams from almost any website, with a strong focus on **active superbuffering and real-time buffer control**.  
It is the result of an in-depth analysis and enhancement of the original extension’s capabilities, engineered to **maximize playback stability** by aggressively preloading media during playback and exposing precise buffer metrics (in seconds). This allows users to pause, accumulate buffer, and resume viewing without interruptions, even on platforms known for unstable or throttled delivery — including complex streaming sites such as *Streaming Community* — while maintaining **high performance** without relying on heavy browser plugins.


---

## 🛠️ Installation Instructions

### 1. Prerequisites

Make sure you have a UserScript manager installed in your browser:

- **Chrome / Edge / Brave**: Tampermonkey  
- **Firefox**: Tampermonkey or Greasemonkey  

---

### 2. Script Installation

1. Click the **Tampermonkey** icon in your browser toolbar  
2. Select **“Create a new script”**  
3. Remove all default code from the editor  
4. Copy the **entire v3.1 script code** provided previously and paste it into the editor  
5. Go to **File → Save** (or press `Ctrl + S`)  

---

### 3. Initial Configuration (CORS)

On the first use of the **“DOWNLOAD (Turbo)”** feature, Tampermonkey will display a security prompt requesting access to external domains.

👉 Select **“Always allow”** to enable background downloading of video segments.

---

## ✨ Features

| Feature | Description |
|--------|-------------|
| **Universal Sniffer** | Detects video streams via `fetch`, `XMLHttpRequest`, and real-time DOM scanning |
| **Turbo Downloader** | Downloads M3U8 streams in parallel (6 simultaneous segments) and merges them into a single file |
| **Advanced Player** | Opens videos in a dedicated player window with professional controls (Plyr) |
| **Superbuffer** | Actively forces aggressive buffering **during playback** to preload large portions of the stream and avoid server-side stalls |
| **Buffer Monitor** | Displays the **exact buffered time in seconds/minutes**, allowing users to pause playback and accumulate buffer for smoother performance |
| **Copy Link** | Instantly copies the media source URL to the clipboard |

---

## 🖥️ User Interface (UI)

The script injects two main UI elements into the webpage:

### 🔹 Top-Center Badge
A small dark rectangle positioned **at the top center of the page**, showing the number of detected videos.  
It is carefully designed **not to obstruct** native play buttons or site menus.

<img width="176" height="103" alt="image" src="https://github.com/user-attachments/assets/d4181c96-184f-4e3e-9b68-11ad5ca4ec75" />

---

### 🔹 Control Panel
Clicking the badge opens the video list with the following actions:

- 🟢 **PLAY** – Launches the advanced player with autoplay and buffer monitoring  
- ⚪ **COPY** – Copies the file or playlist URL  
- 🔴 **DOWNLOAD (Turbo)** – Available for M3U8 streams, with progress bar and segment merging  
- 🟠 **DOWNLOAD** – Available for direct MP4 / WebM files  

<img width="515" height="464" alt="image" src="https://github.com/user-attachments/assets/f579efb6-83aa-421e-9cf1-7228bcd27ce9" />

---

## 🔍 Technical Function Overview

### 🧠 Sniffer Engine

The script leverages **Monkey Patching** on native browser APIs:

- **`XMLHttpRequest.prototype.open/send`**  
  Intercepts asynchronous requests and inspects JSON responses to extract hidden media URLs  
  (commonly used by platforms such as Twitter or Instagram)

- **`window.fetch`**  
  Monitors modern network requests to detect `.mp4`, `.m3u8`, and other media resources

- **`MutationObserver`**  
  Continuously scans the DOM to detect `<video>` elements dynamically injected at runtime

---

### 🚀 `downloadHLS(url, ...)`

The **Turbo Download** engine works as follows:

1. Parses the `.m3u8` playlist  
2. Maps all `.ts` segments  
3. Uses `GM_xmlhttpRequest` to bypass browser CORS restrictions  
4. Downloads segments in controlled batches to avoid memory saturation  
5. Merges all segments into a single output `Blob`

---

### 🎬 `openAdvancedPlayer(url, isHls)`

Generates a **virtual HTML page (Blob URL)** embedding:

- **HLS.js** – Streaming playback and decoding  
- **Plyr.js** – Modern, clean, and responsive user interface  
- **Buffer Monitor** –  
  Internal logic polling `video.buffered` every 500 ms to calculate the **exact amount of buffered media (in seconds)** ahead of the current playback position.

This enables a **smart superbuffering strategy**:  
users can intentionally **pause playback**, allow the buffer to grow, and resume viewing only when sufficient buffer is available — significantly improving stability on slow, throttled, or unreliable streaming servers.

---

### 🧩 Smart Superbuffer Strategy

Unlike standard video players, Universal Video Sniffer gives the user **direct control over buffering behavior**.

By continuously displaying the real buffered duration, the player allows users to:
- Pause the video to accumulate additional buffer
- Prevent playback interruptions caused by unstable or overloaded servers
- Resume playback with optimal buffer margin and smoother performance

This approach is particularly effective when dealing with:
- Non-optimized CDNs  
- Rate-limited streaming platforms  
- Long-form content served by fragile backends  

---

## ⚠️ Legal Notes and Limitations

- **M3U8 → MP4**  
  Turbo Download saves the output using the `.mp4` extension, but technically the container is **MPEG-TS**.  
  If your default media player does not support it, use **VLC Media Player**.

- **Resource Usage**  
  The **Superbuffer** feature aggressively loads video data into RAM.  
  Close the player tab after viewing to release system memory.

- **Terms of Use**  
  Use this script **exclusively for personal backup purposes** and in full compliance with applicable copyright laws.

---

## 📌 Disclaimer

This script was created for **advanced analysis of web-based multimedia streams** and for educational or technical purposes only.  
The author assumes no responsibility for improper or illegal usage.

---
