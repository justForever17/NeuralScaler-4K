# -*- coding: utf-8 -*-
import os
import sys
import unittest
from unittest.mock import patch, MagicMock
import io
import json

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))
import server
from server import queue_manager, export_state, AppHandler

def create_mock_post(path, body_dict=None):
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

class TestTaskQueueConcurrency(unittest.TestCase):
    """FIFO 任务队列与 GPU 单并发隔离测试套件"""

    def setUp(self):
        queue_manager.queue.clear()
        queue_manager.pending_injected_video = None
        export_state["is_processing"] = False
        export_state["status"] = "IDLE"

    @patch("server.probe_file")
    def test_fifo_ordering(self, mock_probe):
        """验证任务队列严格遵循先进先出 (FIFO) 顺序"""
        mock_probe.return_value = {
            "status": "RECOMMENDED",
            "width": 1920,
            "height": 1080,
            "total_frames": 100
        }
        res1 = queue_manager.add_to_queue("video1.mp4")
        res2 = queue_manager.add_to_queue("video2.mp4")
        res3 = queue_manager.add_to_queue("video3.mp4")

        self.assertEqual(res1["queue_position"], 1)
        self.assertEqual(res2["queue_position"], 2)
        self.assertEqual(res3["queue_position"], 3)
        self.assertEqual(len(queue_manager.get_queue()), 3)

        # 依次弹出验证 FIFO 顺序
        task_first = queue_manager.pop_next_task()
        self.assertEqual(task_first["fileName"], "video1.mp4")
        task_second = queue_manager.pop_next_task()
        self.assertEqual(task_second["fileName"], "video2.mp4")
        task_third = queue_manager.pop_next_task()
        self.assertEqual(task_third["fileName"], "video3.mp4")
        self.assertIsNone(queue_manager.pop_next_task())

    @patch("server.probe_file")
    def test_remove_from_queue(self, mock_probe):
        """验证从待处理队列中成功移除指定任务"""
        mock_probe.return_value = {"status": "RECOMMENDED", "width": 1920, "height": 1080, "total_frames": 100}
        res = queue_manager.add_to_queue("remove_me.mp4")
        task_id = res["task"]["id"]
        self.assertEqual(len(queue_manager.get_queue()), 1)

        success = queue_manager.remove_from_queue(task_id)
        self.assertTrue(success)
        self.assertEqual(len(queue_manager.get_queue()), 0)

        # 再次移除不存在的任务应返回 False
        self.assertFalse(queue_manager.remove_from_queue(task_id))

    @patch("server.run_export_pipeline")
    @patch("server.probe_file")
    def test_trigger_next_if_idle(self, mock_probe, mock_run):
        """当空闲且队列有任务时，trigger_next_if_idle 应当自动发起导出调度"""
        mock_probe.return_value = {"status": "RECOMMENDED", "width": 1920, "height": 1080, "total_frames": 100}
        queue_manager.add_to_queue("next_job.mp4")

        export_state["is_processing"] = False
        queue_manager.trigger_next_if_idle()

        # 等待微秒级线程启动
        import time; time.sleep(0.05)
        mock_run.assert_called_once()
        self.assertEqual(len(queue_manager.queue), 0)

    @patch("server.probe_file")
    def test_concurrency_guard_api(self, mock_probe):
        """当已有任务正在导出时，/api/start_export 接口必须拒绝并发，自动转为 QUEUED 排队"""
        export_state["is_processing"] = True
        mock_probe.return_value = {"status": "RECOMMENDED", "width": 1920, "height": 1080, "total_frames": 100}

        test_video = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'fixtures', 'corrupted_moov_header.mp4'))
        handler = create_mock_post("/api/start_export", {
            "inputFile": test_video,
            "qualityProfile": "FAITHFUL",
            "targetResolution": "4K",
            "totalFrames": 100
        })

        with patch("server.get_system_info") as mock_sys:
            mock_sys.return_value = {
                "gpus": [{
                    "id": "gpu_test",
                    "name": "NVIDIA GeForce RTX 4070",
                    "vendor": "NVIDIA",
                    "vram_mb": 8192,
                    "is_supported": True
                }],
                "selected_gpu": "gpu_test"
            }
            handler.do_POST()

        raw_output = handler.wfile.getvalue()
        json_str = raw_output.split(b"\r\n\r\n")[1].decode("utf-8")
        resp = json.loads(json_str)

        self.assertEqual(resp["status"], "QUEUED")
        self.assertIn("排队", resp["msg"])
        self.assertEqual(len(queue_manager.queue), 1)

if __name__ == '__main__':
    unittest.main()
