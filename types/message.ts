export interface ChatAttachment {
  type: "image" | "audio" | "file";
  url: string; // Data URL or file URL
  fileName?: string;
  fileSize?: number; // In bytes
  mimeType?: string;
  duration?: number; // For audio/voice notes in seconds
}

export interface ChatMessage {
  id: string;
  senderUsername: string;
  senderName: string;
  senderRole: "admin" | "staff" | "manager";
  recipientUsername: string; // Target username
  recipientName: string;
  content: string;
  attachment?: ChatAttachment;
  timestamp: string; // ISO 8601 string
  read: boolean;
  readAt?: string;
}

export interface ConversationSummary {
  username: string;
  name: string;
  role: "admin" | "staff" | "manager";
  avatarInitials: string;
  lastMessage?: string;
  lastMessageTime?: string;
  lastMessageSender?: string;
  unreadCount: number;
  isOnline: boolean;
  orderCount?: number;
}

export interface SendMessagePayload {
  recipientUsername: string;
  content: string;
  attachment?: ChatAttachment;
}
