/**
 * LiveConnect Widget - ChatPanel Component.
 * In-call chat overlay with message list, input field, and send button.
 */

import { h } from 'preact';
import { useState, useRef, useEffect } from 'preact/hooks';

/**
 * Represents a chat message in the conversation.
 */
export interface ChatMessage {
  /** Unique identifier for the message */
  id: string;
  /** Message text content */
  content: string;
  /** Type of sender - REP for representative, VISITOR for site visitor */
  senderType: 'REP' | 'VISITOR';
  /** Display name of the sender */
  senderName: string;
  /** ISO 8601 timestamp when the message was sent */
  sentAt: string;
}

/**
 * Props for the ChatPanel component.
 */
export interface ChatPanelProps {
  /** Array of chat messages to display */
  messages: ChatMessage[];
  /** Callback fired when user sends a message */
  onSendMessage: (content: string) => void;
  /** Whether a message is currently being sent */
  isLoading?: boolean;
}

// ============================================================================
// SVG Icons (Tabler Icons)
// ============================================================================

/**
 * Send icon for the message submit button.
 * @returns SVG element
 */
function SendIcon(): h.JSX.Element {
  return (
    <svg
      class="lc-chat__send-icon"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M10 14l11 -11" />
      <path d="M21 3l-6.5 18a.55 .55 0 0 1 -1 0l-3.5 -7l-7 -3.5a.55 .55 0 0 1 0 -1l18 -6.5" />
    </svg>
  );
}

/**
 * Message icon for empty state.
 * @returns SVG element
 */
function MessageBubbleIcon(): h.JSX.Element {
  return (
    <svg
      class="lc-chat__empty-icon"
      width="48"
      height="48"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M8 9h8" />
      <path d="M8 13h6" />
      <path d="M18 4a3 3 0 0 1 3 3v8a3 3 0 0 1 -3 3h-5l-5 3v-3h-2a3 3 0 0 1 -3 -3v-8a3 3 0 0 1 3 -3h12z" />
    </svg>
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Formats an ISO timestamp to a human-readable time string.
 * Shows "Just now" for messages less than a minute old,
 * otherwise shows time in HH:MM AM/PM format.
 *
 * @param isoTimestamp - ISO 8601 timestamp string
 * @returns Formatted time string
 */
function formatMessageTime(isoTimestamp: string): string {
  const messageDate = new Date(isoTimestamp);
  const now = new Date();
  const diffMs = now.getTime() - messageDate.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);

  // Show "Just now" for messages less than 60 seconds old
  if (diffSeconds < 60) {
    return 'Just now';
  }

  // Format as time (e.g., "2:30 PM")
  return messageDate.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

// ============================================================================
// ChatPanel Component
// ============================================================================

/**
 * ChatPanel component for in-call messaging.
 * Displays a scrollable list of messages with an input field for sending new messages.
 *
 * Features:
 * - Auto-scrolls to newest message when new messages arrive
 * - Differentiates between sent (visitor) and received (rep) messages
 * - Shows sender name and timestamp for each message
 * - Empty state when no messages exist
 * - Supports Enter key to send and Shift+Enter for newlines
 *
 * @param props - Component props
 * @returns ChatPanel element
 *
 * @example
 * ```tsx
 * <ChatPanel
 *   messages={[
 *     {
 *       id: '1',
 *       content: 'Hello!',
 *       senderType: 'VISITOR',
 *       senderName: 'John',
 *       sentAt: '2024-01-15T10:30:00Z'
 *     }
 *   ]}
 *   onSendMessage={(content) => sendMessage(content)}
 *   isLoading={false}
 * />
 * ```
 */
export function ChatPanel({
  messages,
  onSendMessage,
  isLoading = false,
}: ChatPanelProps): h.JSX.Element {
  // Input field state
  const [inputValue, setInputValue] = useState('');

  // Ref for auto-scrolling to bottom
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Ref for the input field
  const inputRef = useRef<HTMLInputElement>(null);

  /**
   * Auto-scroll to bottom when new messages arrive.
   */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  /**
   * Handles form submission to send a message.
   */
  const handleSubmit = (): void => {
    const trimmedValue = inputValue.trim();
    if (trimmedValue && !isLoading) {
      onSendMessage(trimmedValue);
      setInputValue('');
      // Refocus the input after sending
      inputRef.current?.focus();
    }
  };

  /**
   * Handles input field changes.
   * @param event - Input event
   */
  const handleInputChange = (event: Event): void => {
    const target = event.target as HTMLInputElement;
    setInputValue(target.value);
  };

  /**
   * Handles keyboard events in the input field.
   * Enter sends the message, Shift+Enter is ignored (for potential multiline).
   * @param event - Keyboard event
   */
  const handleKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  };

  /**
   * Handles send button click.
   * @param event - Mouse event
   */
  const handleSendClick = (event: MouseEvent): void => {
    event.preventDefault();
    handleSubmit();
  };

  /**
   * Determines if the send button should be disabled.
   */
  const isSendDisabled = !inputValue.trim() || isLoading;

  return (
    <div class="lc-chat" role="region" aria-label="Chat panel">
      {/* Messages container */}
      <div
        class="lc-chat__messages"
        role="log"
        aria-live="polite"
        aria-label="Chat messages"
      >
        {messages.length === 0 ? (
          // Empty state
          <div class="lc-chat__empty">
            <MessageBubbleIcon />
            <p class="lc-text lc-text--muted">No messages yet</p>
            <p class="lc-text lc-text--sm lc-text--muted">
              Send a message to start the conversation
            </p>
          </div>
        ) : (
          // Message list
          messages.map((message) => {
            const isSent = message.senderType === 'VISITOR';
            const messageClass = isSent
              ? 'lc-chat__message lc-chat__message--sent'
              : 'lc-chat__message lc-chat__message--received';

            return (
              <div key={message.id} class={messageClass}>
                {/* Message metadata (sender name and time) */}
                <div class="lc-chat__message-meta">
                  <span class="lc-chat__message-sender">
                    {message.senderName}
                  </span>
                  <span class="lc-chat__message-time">
                    {formatMessageTime(message.sentAt)}
                  </span>
                </div>
                {/* Message content bubble */}
                <div class="lc-chat__message-bubble">
                  {message.content}
                </div>
              </div>
            );
          })
        )}
        {/* Scroll anchor */}
        <div ref={messagesEndRef} aria-hidden="true" />
      </div>

      {/* Input area */}
      <div class="lc-chat__input-area">
        <input
          ref={inputRef}
          type="text"
          class="lc-chat__input"
          placeholder="Type a message..."
          value={inputValue}
          onInput={handleInputChange}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          aria-label="Chat message input"
        />
        <button
          type="button"
          class="lc-chat__send"
          onClick={handleSendClick}
          disabled={isSendDisabled}
          aria-label="Send message"
          title="Send"
        >
          {isLoading ? (
            <span class="lc-spinner lc-spinner--sm" aria-hidden="true" />
          ) : (
            <SendIcon />
          )}
        </button>
      </div>

      {/* Screen reader announcement for loading state */}
      {isLoading && (
        <span class="lc-sr-only" role="status" aria-live="polite">
          Sending message...
        </span>
      )}
    </div>
  );
}

export default ChatPanel;