import { ShieldCheck } from 'lucide-react';

export default function RiskGauge({ value = 0, category = 'LOW' }) {
  const tone = category.toLowerCase();
  const displayValue = Number(value).toFixed(1);
  return <div className="gauge-wrap">
    <div className={`risk-gauge ${tone}`} style={{ '--risk': `${Math.min(Math.max(value, 0), 100)}%` }}>
      <div className="gauge-inner"><ShieldCheck size={22} /><strong>{displayValue}<small>%</small></strong><span>risk estimate</span></div>
    </div>
    <div className={`risk-pill ${tone}`}>{category} RISK</div>
  </div>;
}