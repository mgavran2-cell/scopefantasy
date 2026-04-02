import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Send, MessageCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import moment from 'moment';

export default function ContestLiveChat({ contestId, currentUser }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    base44.entities.Comment.filter({ post_id: contestId }, 'created_date', 100).then(data => {
      setMessages(data);
      setLoading(false);
    });

    const unsub = base44.entities.Comment.subscribe(event => {
      if (event.type === 'create' && event.data.post_id === contestId) {
        setMessages(prev => [...prev, event.data]);
      }
    });
    return unsub;
  }, [contestId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    await base44.entities.Comment.create({
      post_id: contestId,
      user_email: currentUser.email,
      user_name: currentUser.full_name || currentUser.email,
      avatar_url: currentUser.avatar_url || null,
      content: text.trim(),
    });
    setText('');
    setSending(false);
  };

  return (
    <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/40">
        <MessageCircle className="w-4 h-4 text-primary" />
        <h3 className="font-bold text-sm">Live Chat</h3>
        <span className="ml-auto text-xs text-muted-foreground">{messages.length} poruka</span>
      </div>

      <div className="h-64 overflow-y-auto p-3 space-y-2">
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-5 h-5 border-2 border-muted border-t-primary rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground text-sm">
            <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-20" />
            Budi prvi koji će napisati poruku!
          </div>
        ) : messages.map((msg, i) => {
          const isMe = msg.user_email === currentUser?.email;
          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-2 ${isMe ? 'flex-row-reverse' : ''}`}
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-fuchsia-500 flex items-center justify-center shrink-0 overflow-hidden">
                {msg.avatar_url
                  ? <img src={msg.avatar_url} alt="" className="w-full h-full object-cover" />
                  : <span className="text-white font-bold text-xs">{(msg.user_name || msg.user_email)?.charAt(0).toUpperCase()}</span>
                }
              </div>
              <div className={`max-w-[75%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                {!isMe && <p className="text-[10px] text-muted-foreground mb-0.5 ml-1">{msg.user_name || msg.user_email}</p>}
                <div className={`px-3 py-1.5 rounded-2xl text-sm ${isMe ? 'bg-primary text-primary-foreground rounded-tr-sm' : 'bg-secondary rounded-tl-sm'}`}>
                  {msg.content}
                </div>
                <p className="text-[10px] text-muted-foreground/50 mt-0.5 mx-1">{moment(msg.created_date).format('HH:mm')}</p>
              </div>
            </motion.div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="px-3 pb-3 pt-2 border-t border-border/30 flex gap-2">
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="Napiši poruku..."
          className="flex-1 bg-secondary rounded-xl px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
        />
        <button
          onClick={send}
          disabled={sending || !text.trim()}
          className="p-2 rounded-xl bg-primary text-primary-foreground disabled:opacity-40 hover:opacity-90 transition-all"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}