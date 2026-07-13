export interface Message {
  id: string;
  platform: "whatsapp" | "telegram" | "voice" | "system";
  from: string;
  to: string;
  text: string;
  timestamp: number;
  replyTo?: string;
  metadata?: Record<string, unknown>;
}

export interface MessageBridge {
  readonly platform: string;
  readonly enabled: boolean;
  send(msg: Message): Promise<MessageResult>;
  onMessage(handler: (msg: Message) => void): void;
  start(): Promise<void>;
  stop(): Promise<void>;
}

export interface MessageResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface MessageQueueItem {
  message: Message;
  attempts: number;
  maxAttempts: number;
  nextRetryAt: number;
  lastError?: string;
}
