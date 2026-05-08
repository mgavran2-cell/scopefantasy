import { useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Camera } from 'lucide-react';
import { RankBadgeSmall, getRank } from './RankBadge';
import moment from 'moment';

const SPORT_EMOJI = {
  'Nogomet': '⚽',
  'Košarka': '🏀',
  'Tenis': '🎾',
  'Formula 1': '🏎️',
  'MMA': '🥊',
};

export default function ProfileHeader({ user, stats, avatarSize = 120, onAvatarUpdated }) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const rank = getRank(stats.total, stats.tokensWon);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    await base44.auth.updateMe({ avatar_url: file_url });
    if (onAvatarUpdated) onAvatarUpdated(file_url);
    setUploading(false);
  };

  const initials = user?.full_name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U';
  const joinDate = user?.created_date ? moment(user.created_date).format('DD.MM.YYYY') : '—';

  return (
    <div className="flex flex-col sm:flex-row items-start gap-5 mb-8">
      {/* Avatar */}
      <div className="relative group shrink-0" style={{ width: avatarSize, height: avatarSize }}>
        <div
          className="w-full h-full rounded-2xl overflow-hidden bg-gradient-to-br from-primary to-fuchsia-500 flex items-center justify-center"
        >
          {user?.avatar_url ? (
            <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <span className="font-black text-white" style={{ fontSize: avatarSize * 0.35 }}>{initials}</span>
          )}
        </div>
        {onAvatarUpdated && (
          <>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute inset-0 rounded-2xl bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center"
            >
              {uploading
                ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <Camera className="w-5 h-5 text-white" />}
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
          </>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <h1 className="text-2xl font-black truncate">{user?.full_name || 'Igrač'}</h1>
          <RankBadgeSmall rank={rank} />
          {user?.favorite_sport && (
            <span className="text-base">{SPORT_EMOJI[user.favorite_sport]}</span>
          )}
        </div>
        <p className="text-sm text-muted-foreground mb-1">{user?.email}</p>
        <p className="text-xs text-muted-foreground mb-2">Član od {joinDate}</p>
        {user?.bio && (
          <p className="text-sm text-foreground/80 leading-relaxed max-w-md">{user.bio}</p>
        )}
      </div>
    </div>
  );
}