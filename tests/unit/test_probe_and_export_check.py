# -*- coding: utf-8 -*-
import os
import unittest
from server import probe_file, resolve_fallback_path

class TestProbeAndExportCheck(unittest.TestCase):
    def test_portrait_540x960_recommendation(self):
        # Even without a real file, we can test mock or probe logic if file exists
        fixtures_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'fixtures'))
        synth_720p = os.path.join(fixtures_dir, 'synth_720p_standard.mp4')
        res = probe_file(synth_720p)
        self.assertEqual(res['status'], 'RECOMMENDED')
        self.assertGreaterEqual(res['width'], 640)

    def test_resolve_fallback_cleanup(self):
        # Ensure resolve_fallback_path handles clean names
        temp_input = r"C:\dummy\test_video.mp4"
        out_dir, out_file = resolve_fallback_path(temp_input)
        self.assertTrue(out_file.endswith("test_video_4K_DLSS5.mp4"))

if __name__ == '__main__':
    unittest.main()
