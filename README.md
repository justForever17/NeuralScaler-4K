# NeuralScaler 4K (DLSS 5)

<p align="center">
  <img src="public/app.png" width="120" height="120" alt="NeuralScaler 4K Logo" style="border-radius: 24px;" />
</p>

<p align="center">
  <b>English</b> | <a href="README-ZH.md">简体中文</a>
</p>

---

NeuralScaler 4K is an offline, high-performance 4K video super-resolution workstation developed upon NVIDIA DLSS 5 (Deep Learning Super Sampling 5) neural reconstruction technology. It integrates native DLSS 5 hardware pipelines, temporal-spatial motion vector inference, cross-platform color consistency management, dynamic VRAM safeguard mechanisms, and a frame-locked dual-source comparison player.

### Architecture & Key Features

- **NVIDIA DLSS 5 Neural Reconstruction**: Harnesses native NVNGX runtimes (`nvngx_dlss.dll`, `nvngx_dlssd.dll`, `nvngx_dlssnr.dll`) alongside Tensor Core acceleration and Optical Flow inference to accurately reconstruct low-resolution inputs into ultra-clear 4K videos with minimal temporal artifacts.
- **Cross-Platform ColorSync Engine**: Eliminates the persistent industry dilemma where 4K upscaled videos look natural on PC monitors but heavily oversaturated and red-tinted on mobile OLED (Display P3) displays. Performs automated ITU-R BT.601 to BT.709 color matrix conversion (`colormatrix=bt601:bt709`) and enforces broadcast-safe Limited Range (16-235) with strict VUI metadata, ensuring 100% truthful, neutral color and skin tones across iPhone, Android, and PC.
- **VRAM Safeguard & Chunked Streaming**: Robust stream chunking and continuous hardware telemetry prevent CUDA Out-of-Memory faults during intensive 4K reconstruction workloads across NVIDIA GeForce RTX series GPUs.
- **Frame-Locked Comparison Player**: Phase-locked loop synchronization dynamically compensates for browser decoding disparities between original footage and high-bitrate 4K exports, guaranteeing strict $dx=0, dy=0$ spatial alignment and zero temporal drift.

---

### System Requirements

- **Operating System**: Windows 10 / Windows 11 (64-bit)
- **GPU**: NVIDIA GeForce RTX Series / AMD Radeon (Dedicated VRAM >= 2GB)
- **Driver**: NVIDIA Driver >= 535.00
- **Webview Engine**: Microsoft Edge (Built-in)

---

### Quick Start

#### Method A: npm CLI (Headless Super-Resolution)
```bash
# Run immediately via npx without manual installation:
npx neuralscaler <input.mp4> --target 4K

# Or install globally and use the shorthand 'ns' command:
npm install -g neuralscaler
ns input.mp4 -o ./output_4k/ -t 4K -q FAITHFUL

# Or invoke directly via batch script:
ns.bat input.mp4 -t 4K
```

#### Method B: Standalone Installer (Recommended for Windows)
1. Download the latest `NeuralScaler-4K-Setup-v*.exe` from [Releases](https://github.com/justForever17/NeuralScaler-4K/releases).
2. Run the wizard setup to get desktop shortcuts and silent Windows Explorer context menu integration (`Right-click -> Super-resolve with NeuralScaler 4K`).

#### Method C: Portable Archive
1. Download and extract the latest `NeuralScaler-4K-Portable-windows-x64-v*.zip` from [Releases](https://github.com/justForever17/NeuralScaler-4K/releases).
2. Double-click `NeuralScaler.bat` to launch the engine and desktop interface (or use `ns.bat` from terminal).

#### Method D: Build from Source
```powershell
# 1. Clone repository
git clone https://github.com/justForever17/NeuralScaler-4K.git
cd NeuralScaler-4K

# 2. Install dependencies & build frontend
npm install
npm run build

# 3. Launch server & app window
python server.py
```

---

## Sponsor & Support

If you find NeuralScaler 4K valuable for your projects or workflows, consider supporting its continuous maintenance and compute resources!

<p align="center">
  <a href="https://afdian.com/a/justforever17" target="_blank">
    <img src="https://img.shields.io/badge/Sponsor-爱发电-946ce6?style=for-the-badge&logo=afdian&logoColor=white" alt="Sponsor via Afdian" />
  </a>
</p>

---

### License

This project is licensed under the [MIT License](LICENSE).
