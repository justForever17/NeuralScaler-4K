@echo off
chcp 65001 >nul
title NeuralScaler 4K - 超分渲染控制台
cd /d "%~dp0"

echo ========================================================
echo   NeuralScaler 4K - DLSS 5 神经视频超分引擎
echo ========================================================
echo.

set PY_EXE=
if exist "python\python.exe" (
    set "PY_EXE=python\python.exe"
) else if exist "..\..\.venv\Scripts\python.exe" (
    set "PY_EXE=..\..\.venv\Scripts\python.exe"
) else (
    set "PY_EXE=python.exe"
)

echo [Info] 启动环境: Windows 11 (x64)
echo [Info] Python 运行时: %PY_EXE%
echo [Info] 本地 Web 服务: http://127.0.0.1:1420
echo [Info] 正在启动核心服务并自动唤起独立应用窗口...
echo [Info] 请保持本控制台运行，关闭本窗口将终止超分任务。
echo ========================================================
echo.

"%PY_EXE%" server.py %*

echo.
echo [Info] 核心服务已退出。按任意键关闭窗口...
pause >nul
