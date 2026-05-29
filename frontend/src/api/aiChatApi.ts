import { API_BASE_URL } from './apiClient';

export interface AiChatHistoryMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AiChatRequest {
  message: string;
  userId?: string;
  productId?: string;
  conversationHistory?: AiChatHistoryMessage[];
}

export interface AiProduct {
  id: string;
  name: string;
  imageUrl?: string;
  bestPrice?: number;
  originalPrice?: number;
  discountPct?: number;
  brandName?: string;
  categoryName?: string;
  bestPlatform?: string;
}

export const streamAiChat = async (
  payload: AiChatRequest,
  onChunk: (chunk: string) => void,
  onProducts?: (products: AiProduct[]) => void,
  onDone?: () => void,
  onError?: (message: string) => void,
) => {
  const response = await fetch(`${API_BASE_URL}/ai-chat/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok || !response.body) {
    onError?.('Không thể kết nối AI Chatbot.');
    throw new Error('Không thể kết nối AI Chatbot.');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');

  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      onDone?.();
      break;
    }

    buffer += decoder.decode(value, { stream: true });

    const events = buffer.split('\n\n');
    buffer = events.pop() ?? '';

    for (const event of events) {
      const lines = event.split('\n');

      const eventNameLine = lines.find((line) => line.startsWith('event:'));
      const eventName = eventNameLine
        ? eventNameLine.replace(/^event:\s?/, '').trim()
        : 'message';

      const dataLines = lines.filter((line) => line.startsWith('data:'));
      const data = dataLines
        .map((line) => line.replace(/^data:\s?/, ''))
        .join('\n');

      if (!data) continue;

      if (data === '[DONE]') {
        onDone?.();
        return;
      }

      if (eventName === 'chunk') {
        onChunk(data);
        continue;
      }

      if (eventName === 'products') {
        try {
          const products = JSON.parse(data) as AiProduct[];
          onProducts?.(products);
        } catch (error) {
          console.error('Parse products failed:', error);
        }
        continue;
      }

      if (eventName === 'error') {
        onError?.(data);
        return;
      }
    }
  }
};