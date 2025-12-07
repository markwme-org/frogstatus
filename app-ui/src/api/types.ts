export interface BuildInfo {
  buildName: string;
  buildNumber: string;
  gitCommit: string;
  environment: string;
  xrayStatus: string;
}

export interface Dependency {
  name: string;
  version: string;
  status: string;
}
