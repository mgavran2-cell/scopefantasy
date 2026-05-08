import { useParams, useLocation } from 'react-router-dom';

const PAGES = {
  '/pravila': {
    title: 'Pravila korištenja',
    version: 'Beta v0.1',
  },
  '/privatnost': {
    title: 'Pravila o privatnosti',
    version: 'Beta v0.1',
  },
  '/kako-igrati': {
    title: 'Kako igrati',
    version: 'Beta v0.1',
  },
};

const CURRENT_DATE = '8. svibnja 2026.';

export default function LegalPage() {
  const { pathname } = useLocation();
  const page = PAGES[pathname] || { title: 'Dokument', version: 'Beta v0.1' };

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-[800px] mx-auto">
        {/* Header */}
        <div className="mb-8 pb-6 border-b border-border/40">
          <h1 className="text-3xl font-black mb-2">{page.title}</h1>
          <p className="text-sm text-muted-foreground">
            Verzija: {page.version} · Datum: {CURRENT_DATE}
          </p>
        </div>

        {/* Body */}
        <div className="prose prose-invert prose-sm max-w-none">
          <div className="rounded-2xl bg-card border border-border/40 p-8 text-muted-foreground text-sm leading-relaxed">
            <p className="italic">
              Sadržaj se učitava — ažurirat ćemo nakon pravne provjere.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-border/40">
          <p className="text-xs text-muted-foreground">
            Posljednje ažuriranje: {CURRENT_DATE}
          </p>
        </div>
      </div>
    </div>
  );
}