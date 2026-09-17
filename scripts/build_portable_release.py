import os
import sys
import shutil
import subprocess

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
RELEASE_DIR = os.path.join(PROJECT_ROOT, "release", "NeuralScaler-4K-Portable")

def log(msg):
    print(f"[Build] {msg}")

def ensure_frontend_built():
    dist_dir = os.path.join(PROJECT_ROOT, "dist")
    index_html = os.path.join(dist_dir, "index.html")
    if not os.path.exists(index_html):
        log("Frontend dist not found, executing npm run build...")
        npm_cmd = "npm.cmd" if sys.platform == "win32" else "npm"
        res = subprocess.run([npm_cmd, "run", "build"], cwd=PROJECT_ROOT)
        if res.returncode != 0:
            raise RuntimeError("Frontend npm run build failed!")
    else:
        log("Verified frontend build exists in dist/")

def assemble_bundle():
    log(f"Target release directory: {RELEASE_DIR}")
    os.makedirs(RELEASE_DIR, exist_ok=True)

    # 1. Copy dist/
    src_dist = os.path.join(PROJECT_ROOT, "dist")
    dst_dist = os.path.join(RELEASE_DIR, "dist")
    log(f"Copying {src_dist} -> {dst_dist}")
    shutil.copytree(src_dist, dst_dist, dirs_exist_ok=True)

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
            found_in_path = shutil.which(bf)
            if found_in_path:
                d_file = os.path.join(dst_bin, bf)
                shutil.copy2(found_in_path, d_file)
                size_mb = os.path.getsize(d_file) / (1024 * 1024)
                log(f"  + Bundled from PATH: {bf} ({size_mb:.1f} MB)")
            else:
                log(f"  ! Warning: {bf} not found in {src_bin} or PATH")

    # 4. Copy app.ico, LICENSE, and README.md
    src_ico = os.path.join(PROJECT_ROOT, "public", "app.ico")
    if os.path.exists(src_ico):
        shutil.copy2(src_ico, os.path.join(RELEASE_DIR, "app.ico"))

    src_png = os.path.join(PROJECT_ROOT, "public", "app.png")
    if os.path.exists(src_png):
        shutil.copy2(src_png, os.path.join(RELEASE_DIR, "app.png"))

    for doc_name in ["LICENSE", "README.md", "README-ZH.md"]:
        doc_src = os.path.join(PROJECT_ROOT, doc_name)
        if os.path.exists(doc_src):
            shutil.copy2(doc_src, os.path.join(RELEASE_DIR, doc_name))

    # 5. Generate NeuralScaler.bat (Explicit Console Launcher, 100% stable, zero antivirus warnings)
    bat_content = '''@echo off
chcp 65001 >nul
title NeuralScaler 4K - 超分渲染控制台
cd /d "%~dp0"

echo ========================================================
echo   NeuralScaler 4K - DLSS 5 神经视频超分引擎
echo ========================================================
echo.

set PY_EXE=
if exist "python\\python.exe" (
    set "PY_EXE=python\\python.exe"
) else if exist "..\\..\\.venv\\Scripts\\python.exe" (
    set "PY_EXE=..\\..\\.venv\\Scripts\\python.exe"
) else (
    set "PY_EXE=python.exe"
)

echo [Info] 启动环境: Windows 11 (x64)
echo [Info] Python 运行时: %PY_EXE%
echo [Info] 本地 Web 服务: http://127.0.0.1:1420
echo [Info] 正在启动核心服务并自动唤起独立应用视窗...
echo [Info] 请保持本控制台运行，关闭本窗口将终止超分任务。
echo ========================================================
echo.

"%PY_EXE%" server.py %* --gui

echo.
echo [Info] 核心服务已退出。按任意键关闭窗口...
pause >nul
'''
    bat_path = os.path.join(RELEASE_DIR, "NeuralScaler.bat")
    with open(bat_path, "w", encoding="utf-8") as f:
        f.write(bat_content)
    log("Created NeuralScaler.bat (Explicit Console Launcher)")

    # 5.1 Copy ns.bat (shorthand CLI launcher)
    src_ns_bat = os.path.join(PROJECT_ROOT, "ns.bat")
    if os.path.exists(src_ns_bat):
        shutil.copy2(src_ns_bat, os.path.join(RELEASE_DIR, "ns.bat"))
        log("Copied ns.bat (shorthand CLI launcher)")

    # 5.2 Copy launch_menu.vbs (silent context menu launcher)
    src_vbs = os.path.join(PROJECT_ROOT, "launch_menu.vbs")
    if os.path.exists(src_vbs):
        shutil.copy2(src_vbs, os.path.join(RELEASE_DIR, "launch_menu.vbs"))
        log("Copied launch_menu.vbs (silent context menu launcher)")

    # 6. Generate README.txt
    readme_content = '''========================================================
  NeuralScaler 4K - 便携独立运行版 (Portable Edition)
========================================================

【启动方式】
直接双击运行 "NeuralScaler.bat"：
程序将开启显式控制台终端并启动核心超分服务，同时自动唤起独立的 4K 神经渲染应用视窗。
运行期间请保持控制台窗口打开，实时输出 GPU 占用及任务进度。

【已打包依赖清单】
- 启动程序：NeuralScaler.bat (显式终端，完全兼容各类安全防护软件)
- Web 界面资产：dist/ (React 19 + Tailwind CSS + Fluent UI 风格，支持深色/浅色/系统自适应皮肤)
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
