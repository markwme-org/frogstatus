export interface LLMConfig {
  openai: {
    apiKey: string | undefined;
    model: string;
    enabled: boolean;
  };
  anthropic: {
    apiKey: string | undefined;
    model: string;
    enabled: boolean;
  };
  gemini: {
    apiKey: string | undefined;
    model: string;
    enabled: boolean;
  };
  mcp: {
    enabled: boolean;
    jfrogUrl: string | undefined;
    jfrogToken: string | undefined;
  };
}

let cachedConfig: LLMConfig | null = null;

export function getLLMConfig(): LLMConfig {
  if (!cachedConfig) {
    cachedConfig = {
      openai: {
        apiKey: process.env.OPENAI_API_KEY,
        model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
        enabled: Boolean(process.env.OPENAI_API_KEY),
      },
      anthropic: {
        apiKey: process.env.ANTHROPIC_API_KEY,
        model: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022',
        enabled: Boolean(process.env.ANTHROPIC_API_KEY),
      },
      gemini: {
        apiKey: process.env.GOOGLE_API_KEY,
        model: process.env.GEMINI_MODEL || 'gemini-pro',
        enabled: Boolean(process.env.GOOGLE_API_KEY),
      },
      mcp: {
        enabled: process.env.MCP_SERVER_ENABLED === 'true',
        jfrogUrl: process.env.JFROG_PLATFORM_URL,
        jfrogToken: process.env.JFROG_ACCESS_TOKEN,
      },
    };

    // Debug logging
    console.log('🤖 LLM Configuration:');
    console.log('   OpenAI:', cachedConfig.openai.enabled ? '✅ Enabled' : '❌ Disabled');
    console.log('   Anthropic:', cachedConfig.anthropic.enabled ? '✅ Enabled' : '❌ Disabled');
    console.log('   Gemini:', cachedConfig.gemini.enabled ? '✅ Enabled' : '❌ Disabled');
    console.log('   MCP Server:', cachedConfig.mcp.enabled ? '✅ Enabled' : '❌ Disabled');
  }

  return cachedConfig;
}
