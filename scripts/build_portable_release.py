import os
import sys
import shutil
import subprocess

PROJECT_ROOT = r"E:\comfyui\dlss5-super-resolution"
RELEASE_DIR = os.path.join(PROJECT_ROOT, "release", "NeuralScaler-4K-Portable")

def log(msg):
    print(f"[Build] {msg}")

def ensure_frontend_built():
    dist_dir = os.path.join(PROJECT_ROOT, "dist")
    index_html = os.path.join(dist_dir, "index.html")
    if not os.path.exists(index_html):
        log("Frontend dist not found, executing npm run build...")
        res = subprocess.run(["npm.cmd", "run", "build"], cwd=PROJECT_ROOT)
        if res.returncode != 0:
            raise RuntimeError("Frontend npm run build failed!")
    else:
        log("Verified frontend build exists in dist/")

def assemble_bundle():
    log(f"Target release directory: {RELEASE_DIR}")
    if os.path.exists(RELEASE_DIR):
        log("Cleaning previous release directory...")
        shutil.rmtree(RELEASE_DIR)
    os.makedirs(RELEASE_DIR, exist_ok=True)

    # 1. Copy dist/
    src_dist = os.path.join(PROJECT_ROOT, "dist")
    dst_dist = os.path.join(RELEASE_DIR, "dist")
    log(f"Copying {src_dist} -> {dst_dist}")
    shutil.copytree(src_dist, dst_dist)

    # 2. Copy server.py
    src_server = os.path.join(PROJECT_ROOT, "server.py")
    dst_server = os.path.join(RELEASE_DIR, "server.py")
    log(f"Copying {src_server} -> {dst_server}")
    shutil.copy2(src_server, dst_server)

    # 3. Copy bin/ (ffmpeg.exe, ffprobe.exe, nvngx_dlss*.dll)
    src_bin = os.path.join(PROJECT_ROOT, "bin")
    dst_bin = os.path.join(RELEASE_DIR, "bin")
    log(f"Copying binaries from {src_bin} -> {dst_bin}")
    os.makedirs(dst_bin, exist_ok=True)
    
    bin_files = ["ffmpeg.exe", "ffprobe.exe", "nvngx_dlss.dll", "nvngx_dlssd.dll", "nvngx_dlssnr.dll"]
    for bf in bin_files:
        s_file = os.path.join(src_bin, bf)
        if os.path.exists(s_file):
            d_file = os.path.join(dst_bin, bf)
            shutil.copy2(s_file, d_file)
            size_mb = os.path.getsize(d_file) / (1024 * 1024)
            log(f"  + Bundled: {bf} ({size_mb:.1f} MB)")
        else:
            log(f"  ! Warning: {bf} not found in {src_bin}")

    # 4. Generate NeuralScaler.vbs (Silent background launcher, zero cmd black window)
    vbs_content = '''Set WshShell = CreateObject("WScript.Shell")
strCurDir = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)
WshShell.CurrentDirectory = strCurDir

Set fso = CreateObject("Scripting.FileSystemObject")
pyPath = ""

If fso.FileExists(strCurDir & "\\python\\pythonw.exe") Then
    pyPath = strCurDir & "\\python\\pythonw.exe"
ElseIf fso.FileExists(strCurDir & "\\..\\..\\.venv\\Scripts\\pythonw.exe") Then
    pyPath = strCurDir & "\\..\\..\\.venv\\Scripts\\pythonw.exe"
ElseIf fso.FileExists(strCurDir & "\\..\\..\\.venv\\Scripts\\python.exe") Then
    pyPath = strCurDir & "\\..\\..\\.venv\\Scripts\\python.exe"
Else
    pyPath = "pythonw.exe"
End If

cmd = """" & pyPath & """ """ & strCurDir & "\\server.py"""
On Error Resume Next
WshShell.Run cmd, 0, False
If Err.Number <> 0 Then
    WshShell.Run "python.exe """ & strCurDir & "\\server.py""", 0, False
End If
'''
    vbs_path = os.path.join(RELEASE_DIR, "NeuralScaler.vbs")
    with open(vbs_path, "w", encoding="utf-8") as f:
        f.write(vbs_content)
    log("Created NeuralScaler.vbs (Silent Windows launcher)")

    # 5. Generate NeuralScaler.bat (Double click runner)
    bat_content = '''@echo off
cd /d "%~dp0"
start "" wscript.exe "%~dp0NeuralScaler.vbs"
'''
    bat_path = os.path.join(RELEASE_DIR, "NeuralScaler.bat")
    with open(bat_path, "w", encoding="utf-8") as f:
        f.write(bat_content)
    log("Created NeuralScaler.bat")

    # 6. Generate NeuralScaler-Debug.bat (Console mode for debugging)
    debug_bat = '''@echo off
chcp 65001 >nul
title NeuralScaler 4K - 控制台调试模式
echo ========================================================
echo   NeuralScaler 4K - DLSS 5 超分引擎 [控制台模式]
echo ========================================================
cd /d "%~dp0"

set PY_EXE=
if exist "python\\python.exe" (
    set "PY_EXE=python\\python.exe"
) else if exist "..\\..\\.venv\\Scripts\\python.exe" (
    set "PY_EXE=..\\..\\.venv\\Scripts\\python.exe"
) else (
    set "PY_EXE=python.exe"
)

echo [Info] 正在启动核心服务，使用的 Python: %PY_EXE%
"%PY_EXE%" server.py
pause
'''
    debug_bat_path = os.path.join(RELEASE_DIR, "NeuralScaler-Debug.bat")
    with open(debug_bat_path, "w", encoding="utf-8") as f:
        f.write(debug_bat)
    log("Created NeuralScaler-Debug.bat")

    # 7. Generate README.txt
    readme_content = '''========================================================
  NeuralScaler 4K - 便携独立运行版 (Portable Edition)
========================================================

【快速启动】
1. 双击 "NeuralScaler.bat" 或 "NeuralScaler.vbs"：
   静默启动后台服务并自动唤起独立的 4K 神经渲染纯净窗口。
2. 双击 "NeuralScaler-Debug.bat"：
   打开带命令行输出的控制台，可实时查看超分帧数、硬件占用日志。

【已打包依赖清单】
- Web 界面资产：dist/ (React 19 + Tailwind CSS + Fluent UI 风格)
- 核心引擎服务：server.py (纯 Python 标准库，无多余第三方包)
- 视频处理工具：bin/ffmpeg.exe, bin/ffprobe.exe (本地独立，不依赖系统环境变量)
- 神经超分库：bin/nvngx_dlss.dll, bin/nvngx_dlssd.dll, bin/nvngx_dlssnr.dll

【系统要求】
- 操作系统：Windows 10 / 11 (64位)
- 显卡：推荐 NVIDIA RTX 20/30/40 系列独立显卡 (已针对 8GB 显存显卡深度优化)
- 浏览器环境：内置调用 Microsoft Edge Application 模式 (沙箱隔离，阻断任何外部插件干扰)
'''
    readme_path = os.path.join(RELEASE_DIR, "README.txt")
    with open(readme_path, "w", encoding="utf-8") as f:
        f.write(readme_content)
    log("Created README.txt")

    log("Portable packaging complete!")

if __name__ == "__main__":
    ensure_frontend_built()
    assemble_bundle()
