import React, { useState, useEffect, useRef } from 'react';
import { getSocket } from '../socket';
import { ChatMessage, ChatReaction } from '../types';
import { playSound } from '../sound';
import { Send, MessageSquare, X, Smile } from 'lucide-react';

const EMOJIS = ['😂', '😭', '😕', '🤝', '🕵️', '🤫', '😱', '👑', '🔥', '👀', '👍', '💀', '😎', '🥳', '😤', '👏', '⏳'];
// Shown in the always-visible quick bar next to the chat button.
const QUICK_EMOJIS = ['😂', '😭', '😕', '🤝', '😱', '🔥', '👍'];

interface ChatProps {
  currentUserId: string;
}

export const Chat: React.FC<ChatProps> = ({ currentUserId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [inputMessage, setInputMessage] = useState('');
  const [showEmojiPanel, setShowEmojiPanel] = useState(false);
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
    } else {
      setShowEmojiPanel(false);
    }
  }, [isOpen]);

  useEffect(() => {
    const socket = getSocket();

    const handleMessage = (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg]);
      // Only count incoming messages from other players as unread when drawer is closed
      if (!isOpenRef.current && msg.senderId !== currentUserId) {
        setUnreadCount((prev) => prev + 1);
      }
    };

    const handleReaction = (reaction: ChatReaction) => {
      // Quick blip for every floating emoji (own or someone else's).
      playSound('pop');

      const id = Math.random().toString();
      setFloatingReactions((prev) => [...prev, { id, ...reaction }]);
      setTimeout(() => {
        setFloatingReactions((prev) => prev.filter((r) => r.id !== id));
      }, 3000);
    };

    socket.on('chat:message', handleMessage);
    socket.on('chat:reaction', handleReaction);

    return () => {
      socket.off('chat:message', handleMessage);
      socket.off('chat:reaction', handleReaction);
    };
  }, [currentUserId]);

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
  };

  const sendReaction = (reaction: string) => {
    const socket = getSocket();
    socket.emit('chat:send-reaction', { reaction });
  };

  return (
    <>
      {/* Floating Reactions on Screen — anchored to the left so they never
          collide with the chat button/drawer on the right. */}
      <div className="fixed bottom-24 left-4 sm:left-6 pointer-events-none z-50 flex flex-col gap-2 items-start max-w-[90vw]">
        {floatingReactions.map((r) => (
          <div
            key={r.id}
            className="animate-bounce bg-slate-900/90 text-white px-4 py-2 rounded-full border border-amber-500/30 shadow-lg text-lg flex items-center gap-2"
          >
            <span>{r.reaction}</span>
            <span className="text-xs text-amber-300 font-semibold">{r.senderName}</span>
          </div>
        ))}
      </div>

      {/* Floating Chat Toggle Button */}
      <div className="fixed bottom-4 right-3 sm:bottom-6 sm:right-6 z-40 flex items-center gap-1.5 sm:gap-2 max-w-[calc(100vw-1.5rem)]">
        {/* Quick Reaction Bar — the last emojis hide on tiny screens so the
            chat button itself never gets pushed out of view. */}
        <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700 p-1.5 rounded-full shadow-xl flex items-center gap-0.5 sm:gap-1 min-w-0 overflow-x-auto">
          {QUICK_EMOJIS.map((emoji, i) => (
            <button
              key={emoji}
              onClick={() => sendReaction(emoji)}
              className={`text-[1.15rem] sm:text-xl p-2 sm:p-1.5 hover:scale-125 active:scale-90 transition-transform cursor-pointer shrink-0 ${
                i >= QUICK_EMOJIS.length - 2 ? 'hidden sm:block' : ''
              }`}
              title="React"
            >
              {emoji}
            </button>
          ))}
        </div>

        <button
          onClick={() => setIsOpen(!isOpen)}
          className="relative shrink-0 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 p-3.5 rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-transform font-bold cursor-pointer"
        >
          {isOpen ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
          {!isOpen && unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs min-w-5 h-5 px-1 rounded-full flex items-center justify-center font-bold animate-pulse shadow-lg border-2 border-slate-950">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Chat Drawer / Window */}
      {isOpen && (
        <div className="fixed bottom-20 right-4 left-4 sm:left-auto sm:right-6 sm:w-96 h-96 max-h-[calc(100vh-9rem)] bg-slate-900/95 backdrop-blur-lg border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col z-50 overflow-hidden animate-in fade-in slide-in-from-bottom-6">
          {/* Header */}
          <div className="bg-slate-800/80 px-4 py-3 border-b border-slate-700 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-amber-400" />
            <h3 className="font-bold text-sm text-slate-100">Room Chat</h3>
          </div>

          {/* Messages Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 italic">
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
                    <span className="text-[10px] text-slate-400 mb-0.5 px-1">
                      {isMe ? 'You' : m.senderName}
                    </span>
                    <div
                      className={`px-3 py-1.5 rounded-2xl text-sm max-w-[80%] break-words ${
                        isMe
                          ? 'bg-amber-500 text-slate-950 font-medium rounded-br-none'
                          : 'bg-slate-800 text-slate-100 border border-slate-700 rounded-bl-none'
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

          {/* Emoji section — every reaction in one scrollable grid */}
          {showEmojiPanel && (
            <div className="border-t border-slate-700 bg-slate-900/90 p-2.5 max-h-32 overflow-y-auto shrink-0">
              <span className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5 px-0.5">
                Send a reaction
              </span>
              <div className="grid grid-cols-8 sm:grid-cols-9 gap-1">
                {EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => sendReaction(emoji)}
                    className="text-xl py-1.5 rounded-lg hover:bg-slate-700/70 active:scale-90 transition cursor-pointer"
                    title="React"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Form */}
          <form
            onSubmit={handleSend}
            className="p-2.5 bg-slate-800/80 border-t border-slate-700 flex gap-2"
          >
            <button
              type="button"
              onClick={() => setShowEmojiPanel((open) => !open)}
              aria-label="Emoji reactions"
              aria-expanded={showEmojiPanel}
              className={`shrink-0 p-2.5 rounded-xl border transition-colors cursor-pointer ${
                showEmojiPanel
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                  : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-amber-300 hover:border-amber-500/40'
              }`}
            >
              <Smile className="w-5 h-5" />
            </button>
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Type message..."
              maxLength={200}
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
            />
            <button
              type="submit"
              disabled={!inputMessage.trim()}
              aria-label="Send message"
              className="shrink-0 bg-amber-500 disabled:opacity-40 text-slate-950 p-2.5 rounded-xl font-bold hover:bg-amber-400 transition-colors cursor-pointer"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
      )}
    </>
  );
};
