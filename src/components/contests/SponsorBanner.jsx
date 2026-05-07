import { ExternalLink, Gift } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function SponsorBanner({ contest }) {
  if (!contest?.is_sponsored) return null;

  const { sponsor_name, sponsor_logo_url, sponsor_message, sponsor_url, sponsor_prize_description, sponsor_color } = contest;

  const handleSponsorClick = async () => {
    const user = await base44.auth.me().catch(() => null);
    await base44.entities.SponsorClick.create({
      contest_id: contest.id,
      user_email: user?.email || null,
      sponsor_name: sponsor_name || '',
    }).catch(() => {});
    if (sponsor_url) window.open(sponsor_url, '_blank', 'noopener,noreferrer');
  };
  const accentColor = sponsor_color || '#FFD700';

  return (
    <div
      className="rounded-2xl border p-5 mb-6 relative overflow-hidden"
      style={{ borderColor: `${accentColor}40`, background: `${accentColor}08` }}
    >
      {/* Decorative glow */}
      <div
        className="absolute inset-0 opacity-5 rounded-2xl"
        style={{ background: `radial-gradient(circle at top left, ${accentColor}, transparent 60%)` }}
      />

      <div className="relative flex items-start gap-4">
        {/* Logo */}
        {sponsor_logo_url ? (
          <img
            src={sponsor_logo_url}
            alt={sponsor_name}
            className="w-16 h-16 rounded-xl object-contain bg-white/10 p-1 shrink-0 border border-white/10"
          />
        ) : (
          <div
            className="w-16 h-16 rounded-xl flex items-center justify-center shrink-0 font-black text-2xl border"
            style={{ borderColor: `${accentColor}40`, color: accentColor, background: `${accentColor}15` }}
          >
            {sponsor_name?.charAt(0) || '★'}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span
              className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full"
              style={{ color: accentColor, background: `${accentColor}20` }}
            >
              Sponzor natjecanja
            </span>
          </div>
          <h3 className="font-black text-base" style={{ color: accentColor }}>{sponsor_name}</h3>
          {sponsor_message && (
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{sponsor_message}</p>
          )}
          {sponsor_url && (
            <button
              onClick={handleSponsorClick}
              className="inline-flex items-center gap-1.5 mt-3 text-xs font-bold px-3 py-1.5 rounded-xl transition-all hover:opacity-80"
              style={{ color: accentColor, background: `${accentColor}15`, border: `1px solid ${accentColor}30` }}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Saznaj više
            </button>
          )}
        </div>
      </div>

      {/* Prize section */}
      {sponsor_prize_description && (
        <div
          className="mt-4 pt-4 border-t"
          style={{ borderColor: `${accentColor}25` }}
        >
          <div className="flex items-start gap-2">
            <Gift className="w-4 h-4 mt-0.5 shrink-0" style={{ color: accentColor }} />
            <div>
              <p className="text-xs font-black uppercase tracking-wider mb-1" style={{ color: accentColor }}>
                Sponzor nagrade
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">{sponsor_prize_description}</p>
              <p className="text-xs font-semibold mt-1.5" style={{ color: accentColor }}>
                Pobjednik osvaja sponzor nagradu uz osvoj ene tokene!
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}