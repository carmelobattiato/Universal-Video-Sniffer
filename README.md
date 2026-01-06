# 📺 Universal Video Sniffer

**Universal Video Sniffer** is an advanced **Tampermonkey UserScript** designed to intercept, play, and download video streams from almost any website.  
It is the result of an in-depth analysis and enhancement of the original extension’s capabilities, optimized to deliver **high performance** without requiring heavy browser plugins.

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
|-------|------------|
| **Universal Sniffer** | Detects videos via `fetch`, `XMLHttpRequest`, and real-time DOM scanning |
| **Turbo Downloader** | Downloads M3U8 streams in parallel (6 simultaneous segments) and merges them into a single file |
| **Advanced Player** | Opens the video in a dedicated window with professional controls (Plyr) |
| **Superbuffer** | Forces aggressive pre-buffering to prevent playback stuttering |
| **Buffer Monitor** | Displays real-time buffered seconds/minutes ahead of playback |
| **Copy Link** | Instantly copies the source URL to the clipboard |

---

## 🖥️ User Interface (UI)

The script injects two main UI elements into the webpage:

### 🔹 Top-Center Badge
A small dark rectangle positioned **at the top center of the page**, showing the number of detected videos.  
It is designed **not to obstruct** play buttons or site menus.

<img width="176" height="103" alt="image" src="https://github.com/user-attachments/assets/d4181c96-184f-4e3e-9b68-11ad5ca4ec75" />

---

### 🔹 Control Panel
Clicking the badge opens the video list with the following actions:

- 🟢 **PLAY** – Launches the player with buffer monitoring and autoplay  
- ⚪ **COPY** – Copies the file or playlist URL  
- 🔴 **DOWNLOAD (Turbo)** – For M3U8 streams, with progress bar and segment merging  
- 🟠 **DOWNLOAD** – For direct MP4 / WebM files  

<img width="515" height="464" alt="image" src="https://github.com/user-attachments/assets/f579efb6-83aa-421e-9cf1-7228bcd27ce9" />

---

## 🔍 Technical Function Overview

### 🧠 Sniffer Engine

The script uses **Monkey Patching** on native browser APIs:

- **`XMLHttpRequest.prototype.open/send`**  
  Intercepts asynchronous requests and inspects JSON responses to extract hidden media URLs  
  (commonly used by platforms such as Twitter or Instagram)

- **`window.fetch`**  
  Monitors modern network requests to detect `.mp4`, `.m3u8`, and similar media resources

- **`MutationObserver`**  
  Continuously scans the DOM to detect `<video>` elements injected dynamically at runtime

---

### 🚀 `downloadHLS(url, ...)`

The **Turbo Download** engine:

1. Parses the `.m3u8` playlist  
2. Maps all `.ts` segments  
3. Uses `GM_xmlhttpRequest` to bypass CORS restrictions  
4. Downloads segments in controlled batches to avoid memory saturation  
5. Assembles the final output into a single `Blob`

---

### 🎬 `openAdvancedPlayer(url, isHls)`

Generates a **virtual HTML page (Blob URL)** embedding:

- **HLS.js** – Streaming playback and decoding  
- **Plyr.js** – Modern, clean, and responsive UI  
- **Buffer Monitor** –  
  Internal logic polling `video.buffered` every 500 ms to compute buffer lead time relative to current playback position

---

## ⚠️ Legal Notes and Limitations

- **M3U8 → MP4**  
  Turbo Download outputs a `.mp4` file, but technically the container is **MPEG-TS**.  
  If your default player does not support it, use **VLC Media Player**.

- **Resource Usage**  
  The **Superbuffer** feature aggressively loads data into RAM.  
  Close the player tab after viewing to release memory.

- **Terms of Use**  
  Use this script **only for personal backup purposes** and in compliance with applicable copyright laws.

---

## 📌 Disclaimer

This script was created for **advanced analysis of web-based multimedia streams** and for educational/technical purposes only.  
The author assumes no responsibility for misuse.

---
