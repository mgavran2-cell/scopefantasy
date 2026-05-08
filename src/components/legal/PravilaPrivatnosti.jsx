const Section = ({ num, title, children }) => (
  <div className="mb-8">
    <h2 className="text-base font-bold text-foreground mb-3">{num}. {title}</h2>
    <div className="text-sm text-muted-foreground leading-relaxed space-y-2">{children}</div>
  </div>
);

const Table = ({ headers, rows }) => (
  <div className="overflow-x-auto mt-2">
    <table className="w-full text-sm border-collapse">
      <thead>
        <tr className="border-b border-border/50">
          {headers.map((h, i) => (
            <th key={i} className="text-left py-2 pr-4 text-foreground font-semibold text-xs uppercase tracking-wide">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} className="border-b border-border/20 last:border-0">
            {row.map((cell, j) => (
              <td key={j} className="py-2 pr-4 text-muted-foreground align-top">{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default function PravilaPrivatnosti() {
  return (
    <div>
      <div className="mb-8 space-y-1 text-sm text-muted-foreground">
        <p><span className="text-foreground font-semibold">Verzija:</span> Beta v0.1</p>
        <p><span className="text-foreground font-semibold">Datum stupanja na snagu:</span> 8. svibnja 2026.</p>
      </div>

      <Section num="1" title="Uvod">
        <p>Vaša privatnost nam je važna. Ova Pravila opisuju koje osobne podatke prikupljamo, kako ih koristimo i koja prava imate prema Općoj uredbi o zaštiti podataka (GDPR).</p>
      </Section>

      <Section num="2" title="Voditelj obrade">
        <p>ScopeFantasy</p>
        <p>Kontakt: <a href="mailto:marko.gavran@outlook.com" className="text-primary underline underline-offset-2 hover:opacity-80">marko.gavran@outlook.com</a> (uskoro: info@scopefantasy.hr)</p>
      </Section>

      <Section num="3" title="Koje podatke prikupljamo">
        <p className="font-semibold text-foreground">Podaci koje vi pružate:</p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>Email adresa (obvezno)</li>
          <li>Korisničko ime (obvezno)</li>
          <li>Profilna slika (opcionalno)</li>
          <li>Sadržaj objavljen u aplikaciji (komentari, postovi)</li>
        </ul>
        <p className="font-semibold text-foreground mt-3">Podaci koje automatski prikupljamo:</p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>Aktivnost u aplikaciji (natjecanja, listići, tokeni)</li>
          <li>IP adresa</li>
          <li>Tip uređaja i browsera</li>
          <li>Tehnički podaci o aplikaciji</li>
        </ul>
        <p className="font-semibold text-foreground mt-3">Podaci koje NE prikupljamo:</p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>Bankovne kartice (plaćanja u beta fazi nisu aktivna)</li>
          <li>Lokaciju u stvarnom vremenu</li>
          <li>Kontakte iz telefona</li>
        </ul>
      </Section>

      <Section num="4" title="Pravna osnova obrade">
        <Table
          headers={['Podatak', 'Svrha', 'Pravna osnova']}
          rows={[
            ['Email, korisničko ime', 'Stvaranje računa', 'Izvršenje ugovora'],
            ['Aktivnost', 'Pružanje usluge', 'Izvršenje ugovora'],
            ['IP adresa', 'Sigurnost', 'Legitimni interes'],
            ['Sadržaj u aplikaciji', 'Socijalne funkcije', 'Privola korisnika'],
          ]}
        />
      </Section>

      <Section num="5" title="Dijeljenje podataka">
        <p>ScopeFantasy ne prodaje osobne podatke trećim stranama.</p>
        <p className="mt-2">Možemo dijeliti podatke s:</p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>Tehničkim partnerima (hosting platforma Base44)</li>
          <li>Pravosudnim tijelima ako to zahtijeva zakon</li>
        </ul>
      </Section>

      <Section num="6" title="Razdoblje čuvanja">
        <Table
          headers={['Vrsta podatka', 'Razdoblje']}
          rows={[
            ['Aktivni račun', 'Dok je račun aktivan'],
            ['Neaktivni 12+ mjeseci', 'Brisanje nakon obavijesti'],
            ['Aktivnost u aplikaciji', '24 mjeseca'],
            ['Tehnički logovi', '6 mjeseci'],
          ]}
        />
      </Section>

      <Section num="7" title="Vaša prava prema GDPR-u">
        <ul className="space-y-1.5 ml-2">
          <li><span className="text-foreground font-semibold">Pravo na pristup</span> — kopija podataka</li>
          <li><span className="text-foreground font-semibold">Pravo na ispravak</span> — ispravak netočnih podataka</li>
          <li><span className="text-foreground font-semibold">Pravo na brisanje</span> — "pravo na zaborav"</li>
          <li><span className="text-foreground font-semibold">Pravo na ograničenje obrade</span></li>
          <li><span className="text-foreground font-semibold">Pravo na prenosivost</span> — podaci u JSON/CSV formatu</li>
          <li><span className="text-foreground font-semibold">Pravo na prigovor</span> — protiv obrade temeljene na legitimnom interesu</li>
          <li><span className="text-foreground font-semibold">Pravo na povlačenje privole</span></li>
        </ul>
        <p className="mt-3">Ostvarivanje prava: <a href="mailto:marko.gavran@outlook.com" className="text-primary underline underline-offset-2 hover:opacity-80">marko.gavran@outlook.com</a> (odgovor unutar 30 dana)</p>
      </Section>

      <Section num="8" title="Pritužba">
        <p>Imate pravo podnijeti pritužbu Agenciji za zaštitu osobnih podataka (AZOP):</p>
        <ul className="list-disc list-inside space-y-1 ml-2 mt-2">
          <li>Web: <a href="https://azop.hr" target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2 hover:opacity-80">azop.hr</a></li>
          <li>Email: <a href="mailto:azop@azop.hr" className="text-primary underline underline-offset-2 hover:opacity-80">azop@azop.hr</a></li>
          <li>Adresa: Selska cesta 136, 10000 Zagreb</li>
        </ul>
      </Section>

      <Section num="9" title="Sigurnost podataka">
        <p>Primjenjujemo:</p>
        <ul className="list-disc list-inside space-y-1 ml-2 mt-1">
          <li>Enkripciju u prijenosu (HTTPS)</li>
          <li>Pristup podacima samo ovlaštenim osobama</li>
          <li>Redovne backupe</li>
        </ul>
      </Section>

      <Section num="10" title="Maloljetnici">
        <p>ScopeFantasy je namijenjen osobama starijim od 18 godina. Ne prikupljamo svjesno podatke maloljetnika.</p>
      </Section>

      <Section num="11" title="Kolačići">
        <p>Aplikacija koristi nužne kolačiće za funkcioniranje (autentifikacija, sesije). Detaljniji Cookie Policy bit će dostupan u nadolazećoj verziji.</p>
      </Section>

      <Section num="12" title="Izmjene">
        <p>Ažuriramo ova Pravila po potrebi. Značajne izmjene komuniciramo emailom najmanje 14 dana prije stupanja na snagu.</p>
      </Section>

      <Section num="13" title="Kontakt">
        <p><a href="mailto:marko.gavran@outlook.com" className="text-primary underline underline-offset-2 hover:opacity-80">marko.gavran@outlook.com</a> (uskoro: info@scopefantasy.hr)</p>
      </Section>
    </div>
  );
}