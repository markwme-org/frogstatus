import { Message } from '../types/chat';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';

  // Render markdown for assistant messages
  const content = isUser
    ? message.content
    : DOMPurify.sanitize(marked.parse(message.content) as string);

  return (
    <div className={`chat-message ${isUser ? 'user' : 'assistant'}`}>
      <div className="message-content">
        {isUser ? (
          <p>{content}</p>
        ) : (
          <div dangerouslySetInnerHTML={{ __html: content }} />
        )}
      </div>
      {message.provider && (
        <div className="message-meta">
          <span className="message-provider">{message.provider}</span>
        </div>
      )}
    </div>
  );
}
