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
      <table className="deps-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Version</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {dependencies.map((dep) => (
            <tr key={dep.name}>
              <td>{dep.name}</td>
              <td>{dep.version}</td>
              <td>
                <span className={`status-badge ${getStatusClass(dep.status)}`}>
                  {dep.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
