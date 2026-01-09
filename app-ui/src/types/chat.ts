export type Provider = 'openai' | 'anthropic' | 'gemini' | 'local';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  provider?: Provider;
}

export interface ProviderInfo {
  id: Provider;
  name: string;
  enabled: boolean;
  model: string;
}

export interface ProvidersResponse {
  providers: ProviderInfo[];
  mcpEnabled: boolean;
}

export interface ChatRequest {
  provider: Provider;
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
  useJFrogContext?: boolean;
}

export interface ChatResponse {
  response: string;
}
