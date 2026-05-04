import { useState } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Coins, ArrowLeft, X } from 'lucide-react';
import { TOKEN_PACKAGES } from '@/lib/tokenPackages';

function BetaModal({ onClose }) {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-black text-lg">ScopeFantasy Beta</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed mb-6">
          Aplikacija je trenutno u zatvorenoj beta fazi. Plaćanja nisu aktivna. Novi korisnici dobivaju <strong className="text-foreground">5000 besplatnih tokena</strong> pri registraciji + dnevni bonus od <strong className="text-foreground">500 tokena</strong>.
          <br /><br />
          Ako želiš dodatne tokene za testiranje, javi se na{' '}
          <a href="mailto:marko.gavran@outlook.com" className="text-primary underline">marko.gavran@outlook.com</a>
          <br /><br />
          Hvala što testiraš ScopeFantasy!
        </p>
        <button
          onClick={onClose}
          className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-black text-sm hover:opacity-90 transition-all"
        >
          Zatvori
        </button>
      </motion.div>
    </div>
  );
}

export default function BuyTokens() {
  const { tokenBalance } = useOutletContext();
  const navigate = useNavigate();
  const [showBetaModal, setShowBetaModal] = useState(false);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm font-medium">Natrag</span>
      </button>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
            <Coins className="w-8 h-8 text-accent" />
          </div>
          <h1 className="text-3xl font-black mb-2">Kupi Tokene</h1>
          <p className="text-muted-foreground">Koristi tokene za ulaz u natjecanja i osvajanje nagrada</p>
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20">
            <Coins className="w-4 h-4 text-accent" />
            <span className="font-bold text-accent">Trenutno stanje: {tokenBalance?.toLocaleString() || 0}</span>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {TOKEN_PACKAGES.map((pkg, i) => {
            const Icon = pkg.icon;
            const total = pkg.tokens + pkg.bonus;
            const isPopular = pkg.badge === 'Najpopularnije';
            return (
              <motion.div
                key={pkg.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <button
                  onClick={() => setShowBetaModal(true)}
                  className={`w-full text-left p-5 rounded-2xl border transition-all hover:scale-[1.02] active:scale-[0.98] bg-gradient-to-br ${pkg.color} ${pkg.border}`}
                >
                  {pkg.badge && (
                    <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-bold bg-primary/20 text-primary mb-3">
                      ⭐ {pkg.badge}
                    </span>
                  )}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                        <Icon className={`w-5 h-5 ${pkg.iconColor}`} />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">{pkg.name}</p>
                        <p className="text-2xl font-black">{total.toLocaleString()}</p>
                      </div>
                    </div>
                    <span className="text-lg font-black">{pkg.priceLabel}</span>
                  </div>
                  {pkg.bonus > 0 && (
                    <p className="text-xs font-semibold text-primary">🎁 +{pkg.bonus} bonus tokena gratis</p>
                  )}
                </button>
              </motion.div>
            );
          })}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Tokeni su virtualna valuta i nemaju stvarnu novčanu vrijednost.
        </p>
      </motion.div>
      {showBetaModal && <BetaModal onClose={() => setShowBetaModal(false)} />}
    </div>
  );
}