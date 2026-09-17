# -*- coding: utf-8 -*-
import os
import sys
import unittest
from unittest.mock import patch, MagicMock
import io
import json

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))
import server
from server import queue_manager, export_state, AppHandler, probe_existing_instance

def create_mock_handler(path, body_dict=None):
    handler = AppHandler.__new__(AppHandler)
    handler.requestline = f"POST {path} HTTP/1.1"
    handler.request_version = "HTTP/1.1"
    handler.path = path
    handler.client_address = ("127.0.0.1", 12345)
    body_bytes = json.dumps(body_dict).encode("utf-8") if body_dict else b"{}"
    handler.headers = {"Content-Length": str(len(body_bytes))}
    handler.rfile = io.BytesIO(body_bytes)
    handler.wfile = io.BytesIO()
    return handler

class TestSingleInstanceIPC(unittest.TestCase):
    """单实例守护与本地 IPC 注入通信单元测试套件"""

    def setUp(self):
        queue_manager.queue.clear()
        queue_manager.pending_injected_video = None
        queue_manager.initial_video = None
        export_state["is_processing"] = False
        export_state["status"] = "IDLE"

    def test_probe_existing_instance_offline(self):
        """当本地无监听实例时，探针应返回 (False, None)"""
        alive, data = probe_existing_instance(port=19999, timeout=0.2)
        self.assertFalse(alive)
        self.assertIsNone(data)

    @patch("server.bring_app_window_to_front")
    def test_inject_video_when_idle(self, mock_bring):
        """当服务空闲时，注入新视频应设为待机预览对象并返回 LOADED 状态"""
        test_video = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'fixtures', 'corrupted_moov_header.mp4'))
        handler = create_mock_handler("/api/inject_video", {"filePath": test_video})

        with patch("server.probe_file") as mock_probe:
            mock_probe.return_value = {
                "status": "RECOMMENDED",
                "width": 1920,
                "height": 1080,
                "duration": 10.0,
                "fps": 30.0,
                "total_frames": 300,
                "codec": "h264",
                "size": 1024000
            }
            handler.do_POST()

        mock_bring.assert_called_once()
        raw_output = handler.wfile.getvalue()
        json_str = raw_output.split(b"\r\n\r\n")[1].decode("utf-8")
        resp = json.loads(json_str)

        self.assertEqual(resp["status"], "LOADED")
        self.assertEqual(resp["fileName"], os.path.basename(test_video))
        self.assertIsNotNone(queue_manager.pending_injected_video)
        self.assertEqual(queue_manager.pending_injected_video["fileName"], os.path.basename(test_video))

    @patch("server.bring_app_window_to_front")
    def test_inject_video_when_processing(self, mock_bring):
        """当服务正在导出时，注入新视频应自动加入 FIFO 队列并返回 QUEUED 状态"""
        export_state["is_processing"] = True
        export_state["status"] = "PROCESSING"

        test_video = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'fixtures', 'corrupted_moov_header.mp4'))
        handler = create_mock_handler("/api/inject_video", {"filePath": test_video})

        with patch("server.probe_file") as mock_probe:
            mock_probe.return_value = {
                "status": "RECOMMENDED",
                "width": 1280,
                "height": 720,
                "total_frames": 240
            }
            handler.do_POST()

        mock_bring.assert_called_once()
        raw_output = handler.wfile.getvalue()
        json_str = raw_output.split(b"\r\n\r\n")[1].decode("utf-8")
        resp = json.loads(json_str)

        self.assertEqual(resp["status"], "QUEUED")
        self.assertEqual(resp["queue_position"], 1)
        self.assertEqual(len(queue_manager.queue), 1)
        self.assertIsNone(queue_manager.pending_injected_video)

    def test_consume_injected_video(self):
        """前端读取注入视频后，发送 consume 指令应成功清空 pending 状态"""
        queue_manager.pending_injected_video = {"fileName": "test.mp4"}
        handler = create_mock_handler("/api/consume_injected_video")
        handler.do_POST()
        self.assertIsNone(queue_manager.pending_injected_video)

    @patch("server.bring_app_window_to_front")
    def test_activate_window(self, mock_bring):
        """调用 activate_window 接口应调用 Win32 置顶并返回 OK"""
        handler = create_mock_handler("/api/activate_window")
        handler.do_POST()
        mock_bring.assert_called_once()
        raw_output = handler.wfile.getvalue()
        json_str = raw_output.split(b"\r\n\r\n")[1].decode("utf-8")
        resp = json.loads(json_str)
        self.assertEqual(resp["status"], "OK")

if __name__ == '__main__':
    unittest.main()
