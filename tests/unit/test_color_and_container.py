# -*- coding: utf-8 -*-
import os
import subprocess
import json
import unittest

FIXTURES_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'fixtures'))

class TestColorAndContainerStandards(unittest.TestCase):
    def test_bt709_color_tags_and_faststart(self):
        src = os.path.join(FIXTURES_DIR, 'synth_720p_standard.mp4')
        dst = os.path.join(FIXTURES_DIR, 'synth_bt709_faststart_out.mp4')
        self.assertTrue(os.path.exists(src))
        
        # Encode with BT.709 VUI tags and faststart
        cmd = [
            'ffmpeg', '-y', '-i', src,
            '-c:v', 'libx264',
            '-bsf:v', 'h264_metadata=colour_primaries=1:transfer_characteristics=1:matrix_coefficients=1',
            '-movflags', '+faststart',
            '-c:a', 'copy',
            dst
        ]
        subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
        self.assertTrue(os.path.exists(dst))
        
        # Probe VUI color metadata
        cmd_probe = [
            'ffprobe', '-v', 'error',
            '-select_streams', 'v:0',
            '-show_entries', 'stream=color_space,color_primaries,color_transfer',
            '-of', 'json', dst
        ]
        res = subprocess.run(cmd_probe, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=True)
        data = json.loads(res.stdout)
        st = data['streams'][0]
        self.assertEqual(st.get('color_space'), 'bt709')
        self.assertEqual(st.get('color_primaries'), 'bt709')
        self.assertEqual(st.get('color_transfer'), 'bt709')
        
        if os.path.exists(dst):
            os.remove(dst)

if __name__ == '__main__':
    unittest.main()
