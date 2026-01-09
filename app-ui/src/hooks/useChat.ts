import { useState, useCallback } from 'react';
import { Message, Provider } from '../types/chat';
import { sendMessage, streamMessage } from '../services/chatService';
import { chatWithLocalModel } from '../services/transformersService';

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentProvider, setCurrentProvider] = useState<Provider>('local');
  const [useJFrogContext, setUseJFrogContext] = useState(false);

  const addMessage = useCallback((message: Omit<Message, 'id' | 'timestamp'>) => {
    const newMessage: Message = {
      ...message,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, newMessage]);
    return newMessage;
  }, []);

  const sendUserMessage = useCallback(async (content: string) => {
    // Add user message
    addMessage({ role: 'user', content, provider: currentProvider });
    setIsLoading(true);

    try {
      // Prepare conversation history
      const conversationMessages = messages.map(m => ({
        role: m.role,
        content: m.content,
      }));
      conversationMessages.push({ role: 'user', content });

      let response: string;

      if (currentProvider === 'local') {
        // Use local model
        response = await chatWithLocalModel(conversationMessages);
      } else {
        // Use cloud provider
        response = await sendMessage({
          provider: currentProvider,
          messages: conversationMessages,
          useJFrogContext,
        });
      }

      // Add assistant response
      addMessage({
        role: 'assistant',
        content: response,
        provider: currentProvider,
      });
    } catch (error) {
      console.error('Chat error:', error);
      addMessage({
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        provider: currentProvider,
      });
    } finally {
      setIsLoading(false);
    }
  }, [messages, currentProvider, useJFrogContext, addMessage]);

  const sendUserMessageStreaming = useCallback(async (content: string) => {
    if (currentProvider === 'local') {
      // Local model doesn't support streaming, fall back to normal
      return sendUserMessage(content);
    }

    // Add user message
    addMessage({ role: 'user', content, provider: currentProvider });
    setIsLoading(true);

    // Add placeholder for streaming response
    const assistantMessage = addMessage({
      role: 'assistant',
      content: '',
      provider: currentProvider,
    });

    try {
      const conversationMessages = messages.map(m => ({
        role: m.role,
        content: m.content,
      }));
      conversationMessages.push({ role: 'user', content });

      let fullResponse = '';

      for await (const chunk of streamMessage({
        provider: currentProvider,
        messages: conversationMessages,
        useJFrogContext,
      })) {
        fullResponse += chunk;

        // Update the assistant message
        setMessages(prev =>
          prev.map(m =>
            m.id === assistantMessage.id
              ? { ...m, content: fullResponse }
              : m
          )
        );
      }
    } catch (error) {
      console.error('Streaming error:', error);
      setMessages(prev =>
        prev.map(m =>
          m.id === assistantMessage.id
            ? {
              ...m,
              content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
            }
            : m
        )
      );
    } finally {
      setIsLoading(false);
    }
  }, [messages, currentProvider, useJFrogContext, addMessage, sendUserMessage]);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    isLoading,
    currentProvider,
    setCurrentProvider,
    useJFrogContext,
    setUseJFrogContext,
    sendMessage: sendUserMessageStreaming,
    clearMessages,
  };
}
