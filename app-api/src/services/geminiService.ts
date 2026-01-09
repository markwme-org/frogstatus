import { GoogleGenerativeAI } from '@google/generative-ai';
import { getLLMConfig } from '../config/llm.js';
import { ChatMessage } from './openaiService.js';

export async function chatWithGemini(
  messages: ChatMessage[],
  stream: boolean = false
): Promise<string | AsyncIterable<string>> {
  const config = getLLMConfig();

  if (!config.gemini.enabled) {
    throw new Error('Google Gemini is not configured');
  }

  const genAI = new GoogleGenerativeAI(config.gemini.apiKey!);
  const model = genAI.getGenerativeModel({ model: config.gemini.model });

  // Convert messages to Gemini format
  const systemMessage = messages.find(m => m.role === 'system')?.content;
  const history = messages
    .filter(m => m.role !== 'system' && m.role !== 'user')
    .slice(0, -1) // Exclude the last user message
    .map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

  const lastUserMessage = messages
    .filter(m => m.role === 'user')
    .pop()?.content || '';

  const chat = model.startChat({
    history,
    systemInstruction: systemMessage,
  } as any);

  if (stream) {
    const result = await chat.sendMessageStream(lastUserMessage);

    return (async function* () {
      for await (const chunk of result.stream) {
        yield chunk.text();
      }
    })();
  } else {
    const result = await chat.sendMessage(lastUserMessage);
    return result.response.text();
  }
}
