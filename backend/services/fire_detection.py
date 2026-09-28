from backend.config import settings
from backend.models.sensor_data import SensorData

def run_rule_based_check(reading: SensorData) -> str:
    """
    Evaluates sensor readings against configured thresholds.
    """
    temp_high = reading.temperature > settings.temperature_threshold
    smoke_high = reading.smoke_level > settings.smoke_threshold
    sustained = reading.duration_seconds >= settings.required_duration_seconds if hasattr(reading, 'duration_seconds') else True
    # The sensor data model from the spec didn't actually have duration_seconds but AI training did.
    # Let's check if duration_seconds is in reading, else assume 5.
    duration = getattr(reading, 'duration_seconds', 0)
    # The spec payload has timestamp but no duration. The AI required duration. 
    # Let's just use temp and smoke and flame for rules if duration is missing.
    
    flame = reading.flame_detected
    
    if temp_high and smoke_high and flame:
        return 'CONFIRMED_FIRE'
    if temp_high and smoke_high:
        return 'POSSIBLE_FIRE'
    if (temp_high and not smoke_high) or (smoke_high and not temp_high):
        return 'MANUAL_REVIEW'
    
    return 'NORMAL'
