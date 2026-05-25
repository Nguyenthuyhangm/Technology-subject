import React, { useMemo, useRef, useState } from 'react';
import { Bot, Loader2, Send, Sparkles, Wand2, X } from 'lucide-react';
import { streamAiChat } from '../../api/aiChatApi';
import jellyfishAi from '../../assets/jellyfish-ai.png';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface FloatingAIAssistantProps {
  userId?: string;
  productId?: string;
}

const quickQuestions = [
  'Dựa trên wishlist, gợi ý sản phẩm cho mình',
  'Hôm nay có sản phẩm nào đáng mua không?',
  'Mình nên mua ngay hay chờ giảm giá?',
];

const formatAssistantContent = (content: string) => {
  return content
    // Cho tiêu đề xuống dòng
    .replace(/Trả lời ngắn:\s*/g, 'Trả lời ngắn:\n')
    .replace(/Gợi ý nhanh:\s*/g, 'Gợi ý nhanh:\n')

    // Mỗi dấu "-" thành một dòng bullet riêng
    .replace(/\s*-\s*/g, '\n- ')

    // Kết luận tách riêng ra
    .replace(/\s*Kết luận:\s*/g, '\n\nKết luận: ')

    // Xóa dòng trống thừa
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

export default function FloatingAIAssistant({
  userId,
  productId,
}: FloatingAIAssistantProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content:
        'Xin chào, mình là PriceHawk AI ✨\nMình có thể gợi ý sản phẩm, phân tích giá và đề xuất đặt alert.',
    },
  ]);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  const canSend = useMemo(() => {
    return input.trim().length > 0 && !streaming;
  }, [input, streaming]);

  const scrollToBottom = () => {
    setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  };

  const sendMessage = async (messageText?: string) => {
    const content = (messageText ?? input).trim();

    if (!content || streaming) return;

    setInput('');
    setStreaming(true);

    setMessages((prev) => [
      ...prev,
      {
        role: 'user',
        content,
      },
      {
        role: 'assistant',
        content: '',
      },
    ]);

    scrollToBottom();

    try {
      await streamAiChat(
        {
          message: content,
          userId,
          productId,
        },
        (chunk) => {
          setMessages((prev) => {
            const next = [...prev];
            const lastIndex = next.length - 1;

            if (lastIndex >= 0 && next[lastIndex].role === 'assistant') {
              next[lastIndex] = {
                ...next[lastIndex],
                content: next[lastIndex].content + chunk,
              };
            }

            return next;
          });

          scrollToBottom();
        },
        () => {
          setStreaming(false);
          scrollToBottom();
        },
        (errorMessage) => {
          setMessages((prev) => {
            const next = [...prev];
            const lastIndex = next.length - 1;

            if (lastIndex >= 0 && next[lastIndex].role === 'assistant') {
              next[lastIndex] = {
                ...next[lastIndex],
                content: errorMessage,
              };
            } else {
              next.push({
                role: 'assistant',
                content: errorMessage,
              });
            }

            return next;
          });

          setStreaming(false);
          scrollToBottom();
        },
      );
    } catch (error) {
      console.error(error);

      setMessages((prev) => {
        const next = [...prev];
        const lastIndex = next.length - 1;

        if (lastIndex >= 0 && next[lastIndex].role === 'assistant') {
          next[lastIndex] = {
            ...next[lastIndex],
            content:
              'Xin lỗi, hiện tại mình chưa kết nối được AI. Bạn thử lại sau nhé.',
          };
        } else {
          next.push({
            role: 'assistant',
            content:
              'Xin lỗi, hiện tại mình chưa kết nối được AI. Bạn thử lại sau nhé.',
          });
        }

        return next;
      });

      setStreaming(false);
      scrollToBottom();
    }
  };

  return (
    <>
      <style>
        {`
          @keyframes jellyFloat {
            0% { transform: translateY(0px) scale(1); }
            50% { transform: translateY(-10px) scale(1.02); }
            100% { transform: translateY(0px) scale(1); }
          }

          @keyframes jellyGlow {
            0% {
              box-shadow:
                0 14px 30px rgba(183,132,140,0.22),
                0 0 0 rgba(183,132,140,0.0);
            }
            50% {
              box-shadow:
                0 22px 44px rgba(183,132,140,0.30),
                0 0 28px rgba(215, 190, 196, 0.42);
            }
            100% {
              box-shadow:
                0 14px 30px rgba(183,132,140,0.22),
                0 0 0 rgba(183,132,140,0.0);
            }
          }

          @keyframes sparkleTwinkle {
            0%, 100% { transform: scale(0.9); opacity: 0.55; }
            50% { transform: scale(1.2); opacity: 1; }
          }

          @keyframes sparkleFloat {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-4px); }
          }
        `}
      </style>

      <div className="fixed bottom-8 right-8 z-[9999] flex flex-col items-end gap-4">
        {open && (
          <div className="mb-1 flex h-[560px] w-[390px] flex-col overflow-hidden rounded-[32px] border border-stone-200/80 bg-white/95 shadow-[0_24px_70px_rgba(15,23,42,0.16)] backdrop-blur-xl dark:border-stone-700/50 dark:bg-[#1A1614]/95">
            <div className="flex items-center justify-between border-b border-stone-200/70 px-5 py-4 dark:border-stone-700/50">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#F6E8EB] text-[#8E6A72]">
                  <Bot size={20} />
                </div>

                <div>
                  <p className="text-sm font-semibold text-stone-800 dark:text-stone-100">
                    PriceHawk AI
                  </p>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    Phân tích giá & gợi ý mua hàng
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full p-2 text-stone-500 transition hover:bg-stone-100 hover:text-stone-800 dark:hover:bg-stone-800"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
              {messages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={
                    message.role === 'user'
                      ? 'ml-auto max-w-[86%] whitespace-pre-line rounded-3xl bg-[#1F1A17] px-4 py-3 text-sm leading-6 text-white'
                      : 'mr-auto max-w-[92%] whitespace-pre-line rounded-3xl bg-[#FCF6F7] px-4 py-3 text-sm leading-6 text-stone-700 dark:bg-stone-800 dark:text-stone-200'
                  }
                >
                  {message.content ? (
                    message.role === 'assistant'
                      ? formatAssistantContent(message.content)
                      : message.content
                  ) : (
                    <span className="inline-flex items-center gap-2 text-stone-400">
                      <Loader2 size={14} className="animate-spin" />
                      Đang phân tích...
                    </span>
                  )}
                </div>
              ))}

              <div ref={bottomRef} />
            </div>

            <div className="border-t border-stone-200/70 px-5 py-4 dark:border-stone-700/50">
              <div className="mb-3 flex flex-wrap gap-2">
                {quickQuestions.map((question) => (
                  <button
                    key={question}
                    type="button"
                    disabled={streaming}
                    onClick={() => sendMessage(question)}
                    className="rounded-full border border-stone-200 bg-stone-50 px-3 py-2 text-[11px] text-stone-600 transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300"
                  >
                    {question}
                  </button>
                ))}
              </div>

              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  sendMessage();
                }}
                className="flex items-center gap-2 rounded-full border border-stone-200 bg-white px-3 py-2 dark:border-stone-700 dark:bg-stone-900"
              >
                <Wand2 size={16} className="text-[#8E6A72]" />

                <input
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  type="text"
                  placeholder="Hỏi AI về giá, deal, wishlist..."
                  className="flex-1 bg-transparent text-sm text-stone-700 outline-none placeholder:text-stone-400 dark:text-stone-100"
                />

                <button
                  type="submit"
                  disabled={!canSend}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1F1A17] text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {streaming ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Send size={14} />
                  )}
                </button>
              </form>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="group relative flex h-28 w-28 items-center justify-center rounded-full border border-white/70 bg-gradient-to-br from-[#F8EFF2] via-[#F5E7EB] to-[#E9D8DE] transition duration-300 hover:scale-105"
          style={{
            animation: 'jellyFloat 3.4s ease-in-out infinite, jellyGlow 3s ease-in-out infinite',
          }}
        >
          <span className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.9),rgba(255,255,255,0.18),transparent_70%)]" />

          <span className="absolute -left-1 top-4 text-[#D9AEB8]" style={{ animation: 'sparkleTwinkle 2.2s ease-in-out infinite, sparkleFloat 2.2s ease-in-out infinite' }}>
            <Sparkles size={15} fill="currentColor" />
          </span>

          <span className="absolute right-3 top-2 text-[#E7C7CF]" style={{ animation: 'sparkleTwinkle 1.8s ease-in-out infinite, sparkleFloat 2.4s ease-in-out infinite' }}>
            <Sparkles size={13} fill="currentColor" />
          </span>

          <span className="absolute bottom-3 left-2 text-[#CFA6B1]" style={{ animation: 'sparkleTwinkle 2.5s ease-in-out infinite, sparkleFloat 2s ease-in-out infinite' }}>
            <Sparkles size={11} fill="currentColor" />
          </span>

          <img
            src={jellyfishAi}
            alt="PriceHawk AI Jellyfish"
            className="relative z-10 h-24 w-24 scale-125 object-contain drop-shadow-[0_10px_18px_rgba(142,106,114,0.18)]"
          />

          <span className="pointer-events-none absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full border border-white/80 bg-white text-[#B7848C] shadow-md">
            <Sparkles size={13} />
          </span>
        </button>
      </div>
    </>
  );
}
