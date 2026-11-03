import joblib
import pandas as pd
import numpy as np
import os
import json

# Global cache for model to avoid loading overhead on every request
_model_pipeline = None

def load_artifacts():
    global _model_pipeline
    if _model_pipeline is None:
        base_path = os.path.join(os.path.dirname(__file__), '..', 'model')
        _model_pipeline = joblib.load(os.path.join(base_path, 'best_model.pkl'))

def predict_fire_confidence(sensor_data: dict) -> dict:
    """
    Predicts fire confidence and classification based on a single sensor reading.
    Returns:
        {
            "fire_confidence": float,
            "classification": str
        }
    """
    load_artifacts()
    
    # Extract needed raw values with defaults/safeguards
    try:
        temperature = float(sensor_data.get('temperature', 25.0))
    except (ValueError, TypeError):
        temperature = 25.0
        
    try:
        smoke_level = int(sensor_data.get('smoke_level', 0))
    except (ValueError, TypeError):
        smoke_level = 0
        
    # Handle boolean or string boolean
    fd = sensor_data.get('flame_detected', False)
    if isinstance(fd, str):
        flame_detected = 1 if fd.lower() == 'true' else 0
    else:
        flame_detected = int(bool(fd))
        
    try:
        duration_seconds = int(sensor_data.get('duration_seconds', 0))
    except (ValueError, TypeError):
        duration_seconds = 0
    
    # Outlier clipping as in training
    temperature = max(-20.0, min(200.0, temperature))
    smoke_level = max(0, min(1023, smoke_level))
    
    # Feature engineering
    temp_smoke_interaction = temperature * smoke_level
    is_high_risk = 1 if (temperature > 60 and flame_detected == 1) else 0
    
    # Create DataFrame for preprocessor
    input_df = pd.DataFrame([{
        'temperature': temperature,
        'smoke_level': smoke_level,
        'duration_seconds': duration_seconds,
        'temp_smoke_interaction': temp_smoke_interaction,
        'flame_detected': flame_detected,
        'is_high_risk': is_high_risk
    }])
    
    # Predict
    classification = _model_pipeline.predict(input_df)[0]
    
    # Get probabilities to derive confidence
    # Random Forest Pipeline has predict_proba
    probs = _model_pipeline.predict_proba(input_df)[0]
    classes = list(_model_pipeline.classes_)
    
    # Confidence calculation:
    # If classified as CONFIRMED_FIRE or POSSIBLE_FIRE, we use their probabilities.
    # Actually, we can sum the probabilities of CONFIRMED_FIRE and POSSIBLE_FIRE as the "fire_confidence" score,
    # or just use the max probability of the predicted class.
    # Let's define fire_confidence as the probability of (POSSIBLE_FIRE + CONFIRMED_FIRE).
    fire_prob = 0.0
    if 'CONFIRMED_FIRE' in classes:
        fire_prob += probs[classes.index('CONFIRMED_FIRE')]
    if 'POSSIBLE_FIRE' in classes:
        fire_prob += probs[classes.index('POSSIBLE_FIRE')]
        
    # If the model predicts ANOMALY, we might not be highly confident in fire, but it's an anomaly.
    # The spec: "fire_confidence: float (0.0 - 1.0)"
    
    # To satisfy contradictory cases landing in ambiguous/anomaly zone, 
    # we can use the sum of fire probabilities as fire_confidence.
    
    return {
        "fire_confidence": round(float(fire_prob), 4),
        "classification": classification
    }
