import { Dependency } from './types';

export async function getDependencies(): Promise<Dependency[]> {
  const response = await fetch('/api/dependencies');
  if (!response.ok) {
    throw new Error('Failed to fetch dependencies');
  }
  return response.json();
}
