import unittest
import sys
import os

# Add parent directory to path to allow importing ai.inference
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from ai.inference.ai_service import predict_fire_confidence

class TestAIService(unittest.TestCase):

    def test_1_clean_normal_reading(self):
        data = {
            "temperature": 25.0,
            "smoke_level": 50,
            "flame_detected": False,
            "duration_seconds": 1
        }
        result = predict_fire_confidence(data)
        print(f"Test 1 - Normal Reading: {result}")
        self.assertEqual(result['classification'], 'NORMAL')
        self.assertLess(result['fire_confidence'], 0.4)

    def test_2_high_temp_only(self):
        data = {
            "temperature": 80.0,
            "smoke_level": 50,
            "flame_detected": False,
            "duration_seconds": 2
        }
        result = predict_fire_confidence(data)
        print(f"Test 2 - High Temp Only: {result}")
        self.assertNotEqual(result['classification'], 'CONFIRMED_FIRE')

    def test_3_high_temp_high_smoke_no_flame(self):
        data = {
            "temperature": 75.0,
            "smoke_level": 400,
            "flame_detected": False,
            "duration_seconds": 3
        }
        result = predict_fire_confidence(data)
        print(f"Test 3 - High Temp/Smoke No Flame: {result}")
        self.assertIn(result['classification'], ['POSSIBLE_FIRE', 'ANOMALY'])

    def test_4_confirmed_fire(self):
        data = {
            "temperature": 90.0,
            "smoke_level": 800,
            "flame_detected": True,
            "duration_seconds": 10
        }
        result = predict_fire_confidence(data)
        print(f"Test 4 - Confirmed Fire: {result}")
        self.assertEqual(result['classification'], 'CONFIRMED_FIRE')
        self.assertGreater(result['fire_confidence'], 0.6)

    def test_5_contradictory_combination(self):
        data = {
            "temperature": 150.0,
            "smoke_level": 0,
            "flame_detected": False,
            "duration_seconds": 2
        }
        result = predict_fire_confidence(data)
        print(f"Test 5 - Contradictory: {result}")
        # Could be ANOMALY or POSSIBLE_FIRE depending on the tree
        self.assertNotIn(result['classification'], ['NORMAL', 'CONFIRMED_FIRE'])

    def test_6_edge_cases(self):
        data = {}
        result = predict_fire_confidence(data)
        print(f"Test 6 - Empty Data: {result}")
        self.assertIn('classification', result)
        
        data_extreme = {
            "temperature": 5000.0,
            "smoke_level": -500,
            "flame_detected": "NotABool",
            "duration_seconds": None
        }
        result_extreme = predict_fire_confidence(data_extreme)
        print(f"Test 6 - Extreme Data: {result_extreme}")
        self.assertIn('classification', result_extreme)

if __name__ == '__main__':
    unittest.main(verbosity=2)
