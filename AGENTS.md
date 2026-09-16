# 【NeuralScaler-DLSS5】Agent 工作准则与规范绑定协议 (AGENTS.md)

> **生效范围**：本项目 (`E:\\comfyui\\dlss5-super-resolution`) 所有自主 Agent、Subagent 及开发者交互。  
> **核心哲学**：**规范先行 (Spec-First)、测试驱动交付 (Harness-Driven)、OFA硬件光流闭环 (Motion Vector Grounded)、144Hz解耦丝滑手感 (Decoupled Fluidity)**。

---

## 一、 Agent 执行流程与规范精准绑定矩阵 (Mandatory Binding Matrix)

任何 Agent 在介入本项目执行具体任务前，**必须且只能**严格遵循以下六步生命周期，并在每一步强制读取绑定的规范章节，严禁脱离文档盲目编码：

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ 步骤 1: 需求定位 ────> 必须读取 .agents/spec/requirements.md 对应业务章节   │
│ 步骤 2: 架构对齐 ────> 必须读取 .agents/spec/design.md 对应技术选型与接口   │
│ 步骤 3: 任务认领 ────> 必须读取 .agents/spec/tasks.md 对应 TASK 编号与 DoD   │
│ 步骤 4: 外科手术编码 ─> 仅修改当前任务直接相关的源文件，坚守 3.4GB 显存红线│
│ 步骤 5: 夹具套件验证 ─> 必须运行 tests/ 下所有测试用例，确保 100% 通过      │
│ 步骤 6: 任务状态闭环 ─> 验证无误后回写 tasks.md 更新进度状态与交付结果      │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 精准绑定映射表 (Traceability Enforcement)

| 实施任务领域 | 步骤 1：必须读取需求 (requirements.md) | 步骤 2：必须读取设计 (design.md) | 步骤 3：认领任务 (tasks.md) | 步骤 5：测试夹具与验收 (tests/) |
| :--- | :--- | :--- | :--- | :--- |
| **C++ 核心工程与 IPC** | 第一章 (产品愿景与定位) | 第一章 (技术栈选型与模块划分) | `TASK-001`, `TASK-002` | `tests/unit/test_ipc.py` |
| **NVDEC 硬件解码桥接** | 第一章 1.1 (管线总拓扑) | 第二章 (全零拷贝流转架构) | `TASK-101` | `tests/unit/test_nvdec_bridge.cpp` |
| **OFA 硬件光流加速器** | 第一章 1.1 (断点闭环 1) | 第二章 2.1 (OFA 架构) | `TASK-102` | `tests/unit/test_ofa_motion_vector.py` |
| **CS 线性化与去块滤波**| 第一章 1.1 (断点闭环 3) | 第一章 / 第二章 (Compute Shader) | `TASK-103` | `tests/unit/test_deblock_filter.cpp` |
| **DLSS 5 1080P 归一化** | 第一章 1.1 (断点闭环 2) | 第一章 (1080P 神经中间层) | `TASK-104` | `tests/e2e/test_neural_pass.cpp` |
| **RTX VSR 4K 与硬编**  | 第一章 1.1 (两阶段分层) | 第一章 / 第二章 2.3 (显存预算) | `TASK-105` | `tests/unit/test_color_and_container.py` |
| **faststart 与无损混流**| 第三章 3.0 (Windows 编码) | 第一章 (FFmpeg Muxer) | `TASK-106` | `tests/unit/test_color_and_container.py` |
| **Win11 Fluent 2 GUI** | 第二章 (现代产品形态) | 第一章 (Mica Alt 材质系统) | `TASK-201` | `tests/e2e/test_gui_startup.py` |
| **系统原生文件选择器** | 第二章 2.2 (杜绝手动打字) | 第一章 / 第二章 (原生对话框) | `TASK-202` | `tests/unit/test_native_dialog.py` |
| **智能输入与 480P 警示**| 第二章 2.0 / 第四章 (反例) | 第一章 (输入状态机判定设计) | `TASK-203` | `tests/negative/test_input_validation.py`|
| **144Hz 双速率擦除播放器**| 第二章 2.1 (FR-UI.1, FR-UI.2)| 第二章 2.2 (双速率解耦合成器) | `TASK-204` | `tests/unit/test_hover_wipe_decoupled.py` |
| **单击定格与滚轮穿梭** | 第二章 2.1 (FR-UI.3) | 第二章 2.2 (交互状态机) | `TASK-205` | `tests/unit/test_hover_wipe_decoupled.py` |
| **三级 Fallback 与冲突**| 第三章 3.1 (路径降级链条) | 第一章 (三级 Fallback 算法) | `TASK-301` | `tests/unit/test_fallback_and_paths.py` |
| **并发会话互斥管理**   | 第一章 1.1 (断点闭环 4) | 第三章 (SessionCoordinator) | `TASK-302` | `tests/unit/test_session_coordinator.py` |
| **四级极限场景主动熔断**| 第三章 3.2 (FR-CIRCUIT-BREAKER)| 第一章 (四级熔断看门狗) | `TASK-303` | `tests/unit/test_circuit_breaker.py` |
| **条件组合覆盖 (MCC) 测试**| 第四章 (覆盖测试标准) | 全文 | `TASK-TEST-01` | `tests/unit/`, `tests/negative/` |
| **黑盒 E2E 画质与性能**| 第四章 (黑盒交付门禁) | 全文 | `TASK-TEST-02` | `tests/e2e/` |
| **反例与极端故障注入** | 第四章 (反例门禁) | 第三章 3.2 (熔断机制) | `TASK-TEST-03` | `tests/negative/`, `tests/fixtures/` |
| **便携 EXE 与 WiX MSI** | 需求全文 / 打包规划 | 设计全文 (打包架构) | `TASK-401`, `TASK-402` | 双击直接运行、MSI 安装卸载无残留 |

---

## 二、 Agent 编码实施的铁律红线 (Operational Guardrails)

1. **绝对严禁在 2D 视频上无运动矢量硬跑时序 DLSS 5**：
   - 必须通过 NVIDIA OFA 硬件提取稠密运动矢量，杜绝动态画面产生鬼影拉丝与面部撕裂。
2. **绝对严禁单线程耦合鼠标悬停与视频渲染**：
   - Wipe 擦除合成器必须以显示器原生刷新率（144Hz+）解耦运行，视频渲染维持原片帧率（24/30fps），确保极致丝滑手感。
3. **4GB~8GB 显存预算（$\le 3.4	ext{GB}$）不可逾越**：
   - 导出与预览必须遵循会话互斥原则，导出期间预览自动降级为快照代理模式，严禁双硬解流并行爆显存。
4. **严禁在路径设置中使用纯文本框输入**：
   - 必须调用系统原生文件/目录选择器，且严格执行 Win32 宽字符与 UTF-8 互转。
5. **交付前必须 100% 通过 MCC 覆盖与全套夹具测试**：
   - 任何改动必须在 `tests/` 下提供真实的通过日志方可关闭任务。
