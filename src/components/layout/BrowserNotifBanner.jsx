import { useState } from 'react';
import { useBrowserNotifications } from '../../hooks/useBrowserNotifications';
import { Bell, X } from 'lucide-react';

export default function BrowserNotifBanner() {
  const { permission, requestPermission } = useBrowserNotifications();
  const [dismissed, setDismissed] = useState(false);

  if (permission !== 'default' || dismissed) return null;

  return (
    <div className="fixed top-16 left-0 right-0 z-40 flex justify-center px-4 pt-3 pointer-events-none">
      <div className="pointer-events-auto flex items-center gap-3 bg-card border border-primary/30 rounded-2xl px-4 py-3 shadow-lg shadow-primary/10 max-w-md w-full">
        <Bell className="w-5 h-5 text-primary shrink-0" />
        <p className="text-sm flex-1">Uključi push obavijesti da ne propustiš ništa!</p>
        <button
          onClick={async () => { await requestPermission(); setDismissed(true); }}
          className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition-all shrink-0"
        >
          Uključi
        </button>
        <button onClick={() => setDismissed(true)} className="text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}