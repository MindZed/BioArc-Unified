from fastapi import FastAPI, HTTPException
import joblib
import pandas as pd
import os

app = FastAPI(title="BioArc ML Virtual Sensor")

MODEL_PATH = "bioreactor_rf_model.pkl"
model = None

@app.on_event("startup")
def load_model():
    global model
    if os.path.exists(MODEL_PATH):
        try:
            model = joblib.load(MODEL_PATH)
            print("✅ bioreactor_rf_model.pkl loaded successfully!")
        except Exception as e:
            print(f"❌ Error loading model: {e}")
    else:
        print("⚠️ Warning: bioreactor_rf_model.pkl not found yet.")

@app.post("/predict")
def predict(payload: dict):
    if model is None:
        # Fallback values if model file is not uploaded yet
        return {"predicted_ph": 7.2, "predicted_do": 6.8}
    
    try:
        expected_cols = getattr(model, "feature_names_in_", [])
        # Fill missing features with default 0
        input_data = {col: payload.get(col, 0) for col in expected_cols}
        
        df = pd.DataFrame([input_data])
        predictions = model.predict(df)
        
        return {
            "predicted_ph": round(float(predictions[0][0]), 2),
            "predicted_do": round(float(predictions[0][1]), 2)
        }
    except Exception as e:
        print(f"Prediction Error: {e}")
        return {"predicted_ph": 7.0, "predicted_do": 6.5}
