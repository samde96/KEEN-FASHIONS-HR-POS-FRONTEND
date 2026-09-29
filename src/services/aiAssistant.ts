import type { AiAssistantReply } from '../data/types';
import { requestJson } from './api';

export function askAiAssistant(message: string) {
  return requestJson<AiAssistantReply>('/api/v1/ai-assistant/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message }),
  });
}
