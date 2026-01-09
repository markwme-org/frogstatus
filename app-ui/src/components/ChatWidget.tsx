import { useState, useEffect, useRef } from 'react';
import { useChat } from '../hooks/useChat';
import { useLocalModel } from '../hooks/useLocalModel';
import { getProviders } from '../services/chatService';
import { ProviderInfo } from '../types/chat';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { ProviderSelector } from './ProviderSelector';
import './ChatWidget.css';

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [mcpEnabled, setMcpEnabled] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    isLoading,
    currentProvider,
    setCurrentProvider,
    useJFrogContext,
    setUseJFrogContext,
    sendMessage,
    clearMessages,
  } = useChat();

  const {
    isLoaded: modelLoaded,
    isLoading: modelLoading,
    loadProgress,
    loadModel,
  } = useLocalModel();

  useEffect(() => {
    // Fetch available providers
    getProviders().then(data => {
      setProviders(data.providers);
      setMcpEnabled(data.mcpEnabled);
    });
  }, []);

  useEffect(() => {
    // Auto-scroll to bottom on new messages
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (content: string) => {
    if (!content.trim()) return;

    // Load local model if needed
    if (currentProvider === 'local' && !modelLoaded && !modelLoading) {
      await loadModel();
    }

    await sendMessage(content);
  };

  const toggleWidget = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className={`chat-widget ${isOpen ? 'open' : 'closed'}`}>
      {!isOpen && (
        <button className="chat-toggle" onClick={toggleWidget}>
          <span className="chat-icon">💬</span>
        </button>
      )}

      {isOpen && (
        <div className="chat-container">
          <div className="chat-header">
            <h3>FrogStatus Assistant</h3>
            <div className="chat-header-actions">
              <button
                className="chat-clear"
                onClick={clearMessages}
                title="Clear conversation"
              >
                🗑️
              </button>
              <button
                className="chat-close"
                onClick={toggleWidget}
              >
                ✕
              </button>
            </div>
          </div>

          <div className="chat-controls">
            <ProviderSelector
              providers={providers}
              currentProvider={currentProvider}
              onProviderChange={setCurrentProvider}
            />

            {mcpEnabled && currentProvider !== 'local' && (
              <label className="jfrog-context-toggle">
                <input
                  type="checkbox"
                  checked={useJFrogContext}
                  onChange={(e) => setUseJFrogContext(e.target.checked)}
                />
                <span title="JFrog MCP integration (demo only - not fully implemented)">
                  Use JFrog Context
                </span>
              </label>
            )}
          </div>

          {currentProvider === 'local' && modelLoading && (
            <div className="model-loading">
              <div className="loading-text">
                Loading local model... {loadProgress}%
              </div>
              <div className="loading-bar">
                <div
                  className="loading-progress"
                  style={{ width: `${loadProgress}%` }}
                />
              </div>
            </div>
          )}

          <div className="chat-messages">
            {messages.length === 0 && (
              <div className="chat-welcome">
                <p>Hello! I'm your FrogStatus assistant.</p>
                <p>I can help you with:</p>
                <ul>
                  <li>JFrog platform status and queries</li>
                  <li>Build and deployment information</li>
                  <li>Security and vulnerability analysis</li>
                  <li>General development questions</li>
                </ul>
              </div>
            )}

            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}

            {isLoading && (
              <div className="chat-loading">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <ChatInput
            onSend={handleSend}
            disabled={isLoading || (currentProvider === 'local' && modelLoading)}
          />
        </div>
      )}
    </div>
  );
}
