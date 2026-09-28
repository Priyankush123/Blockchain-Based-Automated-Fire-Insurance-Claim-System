import os
import sys
import yaml
import json
import joblib
import pandas as pd
import numpy as np
import mlflow
from sklearn.model_selection import train_test_split, StratifiedKFold, GridSearchCV
from sklearn.ensemble import RandomForestClassifier
from sklearn.pipeline import Pipeline
from sklearn.metrics import precision_recall_fscore_support

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))
from ai.preprocessing.pipeline import clean_and_engineer_features, get_preprocessor, NUMERIC_FEATURES, CATEGORICAL_FEATURES

def main():
    with open('config.yaml', 'r') as f:
        config = yaml.safe_load(f)
        
    # Read and clean
    raw_path = os.path.join(os.path.dirname(__file__), config['data']['raw_path'])
    df = pd.read_csv(raw_path)
    df = clean_and_engineer_features(df)
    
    X = df[NUMERIC_FEATURES + CATEGORICAL_FEATURES]
    y = df['label']
    
    rs = config['data']['random_seed']
    test_size = config['data']['split_ratio']['test_size']
    val_size = config['data']['split_ratio']['val_size']
    
    X_temp, X_test, y_temp, y_test = train_test_split(X, y, test_size=test_size, stratify=y, random_state=rs)
    X_train, X_val, y_train, y_val = train_test_split(X_temp, y_temp, test_size=val_size/(1-test_size), stratify=y_temp, random_state=rs)
    
    preprocessor = get_preprocessor()
    rf_pipeline = Pipeline([
        ('preprocessor', preprocessor),
        ('rf', RandomForestClassifier(random_state=rs))
    ])
    
    cv = StratifiedKFold(n_splits=config['model']['cv_folds'], shuffle=True, random_state=rs)
    rf_search = GridSearchCV(rf_pipeline, config['model']['search_space'], cv=cv, scoring=config['model']['scoring'])
    
    mlflow.set_tracking_uri("sqlite:///../mlruns/mlflow.db")
    mlflow.set_experiment("fire-event-ai-confidence")
    
    with mlflow.start_run(run_name="Production_RF_Train"):
        mlflow.sklearn.autolog()
        rf_search.fit(X_train, y_train)
        
    best_model = rf_search.best_estimator_
    test_preds = best_model.predict(X_test)
    f1_macro = float(precision_recall_fscore_support(y_test, test_preds, average='macro')[2])
    
    os.makedirs('../model', exist_ok=True)
    joblib.dump(best_model, '../model/best_model.pkl')
    joblib.dump(preprocessor, '../model/preprocessing_pipeline.pkl')
    
    metadata = {
        "model_type": config['model']['type'],
        "hyperparameters": rf_search.best_params_,
        "features": NUMERIC_FEATURES + CATEGORICAL_FEATURES,
        "test_f1_macro": f1_macro
    }
    with open('../model/model_metadata.json', 'w') as f:
        json.dump(metadata, f, indent=4)
        
    print(f"Training complete. Test F1 Macro: {f1_macro:.4f}")

if __name__ == '__main__':
    main()
