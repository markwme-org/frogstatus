import { BuildInfo } from './types';

export async function getBuildInfo(): Promise<BuildInfo> {
  const response = await fetch('/api/build');
  if (!response.ok) {
    throw new Error('Failed to fetch build info');
  }
  return response.json();
}
