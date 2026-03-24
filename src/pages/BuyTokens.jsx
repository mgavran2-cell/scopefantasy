import { useState } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Coins, ArrowLeft, Check, Sparkles, Gift, Zap } from 'lucide-react';
import { toast } from 'sonner';

const packages = [
  { id: 1, tokens: 500, price: 'Besplatno', bonus: '+ 50 bonus', icon: Gift, highlight: false, description: 'Dnevni poklon' },
  { id: 2, tokens: 2500, price: '€1.99', bonus: '+ 250 bonus', icon: Coins, highlight: false, description: 'Starter paket' },
  { id: 3, tokens: 7500, price: '€4.99', bonus: '+ 1000 bonus', icon: Zap, highlight: true, description: 'Najpopularniji' },
  { id: 4, tokens: 20000, price: '€9.99', bonus: '+ 5000 bonus', icon: Sparkles, highlight: false, description: 'Pro paket' },
];

export default function BuyTokens() {
  const { tokenBalance, loadBalance } = useOutletContext();
  const navigate = useNavigate();
  const [purchasing, setPurchasing] = useState(null);

  const handlePurchase = async (pkg) => {
    setPurchasing(pkg.id);
    
    // Simulate purchase (in real app, integrate payment)
    const totalTokens = pkg.tokens + parseInt(pkg.bonus.replace(/[^0-9]/g, ''));
    const user = await base44.auth.me();
    const newBalance = (tokenBalance || 0) + totalTokens;

    await base44.auth.updateMe({ token_balance: newBalance });
    
    await base44.entities.TokenTransaction.create({
      user_email: user.email,
      type: pkg.price === 'Besplatno' ? 'bonus' : 'purchase',
      amount: totalTokens,
      description: `Kupnja: ${pkg.description} (${pkg.tokens} + bonus)`,
      balance_after: newBalance
    });

    await loadBalance();
    setPurchasing(null);
    toast.success(`Uspješno dodano ${totalTokens.toLocaleString()} tokena!`);
  };

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
          {packages.map((pkg, i) => {
            const Icon = pkg.icon;
            return (
              <motion.div
                key={pkg.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <button
                  onClick={() => handlePurchase(pkg)}
                  disabled={purchasing !== null}
                  className={`w-full text-left p-5 rounded-2xl border transition-all hover:scale-[1.02] active:scale-[0.98] ${
                    pkg.highlight
                      ? 'bg-gradient-to-br from-primary/10 to-emerald-500/5 border-primary/30 shadow-lg shadow-primary/10'
                      : 'bg-card border-border/50 hover:border-border'
                  }`}
                >
                  {pkg.highlight && (
                    <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-bold bg-primary/20 text-primary mb-3">
                      ⭐ Najpopularniji
                    </span>
                  )}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        pkg.highlight ? 'bg-primary/20' : 'bg-secondary'
                      }`}>
                        <Icon className={`w-5 h-5 ${pkg.highlight ? 'text-primary' : 'text-muted-foreground'}`} />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">{pkg.description}</p>
                        <p className="text-2xl font-black">{pkg.tokens.toLocaleString()}</p>
                      </div>
                    </div>
                    <span className={`text-lg font-black ${pkg.price === 'Besplatno' ? 'text-primary' : 'text-foreground'}`}>
                      {pkg.price}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-primary">{pkg.bonus}</span>
                    {purchasing === pkg.id ? (
                      <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Check className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                </button>
              </motion.div>
            );
          })}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Tokeni su virtualna valuta i nemaju stvarnu novčanu vrijednost.
        </p>
      </motion.div>
    </div>
  );
}