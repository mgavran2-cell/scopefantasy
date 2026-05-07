import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Upload, ExternalLink } from 'lucide-react';

export default function SponsorFields({ data, onChange }) {
  const [uploading, setUploading] = useState(false);

  const set = (key, val) => onChange({ ...data, [key]: val });

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    set('sponsor_logo_url', file_url);
    setUploading(false);
  };

  return (
    <div className="space-y-4 mt-4 p-4 rounded-xl bg-yellow-500/5 border border-yellow-500/20">
      <p className="text-xs font-black uppercase tracking-widest text-yellow-400">Podaci o sponzoru</p>

      {/* Sponsor name */}
      <div>
        <label className="text-xs font-semibold text-muted-foreground block mb-1">
          Naziv sponzora <span className="text-destructive">*</span>
        </label>
        <input
          type="text"
          value={data.sponsor_name || ''}
          onChange={e => set('sponsor_name', e.target.value)}
          placeholder="npr. Hervis Sport"
          className="w-full px-3 py-2 rounded-xl bg-secondary border border-border/50 text-sm focus:outline-none focus:border-yellow-500/50"
        />
      </div>

      {/* Sponsor message */}
      <div>
        <label className="text-xs font-semibold text-muted-foreground block mb-1">
          Poruka sponzora <span className="text-destructive">*</span>
        </label>
        <textarea
          value={data.sponsor_message || ''}
          onChange={e => set('sponsor_message', e.target.value)}
          placeholder='npr. "Pobjednik osvaja voucher €50 za Hervis Sport!"'
          rows={2}
          className="w-full px-3 py-2 rounded-xl bg-secondary border border-border/50 text-sm focus:outline-none focus:border-yellow-500/50 resize-none"
        />
      </div>

      {/* Logo */}
      <div>
        <label className="text-xs font-semibold text-muted-foreground block mb-1">Logo sponzora</label>
        <div className="flex gap-2 items-center">
          <input
            type="text"
            value={data.sponsor_logo_url || ''}
            onChange={e => set('sponsor_logo_url', e.target.value)}
            placeholder="URL slike logotipa"
            className="flex-1 px-3 py-2 rounded-xl bg-secondary border border-border/50 text-sm focus:outline-none focus:border-yellow-500/50"
          />
          <label className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-secondary border border-border/50 text-xs font-semibold cursor-pointer hover:bg-secondary/80 transition-all">
            {uploading
              ? <div className="w-4 h-4 border-2 border-muted border-t-yellow-400 rounded-full animate-spin" />
              : <Upload className="w-4 h-4" />
            }
            Upload
            <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
          </label>
        </div>
        {data.sponsor_logo_url && (
          <img src={data.sponsor_logo_url} alt="Logo" className="mt-2 h-12 rounded-lg object-contain bg-white/5 p-1 border border-border/30" />
        )}
      </div>

      {/* Prize description */}
      <div>
        <label className="text-xs font-semibold text-muted-foreground block mb-1">Opis sponzor nagrade</label>
        <textarea
          value={data.sponsor_prize_description || ''}
          onChange={e => set('sponsor_prize_description', e.target.value)}
          placeholder='npr. "Voucher €50, dres po izboru, popust 30%"'
          rows={2}
          className="w-full px-3 py-2 rounded-xl bg-secondary border border-border/50 text-sm focus:outline-none focus:border-yellow-500/50 resize-none"
        />
      </div>

      {/* Brand color */}
      <div>
        <label className="text-xs font-semibold text-muted-foreground block mb-1">Boja brenda (opcionalno)</label>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={data.sponsor_color || '#FFD700'}
            onChange={e => set('sponsor_color', e.target.value)}
            className="w-10 h-10 rounded-lg border border-border/50 cursor-pointer bg-transparent"
          />
          <input
            type="text"
            value={data.sponsor_color || ''}
            onChange={e => set('sponsor_color', e.target.value)}
            placeholder="#FFD700"
            className="flex-1 px-3 py-2 rounded-xl bg-secondary border border-border/50 text-sm focus:outline-none focus:border-yellow-500/50"
          />
        </div>
      </div>

      {/* Sponsor URL */}
      <div>
        <label className="text-xs font-semibold text-muted-foreground block mb-1">Web sponzora (opcionalno)</label>
        <div className="flex items-center gap-2">
          <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            type="url"
            value={data.sponsor_url || ''}
            onChange={e => set('sponsor_url', e.target.value)}
            placeholder="https://www.hervis.hr"
            className="flex-1 px-3 py-2 rounded-xl bg-secondary border border-border/50 text-sm focus:outline-none focus:border-yellow-500/50"
          />
        </div>
      </div>
    </div>
  );
}