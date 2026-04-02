import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, MessageCircle, Trophy, Coins, Send, Zap, Users, Copy, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import moment from 'moment';

const statusConfig = {
  won:     { label: 'Pobijedio', color: 'text-primary', bg: 'bg-primary/15', emoji: '🏆' },
  lost:    { label: 'Izgubio',   color: 'text-destructive', bg: 'bg-destructive/15', emoji: '😔' },
  active:  { label: 'U tijeku', color: 'text-accent', bg: 'bg-accent/15', emoji: '⚡' },
  partial: { label: 'Djelomično', color: 'text-muted-foreground', bg: 'bg-muted', emoji: '🎯' },
};

function PostCard({ post, currentUser, onLike, onComment }) {
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const liked = post.likes?.includes(currentUser?.email);
  const sc = post.pick_status ? statusConfig[post.pick_status] : null;

  const loadComments = async () => {
    if (loadingComments || comments.length > 0) return;
    setLoadingComments(true);
    const data = await base44.entities.Comment.filter({ post_id: post.id }, '-created_date', 50);
    setComments(data);
    setLoadingComments(false);
  };

  const handleToggleComments = () => {
    setShowComments(v => !v);
    if (!showComments) loadComments();
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim()) return;
    setSubmitting(true);
    const comment = await base44.entities.Comment.create({
      post_id: post.id,
      user_email: currentUser.email,
      user_name: currentUser.full_name || currentUser.email,
      avatar_url: currentUser.avatar_url || null,
      content: newComment.trim(),
    });
    setComments(prev => [comment, ...prev]);
    setNewComment('');
    setSubmitting(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border/50 rounded-2xl p-5"
    >
      {/* Author */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-fuchsia-500 flex items-center justify-center overflow-hidden shrink-0">
          {post.avatar_url
            ? <img src={post.avatar_url} alt="" className="w-full h-full object-cover" />
            : <span className="font-black text-white text-sm">{(post.user_name || post.user_email)?.charAt(0).toUpperCase()}</span>
          }
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm">{post.user_name || post.user_email}</p>
          <p className="text-xs text-muted-foreground">{moment(post.created_date).fromNow()}</p>
        </div>
      </div>

      {/* Pick result badge */}
      {sc && post.contest_title && (
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl ${sc.bg} mb-3`}>
          <span>{sc.emoji}</span>
          <span className={`text-xs font-bold ${sc.color}`}>{sc.label} u natjecanju:</span>
          <span className="text-xs font-semibold truncate max-w-[140px]">{post.contest_title}</span>
          {post.pick_status === 'won' && post.tokens_won > 0 && (
            <span className="flex items-center gap-1 text-xs font-black text-primary ml-1">
              <Coins className="w-3 h-3" />+{post.tokens_won}
            </span>
          )}
          {(post.correct_picks != null && post.total_picks) && (
            <span className="text-xs text-muted-foreground">{post.correct_picks}/{post.total_picks} točnih</span>
          )}
        </div>
      )}

      {/* Content */}
      <p className="text-sm leading-relaxed mb-4">{post.content}</p>

      {/* Actions */}
      <div className="flex items-center gap-4 pt-3 border-t border-border/30">
        <button
          onClick={() => onLike(post)}
          className={`flex items-center gap-1.5 text-sm font-semibold transition-all ${liked ? 'text-red-500' : 'text-muted-foreground hover:text-red-400'}`}
        >
          <Heart className={`w-4 h-4 ${liked ? 'fill-red-500' : ''}`} />
          {post.likes?.length || 0}
        </button>
        <button
          onClick={handleToggleComments}
          className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground transition-all"
        >
          <MessageCircle className="w-4 h-4" />
          Komentari
        </button>
        {post.contest_id && (
          <Link
            to={`/natjecanje/${post.contest_id}`}
            className="ml-auto flex items-center gap-1.5 text-xs font-bold text-accent hover:opacity-80 transition-all px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20"
          >
            <Copy className="w-3.5 h-3.5" /> Kopiraj okladu
          </Link>
        )}
      </div>

      {/* Comments */}
      <AnimatePresence>
        {showComments && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-4 space-y-3">
              {/* New comment input */}
              <div className="flex gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-fuchsia-500 flex items-center justify-center shrink-0">
                  <span className="font-black text-white text-xs">{(currentUser?.full_name || currentUser?.email)?.charAt(0).toUpperCase()}</span>
                </div>
                <div className="flex-1 flex gap-2">
                  <input
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSubmitComment()}
                    placeholder="Dodaj komentar..."
                    className="flex-1 bg-secondary rounded-xl px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
                  />
                  <button
                    onClick={handleSubmitComment}
                    disabled={submitting || !newComment.trim()}
                    className="p-2 rounded-xl bg-primary text-white disabled:opacity-50 hover:opacity-90 transition-all"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Comment list */}
              {loadingComments
                ? <div className="flex justify-center py-3"><div className="w-5 h-5 border-2 border-muted border-t-primary rounded-full animate-spin" /></div>
                : comments.map(c => (
                  <div key={c.id} className="flex gap-2">
                    <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center shrink-0 overflow-hidden">
                      {c.avatar_url
                        ? <img src={c.avatar_url} alt="" className="w-full h-full object-cover" />
                        : <span className="font-bold text-xs">{(c.user_name || c.user_email)?.charAt(0).toUpperCase()}</span>
                      }
                    </div>
                    <div className="flex-1 bg-secondary rounded-xl px-3 py-2">
                      <p className="text-xs font-bold mb-0.5">{c.user_name || c.user_email}</p>
                      <p className="text-xs text-muted-foreground">{c.content}</p>
                    </div>
                  </div>
                ))
              }
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function SocialFeed() {
  const [posts, setPosts] = useState([]);
  const [activePicks, setActivePicks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [newPost, setNewPost] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [tab, setTab] = useState('feed');

  useEffect(() => {
    (async () => {
      const [postsData, user, picksData] = await Promise.all([
        base44.entities.SocialPost.list('-created_date', 30),
        base44.auth.me(),
        base44.entities.Pick.filter({ status: 'active', is_public: true }, '-created_date', 50),
      ]);
      setPosts(postsData);
      setCurrentUser(user);
      setActivePicks(picksData);
      setLoading(false);
    })();
  }, []);

  const handlePost = async () => {
    if (!newPost.trim()) return;
    setSubmitting(true);
    const post = await base44.entities.SocialPost.create({
      user_email: currentUser.email,
      user_name: currentUser.full_name || currentUser.email,
      avatar_url: currentUser.avatar_url || null,
      content: newPost.trim(),
      type: 'post',
      likes: [],
    });
    setPosts(prev => [post, ...prev]);
    setNewPost('');
    setSubmitting(false);
  };

  const handleLike = async (post) => {
    const likes = post.likes || [];
    const already = likes.includes(currentUser.email);
    const updated = already
      ? likes.filter(e => e !== currentUser.email)
      : [...likes, currentUser.email];
    await base44.entities.SocialPost.update(post.id, { likes: updated });
    setPosts(prev => prev.map(p => p.id === post.id ? { ...p, likes: updated } : p));
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-black mb-1 flex items-center gap-3">
          <Users className="w-8 h-8 text-primary" />
          Social Feed
        </h1>
        <p className="text-muted-foreground text-sm">Prati uspjehe igrača, dijeli rezultate i komentiraj</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {[{key:'feed',label:'Feed'},{key:'active',label:'Aktivni okladi'}].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
              tab === t.key ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* New post */}
      <div className="bg-card border border-border/50 rounded-2xl p-4 mb-6">
        <div className="flex gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-fuchsia-500 flex items-center justify-center shrink-0 overflow-hidden">
            {currentUser?.avatar_url
              ? <img src={currentUser.avatar_url} alt="" className="w-full h-full object-cover" />
              : <span className="font-black text-white text-sm">{(currentUser?.full_name || currentUser?.email)?.charAt(0).toUpperCase()}</span>
            }
          </div>
          <div className="flex-1">
            <textarea
              value={newPost}
              onChange={e => setNewPost(e.target.value)}
              placeholder="Podijeli nešto s zajednicom..."
              className="w-full bg-secondary rounded-xl px-4 py-3 text-sm outline-none placeholder:text-muted-foreground resize-none min-h-[80px]"
            />
            <div className="flex justify-end mt-2">
              <Button
                onClick={handlePost}
                disabled={submitting || !newPost.trim()}
                size="sm"
                className="rounded-xl"
              >
                {submitting
                  ? <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                  : <><Zap className="w-4 h-4 mr-1.5" /> Objavi</>
                }
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Feed or Active Picks */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
        </div>
      ) : tab === 'feed' ? (
        posts.length === 0 ? (
          <div className="text-center py-16">
            <Users className="w-14 h-14 text-muted-foreground/20 mx-auto mb-4" />
            <h3 className="font-bold text-lg mb-1">Feed je prazan</h3>
            <p className="text-muted-foreground text-sm">Budi prvi koji će nešto podijeliti!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post, i) => (
              <PostCard
                key={post.id}
                post={post}
                currentUser={currentUser}
                onLike={handleLike}
                onComment={() => {}}
              />
            ))}
          </div>
        )
      ) : (
        activePicks.length === 0 ? (
          <div className="text-center py-16">
            <Eye className="w-14 h-14 text-muted-foreground/20 mx-auto mb-4" />
            <h3 className="font-bold text-lg mb-1">Nema aktivnih oklada</h3>
            <p className="text-muted-foreground text-sm">Korisnici još nisu označili okladu kao javnu.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activePicks.map((pick, i) => (
              <motion.div key={pick.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                className="bg-card border border-border/50 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-fuchsia-500 flex items-center justify-center">
                      <span className="text-white font-bold text-xs">{(pick.user_name || pick.user_email)?.charAt(0).toUpperCase()}</span>
                    </div>
                    <div>
                      <p className="font-bold text-sm">{pick.user_name || pick.user_email}</p>
                      <p className="text-xs text-muted-foreground">{pick.selections?.length} odabira · {pick.tokens_spent} tokena</p>
                    </div>
                  </div>
                  <Link to={`/natjecanje/${pick.contest_id}`}
                    className="flex items-center gap-1.5 text-xs font-bold text-accent px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20 hover:opacity-80 transition-all">
                    <Copy className="w-3.5 h-3.5" /> Kopiraj
                  </Link>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {pick.selections?.slice(0, 4).map((s, j) => (
                    <span key={j} className="text-xs px-2 py-1 rounded-lg bg-secondary font-medium">
                      {s.player_name} · <span className={s.choice === 'over' ? 'text-green-400' : 'text-red-400'}>{s.choice === 'over' ? '↑' : '↓'} {s.choice}</span>
                    </span>
                  ))}
                  {pick.selections?.length > 4 && (
                    <span className="text-xs px-2 py-1 rounded-lg bg-secondary text-muted-foreground">+{pick.selections.length - 4} više</span>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )
      )}
    </div>
  );
}