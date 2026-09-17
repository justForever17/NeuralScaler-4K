# -*- coding: utf-8 -*-
import os
import sys
import unittest
from unittest.mock import patch, MagicMock

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))
import server
from server import probe_file

class TestColorManagement(unittest.TestCase):
    """跨平台色彩一致性与色彩空间自适应转换测试套件"""

    @patch("subprocess.run")
    def test_bt601_detected_for_sd_videos(self, mock_run):
        """验证无色域标签的标清视频（短边小于 720）自动识别为 BT.601"""
        mock_run.return_value = MagicMock(
            stdout='''{
                "streams": [{
                    "width": 640,
                    "height": 480,
                    "codec_name": "h264",
                    "r_frame_rate": "30/1",
                    "nb_frames": "60"
                }],
                "format": {"duration": "2.0", "size": "100000"}
            }'''
        )
        with patch("os.path.exists", return_value=True), patch("os.path.getsize", return_value=100000):
            res = probe_file("sd_sample.mp4")
            self.assertTrue(res["is_bt601"])
            self.assertEqual(res["color_space"], "unknown")

    @patch("subprocess.run")
    def test_bt709_detected_for_hd_videos(self, mock_run):
        """验证 1080p 高清视频默认按 BT.709 规范直通处理"""
        mock_run.return_value = MagicMock(
            stdout='''{
                "streams": [{
                    "width": 1920,
                    "height": 1080,
                    "codec_name": "h264",
                    "r_frame_rate": "30/1",
                    "nb_frames": "60"
                }],
                "format": {"duration": "2.0", "size": "200000"}
            }'''
        )
        with patch("os.path.exists", return_value=True), patch("os.path.getsize", return_value=200000):
            res = probe_file("hd_sample.mp4")
            self.assertFalse(res["is_bt601"])

    @patch("subprocess.run")
    def test_explicit_smpte170m_detected(self, mock_run):
        """验证显式标记为 smpte170m/bt601 时识别为 BT.601"""
        mock_run.return_value = MagicMock(
            stdout='''{
                "streams": [{
                    "width": 1280,
                    "height": 720,
                    "codec_name": "h264",
                    "color_space": "smpte170m",
                    "color_primaries": "smpte170m",
                    "r_frame_rate": "30/1",
                    "nb_frames": "60"
                }],
                "format": {"duration": "2.0", "size": "150000"}
            }'''
        )
        with patch("os.path.exists", return_value=True), patch("os.path.getsize", return_value=150000):
            res = probe_file("smpte_sample.mp4")
            self.assertTrue(res["is_bt601"])

    @patch("server.get_gpu_telemetry", return_value={"gpu_load": 20, "vram_used_mb": 2000})
    @patch("subprocess.Popen")
    @patch("server.probe_file")
    def test_export_pipeline_applies_colormatrix_for_bt601(self, mock_probe, mock_popen, mock_tele):
        """验证当源视频为 BT.601 时，导出的 FFmpeg 滤镜链中包含 colormatrix=bt601:bt709 并且带 -color_range tv"""
        mock_probe.return_value = {
            "status": "RECOMMENDED",
            "width": 640,
            "height": 480,
            "total_frames": 60,
            "is_bt601": True
        }
        mock_proc = MagicMock()
        mock_proc.stdout = []
        mock_proc.returncode = 0
        mock_popen.return_value = mock_proc

        server.run_export_pipeline("in.mp4", "out.mp4", 60, quality_profile="FAITHFUL", target_res="4K")

        ffmpeg_call = [c for c in mock_popen.call_args_list if c[0][0][0] == "ffmpeg"][0]
        cmd_args = ffmpeg_call[0][0]

        # 检查参数
        vf_idx = cmd_args.index("-vf")
        vf_str = cmd_args[vf_idx + 1]
        self.assertIn("colormatrix=bt601:bt709", vf_str)
        self.assertIn("cas=0.75", vf_str)
        self.assertNotIn("saturation", vf_str)

        # 检查广播级色域与色彩范围
        self.assertIn("-color_range", cmd_args)
        range_idx = cmd_args.index("-color_range")
        self.assertEqual(cmd_args[range_idx + 1], "tv")
        self.assertIn("bt709", cmd_args)

    @patch("server.get_gpu_telemetry", return_value={"gpu_load": 20, "vram_used_mb": 2000})
    @patch("subprocess.Popen")
    @patch("server.probe_file")
    def test_export_pipeline_skips_colormatrix_for_bt709(self, mock_probe, mock_popen, mock_tele):
        """验证当源视频本身为 BT.709 时，不冗余添加 colormatrix"""
        mock_probe.return_value = {
            "status": "RECOMMENDED",
            "width": 1920,
            "height": 1080,
            "total_frames": 60,
            "is_bt601": False
        }
        mock_proc = MagicMock()
        mock_proc.stdout = []
        mock_proc.returncode = 0
        mock_popen.return_value = mock_proc

        server.run_export_pipeline("in.mp4", "out.mp4", 60, quality_profile="NATURAL", target_res="4K")

        ffmpeg_call = [c for c in mock_popen.call_args_list if c[0][0][0] == "ffmpeg"][0]
        cmd_args = ffmpeg_call[0][0]
        vf_str = cmd_args[cmd_args.index("-vf") + 1]
        self.assertNotIn("colormatrix", vf_str)
        self.assertNotIn("saturation", vf_str)

if __name__ == '__main__':
    unittest.main()
