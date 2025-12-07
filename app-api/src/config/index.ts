export interface Config {
  port: number;
  buildMetadata: {
    buildName: string;
    buildNumber: string;
    gitCommit: string;
    environment: string;
    xrayStatus: string;
  };
}

export function getConfig(): Config {
  return {
    port: parseInt(process.env.PORT || '4000', 10),
    buildMetadata: {
      buildName: process.env.BUILD_NAME || 'frogstatus',
      buildNumber: process.env.BUILD_NUMBER || '1',
      gitCommit: process.env.GIT_COMMIT || 'LOCAL_DEV',
      environment: process.env.ENVIRONMENT || 'dev',
      xrayStatus: process.env.XRAY_STATUS || 'UNKNOWN',
    },
  };
}
