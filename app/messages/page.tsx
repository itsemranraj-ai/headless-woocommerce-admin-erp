"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import Link from "next/link";
import { ChatMessage, ConversationSummary, ChatAttachment } from "@/types/message";
import { formatDisplayName } from "@/lib/utils";

// Helper: Convert File to Base64
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

// Helper: Format file size
function formatBytes(bytes?: number): string {
  if (!bytes) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

// Helper: Format seconds to M:SS
function formatDuration(sec?: number): string {
  if (!sec || isNaN(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

// Voice Message Audio Player Component
function VoiceAudioPlayer({ url, duration, isMe }: { url: string; duration?: number; isMe: boolean }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration || 0);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio(url);
    audioRef.current = audio;

    const onLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setTotalDuration(Math.round(audio.duration));
      }
    };

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.pause();
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("ended", onEnded);
    };
  }, [url]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.playbackRate = playbackRate;
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const toggleRate = () => {
    const nextRate = playbackRate === 1 ? 1.5 : playbackRate === 1.5 ? 2 : 1;
    setPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  return (
    <div className="flex items-center gap-2.5 py-1 min-w-[200px] sm:min-w-[250px]">
      {/* Play/Pause Button */}
      <button
        type="button"
        onClick={togglePlay}
        className={`w-10 h-10 rounded-full flex items-center justify-center text-white shadow-xs transition-transform active:scale-95 shrink-0 ${
          isMe ? "bg-[#00a884] hover:bg-[#008f6f]" : "bg-[#18181b] hover:bg-black"
        }`}
      >
        {isPlaying ? (
          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
          </svg>
        ) : (
          <svg className="w-4 h-4 fill-current ml-0.5" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>

      {/* Progress & Waveform Bar */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="relative flex items-center">
          <input
            type="range"
            min="0"
            max={totalDuration || 1}
            step="0.1"
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#00a884]"
          />
        </div>
        <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono font-bold">
          <span>{formatDuration(isPlaying ? currentTime : totalDuration)}</span>
          <button
            type="button"
            onClick={toggleRate}
            className="px-1.5 py-0.5 rounded bg-slate-200/80 hover:bg-slate-300 text-slate-700 text-[9px] font-black"
          >
            {playbackRate}x
          </button>
        </div>
      </div>
    </div>
  );
}

// Render text with clickable URL links
function FormattedMessageText({ text }: { text: string }) {
  if (!text) return null;

  // Regex to detect URLs
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);

  return (
    <p className="whitespace-pre-wrap leading-relaxed break-words">
      {parts.map((part, i) => {
        if (part.match(urlRegex)) {
          return (
            <a
              key={i}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline font-semibold break-all"
            >
              {part}
            </a>
          );
        }
        return part;
      })}
    </p>
  );
}

export default function MessagesPage() {
  const [currentUser, setCurrentUser] = useState<{ username: string; role: string; name?: string } | null>(null);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activePartner, setActivePartner] = useState<ConversationSummary | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");

  // Attachments State
  const [pendingAttachment, setPendingAttachment] = useState<ChatAttachment | null>(null);
  const [previewLightboxImg, setPreviewLightboxImg] = useState<string | null>(null);

  // Voice Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [micPermissionError, setMicPermissionError] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const lastMessageCountRef = useRef<number>(0);

  // Play subtle WhatsApp chime notification
  const playNotificationSound = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioCtx();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === "suspended") {
        ctx.resume();
      }

      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(587.33, now); // D5
      gain1.gain.setValueAtTime(0.2, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.3);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(880, now + 0.1); // A5
      gain2.gain.setValueAtTime(0.25, now + 0.1);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.1);
      osc2.stop(now + 0.5);
    } catch {
      // Ignore audio policy errors
    }
  }, []);

  // 1. Load current authenticated user session
  useEffect(() => {
    fetch("/api/auth/session")
      .then((res) => res.json())
      .then((json) => {
        if (json.data?.authenticated) {
          setCurrentUser(json.data.user);
        }
      })
      .catch(() => {});
  }, []);

  // 2. Poll Conversations List (Every 3 seconds - silent background update)
  useEffect(() => {
    let ignore = false;

    const fetchConversations = async () => {
      try {
        const res = await fetch("/api/messages/conversations", { cache: "no-store" });
        if (!res.ok) return;
        const json = await res.json();
        if (!ignore && json.success && Array.isArray(json.data) && json.data.length > 0) {
          setConversations((prevList) => {
            // Compare if list is identical to avoid re-render
            if (
              prevList.length === json.data.length &&
              prevList.every((p, idx) => p.username === json.data[idx]?.username && p.lastMessageTime === json.data[idx]?.lastMessageTime && p.unreadCount === json.data[idx]?.unreadCount)
            ) {
              return prevList;
            }
            return json.data;
          });

          // If no active partner selected yet, default to first conversation
          setActivePartner((prev) => {
            if (!prev) return json.data[0];
            const match = json.data.find(
              (p: ConversationSummary) => p.username.toLowerCase() === prev.username.toLowerCase()
            );
            return match ? { ...prev, ...match } : prev;
          });
        }
      } catch {
        // Ignore
      } finally {
        if (!ignore) setLoadingConversations(false);
      }
    };

    fetchConversations();
    const interval = setInterval(fetchConversations, 3000);
    return () => {
      ignore = true;
      clearInterval(interval);
    };
  }, []);

  // 3. Poll Active Conversation Messages (Every 2.5 seconds - completely silent without flickering)
  useEffect(() => {
    const partnerUsername = activePartner?.username;
    if (!partnerUsername) return;

    let ignore = false;

    const fetchMessages = async () => {
      try {
        const res = await fetch(`/api/messages?partner=${encodeURIComponent(partnerUsername)}`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const json = await res.json();
        if (!ignore && json.success && Array.isArray(json.data)) {
          const newMsgs: ChatMessage[] = json.data;

          setMessages((prevMsgs) => {
            if (
              prevMsgs.length === newMsgs.length &&
              (prevMsgs.length === 0 || prevMsgs[prevMsgs.length - 1]?.id === newMsgs[newMsgs.length - 1]?.id)
            ) {
              return prevMsgs; // Return exact same reference to prevent re-render
            }

            // Detect new incoming message to play chime
            if (
              prevMsgs.length > 0 &&
              newMsgs.length > prevMsgs.length &&
              newMsgs[newMsgs.length - 1]?.senderUsername !== currentUser?.username
            ) {
              playNotificationSound();
            }

            return newMsgs;
          });
        }
      } catch {
        // Ignore
      }
    };

    fetchMessages();
    const interval = setInterval(fetchMessages, 2500);

    return () => {
      ignore = true;
      clearInterval(interval);
    };
  }, [activePartner?.username, currentUser?.username, playNotificationSound]);

  // Auto-scroll chat to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle File Selection (Images, PDFs, Docs)
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>, type: "image" | "file") => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const base64Url = await fileToBase64(file);
      setPendingAttachment({
        type,
        url: base64Url,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
      });
    } catch {
      alert("Failed to process file attachment.");
    } finally {
      e.target.value = "";
    }
  };

  // Handle Image Paste from Clipboard (Ctrl + V)
  const handlePaste = async (e: React.ClipboardEvent<HTMLInputElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          const base64Url = await fileToBase64(file);
          setPendingAttachment({
            type: "image",
            url: base64Url,
            fileName: "pasted_image.png",
            fileSize: file.size,
            mimeType: file.type,
          });
          break;
        }
      }
    }
  };

  // Start Voice Recording (iOS Safari, Android & Desktop Compatible)
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Detect best supported audio MIME type across iOS, Android & Desktop
      const supportedMime = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
        "audio/aac",
        "audio/ogg",
      ].find((mime) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported?.(mime));

      const options = supportedMime ? { mimeType: supportedMime } : undefined;
      const mediaRecorder = options ? new MediaRecorder(stream, options) : new MediaRecorder(stream);
      const recordedMimeType = mediaRecorder.mimeType || supportedMime || "audio/webm";

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: recordedMimeType });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Url = reader.result as string;
          sendVoiceNote(base64Url, recordingSeconds);
        };
        reader.readAsDataURL(audioBlob);

        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setMicPermissionError(false);
      setIsRecording(true);
      setRecordingSeconds(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch {
      setMicPermissionError(true);
      console.warn("Microphone permission denied or not available.");
    }
  };

  // Stop & Send Voice Recording
  const stopAndSendRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    }
  };

  // Cancel Voice Recording
  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.ondataavailable = null;
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      setIsRecording(false);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      setRecordingSeconds(0);
    }
  };

  // Helper: Send Voice Note
  const sendVoiceNote = async (base64Url: string, durationSec: number) => {
    if (!activePartner) return;
    const attachment: ChatAttachment = {
      type: "audio",
      url: base64Url,
      fileName: `voice_note_${Date.now()}.webm`,
      duration: durationSec || 1,
    };
    await executeSendMessage("", attachment);
  };

  // Send Message (Text and/or Attachment)
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputText.trim();
    if ((!trimmed && !pendingAttachment) || !activePartner || sending) return;

    await executeSendMessage(trimmed, pendingAttachment || undefined);
    setInputText("");
    setPendingAttachment(null);
  };

  const executeSendMessage = async (content: string, attachment?: ChatAttachment) => {
    if (!activePartner || sending) return;
    setSending(true);

    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientUsername: activePartner.username,
          content: content || "",
          attachment,
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        setMessages((prev) => {
          const exists = prev.some((m) => m.id === json.data.id);
          if (exists) return prev;
          return [...prev, json.data];
        });
        const lastPreview =
          content ||
          (attachment?.type === "image"
            ? "📷 Photo"
            : attachment?.type === "audio"
            ? "🎙️ Voice message"
            : "📎 Attachment");
        setConversations((prev) =>
          prev.map((c) =>
            c.username.toLowerCase() === activePartner.username.toLowerCase()
              ? { ...c, lastMessage: lastPreview, lastMessageTime: new Date().toISOString() }
              : c
          )
        );
      }
    } catch {
      // Ignore
    } finally {
      setSending(false);
    }
  };

  // Filtered Contacts
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const q = searchQuery.toLowerCase();
    return conversations.filter(
      (c) => c.name.toLowerCase().includes(q) || c.username.toLowerCase().includes(q)
    );
  }, [conversations, searchQuery]);

  // Format Time for WhatsApp
  const formatMsgTime = (isoString: string) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });
  };

  const formatListDate = (isoString?: string) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });
    }
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  return (
    <div className="h-[calc(100vh-4.2rem)] flex flex-col bg-[#f0f2f5] select-none font-sans overflow-hidden">
      {/* Lightbox Image Preview Modal */}
      {previewLightboxImg && (
        <div
          onClick={() => setPreviewLightboxImg(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 cursor-zoom-out animate-in fade-in"
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img
              src={previewLightboxImg}
              alt="Preview"
              className="max-h-[85vh] max-w-full rounded-2xl shadow-2xl object-contain"
            />
            <button
              onClick={() => setPreviewLightboxImg(null)}
              className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-white text-black font-black flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Hidden File Inputs */}
      <input
        type="file"
        ref={imageInputRef}
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFileSelect(e, "image")}
      />
      <input
        type="file"
        ref={fileInputRef}
        accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
        className="hidden"
        onChange={(e) => handleFileSelect(e, "file")}
      />

      <div className="flex-1 flex overflow-hidden max-w-7xl mx-auto w-full border-x border-slate-200/80 shadow-xs bg-white">
        {/* ========================================================================= */}
        {/* LEFT PANEL: CONVERSATIONS LIST (WhatsApp Web Left Sidebar) */}
        {/* ========================================================================= */}
        <div
          className={`w-full md:w-80 lg:w-96 flex flex-col border-r border-slate-200/80 bg-white ${
            mobileView === "chat" ? "hidden md:flex" : "flex"
          }`}
        >
          {/* Header Bar */}
          <div className="p-3.5 px-4 bg-[#f0f2f5] border-b border-slate-200/80 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#18181B] text-white flex items-center justify-center font-black text-xs shadow-xs">
                {currentUser?.username ? formatDisplayName(currentUser.name, currentUser.username).substring(0, 2).toUpperCase() : "ME"}
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-900 leading-tight">
                  {formatDisplayName(currentUser?.name, currentUser?.username)}
                </h2>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#00a884]">
                    {currentUser?.role === "staff" ? "Field Sales Rep" : "Admin"}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase">
                ● Live Chat
              </span>
            </div>
          </div>

          {/* Search Box */}
          <div className="p-2.5 bg-white border-b border-slate-100 shrink-0">
            <div className="relative">
              <input
                type="text"
                placeholder="Search sales reps or chats..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#f0f2f5] border-none rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-[#00a884] font-medium"
              />
              <div className="pointer-events-none absolute left-3 top-2.5 text-slate-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Contacts & Conversation List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {loadingConversations ? (
              <div className="p-8 text-center text-xs font-bold text-slate-400">
                <div className="w-5 h-5 border-2 border-slate-300 border-t-[#00a884] rounded-full animate-spin mx-auto mb-2" />
                Syncing team contacts...
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-xs font-bold text-slate-400">
                No active sales representatives found.
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isSelected = activePartner?.username?.toLowerCase() === conv.username.toLowerCase();
                const formattedName = formatDisplayName(conv.name, conv.username);

                return (
                  <div
                    key={conv.username}
                    onClick={() => {
                      setActivePartner(conv);
                      setMobileView("chat");
                    }}
                    className={`flex items-center gap-3.5 p-3.5 px-4 cursor-pointer transition-all hover:bg-[#f5f6f6] ${
                      isSelected ? "bg-[#ebebeb]" : "bg-white"
                    }`}
                  >
                    {/* Contact Avatar */}
                    <div className="relative shrink-0">
                      <div className="w-12 h-12 rounded-full bg-[#18181b] text-white flex items-center justify-center font-black text-sm shadow-xs">
                        {conv.avatarInitials || formattedName.substring(0, 2).toUpperCase()}
                      </div>
                      <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-[#25d366] border-2 border-white" />
                    </div>

                    {/* Contact Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <h4 className="text-sm font-black text-slate-900 truncate">
                          {formattedName}
                        </h4>
                        <span className="text-[10px] font-bold text-slate-400 shrink-0 font-mono">
                          {formatListDate(conv.lastMessageTime)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs text-slate-500 truncate flex-1 font-medium">
                          {conv.lastMessageSender === currentUser?.username && (
                            <span className="text-[#53bdeb] font-black mr-1">✓✓</span>
                          )}
                          {conv.lastMessage || "Tap to chat..."}
                        </p>
                        {conv.unreadCount > 0 && (
                          <span className="px-1.5 py-0.5 min-w-[18px] h-[18px] bg-[#25d366] text-white text-[10px] font-black rounded-full flex items-center justify-center shrink-0">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT PANEL: CHAT THREAD (WhatsApp Web Right Active Area) */}
        {/* ========================================================================= */}
        <div
          className={`flex-1 flex flex-col bg-[#efeae2] relative ${
            mobileView === "list" ? "hidden md:flex" : "flex"
          }`}
        >
          {activePartner ? (
            <>
              {/* Chat Top Header */}
              <div className="p-3.5 px-5 bg-[#f0f2f5] border-b border-slate-200/80 flex items-center justify-between shrink-0 z-10">
                <div className="flex items-center gap-3">
                  {/* Mobile Back Button */}
                  <button
                    onClick={() => setMobileView("list")}
                    className="md:hidden p-1.5 rounded-lg text-slate-600 hover:bg-slate-200 text-lg font-black"
                  >
                    ←
                  </button>

                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-[#18181b] text-white font-black text-xs flex items-center justify-center">
                      {activePartner.avatarInitials || formatDisplayName(activePartner.name, activePartner.username).substring(0, 2).toUpperCase()}
                    </div>
                    <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-[#25d366] border-2 border-white" />
                  </div>

                  <div>
                    <h3 className="text-sm font-black text-slate-900 leading-tight">
                      {formatDisplayName(activePartner.name, activePartner.username)}
                    </h3>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
                      <span className="text-emerald-700 font-bold">● Active Now</span>
                      <span>•</span>
                      <span className="uppercase text-[10px] font-bold text-slate-400">
                        {activePartner.role === "staff" ? "Field Sales Rep" : "Support Admin"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {activePartner.role === "staff" && (
                    <Link
                      href={`/orders?search=${encodeURIComponent(activePartner.username)}`}
                      className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-black text-xs font-extrabold shadow-2xs transition-colors"
                    >
                      <span>📦</span>
                      <span>View Rep Orders</span>
                    </Link>
                  )}
                </div>
              </div>

              {/* Chat Message Stream */}
              <div
                className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 relative"
                style={{
                  backgroundImage:
                    "radial-gradient(circle at center, rgba(0,0,0,0.03) 1px, transparent 1px)",
                  backgroundSize: "20px 20px",
                }}
              >
                {/* Security encryption banner */}
                <div className="flex justify-center my-2">
                  <div className="px-3.5 py-1.5 rounded-xl bg-[#ffeecd] border border-[#ffd88e] text-[#54411a] text-[11px] font-bold shadow-2xs text-center max-w-md">
                    🔒 Internal FixionFuel chat between Admin & Field Reps. Real-time synchronized.
                  </div>
                </div>

                {loadingMessages ? (
                  <div className="py-12 text-center text-xs font-bold text-slate-400">
                    <div className="w-5 h-5 border-2 border-slate-300 border-t-[#00a884] rounded-full animate-spin mx-auto mb-2" />
                    Loading chat messages...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="py-12 text-center text-xs font-bold text-slate-500">
                    Say hello! Send a message or photo/voice memo to start conversation.
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMe = msg.senderUsername === currentUser?.username;
                    const senderLabel = formatDisplayName(msg.senderName, msg.senderUsername);

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                      >
                        <div
                          className={`max-w-[85%] sm:max-w-[70%] p-3 rounded-2xl shadow-xs text-xs sm:text-sm leading-relaxed relative break-words ${
                            isMe
                              ? "bg-[#d9fdd3] text-[#111b21] rounded-tr-none"
                              : "bg-[#ffffff] text-[#111b21] rounded-tl-none border border-slate-100"
                          }`}
                        >
                          {!isMe && (
                            <div className="text-[10px] font-black text-[#00a884] mb-1">
                              {senderLabel}
                            </div>
                          )}

                          {/* Image Attachment Render */}
                          {msg.attachment?.type === "image" && (
                            <div className="mb-2 rounded-xl overflow-hidden cursor-pointer group relative">
                              <img
                                src={msg.attachment.url}
                                alt="Attachment"
                                onClick={() => setPreviewLightboxImg(msg.attachment?.url || null)}
                                className="max-h-64 sm:max-h-80 w-auto rounded-xl object-cover hover:scale-102 transition-transform"
                              />
                              <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[9px] px-2 py-0.5 rounded-md backdrop-blur-xs">
                                🔍 Tap to expand
                              </div>
                            </div>
                          )}

                          {/* Voice / Audio Attachment Render */}
                          {msg.attachment?.type === "audio" && (
                            <div className="mb-1">
                              <VoiceAudioPlayer
                                url={msg.attachment.url}
                                duration={msg.attachment.duration}
                                isMe={isMe}
                              />
                            </div>
                          )}

                          {/* Document / Generic File Render */}
                          {msg.attachment?.type === "file" && (
                            <a
                              href={msg.attachment.url}
                              download={msg.attachment.fileName || "attachment"}
                              className="flex items-center gap-3 p-2.5 mb-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 transition-all text-slate-800 group"
                            >
                              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center text-lg font-black shrink-0">
                                📄
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-bold text-slate-900 truncate">
                                  {msg.attachment.fileName || "Attachment File"}
                                </div>
                                <div className="text-[10px] text-slate-500">
                                  {formatBytes(msg.attachment.fileSize)} • Click to download
                                </div>
                              </div>
                              <div className="text-slate-400 group-hover:text-blue-600 font-black text-sm">
                                ⬇️
                              </div>
                            </a>
                          )}

                          {/* Text Message Content with Link detection */}
                          {msg.content && <FormattedMessageText text={msg.content} />}

                          <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-slate-400 font-mono">
                            <span>{formatMsgTime(msg.timestamp)}</span>
                            {isMe && (
                              <span className={msg.read ? "text-[#53bdeb] font-black" : "text-slate-400 font-bold"}>
                                ✓✓
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Pending Attachment Preview Bar */}
              {pendingAttachment && (
                <div className="p-3 bg-[#e9edef] border-t border-slate-300/70 flex items-center justify-between gap-3 animate-in slide-in-from-bottom-2">
                  <div className="flex items-center gap-3 min-w-0">
                    {pendingAttachment.type === "image" ? (
                      <img
                        src={pendingAttachment.url}
                        alt="Preview"
                        className="w-12 h-12 rounded-xl object-cover border border-slate-300 shadow-xs shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center text-xl shrink-0">
                        📄
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="text-xs font-black text-slate-900 truncate">
                        {pendingAttachment.fileName || "Attachment Ready"}
                      </div>
                      <div className="text-[10px] text-slate-500 font-bold">
                        {formatBytes(pendingAttachment.fileSize)} • Ready to send
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPendingAttachment(null)}
                    className="w-8 h-8 rounded-full bg-slate-300 hover:bg-rose-500 hover:text-white text-slate-700 font-black text-xs flex items-center justify-center transition-colors"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Microphone Permission Help Banner */}
              {micPermissionError && (
                <div className="p-3 bg-amber-50 border-t border-amber-200 text-amber-900 text-xs flex items-center justify-between gap-3 animate-in slide-in-from-bottom-2 shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🎙️</span>
                    <p className="font-semibold text-[11px] sm:text-xs">
                      Microphone permission is blocked. Click the <strong>🔒 Lock icon</strong> on your browser URL bar, set <strong>Microphone → Allow</strong>, then refresh.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMicPermissionError(false)}
                    className="p-1 text-amber-700 hover:text-amber-950 font-black text-xs shrink-0"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Voice Recording Live Bar OR Regular Input Bar */}
              {isRecording ? (
                <div className="p-3 sm:p-4 bg-[#f0f2f5] border-t border-slate-200/80 flex items-center justify-between gap-3 shrink-0">
                  {/* Cancel Recording */}
                  <button
                    type="button"
                    onClick={cancelRecording}
                    title="Cancel Recording"
                    className="p-2.5 rounded-full bg-rose-100 hover:bg-rose-200 text-rose-700 font-bold text-xs flex items-center gap-1.5 transition-colors"
                  >
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                      <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                    </svg>
                    <span>Discard</span>
                  </button>

                  {/* Recording Status & Timer */}
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-rose-600 animate-ping" />
                    <span className="text-xs font-black text-rose-700 font-mono tracking-wider">
                      Recording Voice Note: {formatDuration(recordingSeconds)}
                    </span>
                  </div>

                  {/* Stop & Send Recording */}
                  <button
                    type="button"
                    onClick={stopAndSendRecording}
                    title="Send Voice Note"
                    className="w-11 h-11 rounded-2xl bg-[#00a884] hover:bg-[#008f6f] text-white flex items-center justify-center shadow-md active:scale-95 transition-all"
                  >
                    <svg className="w-5 h-5 -rotate-45 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                    </svg>
                  </button>
                </div>
              ) : (
                /* Chat Input Bar (WhatsApp Web Style with 📎, 📷, 🎙️) */
                <form
                  onSubmit={handleSendMessage}
                  className="p-3 sm:p-4 bg-[#f0f2f5] border-t border-slate-200/80 flex items-center gap-2 sm:gap-3 shrink-0"
                >
                  {/* Photo Picker (📷) */}
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    title="Attach Photo"
                    className="p-2 sm:p-2.5 rounded-xl hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors shrink-0"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </button>

                  {/* Document / File Picker (📎) */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    title="Attach Document"
                    className="p-2 sm:p-2.5 rounded-xl hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors shrink-0"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                  </button>

                  {/* Message Input Box */}
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      placeholder="Type a message or paste an image..."
                      value={inputText}
                      onPaste={handlePaste}
                      onChange={(e) => setInputText(e.target.value)}
                      className="w-full px-4 py-3 text-xs sm:text-sm rounded-2xl bg-white border border-transparent focus:border-[#00a884] outline-none text-slate-900 font-medium placeholder:text-slate-400 shadow-2xs"
                    />
                  </div>

                  {/* Voice Note Button (🎙️) OR Send Button (✈️) */}
                  {inputText.trim() || pendingAttachment ? (
                    <button
                      type="submit"
                      disabled={sending}
                      className="w-11 h-11 rounded-2xl bg-[#00a884] hover:bg-[#008f6f] active:scale-95 text-white flex items-center justify-center shadow-md transition-all shrink-0"
                    >
                      {sending ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <svg className="w-5 h-5 -rotate-45 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                        </svg>
                      )}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={startRecording}
                      title="Hold to Record Voice Message"
                      className="w-11 h-11 rounded-2xl bg-slate-200 hover:bg-[#00a884] hover:text-white text-slate-700 active:scale-95 flex items-center justify-center shadow-2xs transition-all shrink-0"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                    </button>
                  )}
                </form>
              )}
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
              <div className="w-16 h-16 rounded-full bg-slate-200/70 flex items-center justify-center text-3xl mb-4">
                💬
              </div>
              <h3 className="text-base font-black text-slate-700">FixionFuel Live Messenger</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                Select a sales representative from the left to start a real-time conversation.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
