import { useEffect, useState } from 'react';
import { getBuildInfo } from './api/getBuildInfo';
import { getDependencies } from './api/getDependencies';
import { BuildInfo, Dependency } from './api/types';
import { BuildPanel } from './components/BuildPanel';
import { DependencyPanel } from './components/DependencyPanel';
import { JFrogFeaturesPanel } from './components/JFrogFeaturesPanel';
import { ChatWidget } from './components/ChatWidget';
import './App.css';

function App() {
  const [buildInfo, setBuildInfo] = useState<BuildInfo | null>(null);
  const [dependencies, setDependencies] = useState<Dependency[]>([]);
  const [buildLoading, setBuildLoading] = useState(true);
  const [depsLoading, setDepsLoading] = useState(true);
  const [buildError, setBuildError] = useState<string | null>(null);
  const [depsError, setDepsError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchBuildInfo() {
      try {
        const data = await getBuildInfo();
        setBuildInfo(data);
      } catch (err) {
        setBuildError(err instanceof Error ? err.message : 'Failed to load build info');
      } finally {
        setBuildLoading(false);
      }
    }

    async function fetchDependencies() {
      try {
        const data = await getDependencies();
        setDependencies(data);
      } catch (err) {
        setDepsError(err instanceof Error ? err.message : 'Failed to load dependencies');
      } finally {
        setDepsLoading(false);
      }
    }

    fetchBuildInfo();
    fetchDependencies();
  }, []);

  return (
    <div className="app">
      <header className="header">
        <h1>FrogStatus</h1>
      </header>
      <div className="container">
        <div className="panels">
          <BuildPanel buildInfo={buildInfo} loading={buildLoading} error={buildError} />
          <DependencyPanel dependencies={dependencies} loading={depsLoading} error={depsError} />
          <JFrogFeaturesPanel buildInfo={buildInfo} />
        </div>
      </div>
      <ChatWidget />
    </div>
  );
}

export default App;
