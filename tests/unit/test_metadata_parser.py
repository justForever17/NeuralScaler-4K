# -*- coding: utf-8 -*-
import os
import subprocess
import json
import unittest

FIXTURES_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'fixtures'))

class TestMetadataParser(unittest.TestCase):
    def test_720p_metadata(self):
        f = os.path.join(FIXTURES_DIR, 'synth_720p_standard.mp4')
        self.assertTrue(os.path.exists(f))
        cmd = [
            'ffprobe', '-v', 'error',
            '-show_entries', 'stream=width,height,r_frame_rate,codec_name',
            '-of', 'json', f
        ]
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=True)
        data = json.loads(res.stdout)
        v_stream = next(s for s in data['streams'] if s.get('width'))
        self.assertEqual(int(v_stream['width']), 1280)
        self.assertEqual(int(v_stream['height']), 720)
        self.assertEqual(v_stream['codec_name'], 'h264')

    def test_1080p_metadata(self):
        f = os.path.join(FIXTURES_DIR, 'synth_1080p_interview.mp4')
        self.assertTrue(os.path.exists(f))
        cmd = [
            'ffprobe', '-v', 'error',
            '-show_entries', 'stream=width,height,r_frame_rate,codec_name',
            '-of', 'json', f
        ]
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=True)
        data = json.loads(res.stdout)
        v_stream = next(s for s in data['streams'] if s.get('width'))
        self.assertEqual(int(v_stream['width']), 1920)
        self.assertEqual(int(v_stream['height']), 1080)

if __name__ == '__main__':
    unittest.main()
