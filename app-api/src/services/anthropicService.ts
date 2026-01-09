import Anthropic from '@anthropic-ai/sdk';
import { getLLMConfig } from '../config/llm.js';
import { ChatMessage } from './openaiService.js';

export async function chatWithAnthropic(
  messages: ChatMessage[],
  stream: boolean = false
): Promise<string | AsyncIterable<string>> {
  const config = getLLMConfig();

  if (!config.anthropic.enabled) {
    throw new Error('Anthropic is not configured');
  }

  const anthropic = new Anthropic({
    apiKey: config.anthropic.apiKey,
  });

  // Convert messages format (separate system from user/assistant)
  const systemMessage = messages.find(m => m.role === 'system')?.content;
  const conversationMessages = messages
    .filter(m => m.role !== 'system')
    .map(m => ({ role: m.role, content: m.content }));

  if (stream) {
    const response = await anthropic.messages.create({
      model: config.anthropic.model,
      max_tokens: 4096,
      system: systemMessage,
      messages: conversationMessages as any,
      stream: true,
    });

    return (async function* () {
      for await (const event of response) {
        if (event.type === 'content_block_delta' &&
          event.delta.type === 'text_delta') {
          yield event.delta.text;
        }
      }
    })();
  } else {
    const response = await anthropic.messages.create({
      model: config.anthropic.model,
      max_tokens: 4096,
      system: systemMessage,
      messages: conversationMessages as any,
      stream: false,
    });

    const textContent = response.content.find(c => c.type === 'text');
    return (textContent as any)?.text || '';
  }
}
