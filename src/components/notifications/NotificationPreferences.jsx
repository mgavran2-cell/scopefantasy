import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Bell, Trophy, Flame, Users, Settings, Monitor, Mail, Newspaper } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useBrowserNotifications } from '../../hooks/useBrowserNotifications';

const PREFS = [
  {
    key: 'pick_results',
    label: 'Pick rezultati',
    desc: 'Kad tvoj pick pobijedi, izgubi ili bude djelomičan',
    icon: Trophy,
    color: 'text-primary',
  },
  {
    key: 'daily_streak',
    label: 'Daily Streak i poklon',
    desc: 'Dnevni podsjete i streak nagrade',
    icon: Flame,
    color: 'text-orange-400',
  },
  {
    key: 'social',
    label: 'Socijalne aktivnosti',
    desc: 'Novi pratioci, komentari i dvoboji',
    icon: Users,
    color: 'text-accent',
  },
  {
    key: 'system',
    label: 'Sistemske obavijesti',
    desc: 'Nova natjecanja, rezultati i rangovi',
    icon: Settings,
    color: 'text-muted-foreground',
  },
  {
    key: 'weekly_digest',
    label: 'Tjedni digest prijatelja',
    desc: 'Recap aktivnosti prijatelja kad si neaktivan 3+ dana',
    icon: Newspaper,
    color: 'text-blue-400',
  },
  {
    key: 'email_digest',
    label: 'Email digest',
    desc: 'Primi tjedni digest i na email (zadano isključeno)',
    icon: Mail,
    color: 'text-green-400',
  },
];

export default function NotificationPreferences({ user, onSaved }) {
  const { requestPermission, permissionStatus } = useBrowserNotifications();

  const defaultPrefs = {
    pick_results: true,
    daily_streak: true,
    social: true,
    system: true,
    browser_push: false,
    weekly_digest: true,
    email_digest: false,
    ...((user?.notification_preferences) || {}),
  };

  const [prefs, setPrefs] = useState(defaultPrefs);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const toggle = (key) => {
    setPrefs(prev => ({ ...prev, [key]: !prev[key] }));
    setSaved(false);
  };

  const toggleBrowserPush = async () => {
    if (!prefs.browser_push) {
      const granted = await requestPermission();
      if (!granted) return;
    }
    setPrefs(prev => ({ ...prev, browser_push: !prev.browser_push }));
    setSaved(false);
  };

  const save = async () => {
    setSaving(true);
    await base44.auth.updateMe({ notification_preferences: prefs });
    setSaving(false);
    setSaved(true);
    if (onSaved) onSaved(prefs);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="rounded-2xl bg-card border border-border/50 overflow-hidden">
      <div className="px-5 py-4 border-b border-border/40">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-primary" />
          <h3 className="font-bold text-sm">Postavke obavijesti</h3>
        </div>
      </div>

      <div className="divide-y divide-border/30">
        {PREFS.map(({ key, label, desc, icon: Icon, color }) => (
          <div key={key} className="flex items-center gap-4 px-5 py-4">
            <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center shrink-0">
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">{label}</p>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </div>
            <Switch
              checked={prefs[key]}
              onCheckedChange={() => toggle(key)}
            />
          </div>
        ))}

        {/* Browser push — special */}
        <div className="flex items-center gap-4 px-5 py-4">
          <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center shrink-0">
            <Monitor className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">Browser push obavijesti</p>
            <p className="text-xs text-muted-foreground">
              {permissionStatus === 'denied'
                ? 'Blokirano u postavkama preglednika'
                : 'Primaj obavijesti čak i kad nisi na stranici'}
            </p>
          </div>
          <Switch
            checked={prefs.browser_push}
            onCheckedChange={toggleBrowserPush}
            disabled={permissionStatus === 'denied'}
          />
        </div>
      </div>

      <div className="px-5 py-4 border-t border-border/40">
        <button
          onClick={save}
          disabled={saving}
          className={`w-full py-2.5 rounded-xl text-sm font-bold transition-all ${
            saved
              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
              : 'bg-primary text-primary-foreground hover:opacity-90'
          }`}
        >
          {saving ? 'Sprema...' : saved ? '✓ Spremljeno' : 'Spremi postavke'}
        </button>
      </div>
    </div>
  );
}