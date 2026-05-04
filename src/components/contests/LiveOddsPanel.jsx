import { Zap, Clock } from 'lucide-react';

export default function LiveOddsPanel({ contest, selections }) {
  if (!contest.players?.length) return null;

  return (
    <div className="rounded-2xl border border-border/50 bg-card overflow-hidden mb-6">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/30">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-accent" />
          <span className="font-black text-sm uppercase tracking-wide">Live Kvote</span>
        </div>
        <span className="px-2.5 py-1 rounded-full bg-accent/20 text-accent text-xs font-bold uppercase tracking-wider">Uskoro</span>
      </div>
      <div className="flex flex-col items-center justify-center py-10 px-6 text-center gap-3">
        <Clock className="w-8 h-8 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
          Live podaci uskoro — trenutno testiramo integraciju s pravim sportskim API-jem.
        </p>
      </div>
    </div>
  );
}