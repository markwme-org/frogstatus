import { BuildInfo } from '../api/types';

interface BuildPanelProps {
  buildInfo: BuildInfo | null;
  loading: boolean;
  error: string | null;
}

export function BuildPanel({ buildInfo, loading, error }: BuildPanelProps) {
  if (loading) {
    return (
      <div className="panel">
        <h2>Build Information</h2>
        <div className="loading">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="panel">
        <h2>Build Information</h2>
        <div className="error">{error}</div>
      </div>
    );
  }

  if (!buildInfo) {
    return null;
  }

  return (
    <div className="panel">
      <h2>Build Information</h2>
      <div className="info-grid">
        <div className="info-row">
          <span className="info-label">Build Name:</span>
          <span className="info-value">{buildInfo.buildName}</span>
        </div>
        <div className="info-row">
          <span className="info-label">Build Number:</span>
          <span className="info-value">{buildInfo.buildNumber}</span>
        </div>
        <div className="info-row">
          <span className="info-label">Git Commit:</span>
          <span className="info-value">{buildInfo.gitCommit}</span>
        </div>
        <div className="info-row">
          <span className="info-label">Environment:</span>
          <span className="info-value">{buildInfo.environment}</span>
        </div>
        <div className="info-row">
          <span className="info-label">Xray Status:</span>
          <span className="info-value">{buildInfo.xrayStatus}</span>
        </div>
      </div>
    </div>
  );
}
