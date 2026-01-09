import { Provider, ProviderInfo } from '../types/chat';

interface ProviderSelectorProps {
  providers: ProviderInfo[];
  currentProvider: Provider;
  onProviderChange: (provider: Provider) => void;
}

export function ProviderSelector({
  providers,
  currentProvider,
  onProviderChange,
}: ProviderSelectorProps) {
  return (
    <div className="provider-selector">
      <label htmlFor="provider-select">Model:</label>
      <select
        id="provider-select"
        value={currentProvider}
        onChange={(e) => onProviderChange(e.target.value as Provider)}
      >
        {providers.map((provider) => (
          <option
            key={provider.id}
            value={provider.id}
            disabled={!provider.enabled}
          >
            {provider.name} {!provider.enabled && '(not configured)'}
          </option>
        ))}
      </select>
    </div>
  );
}
