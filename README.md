# UTube - YouTube Downloader

Production-ready YouTube downloader with ultra-fast parallel downloads.

## Setup

1. Install dependencies:
```
npm install
```

2. Ensure `yt-dlp.exe` is in the root directory

3. Ensure FFmpeg binaries are in the `bin` folder:
   - `bin/ffmpeg.exe`
   - `bin/ffprobe.exe`

## Run

```
npm start
```

## Build

```
npm run build
```

Outputs to `dist/` folder.

## Features

- MP3/MP4 downloads
- Quality selection (360p-4K, 64-320kbps)
- Real-time progress tracking
- Parallel fragment downloads
- Optimized performance
- Secure IPC architecture
