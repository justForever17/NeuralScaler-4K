# -*- coding: utf-8 -*-
import os
import unittest
import tempfile
import shutil

class PathResolver:
    @staticmethod
    def resolve_output_dir(user_specified_dir, input_file_path, default_user_videos_dir=None):
        """Implements the 3-tier Fallback resolution logic."""
        # Tier 1: User specified valid & writable directory
        if user_specified_dir:
            try:
                os.makedirs(user_specified_dir, exist_ok=True)
                test_file = os.path.join(user_specified_dir, ".test_write_perm")
                with open(test_file, "w") as f:
                    f.write("ok")
                os.remove(test_file)
                return os.path.abspath(user_specified_dir)
            except Exception:
                pass # Fall through to Tier 2
                
        # Tier 2: Same directory as input file under output_4k/
        input_dir = os.path.dirname(os.path.abspath(input_file_path))
        default_dir = os.path.join(input_dir, "output_4k")
        try:
            os.makedirs(default_dir, exist_ok=True)
            test_file = os.path.join(default_dir, ".test_write_perm")
            with open(test_file, "w") as f:
                f.write("ok")
            os.remove(test_file)
            return os.path.abspath(default_dir)
        except Exception:
            pass # Fall through to Tier 3
            
        # Tier 3: User Videos Directory Fallback
        if not default_user_videos_dir:
            user_profile = os.environ.get("USERPROFILE", os.path.expanduser("~"))
            default_user_videos_dir = os.path.join(user_profile, "Videos", "NeuralScaler")
        os.makedirs(default_user_videos_dir, exist_ok=True)
        return os.path.abspath(default_user_videos_dir)

    @staticmethod
    def generate_conflict_free_filename(target_dir, base_filename, ext=".mp4"):
        """Generates incremental suffix when destination file already exists."""
        candidate = os.path.join(target_dir, f"{base_filename}{ext}")
        counter = 1
        while os.path.exists(candidate):
            candidate = os.path.join(target_dir, f"{base_filename} ({counter}){ext}")
            counter += 1
        return candidate

class TestFallbackAndChinesePaths(unittest.TestCase):
    def setUp(self):
        self.temp_root = tempfile.mkdtemp(prefix="neural_test_")
        
    def tearDown(self):
        if os.path.exists(self.temp_root):
            shutil.rmtree(self.temp_root, ignore_errors=True)

    def test_path_1_user_specified_valid(self):
        custom_out = os.path.join(self.temp_root, "我的自定义导出目录")
        input_file = os.path.join(self.temp_root, "source.mp4")
        resolved = PathResolver.resolve_output_dir(custom_out, input_file)
        self.assertEqual(resolved, os.path.abspath(custom_out))
        self.assertTrue(os.path.exists(resolved))

    def test_path_2_user_specified_invalid_fallback_same_dir(self):
        # Invalid directory syntax on Windows, e.g. invalid drive letter Z:\non_existent_drive
        invalid_out = "Z:\\non_existent_folder_999\\output"
        input_file = os.path.join(self.temp_root, "source.mp4")
        resolved = PathResolver.resolve_output_dir(invalid_out, input_file)
        expected = os.path.abspath(os.path.join(self.temp_root, "output_4k"))
        self.assertEqual(resolved, expected)

    def test_path_3_no_specified_default_same_dir(self):
        input_file = os.path.join(self.temp_root, "输入素材", "sample.mp4")
        os.makedirs(os.path.dirname(input_file), exist_ok=True)
        resolved = PathResolver.resolve_output_dir("", input_file)
        expected = os.path.abspath(os.path.join(self.temp_root, "输入素材", "output_4k"))
        self.assertEqual(resolved, expected)

    def test_path_4_chinese_and_special_character_path_creation(self):
        chinese_input = os.path.join(self.temp_root, "电影项目 [2026] (超清)", "测试_1080p_特写.mp4")
        os.makedirs(os.path.dirname(chinese_input), exist_ok=True)
        with open(chinese_input, "w", encoding="utf-8") as f:
            f.write("mock")
        resolved = PathResolver.resolve_output_dir("", chinese_input)
        self.assertTrue(os.path.exists(resolved))
        self.assertIn("电影项目 [2026] (超清)", resolved)

    def test_conflict_incremental_suffix(self):
        out_dir = os.path.join(self.temp_root, "out")
        os.makedirs(out_dir, exist_ok=True)
        # Create base file
        f0 = os.path.join(out_dir, "clip_4K_DLSS5.mp4")
        with open(f0, "w") as f: f.write("0")
        
        # Test 1st conflict -> (1)
        next_path1 = PathResolver.generate_conflict_free_filename(out_dir, "clip_4K_DLSS5", ".mp4")
        self.assertTrue(next_path1.endswith("clip_4K_DLSS5 (1).mp4"))
        with open(next_path1, "w") as f: f.write("1")
        
        # Test 2nd conflict -> (2)
        next_path2 = PathResolver.generate_conflict_free_filename(out_dir, "clip_4K_DLSS5", ".mp4")
        self.assertTrue(next_path2.endswith("clip_4K_DLSS5 (2).mp4"))

if __name__ == "__main__":
    unittest.main()
