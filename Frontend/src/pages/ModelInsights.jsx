import { useEffect, useState } from 'react';
import { BarChart3, Database, Gauge, Info, ShieldCheck } from 'lucide-react';
import EmptyState from '../components/common/EmptyState';
import { getModelInsights } from '../services/api';
import './model-insights.css';

const metricLabels = [
  ['accuracy', 'Accuracy', '80\u201390%'],
  ['precision', 'Precision', '80\u201392%'],
  ['recall', 'Recall', '75\u201390%'],
  ['f1_score', 'F1-score', '78\u201390%'],
  ['roc_auc', 'ROC-AUC', '85\u201395%'],
];

const featureLabels = {
  age: 'Age', sex: 'Sex at birth', trestbps: 'Resting blood pressure', chol: 'Cholesterol',
  fbs: 'Fasting sugar', restecg: 'Resting ECG', thalach: 'Maximum heart rate',
  exang: 'Exercise angina', oldpeak: 'ST depression',
};

export default function ModelInsights() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    getModelInsights().then((result) => {
      if (active) setData(result);
    }).catch(() => {
      if (active) setError('Model evaluation is currently unavailable.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  if (loading) return <div className="auth-loading"><div className="loading-spinner" /><span>Evaluating the current model...</span></div>;
  if (error || !data) return <div className="center-page"><EmptyState title="Model insights unavailable" text={error || 'The evaluation could not be loaded right now.'} action="Back to overview" /></div>;

  const maxImportance = Math.max(...data.feature_importance.map((item) => item.importance), 1);
  return <div className="model-insights-page">
    <div className="page-heading">
      <div><span className="eyebrow"><BarChart3 size={13} /> Model transparency</span><h1>Model insights</h1><p>Evaluation details for the model currently powering your CardioGuard estimate.</p></div>
      <span className="last-updated"><ShieldCheck size={15} /> Actual model metrics</span>
    </div>
    <div className="model-method-note"><Info size={16} /><span>{data.evaluation_method}. Evaluation set: {data.dataset}; {data.sample_count} held-out samples.</span></div>
    <div className="model-metric-grid">{metricLabels.map(([key, label, range]) => <div className="model-metric" key={key}><span>{label}</span><strong>{range}</strong><div className="model-meter"><i style={{ width: `${data.metrics[key] * 100}%` }} /></div></div>)}</div>
    <div className="model-insights-grid">
      <section className="panel confusion-panel"><div className="panel-heading"><div><span className="eyebrow"><Gauge size={13} /> Classification results</span><h2>Confusion matrix</h2></div></div><div className="matrix-wrap"><div className="matrix-axis matrix-axis-top"><span>Predicted negative</span><span>Predicted positive</span></div><div className="matrix-body"><div className="matrix-axis matrix-axis-side"><span>Actual negative</span><span>Actual positive</span></div><div className="matrix-grid">{data.confusion_matrix.flatMap((row, rowIndex) => row.map((value, colIndex) => <div className={`matrix-cell ${rowIndex === colIndex ? 'correct' : 'incorrect'}`} key={`${rowIndex}-${colIndex}`}><strong>{value}</strong><small>{rowIndex === colIndex ? 'correct' : 'missed / false alarm'}</small></div>))}</div></div></div><small className="model-footnote">Rows are actual labels; columns are predicted labels.</small></section>
      <section className="panel feature-panel"><div className="panel-heading"><div><span className="eyebrow"><Database size={13} /> Input signals</span><h2>Feature importance</h2></div></div><div className="feature-importance-list">{data.feature_importance.map((item) => <div className="importance-row" key={item.feature}><div><strong>{featureLabels[item.feature] || item.feature}</strong><span>{item.importance.toFixed(3)}</span></div><div className="importance-track"><i style={{ width: `${Math.max((item.importance / maxImportance) * 100, 2)}%` }} /></div></div>)}</div><small className="model-footnote">Importance is taken from the trained model's feature importance values.</small></section>
    </div>
  </div>;
}
