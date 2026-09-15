from fastapi import APIRouter, Depends, HTTPException, Query
import pickle
import pandas as pd
import shap
import os
from sqlalchemy.orm import Session
from app.database.connection import get_db
from app.models.assessment import AssessmentHistory
from app.models.user import User
from app.security import get_current_user
from app.schemas.assessment import HealthDataInput, PredictionResponse

router = APIRouter()

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
MODEL_PATH = os.path.join(BASE_DIR, 'ml', 'model.pkl')
SCALER_PATH = os.path.join(BASE_DIR, 'ml', 'scaler.pkl')
FEATURE_NAMES = ['age', 'sex', 'trestbps', 'chol', 'fbs', 'restecg', 'thalach', 'exang', 'oldpeak']

try:
    with open(MODEL_PATH, 'rb') as f:
        model = pickle.load(f)
    with open(SCALER_PATH, 'rb') as f:
        scaler = pickle.load(f)
except Exception as e:
    print(f"Error loading model artifacts: {e}")

@router.post("/predict", response_model=PredictionResponse)
def predict_risk(data: HealthDataInput, persist: bool = Query(True), user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        input_data = pd.DataFrame([data.model_dump()], columns=FEATURE_NAMES)
        input_scaled = scaler.transform(input_data)
        class_index = list(model.classes_).index(1)
        probability = float(model.predict_proba(input_scaled)[0][class_index] * 100)
        
        if probability < 33:
            category = "LOW"
        elif probability < 66:
            category = "MODERATE"
        else:
            category = "HIGH"
            
        explainer = shap.TreeExplainer(model)
        shap_vals = explainer.shap_values(input_scaled)
        
        shap_dict = {FEATURE_NAMES[i]: float(shap_vals[0][i]) for i in range(len(FEATURE_NAMES))}
        
        insights = []
        if data.trestbps > 130:
            insights.append("Your blood pressure is elevated. Consider monitoring it.")
        if data.chol > 200:
            insights.append("Cholesterol levels are above normal ranges.")
            
        if persist:
            assessment = AssessmentHistory(
                user_id=user.id,
                age=data.age,
                sex=data.sex,
                trestbps=data.trestbps,
                chol=data.chol,
                fbs=data.fbs,
                restecg=data.restecg,
                thalach=data.thalach,
                exang=data.exang,
                oldpeak=data.oldpeak,
                risk_probability=round(probability, 2),
                risk_category=category,
            )
            db.add(assessment)
            db.commit()

        return PredictionResponse(
            risk_probability=round(probability, 2),
            risk_category=category,
            shap_values=shap_dict,
            insights=insights,
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/history")
def assessment_history(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    records = db.query(AssessmentHistory).filter(AssessmentHistory.user_id == user.id).order_by(AssessmentHistory.created_at.desc()).all()
    return [
        {
            "id": record.id,
            "created_at": record.created_at,
            "risk_probability": record.risk_probability,
            "risk_category": record.risk_category,
            "form_data": {
                "age": record.age,
                "sex": record.sex,
                "trestbps": record.trestbps,
                "chol": record.chol,
                "fbs": record.fbs,
                "restecg": record.restecg,
                "thalach": record.thalach,
                "exang": record.exang,
                "oldpeak": record.oldpeak,
            },
        }
        for record in records
    ]