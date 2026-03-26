import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Coins, Zap, Star, Crown, ArrowUpRight, ArrowDownLeft, ShoppingCart, Clock, CreditCard, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import moment from 'moment';

const PACKAGES = [
  {
    id: 'starter',
    name: 'Starter',
    tokens: 500,
    price: 4.99,
    bonus: 0,
    icon: Coins,
    color: 'from-slate-500/20 to-slate-600/5',
    border: 'border-slate-500/20',
    iconColor: 'text-slate-400',
  },
  {
    id: 'popular',
    name: 'Popular',
    tokens: 1200,
    price: 9.99,
    bonus: 200,
    icon: Star,
    color: 'from-primary/20 to-primary/5',
    border: 'border-primary/30',
    iconColor: 'text-primary',
    badge: 'Najpopularnije',
  },
  {
    id: 'pro',
    name: 'Pro',
    tokens: 2500,
    price: 19.99,
    bonus: 500,
    icon: Zap,
    color: 'from-fuchsia-500/20 to-fuchsia-600/5',
    border: 'border-fuchsia-500/30',
    iconColor: 'text-fuchsia-400',
  },
  {
    id: 'elite',
    name: 'Elite',
    tokens: 6000,
    price: 39.99,
    bonus: 1500,
    icon: Crown,
    color: 'from-yellow-500/20 to-yellow-600/5',
    border: 'border-yellow-500/30',
    iconColor: 'text-yellow-400',
    badge: 'Najveća vrijednost',
  },
];

const typeConfig = {
  purchase: { label: 'Kupnja', icon: ArrowDownLeft, color: 'text-primary' },
  entry:    { label: 'Ulaz u natjecanje', icon: ArrowUpRight, color: 'text-destructive' },
  win:      { label: 'Nagrada', icon: Star, color: 'text-primary' },
  bonus:    { label: 'Bonus', icon: Zap, color: 'text-fuchsia-400' },
  refund:   { label: 'Povrat', icon: ArrowDownLeft, color: 'text-accent' },
};

export default function Store() {
  const { tokenBalance, loadBalance } = useOutletContext();
  const [transactions, setTransactions] = useState([]);
  const [loadingTx, setLoadingTx] = useState(true);
  const [activeTab, setActiveTab] = useState('packages');
  const [processing, setProcessing] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    (async () => {
      const [txData, user] = await Promise.all([
        base44.entities.TokenTransaction.list('-created_date', 50),
        base44.auth.me(),
      ]);
      setTransactions(txData);
      setCurrentUser(user);
      setLoadingTx(false);
    })();
  }, []);

  // Demo purchase (replace with Stripe when Builder+ available)
  const handlePurchase = async (pkg) => {
    setProcessing(pkg.id);
    const totalTokens = pkg.tokens + pkg.bonus;
    const newBalance = (tokenBalance || 0) + totalTokens;

    await base44.auth.updateMe({ token_balance: newBalance });
    const tx = await base44.entities.TokenTransaction.create({
      user_email: currentUser.email,
      type: 'purchase',
      amount: totalTokens,
      description: `Kupnja paketa: ${pkg.name} (${pkg.tokens}${pkg.bonus ? ` + ${pkg.bonus} bonus` : ''} tokena)`,
      balance_after: newBalance,
    });

    setTransactions(prev => [tx, ...prev]);
    await loadBalance();
    toast.success(`Uspješno kupljeno ${totalTokens} tokena!`);
    setProcessing(null);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black mb-1 flex items-center gap-3">
            <ShoppingCart className="w-8 h-8 text-primary" />
            Trgovina
          </h1>
          <p className="text-muted-foreground text-sm">Kupi pakete tokena i pregledaj povijest transakcija</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-primary/10 border border-primary/20">
          <Coins className="w-5 h-5 text-primary" />
          <span className="font-black text-primary text-xl">{(tokenBalance || 0).toLocaleString()}</span>
        </div>
      </div>

      {/* Stripe notice */}
      <div className="flex items-start gap-3 p-4 rounded-2xl bg-accent/10 border border-accent/20 mb-8">
        <AlertCircle className="w-5 h-5 text-accent shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-accent mb-0.5">Demo način plaćanja</p>
          <p className="text-xs text-muted-foreground">Trenutno je aktivan demo način — tokeni se dodjeljuju odmah bez naplate. Za aktivaciju pravog Stripe plaćanja potreban je Builder+ plan.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-8">
        {[
          { key: 'packages', label: 'Paketi tokena', icon: Coins },
          { key: 'history', label: 'Povijest transakcija', icon: Clock },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all ${
              activeTab === t.key
                ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25'
                : 'bg-secondary text-muted-foreground hover:text-foreground'
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Packages tab */}
      {activeTab === 'packages' && (
        <div className="grid sm:grid-cols-2 gap-4">
          {PACKAGES.map((pkg, i) => {
            const Icon = pkg.icon;
            const total = pkg.tokens + pkg.bonus;
            return (
              <motion.div
                key={pkg.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                className={`relative overflow-hidden rounded-2xl border ${pkg.border} bg-gradient-to-br ${pkg.color} p-6`}
              >
                {pkg.badge && (
                  <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                    {pkg.badge}
                  </div>
                )}
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center">
                    <Icon className={`w-6 h-6 ${pkg.iconColor}`} />
                  </div>
                  <div>
                    <h3 className="font-black text-lg">{pkg.name}</h3>
                    <p className="text-xs text-muted-foreground">{pkg.tokens.toLocaleString()} tokena{pkg.bonus > 0 ? ` + ${pkg.bonus} bonus` : ''}</p>
                  </div>
                </div>

                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-3xl font-black">{total.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Coins className="w-3 h-3" /> tokena ukupno
                    </p>
                  </div>
                  <Button
                    onClick={() => handlePurchase(pkg)}
                    disabled={processing === pkg.id}
                    className="rounded-xl font-bold"
                  >
                    {processing === pkg.id
                      ? <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                      : <><CreditCard className="w-4 h-4 mr-1.5" /> €{pkg.price}</>
                    }
                  </Button>
                </div>

                {pkg.bonus > 0 && (
                  <div className="mt-3 px-3 py-1.5 rounded-lg bg-primary/15 border border-primary/20 text-xs font-semibold text-primary">
                    🎁 +{pkg.bonus} bonus tokena gratis!
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* History tab */}
      {activeTab === 'history' && (
        <div>
          {loadingTx ? (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-16">
              <Clock className="w-14 h-14 text-muted-foreground/20 mx-auto mb-4" />
              <h3 className="font-bold text-lg mb-1">Nema transakcija</h3>
              <p className="text-sm text-muted-foreground">Kupi prvi paket tokena da počneš igrati!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx, i) => {
                const tc = typeConfig[tx.type] || typeConfig.purchase;
                const TIcon = tc.icon;
                const isPositive = tx.amount > 0;
                return (
                  <motion.div
                    key={tx.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="flex items-center gap-4 p-4 rounded-2xl bg-card border border-border/50"
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isPositive ? 'bg-primary/15' : 'bg-destructive/10'}`}>
                      <TIcon className={`w-5 h-5 ${tc.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{tx.description || tc.label}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" />
                        {moment(tx.created_date).format('DD.MM.YYYY HH:mm')}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`font-black text-base ${isPositive ? 'text-primary' : 'text-destructive'}`}>
                        {isPositive ? '+' : ''}{tx.amount.toLocaleString()}
                      </p>
                      {tx.balance_after != null && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                          <Coins className="w-3 h-3" /> {tx.balance_after.toLocaleString()}
                        </p>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}