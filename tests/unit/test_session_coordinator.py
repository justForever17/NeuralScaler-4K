# -*- coding: utf-8 -*-
import unittest

class SessionCoordinator:
    """Simulates exclusive hardware session coordination to prevent VRAM/NVDEC exhaustion."""
    def __init__(self, total_vram_mb=4096):
        self.total_vram_mb = total_vram_mb
        self.allocated_vram_mb = 600 # System base
        self.preview_active = False
        self.export_active = False
        self.preview_mode = "IDLE" # IDLE, FULL_HARDWARE, SNAPSHOT_PROXY

    def start_interactive_preview(self):
        if self.export_active:
            # During batch export, preview is forced into zero-cost proxy mode
            self.preview_mode = "SNAPSHOT_PROXY"
            return "PROXY_MODE"
        self.preview_active = True
        self.preview_mode = "FULL_HARDWARE"
        self.allocated_vram_mb += 350 # Allocates preview surfaces
        return "FULL_HARDWARE_ACTIVE"

    def start_batch_export(self):
        self.export_active = True
        if self.preview_active:
            # Gracefully demote preview to snapshot proxy, releasing 350MB
            self.preview_active = False
            self.preview_mode = "SNAPSHOT_PROXY"
            self.allocated_vram_mb -= 350
        # Allocate batch export pipeline (DLSS 5 + OFA + VSR + NVENC = ~2580MB)
        self.allocated_vram_mb += 2580
        # Peak VRAM must be <= 3400MB
        return self.allocated_vram_mb <= 3400

class TestSessionCoordinator(unittest.TestCase):
    def test_session_exclusivity_and_vram_budget(self):
        coord = SessionCoordinator(total_vram_mb=4096)
        
        # User starts preview
        mode = coord.start_interactive_preview()
        self.assertEqual(mode, "FULL_HARDWARE_ACTIVE")
        self.assertEqual(coord.allocated_vram_mb, 950)
        
        # User clicks start batch export
        safe = coord.start_batch_export()
        self.assertTrue(safe)
        # Preview demoted to proxy
        self.assertEqual(coord.preview_mode, "SNAPSHOT_PROXY")
        # Total VRAM is strictly capped <= 3400MB (600 base + 2580 export = 3180MB)
        self.assertEqual(coord.allocated_vram_mb, 3180)
        self.assertLessEqual(coord.allocated_vram_mb, 3400)

if __name__ == "__main__":
    unittest.main()
