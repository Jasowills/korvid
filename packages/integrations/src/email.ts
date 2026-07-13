import type { KorvidConfig } from "@korvid/shared";

export interface EmailMessage {
  id: string;
  from: string;
  to: string[];
  subject: string;
  body: string;
  timestamp: Date;
  read: boolean;
  important?: boolean;
  labels?: string[];
}

export type EmailProvider = "gmail" | "imap" | "exchange";

export interface EmailClient {
  listMessages(opts?: { unreadOnly?: boolean; limit?: number; labels?: string[] }): Promise<EmailMessage[]>;
  getMessage(id: string): Promise<EmailMessage | null>;
  sendMessage(to: string[], subject: string, body: string): Promise<void>;
  markRead(id: string): Promise<void>;
  getUnreadCount(): Promise<number>;
  search(query: string, limit?: number): Promise<EmailMessage[]>;
}

export function createEmailClient(config: KorvidConfig): EmailClient {
  // Gmail API / IMAP integration
  // In production, this would use nodemailer or Google APIs
  console.log("[email] Client created (placeholder implementation)");

  return {
    async listMessages(opts): Promise<EmailMessage[]> {
      console.log(`[email] Listing messages (unread: ${opts?.unreadOnly ?? false})`);
      return [];
    },

    async getMessage(id: string): Promise<EmailMessage | null> {
      console.log(`[email] Getting message ${id}`);
      return null;
    },

    async sendMessage(to: string[], subject: string, body: string): Promise<void> {
      console.log(`[email] Sending to ${to.join(", ")}: ${subject}`);
    },

    async markRead(id: string): Promise<void> {
      console.log(`[email] Marked ${id} as read`);
    },

    async getUnreadCount(): Promise<number> {
      return 0;
    },

    async search(query: string, limit = 10): Promise<EmailMessage[]> {
      console.log(`[email] Searching: "${query}"`);
      return [];
    },
  };
}
