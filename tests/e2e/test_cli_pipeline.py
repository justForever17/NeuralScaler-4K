# -*- coding: utf-8 -*-
import os
import sys
import unittest
import subprocess

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
UTF8_ENV = {**os.environ, "PYTHONIOENCODING": "utf-8", "PYTHONUTF8": "1"}

class TestCliPipeline(unittest.TestCase):
    def test_01_cli_help_and_version(self):
        # 1. Test Python CLI --help
        res_py = subprocess.run(
            [sys.executable, "server.py", "--help"],
            cwd=PROJECT_ROOT,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            encoding="utf-8",
            errors="replace",
            env=UTF8_ENV
        )
        self.assertEqual(res_py.returncode, 0)
        self.assertIn("--cli", res_py.stdout)
        self.assertIn("--target", res_py.stdout)

        # 2. Test Node bin/cli.js --help
        res_node_help = subprocess.run(
            ["node", "bin/cli.js", "--help"],
            cwd=PROJECT_ROOT,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            encoding="utf-8",
            errors="replace",
            env=UTF8_ENV
        )
        self.assertEqual(res_node_help.returncode, 0)
        self.assertIn("Usage:", res_node_help.stdout)
        self.assertIn("neuralscaler", res_node_help.stdout)

        # 3. Test Node bin/cli.js --version
        res_node_ver = subprocess.run(
            ["node", "bin/cli.js", "--version"],
            cwd=PROJECT_ROOT,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            encoding="utf-8",
            errors="replace",
            env=UTF8_ENV
        )
        self.assertEqual(res_node_ver.returncode, 0)
        self.assertIn("2.2.0", res_node_ver.stdout)

    def test_02_cli_headless_super_resolution(self):
        fixture_video = os.path.join(PROJECT_ROOT, "tests", "fixtures", "synth_720p_standard.mp4")
        self.assertTrue(os.path.exists(fixture_video), "Fixture video does not exist")

        # Run headless super-resolution via Python CLI
        res = subprocess.run(
            [sys.executable, "server.py", "--cli", "--input", fixture_video, "-t", "4K"],
            cwd=PROJECT_ROOT,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            encoding="utf-8",
            errors="replace",
            env=UTF8_ENV
        )
        self.assertEqual(res.returncode, 0, f"CLI processing failed: {res.stderr}")
        self.assertIn("SUCCESS", res.stdout)

    def test_03_cli_rejection_for_bad_inputs(self):
        # 1. Non-existent file
        res_missing = subprocess.run(
            [sys.executable, "server.py", "--cli", "--input", "invalid_nonexistent_path.mp4"],
            cwd=PROJECT_ROOT,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            encoding="utf-8",
            errors="replace",
            env=UTF8_ENV
        )
        self.assertNotEqual(res_missing.returncode, 0)

        # 2. Zero-byte empty file
        empty_fixture = os.path.join(PROJECT_ROOT, "tests", "fixtures", "zero_byte_empty.mp4")
        res_empty = subprocess.run(
            [sys.executable, "server.py", "--cli", "--input", empty_fixture],
            cwd=PROJECT_ROOT,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            encoding="utf-8",
            errors="replace",
            env=UTF8_ENV
        )
        self.assertNotEqual(res_empty.returncode, 0)

if __name__ == "__main__":
    unittest.main()
