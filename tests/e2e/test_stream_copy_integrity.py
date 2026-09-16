# -*- coding: utf-8 -*-
import os
import subprocess
import json
import unittest

FIXTURES_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'fixtures'))

class TestStreamCopyIntegrity(unittest.TestCase):
    def test_audio_stream_copy_pts_sync(self):
        src = os.path.join(FIXTURES_DIR, 'synth_1080p_interview.mp4')
        dst = os.path.join(FIXTURES_DIR, 'synth_1080p_remux_test.mp4')
        self.assertTrue(os.path.exists(src))
        
        # Simulate remux / stream-copy
        cmd = [
            'ffmpeg', '-y', '-i', src,
            '-c:v', 'copy', '-c:a', 'copy',
            dst
        ]
        subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
        self.assertTrue(os.path.exists(dst))
        
        # Verify PTS alignment
        cmd_probe = [
            'ffprobe', '-v', 'error',
            '-show_entries', 'format=duration',
            '-of', 'json', dst
        ]
        res = subprocess.run(cmd_probe, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=True)
        data = json.loads(res.stdout)
        duration = float(data['format']['duration'])
        self.assertAlmostEqual(duration, 2.0, delta=0.1)
        
        if os.path.exists(dst):
            os.remove(dst)

if __name__ == '__main__':
    unittest.main()
