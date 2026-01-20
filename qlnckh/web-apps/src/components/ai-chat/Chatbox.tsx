import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { MessageCircle, X, Send, Minimize2, Maximize2, Trash2, FileText } from 'lucide-react';
import { ChatMessage } from './ChatMessage';
import { aiChatApi, ChatMessage as ChatMessageType } from '../../lib/api/ai-chat';
import { proposalsApi } from '../../lib/api/proposals';
import { useAuthStore } from '../../stores/authStore';
import { cn } from '../../lib/utils/cn';

interface ChatboxProps {
  /** Optional proposal ID for context-aware chat */
  proposalId?: string;
  /** Optional proposal title for display */
  proposalTitle?: string;
}

export function Chatbox({ proposalId: propProposalId, proposalTitle: propProposalTitle }: ChatboxProps) {
  const location = useLocation();

  // Auto-detect proposal ID from URL if not provided via props
  const detectedProposalId = useMemo(() => {
    if (propProposalId) return propProposalId;
    const match = location.pathname.match(/\/proposals\/([a-zA-Z0-9-]+)/);
    return match ? match[1] : undefined;
  }, [location.pathname, propProposalId]);

  const [proposalId, setProposalId] = useState<string | undefined>(detectedProposalId);
  const [proposalTitle, setProposalTitle] = useState<string | undefined>(propProposalTitle);

  // Fetch proposal title when on proposal page
  useEffect(() => {
    const fetchProposalTitle = async () => {
      if (detectedProposalId && !propProposalTitle) {
        try {
          const proposal = await proposalsApi.getProposalById(detectedProposalId);
          setProposalTitle(proposal.title);
          setProposalId(detectedProposalId);
        } catch {
          setProposalTitle(undefined);
          setProposalId(undefined);
        }
      } else if (!detectedProposalId) {
        setProposalId(undefined);
        setProposalTitle(undefined);
      }
    };
    fetchProposalTitle();
  }, [detectedProposalId, propProposalTitle]);
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Get auth state
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  // Check AI availability on mount (only if authenticated)
  useEffect(() => {
    const checkAvailability = async () => {
      if (!isAuthenticated) {
        setIsAvailable(null); // Don't hide, just unknown
        return;
      }
      try {
        const health = await aiChatApi.checkHealth();
        setIsAvailable(health.available);
      } catch {
        // On error, assume available and let user try
        // Error will show when they actually try to chat
        setIsAvailable(true);
      }
    };
    checkAvailability();
  }, [isAuthenticated]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && !isMinimized) {
      inputRef.current?.focus();
    }
  }, [isOpen, isMinimized]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessageType = {
      role: 'user',
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      let response;

      if (proposalId) {
        // Chat with proposal context
        response = await aiChatApi.chatWithProposal({
          message: userMessage.content,
          proposalId,
          history: messages,
        });
      } else {
        // Basic chat
        response = await aiChatApi.chatCompletion({
          messages: [...messages, userMessage],
          systemPrompt: 'Bạn là trợ lý AI cho hệ thống Quản lý Nghiên cứu Khoa học. Trả lời bằng tiếng Việt, ngắn gọn và hữu ích.',
        });
      }

      const assistantMessage: ChatMessageType = {
        role: 'assistant',
        content: response.content,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Có lỗi xảy ra';
      setError(errorMessage);
      // Remove the user message if there was an error
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages, proposalId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    setError(null);
  };

  // Always render chatbox - errors will be shown when user tries to chat
  // This prevents the chatbox from disappearing unexpectedly

  return (
    <>
      {/* Floating button - positioned lower on mobile to avoid overlap */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className={cn(
            'fixed z-50',
            // Mobile: smaller, lower position to avoid mobile header and gestures
            'bottom-20 right-4 w-12 h-12',
            // Desktop: original position and size
            'sm:bottom-6 sm:right-6 sm:w-14 sm:h-14',
            'rounded-full shadow-lg',
            'bg-gradient-to-br from-purple-500 to-indigo-600',
            'hover:from-purple-600 hover:to-indigo-700',
            'flex items-center justify-center',
            'transition-all duration-200 hover:scale-105 active:scale-95',
            'focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2'
          )}
          title={proposalId ? `AI Chat - ${proposalTitle || 'Đề tài'}` : 'Mở AI Chat'}
        >
          <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          {/* Context indicator - show file icon when on proposal page */}
          {proposalId ? (
            <span className="absolute -top-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 bg-amber-400 rounded-full border-2 border-white flex items-center justify-center">
              <FileText className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-amber-800" />
            </span>
          ) : (
            <span className="absolute top-0 right-0 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-green-400 rounded-full border-2 border-white" />
          )}
        </button>
      )}

      {/* Chat window - fullscreen on mobile, floating on desktop */}
      {isOpen && (
        <div
          className={cn(
            'fixed z-50',
            'bg-white flex flex-col overflow-hidden',
            'transition-all duration-200',
            // Mobile: fullscreen
            'inset-0 rounded-none',
            // Desktop: floating window
            'sm:inset-auto sm:bottom-6 sm:right-6 sm:rounded-2xl sm:shadow-2xl sm:border sm:border-gray-200',
            isMinimized
              ? 'sm:w-72 sm:h-14'
              : 'sm:w-96 sm:h-[500px]'
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white safe-area-top">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <MessageCircle className="w-5 h-5 flex-shrink-0" />
              <div className="min-w-0">
                <h3 className="font-semibold text-sm">AI Assistant</h3>
                {proposalTitle && !isMinimized && (
                  <p className="text-xs text-purple-100 truncate">
                    {proposalTitle}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {!isMinimized && messages.length > 0 && (
                <button
                  onClick={handleClearChat}
                  className="p-2 sm:p-1.5 hover:bg-white/20 rounded-lg transition-colors min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center"
                  title="Xóa hội thoại"
                >
                  <Trash2 className="w-5 h-5 sm:w-4 sm:h-4" />
                </button>
              )}
              {/* Minimize button - hide on mobile since it's fullscreen */}
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="hidden sm:flex p-1.5 hover:bg-white/20 rounded-lg transition-colors items-center justify-center"
                title={isMinimized ? 'Mở rộng' : 'Thu nhỏ'}
              >
                {isMinimized ? (
                  <Maximize2 className="w-4 h-4" />
                ) : (
                  <Minimize2 className="w-4 h-4" />
                )}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 sm:p-1.5 hover:bg-white/20 rounded-lg transition-colors min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center"
                title="Đóng"
              >
                <X className="w-5 h-5 sm:w-4 sm:h-4" />
              </button>
            </div>
          </div>

          {/* Body - only show if not minimized */}
          {!isMinimized && (
            <>
              {/* Messages area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 ? (
                  <div className="text-center text-gray-500 text-sm py-8">
                    <MessageCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="font-medium">Xin chào!</p>
                    <p className="text-xs mt-1">
                      {proposalId
                        ? 'Tôi có thể giúp bạn với đề tài này.'
                        : 'Tôi có thể giúp gì cho bạn?'}
                    </p>
                  </div>
                ) : (
                  <>
                    {messages.map((msg, idx) => (
                      <ChatMessage
                        key={idx}
                        role={msg.role as 'user' | 'assistant'}
                        content={msg.content}
                      />
                    ))}
                    {isLoading && (
                      <ChatMessage role="assistant" content="" isLoading />
                    )}
                  </>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Error message */}
              {error && (
                <div className="px-4 py-2 bg-red-50 border-t border-red-100">
                  <p className="text-xs text-red-600">{error}</p>
                </div>
              )}

              {/* Input area - with safe area padding on mobile */}
              <div className="border-t border-gray-100 p-3 pb-safe">
                <div className="flex items-end gap-2">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Nhập tin nhắn..."
                    rows={1}
                    className={cn(
                      'flex-1 resize-none rounded-xl border border-gray-200',
                      'px-3 py-2.5 sm:py-2 text-sm',
                      'focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent',
                      'max-h-24 overflow-y-auto'
                    )}
                    disabled={isLoading}
                  />
                  <button
                    onClick={handleSend}
                    disabled={!input.trim() || isLoading}
                    className={cn(
                      'p-3 sm:p-2.5 rounded-xl transition-all',
                      'min-w-[44px] min-h-[44px] flex items-center justify-center',
                      'bg-gradient-to-r from-purple-500 to-indigo-600',
                      'hover:from-purple-600 hover:to-indigo-700',
                      'disabled:opacity-50 disabled:cursor-not-allowed',
                      'focus:outline-none focus:ring-2 focus:ring-purple-500'
                    )}
                  >
                    <Send className="w-5 h-5 sm:w-4 sm:h-4 text-white" />
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-2 text-center">
                  Powered by Z.AI
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
