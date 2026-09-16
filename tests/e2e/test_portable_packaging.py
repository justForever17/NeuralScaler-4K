import os
import sys
import unittest
import subprocess
import re

PROJECT_ROOT = r"E:\comfyui\dlss5-super-resolution"
RELEASE_DIR = os.path.join(PROJECT_ROOT, "release", "NeuralScaler-4K-Portable")

class TestPortablePackaging(unittest.TestCase):
    def test_01_release_folder_structure(self):
        self.assertTrue(os.path.isdir(RELEASE_DIR), "Release folder does not exist")
        
        expected_files = [
            "NeuralScaler.bat",
            "README.txt",
            "server.py",
            "app.ico",
            os.path.join("dist", "index.html"),
            os.path.join("bin", "ffmpeg.exe"),
            os.path.join("bin", "ffprobe.exe"),
            os.path.join("bin", "nvngx_dlssnr.dll")
        ]
        for f in expected_files:
            full_path = os.path.join(RELEASE_DIR, f)
            self.assertTrue(os.path.exists(full_path), f"Missing bundled file: {f}")
            self.assertGreater(os.path.getsize(full_path), 0, f"Bundled file is empty: {f}")

    def test_02_bundled_binaries_functional(self):
        ffmpeg_exe = os.path.join(RELEASE_DIR, "bin", "ffmpeg.exe")
        ffprobe_exe = os.path.join(RELEASE_DIR, "bin", "ffprobe.exe")

        # Verify ffmpeg execution
        p_ffmpeg = subprocess.run([ffmpeg_exe, "-version"], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        self.assertEqual(p_ffmpeg.returncode, 0)
        self.assertIn("ffmpeg version", p_ffmpeg.stdout)

        # Verify ffprobe execution
        p_ffprobe = subprocess.run([ffprobe_exe, "-version"], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        self.assertEqual(p_ffprobe.returncode, 0)
        self.assertIn("ffprobe version", p_ffprobe.stdout)

    def test_03_zero_emojis_in_source_and_release(self):
        emoji_pattern = re.compile(r'[\U0001F300-\U0001F9FF\u2600-\u26FF\u2700-\u27BF]')
        
        # Check release server.py
        server_py = os.path.join(RELEASE_DIR, "server.py")
        with open(server_py, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()
            matches = emoji_pattern.findall(content)
            self.assertEqual(matches, [], f"Found emojis in release server.py: {matches}")

        # Check frontend components in source
        src_dir = os.path.join(PROJECT_ROOT, "src")
        for root, _, files in os.walk(src_dir):
            for file in files:
                if file.endswith((".tsx", ".ts")):
                    with open(os.path.join(root, file), "r", encoding="utf-8", errors="ignore") as f:
                        src_content = f.read()
                        matches = emoji_pattern.findall(src_content)
                        self.assertEqual(matches, [], f"Found emojis in {file}: {matches}")

    def test_04_html_and_assets_validity(self):
        index_html = os.path.join(RELEASE_DIR, "dist", "index.html")
        with open(index_html, "r", encoding="utf-8") as f:
            html = f.read()
            self.assertIn("<title>", html)
            self.assertIn("NeuralScaler", html)
            self.assertIn("favicon.svg", html)

    def test_05_server_path_injection(self):
        # Verify server.py prioritizes LOCAL_BIN
        server_py = os.path.join(RELEASE_DIR, "server.py")
        with open(server_py, "r", encoding="utf-8") as f:
            content = f.read()
            self.assertIn("LOCAL_BIN = os.path.join(PROJECT_ROOT, \"bin\")", content)
            self.assertIn("os.environ[\"PATH\"] = LOCAL_BIN", content)

    def test_06_tailwind_dark_mode_enabled(self):
        tailwind_config = os.path.join(PROJECT_ROOT, "tailwind.config.cjs")
        with open(tailwind_config, "r", encoding="utf-8") as f:
            content = f.read()
            self.assertIn("darkMode: 'class'", content)

if __name__ == "__main__":
    unittest.main()
