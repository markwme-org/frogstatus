import axios from 'axios';
import { ChatRequest, ChatResponse, ProvidersResponse } from '../types/chat';

const API_BASE = '/api';

export async function getProviders(): Promise<ProvidersResponse> {
  const response = await axios.get<ProvidersResponse>(`${API_BASE}/chat/providers`);
  return response.data;
}

export async function sendMessage(request: ChatRequest): Promise<string> {
  const response = await axios.post<ChatResponse>(`${API_BASE}/chat`, request);
  return response.data.response;
}

export async function* streamMessage(request: ChatRequest): AsyncGenerator<string> {
  const response = await fetch(`${API_BASE}/chat/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`Stream failed: ${response.statusText}`);
  }

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  if (!reader) {
    throw new Error('No response body');
  }

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split('\n');

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = JSON.parse(line.slice(6));

        if (data.error) {
          throw new Error(data.error);
        }

        if (data.done) {
          return;
        }

        if (data.content) {
          yield data.content;
        }
      }
    }
  }
}
