@echo off
chcp 65001 >nul
title NeuralScaler 4K - DLSS 5 核心引擎服务 [运行中]
cd /d "%~dp0"

echo ==========================================================
echo   NeuralScaler-DLSS5 独立桌面超分工具 [Windows 11]
echo ==========================================================
echo 正在启动本地核心服务与硬件超分引擎...
echo 桌面视窗将自动唤起，运行期间请保持此终端窗口（最小化即可）。
echo ==========================================================
echo.

"E:\comfyui\.venv\Scripts\python.exe" server.py
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [错误] 核心引擎异常退出，退出码: %ERRORLEVEL%
    pause
)
