import pandas as pd
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.compose import ColumnTransformer

NUMERIC_FEATURES = ['temperature', 'smoke_level', 'duration_seconds', 'temp_smoke_interaction']
CATEGORICAL_FEATURES = ['flame_detected', 'is_high_risk']

def clean_and_engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    
    # Cleaning
    if 'flame_detected' in df.columns:
        df['flame_detected'] = df['flame_detected'].astype(int)
    if 'timestamp' in df.columns:
        df['timestamp'] = pd.to_datetime(df['timestamp'])
        
    if 'temperature' in df.columns:
        df['temperature'] = df['temperature'].clip(lower=-20, upper=200)
    if 'smoke_level' in df.columns:
        df['smoke_level'] = df['smoke_level'].clip(lower=0, upper=1023)
        
    # Engineering
    if 'temperature' in df.columns and 'smoke_level' in df.columns:
        df['temp_smoke_interaction'] = df['temperature'] * df['smoke_level']
    if 'temperature' in df.columns and 'flame_detected' in df.columns:
        df['is_high_risk'] = ((df['temperature'] > 60) & (df['flame_detected'] == 1)).astype(int)
        
    return df

def get_preprocessor() -> ColumnTransformer:
    preprocessor = ColumnTransformer(
        transformers=[
            ('num', StandardScaler(), NUMERIC_FEATURES),
            ('cat', 'passthrough', CATEGORICAL_FEATURES)
        ])
    return preprocessor
