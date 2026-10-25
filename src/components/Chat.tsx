import React, { useState, useEffect, useRef } from 'react';
import { getSocket } from '../socket';
import { ChatMessage, ChatReaction } from '../types';
import { playSound } from '../sound';
import { Send, MessageSquare, X, Smile } from 'lucide-react';
import { Identicon } from './Identicon';

// Every reaction lives in the always-visible quick bar next to the chat
// button: about five fit on a phone and the rest scroll horizontally.
const EMOJIS = ['😂', '😭', '😕', '🤝', '🕵️', '🤫', '😱', '👑', '🔥', '👀', '👍', '💀', '😎', '🥳', '😤', '👏', '⏳'];

// Emojis insertable into a chat message (quick-access picker).
const QUICK_EMOJIS = ['😂', '😭', '🔥', '😍', '😱', '🤬', '🤣', '😎', '🕵️', '👑', '💀', '🥺', '👏', '🙏', '👀', '😅', '🤝', '⏳', '🤞', '😈', '💍', '🎯'];

interface ChatProps {
  currentUserId: string;
  /** When true, render as a permanent panel (desktop sidebar) instead of
   *  the floating button + drawer. Messages never count as unread. */
  inline?: boolean;
}

export const Chat: React.FC<ChatProps> = ({ currentUserId, inline = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [inputMessage, setInputMessage] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [floatingReactions, setFloatingReactions] = useState<
    { id: string; reaction: string; senderName: string }[]
  >([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isOpenRef = useRef(isOpen);

  useEffect(() => {
    isOpenRef.current = isOpen;
    if (isOpen) {
      setUnreadCount(0);
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [isOpen]);

  useEffect(() => {
    const socket = getSocket();

    // After a page reload the socket needs a few hundred ms to re-join the
    // room on the server before `chat:history` will return anything. So
    // instead of a single fire-once request, keep polling until the server
    // actually answers with the room's stored messages.
    const HISTORY_RETRY_MS = 600;
    const MAX_HISTORY_RETRIES = 30; // ~18s of patience for a slow join
    let historyAttempts = 0;
    let historyRetryTimer: ReturnType<typeof setTimeout> | null = null;

    const requestHistory = () => {
      if (historyAttempts >= MAX_HISTORY_RETRIES) return;
      historyAttempts += 1;
      socket.emit('chat:history');
    };

    const scheduleHistoryRetry = () => {
      if (historyRetryTimer) clearTimeout(historyRetryTimer);
      historyRetryTimer = setTimeout(requestHistory, HISTORY_RETRY_MS);
    };

    const handleMessage = (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg]);
      // Only count incoming messages from other players as unread when the
      // drawer is closed (inline sidebar chat is always "open").
      if (!isOpenRef.current && !inline && msg.senderId !== currentUserId) {
        setUnreadCount((prev) => prev + 1);
      }
    };

    // History replay after a refresh/reconnect: replace the (usually empty)
    // local list with the room's stored messages, keeping any live messages
    // that arrived before the reply landed (deduped by sender+timestamp).
    const handleHistory = (msgs: ChatMessage[]) => {
      if (!Array.isArray(msgs)) return;

      // Empty reply = either a fresh room or the join has not completed yet
      // (the server rejects the request). Retry until the join lands; the
      // server replays nothing for a genuinely empty room, which is cheap.
      if (msgs.length === 0) {
        scheduleHistoryRetry();
        return;
      }

      // Got it — cancel any pending retries.
      if (historyRetryTimer) {
        clearTimeout(historyRetryTimer);
        historyRetryTimer = null;
        historyAttempts = MAX_HISTORY_RETRIES;
      }

      const key = (m: ChatMessage) => `${m.senderId}|${m.timestamp}|${m.message}`;
      const storedKeys = new Set(msgs.map(key));
      setMessages((prev) => [
        ...msgs,
        ...prev.filter((m) => !storedKeys.has(key(m))),
      ]);
    };

    const handleReaction = (reaction: ChatReaction) => {
      // The server broadcasts to the whole room, sender included. Our own
      // tap was already shown instantly by sendReaction's optimistic echo,
      // so ignore the server copy or the emoji appears twice ("You" + name).
      if (reaction.senderId === currentUserId) return;

      // Quick blip for every other player's floating emoji.
      playSound('pop');

      const id = Math.random().toString();
      setFloatingReactions((prev) => [...prev, { id, ...reaction }]);
      setTimeout(() => {
        setFloatingReactions((prev) => prev.filter((r) => r.id !== id));
      }, 3000);
    };

    socket.on('chat:message', handleMessage);
    socket.on('chat:history', handleHistory);
    socket.on('chat:reaction', handleReaction);

    // Ask the server for everything already said in this room so a page
    // refresh (or rejoin) replays the chat instead of starting empty.
    requestHistory();

    return () => {
      if (historyRetryTimer) clearTimeout(historyRetryTimer);
      socket.off('chat:message', handleMessage);
      socket.off('chat:history', handleHistory);
      socket.off('chat:reaction', handleReaction);
    };
  }, [currentUserId, inline]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;
    const socket = getSocket();
    socket.emit('chat:send-message', { message: inputMessage.trim() });
    setInputMessage('');
    setPickerOpen(false);
  };

  const sendReaction = (reaction: string) => {
    const socket = getSocket();
    // Optimistic echo: the server broadcasts to the room, but the bubble
    // must appear the moment you tap, even if the event round-trips late
    // or the socket hiccups. The server copy still arrives and animates.
    const id = Math.random().toString();
    const meName = 'You';
    setFloatingReactions((prev) => [
      ...prev.slice(-4),
      { id, reaction, senderName: meName },
    ]);
    setTimeout(() => {
      setFloatingReactions((prev) => prev.filter((r) => r.id !== id));
    }, 3000);
    playSound('pop');
    socket.emit('chat:send-reaction', { reaction });
  };

  const insertEmoji = (emoji: string) => {
    setInputMessage((prev) => (prev + emoji).slice(0, 200));
  };

  const messageList = (bubblesMax: string) => (
    <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2.5">
      {messages.length === 0 ? (
        <div className="h-full flex items-center justify-center text-xs text-zinc-500 italic">
          Say something or send a reaction!
        </div>
      ) : (
        messages.map((m, idx) => {
          const isMe = m.senderId === currentUserId;
          return (
            <div
              key={idx}
              className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
            >
              <span className="mb-0.5 flex items-center gap-1.5 px-1 text-[10px] font-bold text-zinc-500">
                <Identicon name={m.senderName} className="h-3.5 w-3.5" />
                {isMe ? 'You' : m.senderName}
              </span>
              <div
                className={`px-3 py-1.5 rounded-2xl text-sm ${bubblesMax} break-words ${
                  isMe
                    ? 'bg-gradient-to-br from-amber-400 to-amber-500 text-zinc-950 font-medium rounded-br-md'
                    : 'bg-white/[0.07] text-zinc-100 ring-1 ring-white/10 rounded-bl-md'
                }`}
              >
                {m.message}
              </div>
            </div>
          );
        })
      )}
      <div ref={messagesEndRef} />
    </div>
  );

  const composer = (
    <div className="shrink-0 space-y-1.5 border-t border-white/[0.06] bg-white/[0.02] p-2">
      {/* Quick-access emoji picker for messages */}
      {pickerOpen && (
        <div className="grid grid-cols-11 gap-0.5 rounded-xl bg-white/[0.04] p-1.5 ring-1 ring-white/10">
          {QUICK_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => insertEmoji(emoji)}
              className="cursor-pointer rounded-md py-1 text-base transition-transform hover:scale-125 active:scale-90"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
      <form onSubmit={handleSend} className="flex gap-2">
        <button
          type="button"
          onClick={() => setPickerOpen((v) => !v)}
          aria-label="Insert emoji"
          className={`flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl transition-colors ${
            pickerOpen
              ? 'bg-amber-400/20 text-amber-300 ring-1 ring-amber-400/40'
              : 'bg-white/[0.05] text-zinc-400 ring-1 ring-white/10 hover:text-zinc-200'
          }`}
        >
          <Smile className="h-4.5 w-4.5" />
        </button>
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder="Type message…"
          maxLength={200}
          className="h-9 min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[0.05] px-3 text-sm text-white outline-none transition-all placeholder:text-zinc-600 focus:border-amber-400/60 focus:ring-2 focus:ring-amber-400/20"
        />
        <button
          type="submit"
          disabled={!inputMessage.trim()}
          aria-label="Send message"
          className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-gradient-to-b from-amber-400 to-amber-500 text-zinc-950 transition-all hover:brightness-110 disabled:opacity-40 active:scale-95"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );

  // Floating emoji bubbles — rendered in BOTH variants so reactions always
  // show, including the in-game drawer/sidebar chat where the bug was.
  const reactionBubbles = (
    <div
      className={`pointer-events-none z-50 flex flex-col items-start gap-2 max-w-[90vw] ${
        inline
          ? 'fixed bottom-[calc(7.5rem+env(safe-area-inset-bottom))] left-4'
          : 'fixed bottom-[calc(6rem+env(safe-area-inset-bottom))] left-4 sm:left-6'
      }`}
    >
      {floatingReactions.map((r) => (
        <div
          key={r.id}
          className="animate-bounce rounded-full bg-zinc-900/90 px-4 py-2 text-lg shadow-lg ring-1 ring-amber-400/30 flex items-center gap-2 text-white"
        >
          <span>{r.reaction}</span>
          <Identicon name={r.senderName} className="h-4 w-4" />
          <span className="text-xs font-semibold text-amber-300">{r.senderName}</span>
        </div>
      ))}
    </div>
  );

  // ─── INLINE PANEL (desktop sidebar / mobile drawer, always visible) ─────
  if (inline) {
    return (
      <>
        {reactionBubbles}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl bg-[#0b0b13]/80 ring-1 ring-white/10">
          <div className="flex shrink-0 items-center gap-2 border-b border-white/[0.06] bg-white/[0.03] px-3 py-2">
            <MessageSquare className="h-4 w-4 text-amber-400" />
            <h3 className="text-xs font-black uppercase tracking-[0.18em] text-zinc-100">
              Room Chat
            </h3>
          </div>
          {messageList('max-w-[85%]')}
          {/* Quick reaction bar + composer */}
          <div className="shrink-0 border-t border-white/[0.06] bg-white/[0.02] px-2 pt-1.5">
            <div className="flex flex-nowrap items-center gap-0.5 overflow-x-auto emoji-scrollbar pb-1">
              {EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => sendReaction(emoji)}
                  className="shrink-0 cursor-pointer p-1.5 text-lg transition-transform hover:scale-125 active:scale-90"
                  title="React"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
          {composer}
        </div>
      </>
    );
  }

  return (
    <>
      {reactionBubbles}

      {/* Floating Chat Toggle Button */}
      <div className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-3 z-40 flex max-w-[calc(100vw-1.5rem)] items-center gap-1.5 sm:bottom-6 sm:right-6">
        {/* Quick Reaction Bar */}
        <div className="emoji-scrollbar flex min-w-0 max-w-[56vw] flex-nowrap items-center gap-0.5 overflow-x-auto rounded-full border border-white/10 bg-zinc-900/95 p-1.5 shadow-xl backdrop-blur-md sm:max-w-[26rem] sm:gap-1">
          {EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => sendReaction(emoji)}
              className="shrink-0 cursor-pointer p-2 text-[1.15rem] transition-transform hover:scale-125 active:scale-90 sm:p-1.5 sm:text-xl"
              title="React"
            >
              {emoji}
            </button>
          ))}
        </div>

        <button
          onClick={() => setIsOpen(!isOpen)}
          className="relative shrink-0 cursor-pointer rounded-full bg-gradient-to-b from-amber-400 to-amber-500 p-3.5 font-bold text-zinc-950 shadow-2xl transition-transform hover:scale-105 active:scale-95"
        >
          {isOpen ? <X className="h-6 w-6" /> : <MessageSquare className="h-6 w-6" />}
          {!isOpen && unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 min-w-5 animate-pulse items-center justify-center rounded-full border-2 border-zinc-950 bg-red-500 px-1 text-xs font-bold text-white shadow-lg">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Chat Drawer / Window */}
      {isOpen && (
        <div className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] left-4 right-4 z-50 flex h-96 max-h-[calc(100vh-9rem)] flex-col overflow-hidden rounded-2xl bg-[#0b0b13]/95 shadow-2xl ring-1 ring-white/10 backdrop-blur-lg animate-in fade-in slide-in-from-bottom-6 sm:left-auto sm:right-6 sm:w-96">
          <div className="flex items-center gap-2 border-b border-white/[0.06] bg-white/[0.03] px-4 py-3">
            <MessageSquare className="h-4 w-4 text-amber-400" />
            <h3 className="text-sm font-bold text-zinc-100">Room Chat</h3>
          </div>
          {messageList('max-w-[80%]')}
          {composer}
        </div>
      )}
    </>
  );
};
