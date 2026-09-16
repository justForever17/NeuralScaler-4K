# NeuralScaler 4K (DLSS 5)

[English](#english) | [中文说明](#chinese)

---

<a name="chinese"></a>
## 中文说明

NeuralScaler 4K 是基于 NVIDIA DLSS 5（深度学习超分辨率 5 代）神经重绘技术开发的离线高性能 4K 视频超分辨率工作站。项目集成了 DLSS 5 硬件加速管线、时空运动矢量光流推断、动态显存保护机制以及硬件级双源锁步对比播放器，专为高画质、低延迟的本地化视频重绘场景设计。

### 核心技术架构与特性

1. **基于 NVIDIA DLSS 5 的神经重绘与硬件超分**
   - 深度集成 NVIDIA DLSS 5 神经超分运行时（NVNGX 原生动态库 `nvngx_dlss.dll`、`nvngx_dlssd.dll`、`nvngx_dlssnr.dll`）。
   - 结合硬件级 Tensor Core 与光流加速器（Optical Flow Accelerator, OFA），利用多帧时域相关性与亚像素运动矢量，将低分辨率输入（540p / 720p / 1080p）精准重建至 4K 极清视频。
   - 相比传统双三次插值或常规深度学习放大，DLSS 5 能有效消除闪烁与伪影，显著提升细密纹理与运动边缘的保真度。

2. **流式分块处理与显存熔断保护**
   - 具备流式分块分片处理管道与实时显存熔断感知机制，在持续大吞吐超分任务中稳定运行，杜绝 CUDA 显存溢出（Out of Memory）异常。
   - 支持主流 NVIDIA GeForce RTX 系列独立显卡，自适应匹配物理计算单元与显存配置。

3. **硬件级锁步对比播放器 (Hover Wipe Player)**
   - 搭载连续自适应锁步同步引擎（Phase-Locked Loop），通过实时毫秒级相位误差反馈微调播放倍率，杜绝高码率 4K 重构流与原片之间的时序漂移。
   - 交互式无级卷帘对比与定格比对支持，实现 $dx=0, dy=0$ 的像素级物理对齐与实时细节反差校验。

4. **进程生命周期闭环托管**
   - 具备前端心跳探测与视窗关闭信标，客户端关闭即刻联动安全销毁后台核心服务与控制台进程，确保运行环境整洁无残留。

---

### 系统要求

- **操作系统**: Windows 10 / Windows 11 64 位
- **显卡**: NVIDIA GeForce RTX 系列独立显卡
- **驱动要求**: NVIDIA 驱动版本 >= 535.00
- **浏览器**: Microsoft Edge（系统内置）

---

### 快速上手

#### 方式 A：单文件安装向导（推荐）
1. 从 Releases 页面下载 `NeuralScaler-4K-Setup-v2.2.0.exe`。
2. 双击运行安装程序，按提示完成向导式安装。
3. 自动生成桌面高清图标快捷方式，并自动集成 Windows 资源管理器右键快捷菜单（支持在任意 `.mp4` / `.mov` / `.mkv` 视频上右键直接调用超分）。

#### 方式 B：便携绿色版运行（免安装）
1. 从 Releases 页面下载 `NeuralScaler-4K-Portable-windows-x64.zip` 并解压。
2. 双击解压目录中的 `NeuralScaler.bat` 即可直接启动引擎并唤起独立工作站视窗。

#### 方式 C：源码构建与本地运行
```powershell
# 1. 克隆代码仓库
git clone https://github.com/justForever17/NeuralScaler-4K.git
cd NeuralScaler-4K

# 2. 安装依赖并构建前端
npm install
npm run build

# 3. 运行服务与视窗
python server.py
```

---

<a name="english"></a>
## English

NeuralScaler 4K is an offline, high-performance 4K video super-resolution workstation developed upon NVIDIA DLSS 5 (Deep Learning Super Sampling 5) neural reconstruction technology. It integrates native DLSS 5 hardware pipelines, temporal-spatial motion vector inference, dynamic VRAM safeguard mechanisms, and a frame-locked dual-source comparison player.

### Architecture & Key Features

- **NVIDIA DLSS 5 Neural Reconstruction**: Harnesses native NVNGX runtimes (`nvngx_dlss.dll`, `nvngx_dlssd.dll`, `nvngx_dlssnr.dll`) alongside Tensor Core acceleration and Optical Flow inference to accurately reconstruct low-resolution inputs into ultra-clear 4K videos with minimal temporal artifacts.
- **VRAM Safeguard & Chunked Streaming**: Robust stream chunking and continuous hardware telemetry prevent CUDA Out-of-Memory faults during intensive 4K reconstruction workloads across NVIDIA GeForce RTX series GPUs.
- **Frame-Locked Comparison Player**: Phase-locked loop synchronization dynamically compensates for browser decoding disparities between original footage and high-bitrate 4K exports, guaranteeing strict $dx=0, dy=0$ spatial alignment and zero temporal drift.
- **Automated Lifecycle Management**: Automatic cleanup of backend server and console processes upon client exit.

---

### License

This project is licensed under the [MIT License](LICENSE).
