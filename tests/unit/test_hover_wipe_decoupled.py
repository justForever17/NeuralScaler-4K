# -*- coding: utf-8 -*-
import unittest

class DecoupledWipeCompositor:
    """Simulates the 144Hz dual-rate decoupled wipe & scrubbing state machine."""
    def __init__(self, display_hz=144, video_fps=30):
        self.display_hz = display_hz
        self.video_fps = video_fps
        self.wipe_ratio = 0.5 # Default center
        self.is_frozen = False
        self.current_pts = 0.0
        self.frame_duration = 1.0 / video_fps
        self.state = "STICKY_HOLD" # HOVER_ACTIVE, STICKY_HOLD, FROZEN_COMPARE

    def on_pointer_move(self, cursor_x, viewport_width):
        """Executes at display refresh rate (e.g. 144Hz) with 0 lag."""
        if viewport_width <= 0:
            return
        self.state = "HOVER_ACTIVE"
        self.wipe_ratio = max(0.0, min(1.0, cursor_x / float(viewport_width)))

    def on_pointer_leave(self):
        """Sticky memory: holds last position without abrupt jump."""
        self.state = "STICKY_HOLD"

    def toggle_freeze(self):
        """Single click to freeze for micro-detail inspection."""
        self.is_frozen = not self.is_frozen
        self.state = "FROZEN_COMPARE" if self.is_frozen else "STICKY_HOLD"

    def on_wheel_scrub(self, delta_direction):
        """Frame scrubbing: delta +1 or -1 frame."""
        if not self.is_frozen:
            return False # Only active when frozen
        self.current_pts = max(0.0, self.current_pts + delta_direction * self.frame_duration)
        return True

class TestHoverWipeDecoupled(unittest.TestCase):
    def test_hover_tracking_and_sticky_hold(self):
        comp = DecoupledWipeCompositor(display_hz=144, video_fps=30)
        self.assertEqual(comp.wipe_ratio, 0.5)
        
        # Cursor moves to 70% width
        comp.on_pointer_move(cursor_x=700, viewport_width=1000)
        self.assertEqual(comp.state, "HOVER_ACTIVE")
        self.assertAlmostEqual(comp.wipe_ratio, 0.7)
        
        # Cursor leaves -> Sticky Hold retains 70%
        comp.on_pointer_leave()
        self.assertEqual(comp.state, "STICKY_HOLD")
        self.assertAlmostEqual(comp.wipe_ratio, 0.7)

    def test_freeze_and_wheel_frame_scrubbing(self):
        comp = DecoupledWipeCompositor(display_hz=144, video_fps=30)
        
        # Normal playback, wheel does not scrub
        scrubbed = comp.on_wheel_scrub(delta_direction=+1)
        self.assertFalse(scrubbed)
        
        # User clicks to freeze frame
        comp.toggle_freeze()
        self.assertTrue(comp.is_frozen)
        self.assertEqual(comp.state, "FROZEN_COMPARE")
        
        # User scrolls wheel forward 2 frames
        comp.on_wheel_scrub(delta_direction=+1)
        comp.on_wheel_scrub(delta_direction=+1)
        self.assertAlmostEqual(comp.current_pts, 2.0 / 30.0)

if __name__ == "__main__":
    unittest.main()
