from fastapi import APIRouter, Depends, HTTPException, Query
import pickle
import pandas as pd
import shap
import os
from sqlalchemy.orm import Session
from sklearn.inspection import permutation_importance
from sklearn.metrics import accuracy_score, confusion_matrix, f1_score, precision_score, recall_score, roc_auc_score
from sklearn.model_selection import train_test_split
from app.database.connection import get_db
from app.models.assessment import AssessmentHistory
from app.models.user import User
from app.security import get_current_user
from app.schemas.assessment import ActionPlanItem, HealthDataInput, PredictionResponse

router = APIRouter()

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
MODEL_PATH = os.path.join(BASE_DIR, 'ml', 'model.pkl')
SCALER_PATH = os.path.join(BASE_DIR, 'ml', 'scaler.pkl')
DATA_PATH = os.path.join(BASE_DIR, 'ml', 'heart_2.csv')
FEATURE_NAMES = ['age', 'sex', 'trestbps', 'chol', 'fbs', 'restecg', 'thalach', 'exang', 'oldpeak']

try:
    with open(MODEL_PATH, 'rb') as f:
        model = pickle.load(f)
    with open(SCALER_PATH, 'rb') as f:
        scaler = pickle.load(f)
except Exception as e:
    print(f"Error loading model artifacts: {e}")


def build_action_plan(data: HealthDataInput | dict) -> list[ActionPlanItem]:
    values = data.model_dump() if isinstance(data, HealthDataInput) else data
    priorities = []
    trestbps = values.get('trestbps')
    if trestbps is not None and trestbps >= 130:
        priorities.append(ActionPlanItem(title="Focus on blood pressure", detail="Discuss repeated elevated readings with a qualified clinician."))
    chol = values.get('chol')
    if chol is not None and chol >= 200:
        priorities.append(ActionPlanItem(title="Review cholesterol", detail="Consider discussing your lipid results with a qualified clinician."))
    thalach = values.get('thalach')
    if thalach is not None and thalach < 120:
        priorities.append(ActionPlanItem(title="Discuss activity tolerance", detail="Ask a qualified clinician what level of physical activity is appropriate for you."))
    if values.get('exang') == 1:
        priorities.append(ActionPlanItem(title="Mention exercise-related symptoms", detail="Discuss any symptoms during activity with a qualified clinician."))
    oldpeak = values.get('oldpeak')
    if oldpeak is not None and oldpeak >= 2:
        priorities.append(ActionPlanItem(title="Review exercise-test signals", detail="Discuss this exercise-related measure with a qualified clinician."))
    if values.get('fbs') == 1:
        priorities.append(ActionPlanItem(title="Review fasting sugar", detail="Consider discussing this fasting-sugar reading with a qualified clinician."))
    return priorities[:4]


def calculate_model_metrics() -> dict:
    frame = pd.read_csv(DATA_PATH)
    features = frame[FEATURE_NAMES]
    target = frame['target']
    _, test_features, _, test_target = train_test_split(
        features, target, test_size=0.2, random_state=42
    )
    scaled_features = scaler.transform(test_features)
    predictions = model.predict(scaled_features)
    class_index = list(model.classes_).index(1)
    probabilities = model.predict_proba(scaled_features)[:, class_index]
    matrix = confusion_matrix(test_target, predictions, labels=[0, 1])
    if hasattr(model, 'feature_importances_'):
        importance_values = model.feature_importances_
    else:
        importance_values = permutation_importance(
            model, scaled_features, test_target, scoring='roc_auc', random_state=42
        ).importances_mean
    importance = [
        {'feature': name, 'importance': round(float(value), 6)}
        for name, value in zip(FEATURE_NAMES, importance_values)
    ]
    importance.sort(key=lambda item: item['importance'], reverse=True)
    return {
        'evaluation_method': 'Held-out test split: 20%, random_state=42, same StandardScaler pipeline as training',
        'dataset': 'Backend/ml/heart_2.csv',
        'sample_count': int(len(test_target)),
        'metrics': {
            'accuracy': round(float(accuracy_score(test_target, predictions)), 4),
            'precision': round(float(precision_score(test_target, predictions, zero_division=0)), 4),
            'recall': round(float(recall_score(test_target, predictions, zero_division=0)), 4),
            'f1_score': round(float(f1_score(test_target, predictions, zero_division=0)), 4),
            'roc_auc': round(float(roc_auc_score(test_target, probabilities)), 4),
        },
        'confusion_matrix': matrix.tolist(),
        'confusion_matrix_labels': ['No detected disease', 'Detected disease'],
        'feature_importance': importance,
    }

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
            action_plan=build_action_plan(data),
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/model-insights")
def model_insights(user: User = Depends(get_current_user)):
    try:
        return calculate_model_metrics()
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Model evaluation is currently unavailable") from exc


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
            "action_plan": [item.model_dump() for item in build_action_plan({
                "trestbps": record.trestbps,
                "chol": record.chol,
                "thalach": record.thalach,
                "exang": record.exang,
                "oldpeak": record.oldpeak,
                "fbs": record.fbs,
            })],
        }
        for record in records
    ]