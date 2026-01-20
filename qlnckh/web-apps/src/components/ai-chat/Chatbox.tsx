import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { MessageCircle, X, Send, Minimize2, Maximize2, Trash2, FileText } from 'lucide-react';
import { ChatMessage } from './ChatMessage';
import { aiChatApi, ChatMessage as ChatMessageType } from '../../lib/api/ai-chat';
import { proposalsApi } from '../../lib/api/proposals';
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

  // Check AI availability on mount
  useEffect(() => {
    const checkAvailability = async () => {
      try {
        const health = await aiChatApi.checkHealth();
        setIsAvailable(health.available);
      } catch {
        setIsAvailable(false);
      }
    };
    checkAvailability();
  }, []);

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

  // Don't render if AI is not available
  if (isAvailable === false) {
    return null;
  }

  return (
    <>
      {/* Floating button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className={cn(
            'fixed bottom-6 right-6 z-50',
            'w-14 h-14 rounded-full shadow-lg',
            'bg-gradient-to-br from-purple-500 to-indigo-600',
            'hover:from-purple-600 hover:to-indigo-700',
            'flex items-center justify-center',
            'transition-all duration-200 hover:scale-105',
            'focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2'
          )}
          title={proposalId ? `AI Chat - ${proposalTitle || 'Đề tài'}` : 'Mở AI Chat'}
        >
          <MessageCircle className="w-6 h-6 text-white" />
          {/* Context indicator - show file icon when on proposal page */}
          {proposalId ? (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-amber-400 rounded-full border-2 border-white flex items-center justify-center">
              <FileText className="w-3 h-3 text-amber-800" />
            </span>
          ) : (
            <span className="absolute top-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-white" />
          )}
        </button>
      )}

      {/* Chat window */}
      {isOpen && (
        <div
          className={cn(
            'fixed bottom-6 right-6 z-50',
            'bg-white rounded-2xl shadow-2xl border border-gray-200',
            'flex flex-col overflow-hidden',
            'transition-all duration-200',
            isMinimized ? 'w-72 h-14' : 'w-96 h-[500px]'
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              <div>
                <h3 className="font-semibold text-sm">AI Assistant</h3>
                {proposalTitle && !isMinimized && (
                  <p className="text-xs text-purple-100 truncate max-w-[180px]">
                    {proposalTitle}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              {!isMinimized && messages.length > 0 && (
                <button
                  onClick={handleClearChat}
                  className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                  title="Xóa hội thoại"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
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
                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                title="Đóng"
              >
                <X className="w-4 h-4" />
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

              {/* Input area */}
              <div className="border-t border-gray-100 p-3">
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
                      'px-3 py-2 text-sm',
                      'focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent',
                      'max-h-24 overflow-y-auto'
                    )}
                    disabled={isLoading}
                  />
                  <button
                    onClick={handleSend}
                    disabled={!input.trim() || isLoading}
                    className={cn(
                      'p-2.5 rounded-xl transition-all',
                      'bg-gradient-to-r from-purple-500 to-indigo-600',
                      'hover:from-purple-600 hover:to-indigo-700',
                      'disabled:opacity-50 disabled:cursor-not-allowed',
                      'focus:outline-none focus:ring-2 focus:ring-purple-500'
                    )}
                  >
                    <Send className="w-4 h-4 text-white" />
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
