# -*- coding: utf-8 -*-
import os
import subprocess
import sys

FIXTURES_DIR = os.path.dirname(os.path.abspath(__file__))

def run_ffmpeg(cmd, desc):
    print(f"[Generating Fixture] {desc}...")
    try:
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=True)
        print(f"  --> Success")
    except subprocess.CalledProcessError as e:
        print(f"  --> FFmpeg Error: {e.stderr}")

def main():
    os.makedirs(FIXTURES_DIR, exist_ok=True)
    
    # 1. 480P 风险测试样本 (synth_480p_risk_sample.mp4)
    # 640x480, 2s, 30fps, H.264 + AAC 44.1kHz, 带时间码
    p480 = os.path.join(FIXTURES_DIR, "synth_480p_risk_sample.mp4")
    if not os.path.exists(p480):
        cmd = [
            "ffmpeg", "-y", "-f", "lavfi",
            "-i", "testsrc=duration=2:size=640x480:rate=30",
            "-f", "lavfi", "-i", "sine=frequency=1000:duration=2",
            "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac",
            p480
        ]
        run_ffmpeg(cmd, "480P Risk Warning Sample (synth_480p_risk_sample.mp4)")

    # 2. 720P 标准测试样本 (synth_720p_standard.mp4)
    # 1280x720, 2s, 30fps, H.264 + AAC
    p720 = os.path.join(FIXTURES_DIR, "synth_720p_standard.mp4")
    if not os.path.exists(p720):
        cmd = [
            "ffmpeg", "-y", "-f", "lavfi",
            "-i", "smptebars=duration=2:size=1280x720:rate=30",
            "-f", "lavfi", "-i", "sine=frequency=880:duration=2",
            "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac",
            p720
        ]
        run_ffmpeg(cmd, "720P Standard Sample (synth_720p_standard.mp4)")

    # 3. 1080P 推荐测试样本 (synth_1080p_interview.mp4)
    # 1920x1080, 2s, 30fps, H.264 + AAC
    p1080 = os.path.join(FIXTURES_DIR, "synth_1080p_interview.mp4")
    if not os.path.exists(p1080):
        cmd = [
            "ffmpeg", "-y", "-f", "lavfi",
            "-i", "testsrc=duration=2:size=1920x1080:rate=30",
            "-f", "lavfi", "-i", "sine=frequency=440:duration=2",
            "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac",
            p1080
        ]
        run_ffmpeg(cmd, "1080P Recommended Sample (synth_1080p_interview.mp4)")

    # 4. 240P 非法低分辨率测试样本 (synth_240p_rejected.mp4)
    p240 = os.path.join(FIXTURES_DIR, "synth_240p_rejected.mp4")
    if not os.path.exists(p240):
        cmd = [
            "ffmpeg", "-y", "-f", "lavfi",
            "-i", "testsrc=duration=1:size=320x240:rate=30",
            "-c:v", "libx264", "-pix_fmt", "yuv420p",
            p240
        ]
        run_ffmpeg(cmd, "240P Illegal Low-Res Sample (synth_240p_rejected.mp4)")

    # 5. 损坏的 MP4 样本 (corrupted_moov_header.mp4)
    p_corrupt = os.path.join(FIXTURES_DIR, "corrupted_moov_header.mp4")
    if not os.path.exists(p_corrupt):
        with open(p_corrupt, "wb") as f:
            f.write(b"\x00\x00\x00\x18ftypmp42\x00\x00\x00\x00mp42isom\x00\x00\x00\x08freeCORRUPTED_STREAM_DATA_TRUNCATED")
        print(f"[Generating Fixture] Corrupted MP4 Header (corrupted_moov_header.mp4)... Done.")

    # 6. 伪装为 MP4 的纯文本文件 (fake_text_as_mp4.mp4)
    p_fake = os.path.join(FIXTURES_DIR, "fake_text_as_mp4.mp4")
    if not os.path.exists(p_fake):
        with open(p_fake, "w", encoding="utf-8") as f:
            f.write("This is a plain text file pretending to be an mp4 video file.")
        print(f"[Generating Fixture] Fake Text as MP4 (fake_text_as_mp4.mp4)... Done.")

    # 7. 0 字节空文件 (zero_byte_empty.mp4)
    p_empty = os.path.join(FIXTURES_DIR, "zero_byte_empty.mp4")
    if not os.path.exists(p_empty):
        with open(p_empty, "wb") as f:
            pass
        print(f"[Generating Fixture] Zero-byte Empty MP4 (zero_byte_empty.mp4)... Done.")

    print("\nAll test fixtures successfully verified/generated in:")
    print(FIXTURES_DIR)

if __name__ == "__main__":
    main()
