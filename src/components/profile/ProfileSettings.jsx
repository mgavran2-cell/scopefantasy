import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { LogOut, Trash2, Camera, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const SPORTS = ['Nogomet', 'Košarka', 'Tenis', 'Formula 1', 'MMA'];

export default function ProfileSettings({ user, onSaved, onAvatarClick }) {
  const [name, setName] = useState(user?.full_name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [sport, setSport] = useState(user?.favorite_sport || '');
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  const save = async () => {
    setSaving(true);
    await base44.auth.updateMe({
      full_name: name.trim(),
      bio: bio.trim(),
      favorite_sport: sport || null,
    });
    setSaving(false);
    toast.success('Profil ažuriran!');
    if (onSaved) onSaved({ full_name: name.trim(), bio: bio.trim(), favorite_sport: sport || null });
  };

  const requestDeletion = async () => {
    setDeletingAccount(true);
    await base44.auth.updateMe({ deletion_requested: true });
    toast.info('Zahtjev za brisanje računa poslan. Admin će ga obraditi ručno.');
    setShowDeleteConfirm(false);
    setDeletingAccount(false);
  };

  return (
    <div className="space-y-5">
      {/* Name */}
      <div className="rounded-2xl bg-card border border-border/50 p-5 space-y-4">
        <h3 className="font-bold text-sm text-muted-foreground uppercase tracking-wide">Profil informacije</h3>

        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Korisničko ime</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            maxLength={40}
            className="w-full bg-secondary border border-border/50 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary/50 transition-colors"
            placeholder="Tvoje ime..."
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
            Bio <span className="font-normal">({bio.length}/200)</span>
          </label>
          <textarea
            value={bio}
            onChange={e => setBio(e.target.value.slice(0, 200))}
            rows={3}
            className="w-full bg-secondary border border-border/50 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary/50 transition-colors resize-none"
            placeholder="Napiši nešto o sebi..."
          />
          <div className="flex justify-end">
            <span className={`text-xs ${bio.length >= 190 ? 'text-destructive' : 'text-muted-foreground'}`}>{bio.length}/200</span>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Omiljeni sport</label>
          <select
            value={sport}
            onChange={e => setSport(e.target.value)}
            className="w-full bg-secondary border border-border/50 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary/50 transition-colors"
          >
            <option value="">— Nije postavljeno —</option>
            {SPORTS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <Button onClick={save} disabled={saving} className="w-full rounded-xl">
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Sprema...' : 'Spremi promjene'}
        </Button>
      </div>

      {/* Avatar */}
      <div className="rounded-2xl bg-card border border-border/50 p-5">
        <h3 className="font-bold text-sm text-muted-foreground uppercase tracking-wide mb-3">Profilna slika</h3>
        <button
          onClick={onAvatarClick}
          className="flex items-center gap-3 px-4 py-3 rounded-xl bg-secondary hover:bg-secondary/80 transition-all text-sm font-semibold w-full"
        >
          <Camera className="w-4 h-4 text-primary" />
          Promijeni profilnu sliku
        </button>
      </div>

      {/* Danger zone */}
      <div className="rounded-2xl bg-card border border-destructive/20 p-5 space-y-3">
        <h3 className="font-bold text-sm text-destructive uppercase tracking-wide">Opasna zona</h3>
        <Button
          variant="outline"
          className="w-full rounded-xl border-border/50"
          onClick={() => base44.auth.logout()}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Odjava
        </Button>
        <Button
          variant="outline"
          className="w-full rounded-xl border-destructive/40 text-destructive hover:bg-destructive/10"
          onClick={() => setShowDeleteConfirm(true)}
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Zatraži brisanje računa
        </Button>
      </div>

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full">
            <h3 className="font-black text-lg mb-2">Obriši račun?</h3>
            <p className="text-sm text-muted-foreground mb-5">
              Poslatit ćemo zahtjev adminu koji će ručno obrisati tvoj račun i sve povezane podatke. 
              Ova radnja je nepovratna.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-secondary text-sm font-bold hover:bg-secondary/80 transition-all"
              >
                Odustani
              </button>
              <button
                onClick={requestDeletion}
                disabled={deletingAccount}
                className="flex-1 py-2.5 rounded-xl bg-destructive text-destructive-foreground text-sm font-bold hover:opacity-90 disabled:opacity-50 transition-all"
              >
                {deletingAccount ? 'Šalje...' : 'Da, obriši'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}