import { useLocation } from 'react-router-dom';
import PravilaKoristenja from '../components/legal/PravilaKoristenja';
import PravilaPrivatnosti from '../components/legal/PravilaPrivatnosti';
import KakoIgrati from '../components/legal/KakoIgrati';

const CURRENT_DATE = '8. svibnja 2026.';

const PAGES = {
  '/pravila':     { title: 'Pravila korištenja',    version: 'Beta v0.1', Content: PravilaKoristenja },
  '/privatnost':  { title: 'Pravila o privatnosti', version: 'Beta v0.1', Content: PravilaPrivatnosti },
  '/kako-igrati': { title: 'Kako igrati',           version: 'Beta v0.1', Content: KakoIgrati },
};

function Placeholder() {
  return (
    <p className="italic text-muted-foreground">
      Sadržaj se učitava — ažurirat ćemo nakon pravne provjere.
    </p>
  );
}

export default function LegalPage() {
  const { pathname } = useLocation();
  const page = PAGES[pathname] || { title: 'Dokument', version: 'Beta v0.1', Content: null };
  const Content = page.Content || Placeholder;

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
        <div className="rounded-2xl bg-card border border-border/40 p-6 sm:p-10">
          <Content />
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