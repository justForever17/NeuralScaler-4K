# -*- coding: utf-8 -*-
import os
import sys
import unittest
from unittest.mock import patch, MagicMock
import io

# 引入 server 模块中的核心门禁函数与类
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))
from server import evaluate_gpu_gate, AppHandler, run_cli

class TestHardwareGateAndEncoding(unittest.TestCase):
    """
    硬件准入门禁与字符集异常防回归测试套件：
    1. 严格识别 NVIDIA (N卡) 和 AMD (A卡) 且显存 >= 2048 MB (2GB)；
    2. 拦截 Intel 核显/独显、微软基础显示驱动、虚拟显卡及所有显存 < 2048 MB 的设备；
    3. 验证 Python 3.13 下 HTTP 状态行 reason phrase 包含非 ASCII 字符时不崩溃。
    """

    def test_nvidia_supported(self):
        """NVIDIA 独显显存 >= 2GB 应顺利通过门禁"""
        gate = evaluate_gpu_gate("NVIDIA GeForce RTX 4070 Laptop GPU", 8192, pnp_id="PCI\\VEN_10DE&DEV_27E0")
        self.assertTrue(gate["is_supported"])
        self.assertEqual(gate["vendor"], "NVIDIA")
        self.assertIsNone(gate["rejection_reason"])

    def test_nvidia_insufficient_vram(self):
        """NVIDIA 显卡显存低于 2GB (如 1024MB) 应被门禁拦截"""
        gate = evaluate_gpu_gate("NVIDIA GeForce GT 710", 1024, pnp_id="PCI\\VEN_10DE&DEV_128B")
        self.assertFalse(gate["is_supported"])
        self.assertEqual(gate["vendor"], "NVIDIA")
        self.assertIn("显存容量不足", gate["rejection_reason"])
        self.assertIn("2048MB", gate["rejection_reason"])

    def test_amd_supported(self):
        """AMD 独显显存 >= 2GB 应顺利通过门禁"""
        gate = evaluate_gpu_gate("AMD Radeon RX 6600", 8192, pnp_id="PCI\\VEN_1002&DEV_73FF")
        self.assertTrue(gate["is_supported"])
        self.assertEqual(gate["vendor"], "AMD")
        self.assertIsNone(gate["rejection_reason"])

    def test_amd_insufficient_vram(self):
        """AMD 显卡显存低于 2GB 应被门禁拦截"""
        gate = evaluate_gpu_gate("AMD Radeon R7 240", 1024, pnp_id="PCI\\VEN_1002&DEV_6611")
        self.assertFalse(gate["is_supported"])
        self.assertEqual(gate["vendor"], "AMD")
        self.assertIn("显存容量不足", gate["rejection_reason"])

    def test_intel_gpu_rejected(self):
        """Intel 核显即使分配了 4GB 共享显存，也必须被门禁拦截"""
        gate = evaluate_gpu_gate("Intel(R) UHD Graphics 630", 4096, pnp_id="PCI\\VEN_8086&DEV_3E92")
        self.assertFalse(gate["is_supported"])
        self.assertEqual(gate["vendor"], "INTEL")
        self.assertIn("显卡型号不支持", gate["rejection_reason"])
        self.assertIn("仅支持 NVIDIA (N卡) 或 AMD (A卡)", gate["rejection_reason"])

    def test_intel_arc_rejected(self):
        """Intel Arc 独立显卡也应被门禁拦截（当前核心管线仅适配 N卡/A卡）"""
        gate = evaluate_gpu_gate("Intel(R) Arc(TM) A770 Graphics", 16384, pnp_id="PCI\\VEN_8086&DEV_5690")
        self.assertFalse(gate["is_supported"])
        self.assertEqual(gate["vendor"], "INTEL")
        self.assertIn("显卡型号不支持", gate["rejection_reason"])

    def test_virtual_or_other_gpu_rejected(self):
        """虚拟显示驱动、远程桌面显卡应被拦截"""
        gate = evaluate_gpu_gate("Microsoft Basic Display Adapter", 0, pnp_id="PCI\\VEN_1414&DEV_008E")
        self.assertFalse(gate["is_supported"])
        self.assertEqual(gate["vendor"], "OTHER")
        self.assertIn("显卡型号不支持", gate["rejection_reason"])

    def test_python313_latin1_send_error_no_crash(self):
        """
        验证 Python 3.13 下传入中文 message 不会触发 UnicodeEncodeError 崩溃。
        AppHandler.send_error 应自动将 HTTP reason phrase 规范化为 ASCII/latin-1，并将中文安全转存。
        """
        mock_request = MagicMock()
        mock_client_address = ("127.0.0.1", 12345)
        mock_server = MagicMock()

        handler = AppHandler.__new__(AppHandler)
        handler.request = mock_request
        handler.client_address = mock_client_address
        handler.server = mock_server
        handler.wfile = io.BytesIO()
        handler.request_version = "HTTP/1.1"
        handler.requestline = "GET /api/stream_video HTTP/1.1"
        handler.close_connection = True
        handler.responses = {
            404: ('Not Found', 'Nothing matches the given URI')
        }

        # 调用带有中文字符的 send_error，确保在 Python 3.13 下 100% 不抛出 UnicodeEncodeError
        try:
            handler.send_error(404, "视频文件不存在", "详细说明：路径无效")
        except UnicodeEncodeError as e:
            self.fail(f"send_error 抛出 UnicodeEncodeError 崩溃: {e}")

        raw_output = handler.wfile.getvalue()
        self.assertTrue(len(raw_output) > 0)
        self.assertIn(b"404 Error", raw_output)

    @patch("server.get_system_info")
    def test_cli_hardware_gate_rejection(self, mock_sys_info):
        """CLI 模式下若只有不合规显卡（如 Intel 核显），应直接拒绝生成并返回 exit code 1"""
        mock_sys_info.return_value = {
            "os": "Windows 11 x64",
            "gpus": [
                {
                    "id": "gpu_intel",
                    "name": "Intel(R) UHD Graphics 770",
                    "vendor": "INTEL",
                    "vram_mb": 1024,
                    "is_supported": False,
                    "rejection_reason": "显卡型号不支持：当前检测到的显卡为 Intel 核显/芯片。"
                }
            ],
            "selected_gpu": "gpu_intel",
            "has_supported_gpu": False
        }

        with patch("sys.stderr", new_callable=io.StringIO) as mock_err:
            ret = run_cli("dummy_test_video.mp4")
            self.assertEqual(ret, 1)
            err_output = mock_err.getvalue()
            self.assertTrue("不存在" in err_output or "硬件门禁拦截" in err_output)

if __name__ == '__main__':
    unittest.main()
