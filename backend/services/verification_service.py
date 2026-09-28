from backend.services.fire_detection import run_rule_based_check
from ai.inference.ai_service import predict_fire_confidence
from backend.models.sensor_data import StoredSensorData

def verify_fire(reading: StoredSensorData) -> dict:
    rule_verdict = run_rule_based_check(reading)
    
    # AI logic
    ai_result = predict_fire_confidence(reading.model_dump())
    ai_classification = ai_result['classification']
    
    # Decision Table explicitly documented:
    # 1. Rule CONFIRMED + AI CONFIRMED/POSSIBLE -> CONFIRMED_FIRE
    # 2. Rule POSSIBLE + AI CONFIRMED -> CONFIRMED_FIRE
    # 3. Rule POSSIBLE + AI POSSIBLE -> POSSIBLE_FIRE
    # 4. Rule NORMAL + AI NORMAL -> NORMAL
    # 5. Otherwise -> MANUAL_REVIEW
    
    status = 'MANUAL_REVIEW'
    reason = "Sensors and AI models are in ambiguous states."
    
    if rule_verdict == 'CONFIRMED_FIRE' and ai_classification in ['CONFIRMED_FIRE', 'POSSIBLE_FIRE']:
        status = 'CONFIRMED_FIRE'
        reason = "Rule engine and AI both strongly indicate fire."
    elif rule_verdict == 'POSSIBLE_FIRE' and ai_classification == 'CONFIRMED_FIRE':
        status = 'CONFIRMED_FIRE'
        reason = "AI upgraded rule engine's possible fire to confirmed."
    elif rule_verdict == 'POSSIBLE_FIRE' and ai_classification == 'POSSIBLE_FIRE':
        status = 'POSSIBLE_FIRE'
        reason = "Both rule engine and AI indicate a possible fire."
    elif rule_verdict == 'NORMAL' and ai_classification == 'NORMAL':
        status = 'NORMAL'
        reason = "Both rule engine and AI indicate normal conditions."
    else:
        status = 'MANUAL_REVIEW'
        reason = f"Conflicting sensor evidence: Rule engine says {rule_verdict}, AI says {ai_classification}."
        
    return {
        "reading": reading.model_dump(),
        "rule_verdict": rule_verdict,
        "ai_result": ai_result,
        "verification_status": status,
        "reason": reason
    }
