import { API_BASE_URL } from './apiClient';

export interface AiChatRequest {
  message: string;
  userId?: string;
  productId?: string;
}

export const streamAiChat = async (
  payload: AiChatRequest,
  onChunk: (chunk: string) => void,
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
      const dataLines = lines.filter((line) => line.startsWith('data:'));

      for (const line of dataLines) {
        const data = line.replace(/^data:\s?/, '');

        if (data === '[DONE]') {
          onDone?.();
          return;
        }

        if (data) {
          onChunk(data);
        }
      }
    }
  }
};