import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Link } from 'react-router-dom';

const CATEGORIES = [
  {
    emoji: '🎮',
    title: 'Osnove',
    questions: [
      {
        q: 'Što je ScopeFantasy?',
        a: 'ScopeFantasy je hrvatska aplikacija za fantasy sport gdje predviđaš statistike igrača, skupljaš tokene i natječeš se na ljestvici. Temelji se na vještini, nije igra na sreću.',
      },
      {
        q: 'Je li besplatno?',
        a: 'Da, potpuno besplatno tijekom beta faze. Dobiješ 5.000 tokena na startu i 100–1000 tokena svaki dan.',
      },
      {
        q: 'Je li ovo kockanje?',
        a: 'Ne. Tokeni nemaju stvarnu novčanu vrijednost i ne mogu se unovčiti. Igra se temelji na vještini predviđanja, ne na sreći.',
      },
      {
        q: 'Trebam li platiti nešto?',
        a: 'Ne u beta fazi. Kasnije će postojati opcionalna Premium pretplata za napredne funkcije (AI Coach, statistike), ali osnovna igra ostaje besplatna.',
      },
    ],
  },
  {
    emoji: '🪙',
    title: 'Tokeni',
    questions: [
      {
        q: 'Kako dobivam tokene?',
        a: 'Welcome bonus (5.000), dnevni login bonus (100–1000 ovisno o streaku), pobjede u natjecanjima, Daily Streak (do 15.000 tjedno), Welcome Challenge (5.000), pozivanje prijatelja (200 po osobi).',
      },
      {
        q: 'Što mogu raditi s tokenima?',
        a: 'Ulaziš u natjecanja, penješ se na ljestvici. U budućnosti: zamjena za partner nagrade (vaučeri, proizvodi).',
      },
      {
        q: 'Mogu li kupiti tokene?',
        a: 'U beta fazi ne. Plaćanja nisu aktivna.',
      },
      {
        q: 'Mogu li izgubiti tokene?',
        a: 'Trošiš ih kad ulaziš u natjecanja ili dvoboje. Ako ne pogodiš, gubiš uloženo. Ali svaki dan dobiješ besplatne tokene.',
      },
    ],
  },
  {
    emoji: '🎯',
    title: 'Igranje',
    questions: [
      {
        q: "Što je Pick'em?",
        a: 'Predviđaš hoće li igrač postići VIŠE ili MANJE od zadane brojke (npr. "Modrić — više ili manje od 55.5 dodavanja"). Pogodi sve odabire za nagradu.',
      },
      {
        q: 'Što je Parlay?',
        a: 'Kombiniraš više odabira u jedan listić. Power Play: svi moraju pogoditi (veći payout). Flex Play: možeš promašiti 1–2 (manji payout).',
      },
      {
        q: 'Što je Daily Streak?',
        a: 'Tjedni izazov — pogodi Pick dana svaki dan. 4/7 točnih = 500 tokena, 7/7 = 15.000 tokena.',
      },
      {
        q: 'Što su Dvoboji?',
        a: 'Izazoveš prijatelja na direktan duel. Pobjednik uzima sve uložene tokene.',
      },
      {
        q: 'Kako znam jesam li pogodio?',
        a: 'Nakon što natjecanje završi, rezultati se obrađuju i tokeni se automatski isplaćuju pobjednicima. Dobiješ notifikaciju.',
      },
    ],
  },
  {
    emoji: '👤',
    title: 'Račun',
    questions: [
      {
        q: 'Kako mijenjam korisničko ime / sliku?',
        a: 'Profil → Postavke → uredi ime, bio, omiljeni sport, profilnu sliku.',
      },
      {
        q: 'Kako pozovem prijatelje?',
        a: 'Profil → Referali → podijeli svoj kod. Oboje dobivate 200 tokena.',
      },
      {
        q: 'Kako izbrišem račun?',
        a: 'Profil → Postavke → Opasna zona → Zatraži brisanje računa.',
      },
      {
        q: 'Što je rang (Brončani, Srebrni...)?',
        a: 'Rang raste s brojem pobjeda: Brončani (start), Srebrni (10+), Zlatni (50+), Platinasti (200+), Dijamantni (elita).',
      },
    ],
  },
  {
    emoji: '⚙️',
    title: 'Tehnička pitanja',
    questions: [
      {
        q: 'Aplikacija ne radi / bug?',
        a: 'Osvježi stranicu. Ako se nastavi, javi nam na marko.gavran@outlook.com s opisom problema.',
      },
      {
        q: 'Ne dobivam notifikacije?',
        a: 'Provjeri Profil → Postavke obavijesti. Za browser push, moraš dozvoliti notifikacije u browseru.',
      },
      {
        q: 'Što je Premium?',
        a: 'Buduća pretplata koja otključava AI Coach, AI Analizu statistike, statistike timova i iskustvo bez reklama.',
      },
      {
        q: 'Kad dolaze nove funkcije (AI, Hokej, Pikado)?',
        a: 'Tijekom beta faze postupno. Ostavi email na "Uskoro" karticama da te obavijestimo.',
      },
    ],
  },
];

function AccordionItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border/30 last:border-0">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full text-left flex items-center justify-between py-4 gap-3 hover:text-foreground transition-colors"
      >
        <span className="text-sm font-semibold text-foreground">{q}</span>
        <ChevronDown
          className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <p className="text-sm text-muted-foreground leading-relaxed pb-4">{a}</p>
      )}
    </div>
  );
}

export default function FAQ() {
  const [search, setSearch] = useState('');

  const filtered = search.trim()
    ? CATEGORIES.map(cat => ({
        ...cat,
        questions: cat.questions.filter(
          item =>
            item.q.toLowerCase().includes(search.toLowerCase()) ||
            item.a.toLowerCase().includes(search.toLowerCase())
        ),
      })).filter(cat => cat.questions.length > 0)
    : CATEGORIES;

  return (
    <div>
      {/* Intro */}
      <div className="mb-8 p-4 rounded-xl bg-primary/10 border border-primary/20 text-sm text-muted-foreground">
        <p className="font-semibold text-foreground mb-1">Često postavljana pitanja</p>
        <p>Brzi odgovori na najčešća pitanja. Za detaljan vodič pogledaj{' '}
          <Link to="/kako-igrati" className="text-primary underline underline-offset-2 hover:opacity-80">Kako igrati</Link>.
        </p>
      </div>

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Pretraži pitanja..."
          className="w-full bg-secondary border border-border/50 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary/50 transition-colors"
        />
      </div>

      {/* Categories */}
      {filtered.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center py-8">Nema rezultata za "{search}"</p>
      ) : (
        <div className="space-y-8">
          {filtered.map(cat => (
            <div key={cat.title}>
              <h2 className="text-base font-bold text-foreground mb-3">
                {cat.emoji} {cat.title}
              </h2>
              <div className="rounded-xl bg-card border border-border/30 px-5">
                {cat.questions.map(item => (
                  <AccordionItem key={item.q} q={item.q} a={item.a} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bottom help */}
      <div className="mt-10 p-4 rounded-xl bg-secondary/50 text-sm text-muted-foreground text-center">
        Nisi pronašao odgovor?{' '}
        <a href="mailto:marko.gavran@outlook.com" className="text-primary underline underline-offset-2 hover:opacity-80">
          Kontaktiraj nas
        </a>
      </div>
    </div>
  );
}