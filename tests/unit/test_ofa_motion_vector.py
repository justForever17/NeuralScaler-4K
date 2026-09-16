# -*- coding: utf-8 -*-
import unittest

class MockOpticalFlowAccelerator:
    """Simulates the NVIDIA Optical Flow Accelerator (OFA) hardware block."""
    def __init__(self):
        self.hardware_available = True
        self.latency_ms = 0.8 # Typical RTX Ampere/Ada OFA latency at 1080p

    def estimate_motion_vectors(self, prev_frame_shape, curr_frame_shape):
        if prev_frame_shape != curr_frame_shape:
            raise ValueError("Frame dimensions must match for optical flow")
        h, w = curr_frame_shape[:2]
        # Returns simulated dense motion vector buffer shape (H, W, 2) format R16G16_FLOAT
        return {
            "mv_buffer_shape": (h, w, 2),
            "format": "DXGI_FORMAT_R16G16_FLOAT",
            "latency_ms": self.latency_ms,
            "dense_grid": "1x1",
            "status": "HARDWARE_ACCELERATED"
        }

class TestOFAMotionVector(unittest.TestCase):
    def test_ofa_dense_motion_vector_generation(self):
        ofa = MockOpticalFlowAccelerator()
        res = ofa.estimate_motion_vectors((1080, 1920, 3), (1080, 1920, 3))
        self.assertEqual(res["status"], "HARDWARE_ACCELERATED")
        self.assertEqual(res["mv_buffer_shape"], (1080, 1920, 2))
        self.assertEqual(res["format"], "DXGI_FORMAT_R16G16_FLOAT")
        self.assertLessEqual(res["latency_ms"], 1.5)

    def test_ofa_dimension_mismatch_rejection(self):
        ofa = MockOpticalFlowAccelerator()
        with self.assertRaises(ValueError):
            ofa.estimate_motion_vectors((720, 1280, 3), (1080, 1920, 3))

if __name__ == "__main__":
    unittest.main()
