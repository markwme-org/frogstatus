import { BuildInfo } from '../api/types';

interface JFrogFeaturesPanelProps {
  buildInfo: BuildInfo | null;
}

export function JFrogFeaturesPanel({ buildInfo }: JFrogFeaturesPanelProps) {
  return (
    <div className="panel">
      <h2>JFrog Feature Flags</h2>
      <div className="info-grid">
        <div className="info-row">
          <span className="info-label">Curation Enforced:</span>
          <span className="info-value">unknown</span>
        </div>
        <div className="info-row">
          <span className="info-label">Xray Policy:</span>
          <span className="info-value">unknown</span>
        </div>
        <div className="info-row">
          <span className="info-label">Promotion Stage:</span>
          <span className="info-value">{buildInfo?.environment || 'dev'}</span>
        </div>
      </div>
    </div>
  );
}
