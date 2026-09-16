# -*- coding: utf-8 -*-
import os
import subprocess
import json
import unittest

FIXTURES_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'fixtures'))

def probe_video(file_path):
    if not os.path.exists(file_path):
        return {'status': 'ERROR', 'reason': 'FILE_NOT_FOUND'}
    if os.path.getsize(file_path) == 0:
        return {'status': 'REJECTED', 'reason': 'ZERO_BYTE_FILE'}
        
    cmd = [
        'ffprobe', '-v', 'error',
        '-select_streams', 'v:0',
        '-show_entries', 'stream=width,height,codec_name,duration,r_frame_rate',
        '-of', 'json',
        file_path
    ]
    try:
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=True)
        data = json.loads(res.stdout)
        if not data.get('streams'):
            return {'status': 'REJECTED', 'reason': 'NO_VIDEO_STREAM'}
        st = data['streams'][0]
        w = int(st.get('width', 0))
        h = int(st.get('height', 0))
        
        if w == 0 or h == 0:
            return {'status': 'REJECTED', 'reason': 'INVALID_DIMENSIONS'}
        if w < 640 or h < 480:
            return {'status': 'REJECTED', 'reason': 'RESOLUTION_TOO_LOW_BELOW_480P', 'w': w, 'h': h}
        elif w == 640 or h == 480:
            return {'status': 'WARNING_480P', 'reason': 'FACE_DISTORTION_RISK_WARNING', 'w': w, 'h': h}
        elif (w <= 1920 and h <= 1080):
            return {'status': 'RECOMMENDED', 'w': w, 'h': h}
        elif w >= 3840 or h >= 2160:
            return {'status': 'REJECTED', 'reason': 'ALREADY_4K_OR_HIGHER', 'w': w, 'h': h}
        else:
            return {'status': 'VALID', 'w': w, 'h': h}
    except Exception as e:
        return {'status': 'REJECTED', 'reason': 'CORRUPTED_OR_INVALID_CONTAINER', 'error': str(e)}

class TestInputValidationAndBoundaries(unittest.TestCase):
    def test_zero_byte_rejection(self):
        res = probe_video(os.path.join(FIXTURES_DIR, 'zero_byte_empty.mp4'))
        self.assertEqual(res['status'], 'REJECTED')
        self.assertEqual(res['reason'], 'ZERO_BYTE_FILE')

    def test_fake_text_rejection(self):
        res = probe_video(os.path.join(FIXTURES_DIR, 'fake_text_as_mp4.mp4'))
        self.assertEqual(res['status'], 'REJECTED')

    def test_corrupted_header_rejection(self):
        res = probe_video(os.path.join(FIXTURES_DIR, 'corrupted_moov_header.mp4'))
        self.assertEqual(res['status'], 'REJECTED')

    def test_240p_too_low_rejection(self):
        res = probe_video(os.path.join(FIXTURES_DIR, 'synth_240p_rejected.mp4'))
        self.assertEqual(res['status'], 'REJECTED')
        self.assertEqual(res['reason'], 'RESOLUTION_TOO_LOW_BELOW_480P')

    def test_480p_risk_warning_trigger(self):
        res = probe_video(os.path.join(FIXTURES_DIR, 'synth_480p_risk_sample.mp4'))
        self.assertEqual(res['status'], 'WARNING_480P')
        self.assertEqual(res['reason'], 'FACE_DISTORTION_RISK_WARNING')

    def test_720p_recommended_acceptance(self):
        res = probe_video(os.path.join(FIXTURES_DIR, 'synth_720p_standard.mp4'))
        self.assertEqual(res['status'], 'RECOMMENDED')

    def test_1080p_recommended_acceptance(self):
        res = probe_video(os.path.join(FIXTURES_DIR, 'synth_1080p_interview.mp4'))
        self.assertEqual(res['status'], 'RECOMMENDED')

if __name__ == '__main__':
    unittest.main()
