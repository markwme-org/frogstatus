import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import App from '../App';

// Mock the API functions
vi.mock('../api/getBuildInfo', () => ({
  getBuildInfo: vi.fn(() =>
    Promise.resolve({
      buildName: 'frogstatus',
      buildNumber: '1',
      gitCommit: 'abc123',
      environment: 'test',
      xrayStatus: 'OK',
    })
  ),
}));

vi.mock('../api/getDependencies', () => ({
  getDependencies: vi.fn(() =>
    Promise.resolve([
      { name: 'lodash', version: '4.17.21', status: 'ok' },
      { name: 'jsonwebtoken', version: '9.0.0', status: 'ok' },
    ])
  ),
}));

// Mock ChatWidget to avoid axios DataCloneError in test environment
vi.mock('../components/ChatWidget', () => ({
  ChatWidget: () => null,
}));

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the FrogStatus header', () => {
    render(<App />);
    expect(screen.getByText('FrogStatus')).toBeDefined();
  });

  it('renders build information panel', async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText('Build Information')).toBeDefined();
    });
  });

  it('renders dependency health panel', async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText('Dependency Health')).toBeDefined();
    });
  });

  it('renders JFrog features panel', async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText('JFrog Feature Flags')).toBeDefined();
    });
  });

  it('displays build metadata from API', async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText('frogstatus')).toBeDefined();
      expect(screen.getByText('abc123')).toBeDefined();
    });
  });

  it('displays dependencies from API', async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText('lodash')).toBeDefined();
      expect(screen.getByText('4.17.21')).toBeDefined();
    });
  });
});
