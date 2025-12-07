import { Dependency } from '../api/types';

interface DependencyPanelProps {
  dependencies: Dependency[];
  loading: boolean;
  error: string | null;
}

function getStatusClass(status: string): string {
  if (status === 'ok') return 'ok';
  if (status === 'vulnerable') return 'vulnerable';
  return 'unknown';
}

export function DependencyPanel({ dependencies, loading, error }: DependencyPanelProps) {
  if (loading) {
    return (
      <div className="panel">
        <h2>Dependency Health</h2>
        <div className="loading">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="panel">
        <h2>Dependency Health</h2>
        <div className="error">{error}</div>
      </div>
    );
  }

  return (
    <div className="panel">
      <h2>Dependency Health</h2>
      <div className="table-wrapper">
        <table className="deps-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Version</th>
              <th>Status</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {dependencies.map((dep) => (
              <tr key={dep.name}>
                <td>{dep.name}</td>
                <td>{dep.version}</td>
                <td>
                  <div className="status-cell">
                    <span className={`status-badge ${getStatusClass(dep.status)}`}>
                      {dep.status}
                    </span>
                    {dep.severity && (
                      <span className={`severity-badge severity-${dep.severity.toLowerCase()}`}>
                        {dep.severity}
                      </span>
                    )}
                  </div>
                </td>
                <td>
                  {dep.cves && dep.cves.length > 0 ? (
                    <div className="cve-list">
                      {dep.cves.slice(0, 2).map((cve) => (
                        <span key={cve} className="cve-badge">{cve}</span>
                      ))}
                      {dep.cves.length > 2 && (
                        <span className="cve-badge">+{dep.cves.length - 2} more</span>
                      )}
                    </div>
                  ) : (
                    <span className="no-cves">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
