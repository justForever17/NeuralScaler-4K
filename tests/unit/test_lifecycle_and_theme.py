# -*- coding: utf-8 -*-
import unittest
from server import set_native_window_theme

class TestLifecycleAndTheme(unittest.TestCase):
    def test_native_theme_handler_safe_call(self):
        # Should not raise exception under Windows or other platforms
        try:
            set_native_window_theme(True)
            set_native_window_theme(False)
        except Exception as e:
            self.fail(f"set_native_window_theme raised unexpected exception: {e}")

    def test_server_constants(self):
        import server
        self.assertFalse(server.shutdown_triggered)
        self.assertEqual(server.PORT, 1420)

if __name__ == '__main__':
    unittest.main()
