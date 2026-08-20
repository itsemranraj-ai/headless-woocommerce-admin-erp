import fs from "fs";
import path from "path";
import os from "os";
import { ChatMessage, ConversationSummary } from "@/types/message";
import { getAllUsers, SystemUser } from "@/lib/auth/user-store";
import { formatDisplayName } from "@/lib/utils";

const MESSAGES_FILE = path.join(os.tmpdir(), "ff_internal_messages.json");

let inMemoryMessages: ChatMessage[] | null = null;

function loadMessages(): ChatMessage[] {
  if (inMemoryMessages !== null) {
    return inMemoryMessages;
  }

  try {
    if (fs.existsSync(MESSAGES_FILE)) {
      const data = fs.readFileSync(MESSAGES_FILE, "utf-8");
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        inMemoryMessages = parsed;
        return inMemoryMessages;
      }
    }
  } catch {
    // Ignore read errors
  }

  // Initial empty array if no messages yet
  inMemoryMessages = [];
  persistMessages();
  return inMemoryMessages;
}

function persistMessages(): void {
  if (!inMemoryMessages) return;
  try {
    fs.writeFileSync(MESSAGES_FILE, JSON.stringify(inMemoryMessages, null, 2), "utf-8");
  } catch {
    // Ignore write errors
  }
}

/**
 * Returns all messages between userA and userB, ordered chronologically.
 */
export function getMessagesBetween(userA: string, userB: string): ChatMessage[] {
  const all = loadMessages();
  const lowerA = userA.toLowerCase();
  const lowerB = userB.toLowerCase();

  return all
    .filter((m) => {
      const s = m.senderUsername.toLowerCase();
      const r = m.recipientUsername.toLowerCase();
      return (s === lowerA && r === lowerB) || (s === lowerB && r === lowerA);
    })
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

/**
 * Adds a new message and persists it locally.
 */
export function addMessage(
  sender: { username: string; name: string; role: "admin" | "staff" | "manager" },
  recipient: { username: string; name: string },
  content: string,
  attachment?: import("@/types/message").ChatAttachment
): ChatMessage {
  const all = loadMessages();
  const trimmed = (content || "").trim();
  const now = Date.now();

  // Deduplication check: ignore accidental duplicate within 1.5s
  const recentDuplicate = all.find(
    (m) =>
      m.senderUsername.toLowerCase() === sender.username.toLowerCase() &&
      m.recipientUsername.toLowerCase() === recipient.username.toLowerCase() &&
      m.content === trimmed &&
      (!attachment || m.attachment?.url === attachment.url) &&
      now - new Date(m.timestamp).getTime() < 1500
  );

  if (recentDuplicate) {
    return recentDuplicate;
  }

  const newMessage: ChatMessage = {
    id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    senderUsername: sender.username,
    senderName: sender.name,
    senderRole: sender.role,
    recipientUsername: recipient.username,
    recipientName: recipient.name,
    content: trimmed,
    attachment,
    timestamp: new Date().toISOString(),
    read: false,
  };

  all.push(newMessage);
  persistMessages();
  return newMessage;
}

/**
 * Marks all unread messages from partner to reader as read.
 */
export function markConversationAsRead(readerUsername: string, partnerUsername: string): number {
  const all = loadMessages();
  const lowerReader = readerUsername.toLowerCase();
  const lowerPartner = partnerUsername.toLowerCase();
  const now = new Date().toISOString();
  let updatedCount = 0;

  all.forEach((m) => {
    const s = m.senderUsername.toLowerCase();
    const r = m.recipientUsername.toLowerCase();

    if (s === lowerPartner && r === lowerReader && !m.read) {
      m.read = true;
      m.readAt = now;
      updatedCount++;
    }
  });

  if (updatedCount > 0) {
    persistMessages();
  }

  return updatedCount;
}

/**
 * Returns the total unread message count for a given user.
 */
export function getUnreadCountForUser(username: string): number {
  const all = loadMessages();
  const lowerUser = username.toLowerCase();

  return all.filter((m) => {
    const r = m.recipientUsername.toLowerCase();
    const s = m.senderUsername.toLowerCase();
    return r === lowerUser && s !== lowerUser && !m.read;
  }).length;
}

function formatLastMessagePreview(msg?: ChatMessage): string | undefined {
  if (!msg) return undefined;
  if (msg.content && msg.content.trim()) return msg.content;
  if (msg.attachment) {
    if (msg.attachment.type === "image") return "📷 Photo";
    if (msg.attachment.type === "audio") return "🎙️ Voice message";
    return `📎 ${msg.attachment.fileName || "Attachment"}`;
  }
  return undefined;
}

/**
 * Generates the conversations list for a user (WhatsApp-style contact list).
 */
export function getConversationsList(currentUser: { username: string; role: string; name?: string }): ConversationSummary[] {
  const allUsers = getAllUsers();
  const messages = loadMessages();
  const lowerCurrent = currentUser.username.toLowerCase();
  const isAdmin = currentUser.role === "admin" || currentUser.role === "manager";

  const summaries: ConversationSummary[] = [];

  if (isAdmin) {
    // Admins see ONLY Sales Reps (Field Agents)
    const salesReps = allUsers.filter((u: SystemUser) => u.role === "staff");

    for (const rep of salesReps) {
      const convMessages = getMessagesBetween(lowerCurrent, rep.username.toLowerCase());
      const lastMsg = convMessages.length > 0 ? convMessages[convMessages.length - 1] : undefined;

      const unreadCount = messages.filter((m) => {
        return (
          m.senderUsername.toLowerCase() === rep.username.toLowerCase() &&
          m.recipientUsername.toLowerCase() === lowerCurrent &&
          !m.read
        );
      }).length;

      const displayName = formatDisplayName(rep.name, rep.username);
      const initials = displayName
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .substring(0, 2)
        .toUpperCase() || "SR";

      summaries.push({
        username: rep.username,
        name: displayName,
        role: rep.role,
        avatarInitials: initials,
        lastMessage: formatLastMessagePreview(lastMsg),
        lastMessageTime: lastMsg?.timestamp,
        lastMessageSender: lastMsg?.senderUsername,
        unreadCount,
        isOnline: true,
      });
    }
  } else {
    // Sales Rep sees Admin Support
    const admins = allUsers.filter((u: SystemUser) => u.role === "admin" || u.role === "manager");
    const mainAdmin = admins[0] || { username: "fixionfuel_admin", name: "FixionFuel Admin Support", role: "admin" as const };

    const convMessages = getMessagesBetween(lowerCurrent, mainAdmin.username.toLowerCase());
    const lastMsg = convMessages.length > 0 ? convMessages[convMessages.length - 1] : undefined;

    const unreadCount = messages.filter((m) => {
      return (
        m.senderUsername.toLowerCase() !== lowerCurrent &&
        m.recipientUsername.toLowerCase() === lowerCurrent &&
        !m.read
      );
    }).length;

    summaries.push({
      username: mainAdmin.username,
      name: "FixionFuel Admin Support",
      role: "admin",
      avatarInitials: "FF",
      lastMessage: formatLastMessagePreview(lastMsg),
      lastMessageTime: lastMsg?.timestamp,
      lastMessageSender: lastMsg?.senderUsername,
      unreadCount,
      isOnline: true,
    });
  }

  // Sort conversations by most recent message
  return summaries.sort((a, b) => {
    const timeA = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
    const timeB = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
    return timeB - timeA;
  });
}
