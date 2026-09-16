# -*- coding: utf-8 -*-
import unittest

class CircuitBreakerManager:
    def __init__(self, vram_limit_mb=300, frame_timeout_ms=500, disk_limit_mb=500):
        self.vram_limit_mb = vram_limit_mb
        self.frame_timeout_ms = frame_timeout_ms
        self.disk_limit_mb = disk_limit_mb
        self.state = "OPERATIONAL" # OPERATIONAL, SUSPENDED, RECOVERING, SAFE_HALTED
        self.purged_surfaces = False
        self.skipped_frames = []

    def check_vram(self, available_mb):
        if available_mb < self.vram_limit_mb:
            self.state = "SUSPENDED"
            self.purged_surfaces = True
            return False, "CIRCUIT_BREAKER_VRAM_CRITICAL"
        return True, "OK"

    def handle_frame_execution(self, frame_idx, duration_ms):
        if duration_ms > self.frame_timeout_ms:
            # Bad frame deadlock detected, skip frame with hold
            self.skipped_frames.append(frame_idx)
            return "SKIP_AND_INTERPOLATE_WITH_PREVIOUS"
        return "SUCCESS"

    def check_disk_space(self, free_disk_mb):
        if free_disk_mb < self.disk_limit_mb:
            self.state = "SAFE_HALTED"
            return False, "CIRCUIT_BREAKER_DISK_FULL"
        return True, "OK"

class TestCircuitBreaker(unittest.TestCase):
    def test_vram_critical_tripping_and_purge(self):
        cb = CircuitBreakerManager(vram_limit_mb=300)
        # Normal condition (1500MB free)
        ok, msg = cb.check_vram(1500)
        self.assertTrue(ok)
        self.assertEqual(cb.state, "OPERATIONAL")
        self.assertFalse(cb.purged_surfaces)
        
        # Critical condition (180MB free)
        ok, msg = cb.check_vram(180)
        self.assertFalse(ok)
        self.assertEqual(msg, "CIRCUIT_BREAKER_VRAM_CRITICAL")
        self.assertEqual(cb.state, "SUSPENDED")
        self.assertTrue(cb.purged_surfaces)

    def test_bad_frame_timeout_watchdog(self):
        cb = CircuitBreakerManager(frame_timeout_ms=500)
        # Normal frame: 22ms
        res = cb.handle_frame_execution(frame_idx=101, duration_ms=22)
        self.assertEqual(res, "SUCCESS")
        self.assertEqual(len(cb.skipped_frames), 0)
        
        # Corrupted / deadlock frame: 650ms
        res = cb.handle_frame_execution(frame_idx=102, duration_ms=650)
        self.assertEqual(res, "SKIP_AND_INTERPOLATE_WITH_PREVIOUS")
        self.assertIn(102, cb.skipped_frames)

    def test_disk_space_critical_halt(self):
        cb = CircuitBreakerManager(disk_limit_mb=500)
        ok, msg = cb.check_disk_space(free_disk_mb=250)
        self.assertFalse(ok)
        self.assertEqual(msg, "CIRCUIT_BREAKER_DISK_FULL")
        self.assertEqual(cb.state, "SAFE_HALTED")

if __name__ == "__main__":
    unittest.main()
