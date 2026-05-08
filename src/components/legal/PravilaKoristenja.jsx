const Section = ({ num, title, children }) => (
  <div className="mb-8">
    <h2 className="text-base font-bold text-foreground mb-3">
      {num}. {title}
    </h2>
    <div className="text-sm text-muted-foreground leading-relaxed space-y-2">
      {children}
    </div>
  </div>
);

export default function PravilaKoristenja() {
  return (
    <div>
      <div className="mb-8 space-y-1 text-sm text-muted-foreground">
        <p><span className="text-foreground font-semibold">Verzija:</span> Beta v0.1</p>
        <p><span className="text-foreground font-semibold">Datum stupanja na snagu:</span> 8. svibnja 2026.</p>
      </div>

      <Section num="1" title="Uvod">
        <p>
          Dobrodošli na ScopeFantasy. Ova Pravila opisuju uvjete pod kojima koristite naš servis za fantasy sport.
          Korištenjem aplikacije prihvaćate ova Pravila.
        </p>
      </Section>

      <Section num="2" title="O nama">
        <p>ScopeFantasy je hrvatska aplikacija za fantasy sport vještine.</p>
        <p>Kontakt: <a href="mailto:marko.gavran@outlook.com" className="text-primary underline underline-offset-2 hover:opacity-80">marko.gavran@outlook.com</a></p>
      </Section>

      <Section num="3" title="Što je ScopeFantasy">
        <p>
          ScopeFantasy je aplikacija za fantasy sport koja korisnicima omogućuje predviđanje sportskih statistika
          igrača kroz Pick'em, Parlay i Izazove. Sve igre temelje se na vještini predviđanja, ne na slučaju.
          ScopeFantasy nije igra na sreću.
        </p>
      </Section>

      <Section num="4" title="Tokeni">
        <p>Tokeni su virtualna valuta unutar aplikacije. Dobivaju se kroz:</p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>Welcome bonus: 5.000 tokena</li>
          <li>Dnevni bonus: 500 tokena</li>
          <li>Pobjede u natjecanjima</li>
          <li>Welcome Challenge: 5.000 tokena</li>
          <li>Daily Streak: do 15.000 tokena</li>
          <li>Referali: 200 tokena po pozvanoj osobi</li>
        </ul>
        <p className="mt-2">
          Tokeni nemaju stvarnu novčanu vrijednost i ne mogu se mijenjati za novac.
          Plaćanja u beta fazi nisu aktivna.
        </p>
      </Section>

      <Section num="5" title="Registracija">
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>Minimum 18 godina starosti</li>
          <li>Jedan račun po osobi</li>
          <li>Korisnik je odgovoran za sigurnost svog računa</li>
        </ul>
      </Section>

      <Section num="6" title="Pravila ponašanja">
        <p>Zabranjeno je:</p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>Stvaranje lažnih računa</li>
          <li>Korištenje botova ili automatiziranih skripti</li>
          <li>Vrijeđanje korisnika</li>
          <li>Dijeljenje pristupnih podataka</li>
          <li>Pokušaji manipulacije aplikacijom</li>
        </ul>
        <p className="mt-2">Kršenje vodi do upozorenja, suspenzije ili brisanja računa.</p>
      </Section>

      <Section num="7" title="Beta faza">
        <p>
          ScopeFantasy je u beta fazi. Aplikacija se pruža "kako jest". Ne jamčimo neprekidan
          rad bez grešaka tijekom beta perioda.
        </p>
      </Section>

      <Section num="8" title="Intelektualno vlasništvo">
        <p>
          Sav sadržaj aplikacije (kod, dizajn, logo) vlasništvo je ScopeFantasy. Korisnici
          zadržavaju vlasništvo nad sadržajem koji sami stvaraju (komentari, postovi).
        </p>
      </Section>

      <Section num="9" title="Prekid usluge">
        <p>
          ScopeFantasy zadržava pravo privremeno obustaviti uslugu radi održavanja ili trajno
          zatvoriti aplikaciju uz najmanje 30 dana prethodne najave.
        </p>
      </Section>

      <Section num="10" title="Izmjene Pravila">
        <p>
          Značajne izmjene Pravila bit će objavljene najmanje 14 dana prije stupanja na snagu
          putem obavijesti unutar aplikacije i emailom.
        </p>
      </Section>

      <Section num="11" title="Mjerodavno pravo">
        <p>
          Ova Pravila tumače se u skladu s hrvatskim pravom. Svi sporovi rješavaju se kod
          nadležnog suda u Zagrebu.
        </p>
      </Section>

      <Section num="12" title="Kontakt">
        <p>
          <a href="mailto:marko.gavran@outlook.com" className="text-primary underline underline-offset-2 hover:opacity-80">
            marko.gavran@outlook.com
          </a>
          {' '}(uskoro: info@scopefantasy.hr)
        </p>
      </Section>
    </div>
  );
}