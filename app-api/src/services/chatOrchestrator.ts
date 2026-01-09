import { chatWithOpenAI, ChatMessage } from './openaiService.js';
import { chatWithAnthropic } from './anthropicService.js';
import { chatWithGemini } from './geminiService.js';
import { queryJFrogMCP } from './mcpService.js';

export type Provider = 'openai' | 'anthropic' | 'gemini' | 'local';

export interface ChatRequest {
  provider: Provider;
  messages: ChatMessage[];
  stream?: boolean;
  useJFrogContext?: boolean;
}

const SYSTEM_PROMPT = `You are a helpful assistant for the FrogStatus application, a JFrog demo platform. You can answer questions about:
- JFrog products (Artifactory, Xray, Curation)
- Build information and deployment status
- Dependency vulnerabilities and security
- General development questions

When asked about JFrog-specific information, I will query the JFrog platform via MCP.`;

export async function orchestrateChat(
  request: ChatRequest
): Promise<string | AsyncIterable<string>> {
  // Add system prompt if not present
  const messages = request.messages[0]?.role === 'system'
    ? request.messages
    : [{ role: 'system' as const, content: SYSTEM_PROMPT }, ...request.messages];

  // Check if query needs JFrog context
  if (request.useJFrogContext) {
    const lastUserMessage = messages
      .filter(m => m.role === 'user')
      .pop()?.content || '';

    const jfrogData = await queryJFrogMCP(lastUserMessage);

    // Inject JFrog data as context
    messages.push({
      role: 'system',
      content: `JFrog Platform Data: ${jfrogData}`,
    });
  }

  // Route to appropriate provider
  switch (request.provider) {
    case 'openai':
      return chatWithOpenAI(messages, request.stream);
    case 'anthropic':
      return chatWithAnthropic(messages, request.stream);
    case 'gemini':
      return chatWithGemini(messages, request.stream);
    case 'local':
      // Local model is handled client-side, this shouldn't be called
      throw new Error('Local model should be handled client-side');
    default:
      throw new Error(`Unknown provider: ${request.provider}`);
  }
}
