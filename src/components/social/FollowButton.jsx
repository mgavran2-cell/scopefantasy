import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { UserPlus, UserCheck, Loader2 } from 'lucide-react';

export default function FollowButton({ targetEmail, targetName, currentUserEmail, size = 'sm' }) {
  const [following, setFollowing] = useState(null);
  const [followId, setFollowId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUserEmail || currentUserEmail === targetEmail) { setLoading(false); return; }
    base44.entities.Follow.filter({ follower_email: currentUserEmail, following_email: targetEmail }).then(data => {
      if (data.length > 0) { setFollowing(true); setFollowId(data[0].id); }
      else setFollowing(false);
      setLoading(false);
    });
  }, [currentUserEmail, targetEmail]);

  if (!currentUserEmail || currentUserEmail === targetEmail) return null;
  if (loading) return <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />;

  const toggle = async (e) => {
    e.stopPropagation();
    setLoading(true);
    if (following) {
      await base44.entities.Follow.delete(followId);
      setFollowing(false);
      setFollowId(null);
    } else {
      const rec = await base44.entities.Follow.create({
        follower_email: currentUserEmail,
        following_email: targetEmail,
        following_name: targetName || targetEmail,
      });
      setFollowing(true);
      setFollowId(rec.id);
    }
    setLoading(false);
  };

  const sizeClasses = size === 'sm'
    ? 'px-3 py-1.5 text-xs'
    : 'px-4 py-2 text-sm';

  return (
    <button
      onClick={toggle}
      className={`flex items-center gap-1.5 rounded-full font-semibold border transition-all ${sizeClasses} ${
        following
          ? 'bg-secondary border-border/50 text-muted-foreground hover:border-destructive/40 hover:text-destructive'
          : 'bg-primary/10 border-primary/30 text-primary hover:bg-primary/20'
      }`}
    >
      {following ? <UserCheck className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
      {following ? 'Pratiš' : 'Prati'}
    </button>
  );
}