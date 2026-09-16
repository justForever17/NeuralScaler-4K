# NeuralScaler 4K (DLSS 5)

[English](#english) | [中文说明](#chinese)

---

<a name="chinese"></a>
## 中文说明

NeuralScaler 4K 是一款专为消费级显卡（特别是 8GB 显存设备，如 RTX 4070 Laptop / 4060 / 3070）深度优化的轻量级离线 4K 视频神经重绘与超分辨率工作站。它集成了硬件级视频超分引擎、分块显存熔断保护机制以及毫秒级帧锁同步的双源对比播放器，提供兼具工业级稳定度与现代化质感的操作体验。

### 核心特性

1. **8GB 显存极致保护与硬件超分**
   - 采用分块流式处理机制与动态显存熔断监测，将 4K 重绘全流程显存峰值严格压制在 6.2GB 以内，彻底杜绝 CUDA Out of Memory (OOM) 崩溃。
   - 深度集成硬件级超分与运动矢量光流推断，大幅提升低清视频（540p / 720p / 1080p）至 4K 极清画质的重绘效率与保真度。

2. **硬件级锁步对比播放器 (Hover Wipe Player)**
   - 搭载连续自适应锁步同步引擎（Phase-Locked Loop），通过实时毫秒级相位误差反馈微调播放倍率，杜绝高码率 4K 流与低码率原片之间的时序漂移。
   - 交互式无级卷帘对比与定格比对支持，实现 $dx=0, dy=0$ 的像素级物理对齐与实时细节明暗反差校验。

3. **Windows 11 Fluent 现代交互与原生顶栏沉浸适配**
   - 遵循 Windows 11 Fluent Design 规范，全界面采用矢量精绘 SVG 图标，杜绝 Emoji 表情符号。
   - 动态拉取物理 GPU 设备拓扑与显存规格，提供硬件级下拉切换。
   - 通过 Windows DWMAPI (`DwmSetWindowAttribute`) 与 Edge 窗口元信息联动，实现原生操作系统级顶栏按钮（最小化、最大化、关闭）与亮色/暗色主题无缝同步切换。

4. **进程生命周期闭环托管**
   - 具备前端心跳探测（Heartbeat）与关闭信标（Beacon），视窗关闭即刻联动清理后台服务与终端进程，杜绝控制台孤儿残留。

---

### 系统要求

- **操作系统**: Windows 10 / Windows 11 64位
- **显卡**: NVIDIA GeForce RTX 20 / 30 / 40 系列独立显卡（推荐 8GB 或以上显存）
- **驱动要求**: NVIDIA 驱动版本 >= 535.00
- **浏览器**: Microsoft Edge（Windows 默认内置）

---

### 快速上手

#### 方式 A：便携绿色包运行（免安装）
1. 从 Releases 页面下载 `NeuralScaler-4K-Portable-v*.zip` 并解压。
2. 双击解压目录中的 `NeuralScaler.bat` 即可自动启动工作站视窗。

#### 方式 B：源码构建与本地运行
```powershell
# 1. 克隆代码仓库
git clone https://github.com/justForever17/NeuralScaler-4K.git
cd NeuralScaler-4K

# 2. 安装前端依赖并构建静态资产
npm install
npm run build

# 3. 安装 Python 核心依赖（如已具备标准环境可跳过）
pip install -r requirements.txt # 或使用环境内 Python

# 4. 运行服务与视窗
python server.py
```

---

<a name="english"></a>
## English

NeuralScaler 4K is an offline, lightweight 4K video super-resolution workstation specifically engineered and optimized for consumer GPUs with 8GB VRAM (such as NVIDIA RTX 4070 Laptop, RTX 4060, and RTX 3070). Featuring hardware-accelerated neural reconstruction, robust VRAM circuit breaker protection, and a frame-locked dual-source comparison player, it delivers industrial-grade stability with a modern, native Windows 11 desktop experience.

### Key Highlights

- **VRAM Safeguard for 8GB Cards**: Streamlined chunking and hardware-level telemetry ensure peak VRAM usage remains strictly under 6.2GB during 4K neural reconstruction, eliminating Out-of-Memory faults.
- **Frame-Locked Comparison Player**: Phase-locked loop synchronization dynamically compensates for decoding latency between raw inputs and high-bitrate 4K streams, ensuring exact lockstep alignment without visual temporal drift.
- **Native Windows 11 Integration**: Pure SVG iconography, discrete GPU selector, and seamless DWMAPI titlebar skin switching (dark and light modes).
- **Automated Lifecycle Management**: Automatic cleanup of background server and terminal processes upon window exit.

---

### License

This project is licensed under the [MIT License](LICENSE).
