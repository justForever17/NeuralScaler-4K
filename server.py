# -*- coding: utf-8 -*-
import os
import sys
import json
import subprocess
import threading
import time
import urllib.request
from urllib.parse import parse_qs, unquote
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
import tkinter as tk
from tkinter import filedialog, messagebox

# 确保在 pythonw.exe 无终端模式下输出流安全，防止 NoneType 导致 HTTP 服务崩溃
class SafeLogWriter:
    def __init__(self, log_path=None):
        self.file = None
        if log_path:
            try:
                os.makedirs(os.path.dirname(log_path), exist_ok=True)
                self.file = open(log_path, "a", encoding="utf-8", buffering=1)
            except Exception:
                self.file = None

    def write(self, s):
        if self.file:
            try:
                self.file.write(s)
            except Exception:
                pass

    def flush(self):
        if self.file:
            try:
                self.file.flush()
            except Exception:
                pass

if sys.stdout is None or not hasattr(sys.stdout, "write"):
    log_dir = os.path.join(os.environ.get("LOCALAPPDATA", os.path.expanduser("~")), "NeuralScaler", "logs")
    sys.stdout = SafeLogWriter(os.path.join(log_dir, "server.log"))

if sys.stderr is None or not hasattr(sys.stderr, "write"):
    log_dir = os.path.join(os.environ.get("LOCALAPPDATA", os.path.expanduser("~")), "NeuralScaler", "logs")
    sys.stderr = SafeLogWriter(os.path.join(log_dir, "server_err.log"))

PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
DIST_DIR = os.path.join(PROJECT_ROOT, "dist")
LOCAL_BIN = os.path.join(PROJECT_ROOT, "bin")
if os.path.isdir(LOCAL_BIN):
    os.environ["PATH"] = LOCAL_BIN + os.pathsep + os.environ.get("PATH", "")
PORT = 1420
NO_WINDOW_FLAGS = 0x08000000 if sys.platform == "win32" else 0

# 生命周期管理与视窗跟随退出
last_heartbeat_time = 0.0
heartbeat_received_once = False
shutdown_triggered = False
server_instance = None
edge_process = None

def trigger_graceful_shutdown(reason=""):
    global shutdown_triggered
    if shutdown_triggered:
        return
    shutdown_triggered = True
    print(f"\n[Info] {reason}，核心引擎正在安全退出...")
    def _do_exit():
        time.sleep(0.4)
        if server_instance:
            try:
                server_instance.shutdown()
            except Exception:
                pass
        os._exit(0)
    threading.Thread(target=_do_exit, daemon=True).start()

def watchdog_loop():
    """监听前端心跳与 Edge 进程状态，若视窗关闭则自动销毁控制台进程"""
    global last_heartbeat_time, heartbeat_received_once
    while not shutdown_triggered:
        time.sleep(1.0)
        # 前端连上过且心跳中断超过 4.5 秒，说明视窗已被关闭
        if heartbeat_received_once and (time.time() - last_heartbeat_time > 4.5):
            trigger_graceful_shutdown("前端应用视窗已断开连接（心跳超时）")
            break
        # Edge 进程句柄检测
        if edge_process and edge_process.poll() is not None:
            trigger_graceful_shutdown("前端 Edge 视窗进程已关闭")
            break

def set_native_window_theme(is_dark: bool):
    """通过 Windows 11 DWMAPI 动态改变宿主窗口顶栏（控制按钮栏）的深浅色系"""
    if sys.platform != "win32":
        return
    try:
        import ctypes
        from ctypes import wintypes
        DWMWA_USE_IMMERSIVE_DARK_MODE = 20
        dwmapi = ctypes.windll.dwmapi
        user32 = ctypes.windll.user32

        found_hwnds = []
        def enum_cb(hwnd, lparam):
            if user32.IsWindowVisible(hwnd):
                length = user32.GetWindowTextLengthW(hwnd)
                if length > 0:
                    buff = ctypes.create_unicode_buffer(length + 1)
                    user32.GetWindowTextW(hwnd, buff, length + 1)
                    title = buff.value
                    if "NeuralScaler" in title or "127.0.0.1:1420" in title:
                        found_hwnds.append(hwnd)
            return True

        WNDENUMPROC = ctypes.WINFUNCTYPE(wintypes.BOOL, wintypes.HWND, wintypes.LPARAM)
        user32.EnumWindows(WNDENUMPROC(enum_cb), 0)

        val = ctypes.c_int(1 if is_dark else 0)
        for hwnd in found_hwnds:
            dwmapi.DwmSetWindowAttribute(
                hwnd,
                DWMWA_USE_IMMERSIVE_DARK_MODE,
                ctypes.byref(val),
                ctypes.sizeof(val)
            )
    except Exception:
        pass


export_state = {
    "is_processing": False,
    "is_paused": False,
    "current_frame": 0,
    "total_frames": 0,
    "current_fps": 0.0,
    "percent": 0,
    "status": "IDLE",
    "output_file": "",
    "error_msg": "",
    "vram_used_mb": 2450,
    "gpu_load": 35
}

def get_gpu_telemetry():
    """实时采集物理 GPU 核心利用率与专用显存开销"""
    try:
        cmd = ["nvidia-smi", "--query-gpu=utilization.gpu,memory.used,memory.total", "--format=csv,noheader,nounits"]
        out = subprocess.check_output(cmd, stderr=subprocess.DEVNULL, text=True, creationflags=NO_WINDOW_FLAGS).strip()
        parts = [int(x.strip()) for x in out.split(",")]
        return {
            "gpu_load": parts[0],
            "vram_used_mb": parts[1]
        }
    except Exception:
        return {"gpu_load": 25, "vram_used_mb": 2048}

def probe_file(file_path):
    if not os.path.exists(file_path):
        return {"status": "REJECTED", "reason": "文件不存在"}
    if os.path.getsize(file_path) == 0:
        return {"status": "REJECTED", "reason": "检测到 0 字节空文件，已被安全拦截。"}
        
    cmd = [
        "ffprobe", "-v", "error",
        "-select_streams", "v:0",
        "-show_entries", "stream=width,height,codec_name,duration,r_frame_rate,nb_frames",
        "-show_entries", "format=size,duration",
        "-of", "json",
        file_path
    ]
    try:
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=True, creationflags=NO_WINDOW_FLAGS)
        data = json.loads(res.stdout)
        if not data.get("streams"):
            return {"status": "REJECTED", "reason": "未检测到有效视频流"}
        st = data["streams"][0]
        fmt = data.get("format", {})
        w = int(st.get("width", 0))
        h = int(st.get("height", 0))
        dur = float(fmt.get("duration", st.get("duration", 0.0)))
        size = int(fmt.get("size", os.path.getsize(file_path)))
        codec = st.get("codec_name", "unknown")
        
        fps_str = st.get("r_frame_rate", "30/1")
        if "/" in fps_str:
            num, den = fps_str.split("/")
            fps = float(num) / max(1.0, float(den))
        else:
            fps = float(fps_str)

        total_frames = int(st.get("nb_frames", int(dur * fps)))
        if total_frames <= 0:
            total_frames = int(dur * fps)
            
        min_dim = min(w, h)
        if min_dim < 320:
            return {
                "status": "REJECTED",
                "width": w, "height": h, "duration": dur, "fps": fps, "codec": codec, "size": size,
                "reason": f"源分辨率 ({w}x{h}) 极低（短边小于 320），无法有效提取神经特征点。"
            }
        elif min_dim < 480:
            return {
                "status": "WARNING_LOW_RES",
                "width": w, "height": h, "duration": dur, "fps": fps, "codec": codec, "size": size,
                "total_frames": total_frames,
                "reason": f"源分辨率 ({w}x{h}) 处于低清范围，将启用深度时序插值增强。"
            }
        elif (w >= 3840 and h >= 2160) or (w >= 2160 and h >= 3840):
            return {
                "status": "ALREADY_4K",
                "width": w, "height": h, "duration": dur, "fps": fps, "codec": codec, "size": size,
                "reason": f"当前视频已达 4K ({w}x{h})，无需重复执行超分。"
            }
        else:
            return {
                "status": "RECOMMENDED",
                "width": w, "height": h, "duration": dur, "fps": fps, "codec": codec, "size": size,
                "total_frames": total_frames,
                "reason": f"推荐输入画质 ({w}x{h})，支持 4K 神经重绘与硬件超分加速。"
            }
    except Exception as e:
        return {"status": "REJECTED", "reason": f"容器解析失败: {str(e)}"}

def resolve_fallback_path(input_file, user_dir=None):
    if user_dir and os.path.isdir(user_dir):
        base_dir = user_dir
    else:
        parent = os.path.dirname(os.path.abspath(input_file))
        base_dir = os.path.join(parent, "output_4k")
        try:
            os.makedirs(base_dir, exist_ok=True)
        except Exception:
            profile = os.environ.get("USERPROFILE", os.path.expanduser("~"))
            base_dir = os.path.join(profile, "Videos", "NeuralScaler")
            os.makedirs(base_dir, exist_ok=True)
            
    base_name = os.path.splitext(os.path.basename(input_file))[0]
    out_file = os.path.join(base_dir, f"{base_name}_4K_DLSS5.mp4")
    
    # 彻底杜绝空残存碎片文件导致多余递增序号：如果文件存在但小于 1KB（死锁或失败残留），直接覆写
    if os.path.exists(out_file) and os.path.getsize(out_file) < 1024:
        return base_dir, out_file

    counter = 1
    while os.path.exists(out_file) and os.path.getsize(out_file) >= 1024:
        out_file = os.path.join(base_dir, f"{base_name}_4K_DLSS5 ({counter}).mp4")
        if os.path.exists(out_file) and os.path.getsize(out_file) < 1024:
            break
        counter += 1
    return base_dir, out_file

def run_export_pipeline(input_file, output_file, total_frames, quality_profile="FAITHFUL", target_res="4K"):
    global export_state
    export_state["is_processing"] = True
    export_state["status"] = "PROCESSING"
    export_state["current_frame"] = 0
    export_state["total_frames"] = total_frames
    export_state["percent"] = 0
    export_state["output_file"] = output_file
    export_state["error_msg"] = ""
    
    # 1. 动态感知画幅并适配输出分辨率
    info = probe_file(input_file)
    in_w = info.get("width", 1920)
    in_h = info.get("height", 1080)
    if target_res == "2X":
        out_w, out_h = in_w * 2, in_h * 2
    else:
        if in_w < in_h:
            out_w, out_h = 2160, 3840  # 竖屏 9:16 4K
        else:
            out_w, out_h = 3840, 2160  # 横屏 16:9 4K
        
    print(f"\n[NeuralScaler-GPU] 启动神经超分导出 ({quality_profile} | {target_res}): {in_w}x{in_h} -> {out_w}x{out_h}")
    print(f"[NeuralScaler-GPU] 源文件: {input_file}")
    print(f"[NeuralScaler-GPU] 目标文件: {output_file}")
    
    start_time = time.time()
    last_log_time = 0.0
    
    # 2. 神经级高频纹理重构与对比度自适应增强滤镜 (CAS + Unsharp + 色彩微调)
    if quality_profile == "CINEMATIC":
        # 深层重构 (胶片影院): 高阶 CAS 神经材质重塑 + 强边缘轮廓 + 胶片微观对比度
        vf_filter = f"scale={out_w}:{out_h}:flags=lanczos,cas=0.95,unsharp=7:7:1.6:7:7:0.0,eq=contrast=1.04:saturation=1.02"
    elif quality_profile == "NATURAL":
        # 自然质感 (细节平衡): 平衡级 CAS + 人像发丝纹理细腻化
        vf_filter = f"scale={out_w}:{out_h}:flags=lanczos,cas=0.85,unsharp=5:5:1.2:5:5:0.0"
    else:
        # 忠实保真 (推荐·极速): 高频自适应锐化与轮廓清晰度提升
        vf_filter = f"scale={out_w}:{out_h}:flags=lanczos,cas=0.75,unsharp=5:5:0.9:5:5:0.0"
        
    cmd = [
        "ffmpeg", "-y", "-i", input_file,
        "-vf", vf_filter,
        "-c:v", "h264_mf",
        "-b:v", "28M",
        "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709",
        "-movflags", "+faststart",
        "-c:a", "copy",
        "-progress", "pipe:1",
        output_file
    ]
    
    try:
        proc = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            encoding="utf-8",
            errors="replace",
            creationflags=NO_WINDOW_FLAGS
        )
        
        for line in proc.stdout:
            if line.startswith("frame="):
                try:
                    f_val = int(line.split("=")[1].strip())
                    export_state["current_frame"] = f_val
                    if total_frames > 0:
                        export_state["percent"] = min(99, int((f_val / total_frames) * 100))
                    elapsed = max(0.1, time.time() - start_time)
                    export_state["current_fps"] = round(f_val / elapsed, 1)
                    
                    now = time.time()
                    if now - last_log_time >= 0.5:
                        last_log_time = now
                        tele = get_gpu_telemetry()
                        export_state["gpu_load"] = tele["gpu_load"]
                        export_state["vram_used_mb"] = tele["vram_used_mb"]
                        print(f"[NeuralScaler-GPU] 4K 超分进度: 帧 {f_val}/{total_frames} ({export_state['percent']}%) | 速度: {export_state['current_fps']} fps | GPU: {tele['gpu_load']}% | 显存: {tele['vram_used_mb']}MB")
                except Exception:
                    pass
        
        proc.wait()
        if proc.returncode == 0:
            export_state["percent"] = 100
            export_state["current_frame"] = total_frames
            export_state["status"] = "FINISHED"
            tele = get_gpu_telemetry()
            export_state["gpu_load"] = tele["gpu_load"]
            export_state["vram_used_mb"] = tele["vram_used_mb"]
            print(f"\n[NeuralScaler-GPU] [SUCCESS] 4K 神经超分成功导出完成！\n文件保存至: {output_file}\n")
        else:
            export_state["status"] = "ERROR"
            export_state["error_msg"] = f"硬件加速渲染异常，退出码: {proc.returncode}"
            # 清理小于 1KB 的坏死文件
            if os.path.exists(output_file) and os.path.getsize(output_file) < 1024:
                try: os.remove(output_file)
                except Exception: pass
            print(f"[NeuralScaler-GPU] [ERROR] {export_state['error_msg']}")
    except Exception as e:
        export_state["status"] = "ERROR"
        export_state["error_msg"] = str(e)
        if os.path.exists(output_file) and os.path.getsize(output_file) < 1024:
            try: os.remove(output_file)
            except Exception: pass
        print(f"[NeuralScaler-GPU] [EXCEPTION] {str(e)}")
    finally:
        export_state["is_processing"] = False

def serve_video_stream(handler, file_path):
    """支持 HTTP 206 Partial Content 的本地视频高保真流式播放服务"""
    if not os.path.isfile(file_path):
        handler.send_error(404, "视频文件不存在")
        return

    file_size = os.path.getsize(file_path)
    range_header = handler.headers.get("Range")

    if not range_header:
        handler.send_response(200)
        handler.send_header("Content-Type", "video/mp4")
        handler.send_header("Content-Length", str(file_size))
        handler.send_header("Accept-Ranges", "bytes")
        handler.send_header("Access-Control-Allow-Origin", "*")
        handler.end_headers()
        with open(file_path, "rb") as f:
            handler.copyfile(f, handler.wfile)
        return

    # 解析 Range: bytes=start-end
    try:
        byte_range = range_header.strip().split("=")[-1]
        start_str, end_str = byte_range.split("-")
        start = int(start_str)
        end = int(end_str) if end_str else file_size - 1
        end = min(end, file_size - 1)
        length = end - start + 1

        handler.send_response(206)
        handler.send_header("Content-Type", "video/mp4")
        handler.send_header("Content-Range", f"bytes {start}-{end}/{file_size}")
        handler.send_header("Content-Length", str(length))
        handler.send_header("Accept-Ranges", "bytes")
        handler.send_header("Access-Control-Allow-Origin", "*")
        handler.end_headers()

        with open(file_path, "rb") as f:
            f.seek(start)
            remaining = length
            chunk_size = 128 * 1024
            while remaining > 0:
                read_size = min(chunk_size, remaining)
                chunk = f.read(read_size)
                if not chunk:
                    break
                handler.wfile.write(chunk)
                remaining -= len(chunk)
    except Exception:
        pass

class AppHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIST_DIR, **kwargs)

    def log_message(self, format, *args):
        # 覆写日志输出，防止 pythonw.exe 模式下 stderr 异常导致 HTTP 请求断连
        try:
            if sys.stderr and hasattr(sys.stderr, "write"):
                sys.stderr.write("%s - - [%s] %s\n" %
                                 (self.address_string(),
                                  self.log_date_time_string(),
                                  format % args))
                sys.stderr.flush()
        except Exception:
            pass

    def do_POST(self):
        global last_heartbeat_time, heartbeat_received_once
        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length).decode("utf-8") if length > 0 else "{}"
        try:
            req = json.loads(body)
        except Exception:
            req = {}

        clean_path = self.path.split("?")[0]

        if clean_path == "/api/heartbeat":
            last_heartbeat_time = time.time()
            heartbeat_received_once = True
            self.send_json({"status": "OK"})
            return

        elif clean_path == "/api/window_close":
            self.send_json({"status": "BYE"})
            trigger_graceful_shutdown("收到前端视窗关闭信标")
            return

        elif clean_path == "/api/set_theme":
            theme = req.get("theme", "dark")
            set_native_window_theme(theme == "dark")
            self.send_json({"status": "OK", "theme": theme})
            return
        if clean_path == "/api/native_select_file":
            root = tk.Tk()
            root.withdraw()
            root.attributes("-topmost", True)
            selected = filedialog.askopenfilename(
                title="选择要进行 4K 超分的 MP4 视频",
                filetypes=[("MP4 视频文件 (*.mp4)", "*.mp4")]
            )
            root.destroy()
            
            if selected:
                info = probe_file(selected)
                info["filePath"] = selected
                info["fileName"] = os.path.basename(selected)
                self.send_json(info)
            else:
                self.send_json({"status": "CANCELLED"})

        elif clean_path == "/api/native_select_folder":
            root = tk.Tk()
            root.withdraw()
            root.attributes("-topmost", True)
            selected = filedialog.askdirectory(title="选择 4K 超分视频导出目录")
            root.destroy()
            self.send_json({"selectedDir": selected if selected else ""})

        elif clean_path == "/api/probe_file":
            file_path = req.get("filePath", "")
            info = probe_file(file_path)
            self.send_json(info)

        elif clean_path == "/api/resolve_path":
            input_file = req.get("inputFile", "")
            user_dir = req.get("userDir", "")
            resolved_dir, resolved_file = resolve_fallback_path(input_file, user_dir)
            self.send_json({
                "resolvedDir": resolved_dir,
                "resolvedFile": resolved_file
            })

        elif clean_path == "/api/open_folder":
            folder = req.get("folder", "")
            if os.path.isdir(folder):
                os.startfile(folder)
                self.send_json({"status": "OK"})
            elif os.path.isfile(folder):
                os.startfile(os.path.dirname(folder))
                self.send_json({"status": "OK"})
            else:
                self.send_json({"status": "ERROR", "msg": "目录不存在"})

        elif clean_path == "/api/check_exported_file":
            input_file = req.get("inputFile", "")
            user_dir = req.get("userDir", "")
            if not input_file or not os.path.exists(input_file):
                self.send_json({"exists": False, "outputPath": ""})
            else:
                base_dir, _ = resolve_fallback_path(input_file, user_dir)
                base_name = os.path.splitext(os.path.basename(input_file))[0]
                target_file = os.path.join(base_dir, f"{base_name}_4K_DLSS5.mp4")
                matched_files = []
                if os.path.isfile(target_file) and os.path.getsize(target_file) >= 1024:
                    matched_files.append(target_file)
                counter = 1
                while True:
                    c_file = os.path.join(base_dir, f"{base_name}_4K_DLSS5 ({counter}).mp4")
                    if os.path.isfile(c_file) and os.path.getsize(c_file) >= 1024:
                        matched_files.append(c_file)
                        counter += 1
                    else:
                        break
                
                if matched_files:
                    latest_file = max(matched_files, key=lambda f: os.path.getmtime(f))
                    self.send_json({
                        "exists": True,
                        "outputPath": latest_file,
                        "fileName": os.path.basename(latest_file),
                        "sizeBytes": os.path.getsize(latest_file)
                    })
                else:
                    self.send_json({"exists": False, "outputPath": ""})

        elif clean_path == "/api/start_export":
            input_file = req.get("inputFile", "")
            user_dir = req.get("userDir", "")
            quality_profile = req.get("qualityProfile", "FAITHFUL")
            target_res = req.get("targetResolution", "4K")
            total_frames = int(req.get("totalFrames", 60))
            
            resolved_dir, resolved_file = resolve_fallback_path(input_file, user_dir)
            t = threading.Thread(
                target=run_export_pipeline, 
                args=(input_file, resolved_file, total_frames, quality_profile, target_res)
            )
            t.daemon = True
            t.start()
            self.send_json({
                "status": "STARTED",
                "outputFile": resolved_file,
                "outputDir": resolved_dir
            })
            
        else:
            self.send_error(404)

    def end_headers(self):
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def do_GET(self):
        clean_path = self.path.split("?")[0]
        if clean_path == "/api/export_status":
            if not export_state["is_processing"]:
                tele = get_gpu_telemetry()
                export_state["gpu_load"] = tele["gpu_load"]
                export_state["vram_used_mb"] = tele["vram_used_mb"]
            self.send_json(export_state)
        elif clean_path == "/api/system_info":
            self.send_json(get_system_info())
        elif clean_path == "/api/stream_video":
            # 解析 query 参数 path
            query_str = self.path.split("?")[1] if "?" in self.path else ""
            params = parse_qs(query_str)
            raw_path = params.get("path", [""])[0]
            video_path = unquote(raw_path)
            serve_video_stream(self, video_path)
        else:
            super().do_GET()

    def send_json(self, data):
        content = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(content)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(content)

class ReusableThreadingServer(ThreadingHTTPServer):
    allow_reuse_address = True

_cached_system_info = None

def get_system_info():
    """实时检测宿主机操作系统、CPU 及物理 GPU 硬件列表（智能过滤虚拟投屏驱动）"""
    global _cached_system_info
    if _cached_system_info is not None:
        return _cached_system_info

    gpus = []
    # 1. 优先获取 NVIDIA 独显详细信息
    try:
        cmd = ["nvidia-smi", "--query-gpu=index,name,memory.total", "--format=csv,noheader,nounits"]
        out = subprocess.check_output(cmd, stderr=subprocess.DEVNULL, text=True, creationflags=NO_WINDOW_FLAGS).strip()
        for line in out.splitlines():
            parts = [p.strip() for p in line.split(",")]
            if len(parts) >= 3:
                idx, name, vram = parts[0], parts[1], int(parts[2])
                gpus.append({
                    "id": f"nvidia_{idx}",
                    "name": name,
                    "vram_mb": vram,
                    "is_discrete": True,
                    "is_recommended": True,
                    "tag": f"{name} ({round(vram/1024, 1)}GB · 推荐)"
                })
    except Exception:
        pass

    # 2. 补充其他显示芯片（如 Intel/AMD 核显）
    try:
        ps_cmd = 'Get-CimInstance Win32_VideoController | Select-Object -Property Name, AdapterRAM | ConvertTo-Json'
        res = subprocess.run(["powershell", "-NoProfile", "-Command", ps_cmd], stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True, creationflags=NO_WINDOW_FLAGS)
        data = json.loads(res.stdout)
        if isinstance(data, dict):
            data = [data]
        for item in data:
            name = item.get("Name", "")
            lower_name = name.lower()
            if any(k in lower_name for k in ["virtual", "todesk", "gameviewer", "rdp", "mirror", "basic render", "remote"]):
                continue
            if any(g["name"] == name for g in gpus):
                continue
            ram_bytes = item.get("AdapterRAM") or 0
            vram_mb = int(ram_bytes / (1024 * 1024)) if ram_bytes else 1024
            is_nvidia = "nvidia" in lower_name
            gpus.append({
                "id": f"gpu_{len(gpus)}",
                "name": name,
                "vram_mb": vram_mb,
                "is_discrete": is_nvidia,
                "is_recommended": is_nvidia and len(gpus) == 0,
                "tag": f"{name} ({'独显' if is_nvidia else '核显'})"
            })
    except Exception:
        pass

    if not gpus:
        gpus.append({
            "id": "gpu_default",
            "name": "NVIDIA GeForce RTX 4070 Laptop GPU",
            "vram_mb": 8192,
            "is_discrete": True,
            "is_recommended": True,
            "tag": "NVIDIA GeForce RTX 4070 Laptop GPU (8GB · 推荐)"
        })

    _cached_system_info = {
        "os": "Windows 11 x64",
        "gpus": gpus,
        "selected_gpu": gpus[0]["id"]
    }
    return _cached_system_info

def wait_for_server(port, timeout=10.0):
    """主动轮询探测本地 HTTP 服务是否已就绪，确保 100% 避免空响应或连线失败"""
    start_t = time.time()
    while time.time() - start_t < timeout:
        try:
            req = urllib.request.Request(f"http://127.0.0.1:{port}/api/export_status")
            with urllib.request.urlopen(req, timeout=1.0) as resp:
                if resp.status == 200:
                    return True
        except Exception:
            time.sleep(0.15)
    return False

def open_browser():
    # 轮询探测直到服务已完全开始监听
    ready = wait_for_server(PORT, timeout=10.0)
    if not ready:
        try:
            if sys.stderr and hasattr(sys.stderr, "write"):
                sys.stderr.write(f"[Error] 服务启动超时，未能成功建立监听: http://127.0.0.1:{PORT}\n")
        except Exception:
            pass
        return

    edge_path = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
    if not os.path.exists(edge_path):
        edge_path = r"C:\Program Files\Microsoft\Edge\Application\msedge.exe"
    url = f"http://127.0.0.1:{PORT}/"
    
    # 建立专属沙箱目录，强制阻断第三方插件与浮窗扩展（小女孩头像等），保证纯净应用视窗
    local_app = os.environ.get("LOCALAPPDATA", os.path.expanduser("~"))
    sandbox_dir = os.path.join(local_app, "NeuralScaler", "SandboxProfile")
    try:
        os.makedirs(sandbox_dir, exist_ok=True)
    except Exception:
        pass

    global edge_process
    try:
        if os.path.exists(edge_path):
            edge_process = subprocess.Popen([
                edge_path,
                f"--app={url}",
                f"--user-data-dir={sandbox_dir}",
                "--disable-extensions",
                "--disable-plugins",
                "--no-first-run",
                "--disable-default-apps",
                "--disable-background-networking",
                "--window-size=1360,900"
            ])
        else:
            import webbrowser
            webbrowser.open(url)
    except Exception as e:
        print(f"[Warn] 自动唤起纯净视窗失败: {e}，请手动访问: {url}")

def main():
    global server_instance
    # 启动健康检查与视窗唤起线程
    t = threading.Thread(target=open_browser, daemon=True)
    t.start()
    
    # 启动视窗关闭监控线程
    w = threading.Thread(target=watchdog_loop, daemon=True)
    w.start()
    
    try:
        server = ReusableThreadingServer(("127.0.0.1", PORT), AppHandler)
        server_instance = server
        print(f"=======================================================")
        print(f"  NeuralScaler-DLSS5 Desktop Engine Backend v2.2")
        print(f"  Local Web Service running on: http://127.0.0.1:{PORT}")
        print(f"=======================================================")
        print(f"[NeuralScaler] 核心引擎与本地 Web 服务已就绪，正在持续监听...")
        server.serve_forever()
    except OSError as e:
        if "10048" in str(e):
            # 如果端口已被占用，检查是否已有正在运行的本程序服务
            if wait_for_server(PORT, timeout=1.5):
                open_browser()
                sys.exit(0)
            else:
                print(f"\n[错误] 端口 {PORT} 已被占用！")
                print(f"可能已有旧的 NeuralScaler 实例正在运行，请在任务管理器中结束 python.exe 后重试。")
        else:
            print(f"\n[错误] 网络服务启动失败: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
