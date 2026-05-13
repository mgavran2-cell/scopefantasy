const Section = ({ num, title, children }) => (
  <div className="mb-8">
    <h2 className="text-base font-bold text-foreground mb-3">{num ? `${num}. ` : ''}{title}</h2>
    <div className="text-sm text-muted-foreground leading-relaxed space-y-2">{children}</div>
  </div>
);

const Sub = ({ title, children }) => (
  <div className="mt-4">
    <h3 className="text-sm font-bold text-foreground mb-2">{title}</h3>
    {children}
  </div>
);

export default function KakoIgrati() {
  return (
    <div>
      <div className="mb-8 p-4 rounded-xl bg-primary/10 border border-primary/20 text-sm text-muted-foreground">
        <p className="font-semibold text-foreground mb-1">Dobrodošao na ScopeFantasy</p>
        <p>ScopeFantasy je hrvatska aplikacija za fantasy sport vještine. Predviđaš sportske statistike, osvajaš tokene, penješ se na ljestvici. Sve je trenutno besplatno tijekom beta faze.</p>
      </div>

      <Section num="1" title="Tokeni — virtualna valuta">
        <Sub title="Kako ih dobiti:">
          <ul className="space-y-1 ml-2">
            <li>✓ 5.000 tokena pri registraciji (Welcome bonus)</li>
            <li>✓ 500 tokena svaki dan (Dnevni poklon)</li>
            <li>✓ Pobjede u natjecanjima</li>
            <li>✓ Welcome Challenge — pogodi 3/3 i osvoji 5.000 dodatnih tokena</li>
            <li>✓ Daily Streak — do 15.000 tokena tjedno</li>
            <li>✓ Pozivanje prijatelja — 200 tokena po pozvanoj osobi</li>
          </ul>
        </Sub>
        <Sub title="Što s tokenima:">
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Ulaziš u natjecanja</li>
            <li>Penješ se na Ljestvici</li>
            <li>U budućnosti: zamjena za partner nagrade</li>
          </ul>
        </Sub>
        <p className="mt-3 italic">Tokeni nemaju stvarnu novčanu vrijednost.</p>
      </Section>

      <Section num="2" title="Načini igre">
        <Sub title="🎯 Pick'em — Predvidi ishode igrača">
          <ol className="list-decimal list-inside space-y-1 ml-2">
            <li>Otvori aktivno natjecanje</li>
            <li>Vidiš listu igrača s njihovim statistikama (npr. "Luka Dončić — 28.5 bodova")</li>
            <li>Za svakog biraš <span className="text-foreground font-semibold">VIŠE</span> ili <span className="text-foreground font-semibold">MANJE</span> od te brojke</li>
            <li>Trebaš pogoditi sve odabire (obično 4–6)</li>
            <li>Pošalji listić, čekaj rezultate</li>
          </ol>
          <p className="mt-2 bg-secondary/50 rounded-xl px-3 py-2 italic">
            Primjer: Predviđaš da će Dončić zabiti VIŠE od 28.5. Stvarni rezultat: 32. Pogodio si.
          </p>
        </Sub>

        <Sub title="🔗 Parlay — Kombinirani listići">
          <p className="mb-2">Kombiniraš pickove iz <span className="text-foreground font-semibold">više</span> natjecanja u jedan listić.</p>
          <p className="font-semibold text-foreground text-xs uppercase tracking-wide mb-1">Power Play (svi moraju pogoditi):</p>
          <ul className="space-y-0.5 ml-2 mb-3">
            {[['2 picka','3x'],['3 picka','5x'],['4 picka','10x'],['5 pickova','20x'],['6 pickova','35x']].map(([p,m]) => (
              <li key={p} className="flex gap-2"><span className="text-foreground w-20">{p}</span><span>= {m} ulog</span></li>
            ))}
          </ul>
          <p className="font-semibold text-foreground text-xs uppercase tracking-wide mb-1">Flex Play (možeš promašiti 1–2):</p>
          <ul className="space-y-0.5 ml-2">
            <li>3 picka: 3/3 = 2.25x, 2/3 = 1.25x</li>
            <li>4 picka: 4/4 = 5x, 3/4 = 1.5x</li>
            <li>5 pickova: 5/5 = 10x, 4/5 = 2x, 3/5 = 0.4x</li>
            <li>6 pickova: 6/6 = 25x, 5/6 = 2x, 4/6 = 0.4x</li>
          </ul>
          <p className="mt-2 italic">Flex Play dostupan za 3+ pickova.</p>
        </Sub>

        <Sub title="⚡ Izazovi — Dnevni zadaci">
          <p>Specijalni dnevni zadaci s bonus tokenima (npr. "Pogodi 3 picka u tenisu").</p>
        </Sub>

        <Sub title="🔥 Daily Streak — Tjedni izazov">
          <p className="mb-2">7 dana, 7 pickova, jedna nagrada. Besplatno.</p>
          <ul className="space-y-0.5 ml-2">
            <li>4/7 točnih = 500 tokena</li>
            <li>5/7 = 1.500 tokena</li>
            <li>6/7 = 5.000 tokena</li>
            <li className="text-primary font-bold">7/7 = 15.000 tokena (jackpot)</li>
          </ul>
        </Sub>
      </Section>

      <Section num="3" title="Welcome Challenge">
        <p>Bonus za nove igrače: pogodi sva 3 picka u Welcome Challenge-u i osvoji 5.000 dodatnih tokena. Bonus se dobiva samo jednom.</p>
      </Section>

      <Section num="4" title="Rangovi">
        <ul className="space-y-1 ml-2">
          <li>🥉 Brončani — početni rang</li>
          <li>🥈 Srebrni — 10+ pobjeda</li>
          <li>🥇 Zlatni — 50+ pobjeda</li>
          <li>💎 Platinasti — 200+ pobjeda</li>
          <li>💠 Dijamantni — elita</li>
        </ul>
      </Section>

      <Section num="5" title="Socijalne funkcije">
        <ul className="space-y-1 ml-2">
          <li><span className="text-foreground font-semibold">Zajednica (Feed)</span> — dijeli svoje listiće, komentiraj</li>
          <li><span className="text-foreground font-semibold">Prijatelji</span> — prati druge igrače</li>
          <li><span className="text-foreground font-semibold">Dvoboji</span> — izazovi prijatelja</li>
          <li><span className="text-foreground font-semibold">Live chat</span> — pričaj tijekom natjecanja</li>
        </ul>
      </Section>

      <Section num="6" title="Beta faza">
        <p className="mb-2">Aplikacija je u zatvorenoj beta fazi. Što to znači:</p>
        <ul className="space-y-1 ml-2">
          <li>✓ Sve je besplatno</li>
          <li>✓ Plaćanja nisu aktivna</li>
          <li>✓ Neke funkcije su "Uskoro" (AI Analiza statistike, Tvoj AI Coach, Statistika, Live Match Center, Hokej, Pikado)</li>
          <li>✓ Tvoj feedback je super važan</li>
        </ul>
      </Section>

      <Section num="7" title="Trebaš pomoć?">
        <p>
          <a href="mailto:marko.gavran@outlook.com" className="text-primary underline underline-offset-2 hover:opacity-80">marko.gavran@outlook.com</a>
          {' '}(uskoro: info@scopefantasy.hr)
        </p>
      </Section>
    </div>
  );
}