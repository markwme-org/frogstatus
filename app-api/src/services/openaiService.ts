import OpenAI from 'openai';
import { getLLMConfig } from '../config/llm.js';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export async function chatWithOpenAI(
  messages: ChatMessage[],
  stream: boolean = false
): Promise<string | AsyncIterable<string>> {
  const config = getLLMConfig();

  if (!config.openai.enabled) {
    throw new Error('OpenAI is not configured');
  }

  const openai = new OpenAI({
    apiKey: config.openai.apiKey,
  });

  if (stream) {
    const response = await openai.chat.completions.create({
      model: config.openai.model,
      messages: messages,
      stream: true,
    });

    return (async function* () {
      for await (const chunk of response) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) yield content;
      }
    })();
  } else {
    const response = await openai.chat.completions.create({
      model: config.openai.model,
      messages: messages,
      stream: false,
    });

    return response.choices[0]?.message?.content || '';
  }
}
