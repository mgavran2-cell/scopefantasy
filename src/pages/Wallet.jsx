import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { useOutletContext } from 'react-router-dom';
import { Wallet, TrendingUp, TrendingDown, Gift, ShoppingCart, Coins, CreditCard, X, CheckCircle2 } from 'lucide-react';
import moment from 'moment';

const txConfig = {
  purchase: { label: 'Kupnja',     icon: ShoppingCart, color: 'text-primary',     bg: 'bg-primary/15',     sign: '+' },
  entry:    { label: 'Ulaz',       icon: TrendingDown, color: 'text-destructive', bg: 'bg-destructive/15', sign: '-' },
  win:      { label: 'Dobitak',    icon: TrendingUp,   color: 'text-primary',     bg: 'bg-primary/15',     sign: '+' },
  bonus:    { label: 'Bonus',      icon: Gift,         color: 'text-accent',      bg: 'bg-accent/15',      sign: '+' },
  refund:   { label: 'Povrat',     icon: Coins,        color: 'text-yellow-400',  bg: 'bg-yellow-400/15',  sign: '+' },
};

const PACKAGES = [
  { id: 1, tokens: 500,   price: '€4.99',  label: 'Starter',  popular: false },
  { id: 2, tokens: 1200,  price: '€9.99',  label: 'Popular',  popular: true  },
  { id: 3, tokens: 3000,  price: '€19.99', label: 'Pro',       popular: false },
  { id: 4, tokens: 7500,  price: '€39.99', label: 'Elite',    popular: false },
];

function PurchaseModal({ pkg, onClose, onConfirm, loading }) {
  const [cardNum, setCardNum] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');

  const formatCard = v => v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
  const formatExpiry = v => {
    const d = v.replace(/\D/g, '').slice(0, 4);
    return d.length >= 3 ? `${d.slice(0,2)}/${d.slice(2)}` : d;
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm"
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-black text-lg">Kupnja tokena</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-between mb-5">
          <span className="text-sm font-semibold">{pkg.tokens.toLocaleString()} tokena</span>
          <span className="font-black text-primary">{pkg.price}</span>
        </div>

        <div className="space-y-3 mb-5">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Broj kartice</label>
            <div className="relative">
              <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={cardNum}
                onChange={e => setCardNum(formatCard(e.target.value))}
                placeholder="1234 5678 9012 3456"
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-secondary border border-border/50 text-sm focus:outline-none focus:border-primary/50"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Datum isteka</label>
              <input
                value={expiry}
                onChange={e => setExpiry(formatExpiry(e.target.value))}
                placeholder="MM/YY"
                className="w-full px-3 py-2.5 rounded-xl bg-secondary border border-border/50 text-sm focus:outline-none focus:border-primary/50"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">CVV</label>
              <input
                value={cvv}
                onChange={e => setCvv(e.target.value.replace(/\D/g,'').slice(0,3))}
                placeholder="123"
                className="w-full px-3 py-2.5 rounded-xl bg-secondary border border-border/50 text-sm focus:outline-none focus:border-primary/50"
              />
            </div>
          </div>
        </div>

        <p className="text-[10px] text-muted-foreground text-center mb-4">🔒 Ovo je demo modul za plaćanje. Kartica neće biti naplaćena.</p>

        <button
          onClick={() => onConfirm(pkg)}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground font-black text-sm hover:opacity-90 transition-all disabled:opacity-50"
        >
          {loading
            ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            : <><Coins className="w-4 h-4" /> Kupi {pkg.tokens.toLocaleString()} tokena</>
          }
        </button>
      </motion.div>
    </div>
  );
}

export default function WalletPage() {
  const { tokenBalance, loadBalance } = useOutletContext();
  const [transactions, setTransactions] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPkg, setSelectedPkg] = useState(null);
  const [purchasing, setPurchasing] = useState(false);
  const [successPkg, setSuccessPkg] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => { init(); }, []);

  const init = async () => {
    const [me, txs] = await Promise.all([
      base44.auth.me(),
      base44.entities.TokenTransaction.list('-created_date', 50),
    ]);
    setUser(me);
    setTransactions(txs);
    setLoading(false);
  };

  const handlePurchase = async (pkg) => {
    setPurchasing(true);
    const newBalance = (user?.token_balance || 0) + pkg.tokens;
    await Promise.all([
      base44.auth.updateMe({ token_balance: newBalance }),
      base44.entities.TokenTransaction.create({
        user_email: user.email,
        type: 'purchase',
        amount: pkg.tokens,
        description: `Kupnja paketa: ${pkg.label} (${pkg.price})`,
        balance_after: newBalance,
      }),
    ]);
    await init();
    loadBalance();
    setPurchasing(false);
    setSelectedPkg(null);
    setSuccessPkg(pkg);
    setTimeout(() => setSuccessPkg(null), 3000);
  };

  const filtered = filter === 'all' ? transactions : transactions.filter(t => t.type === filter);

  const totalIn = transactions.filter(t => ['purchase','win','bonus','refund'].includes(t.type)).reduce((a, t) => a + (t.amount || 0), 0);
  const totalOut = transactions.filter(t => t.type === 'entry').reduce((a, t) => a + (t.amount || 0), 0);

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
            <Wallet className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-black tracking-wide">NOVČANIK</h1>
            <p className="text-muted-foreground text-sm">Upravljaj svojim tokenima</p>
          </div>
        </div>

        {/* Balance card */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-primary/20 to-fuchsia-500/10 border border-primary/25 mb-4">
          <p className="text-sm text-muted-foreground mb-1">Trenutno stanje</p>
          <p className="text-5xl font-black text-primary mb-4">{tokenBalance?.toLocaleString() ?? 0}</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-black/20 p-3">
              <p className="text-xs text-muted-foreground mb-0.5">Ukupno primljeno</p>
              <p className="font-black text-primary">+{totalIn.toLocaleString()}</p>
            </div>
            <div className="rounded-xl bg-black/20 p-3">
              <p className="text-xs text-muted-foreground mb-0.5">Ukupno uloženo</p>
              <p className="font-black text-destructive">-{totalOut.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Success toast */}
        <AnimatePresence>
          {successPkg && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 p-3 rounded-xl bg-primary/10 border border-primary/25 mb-4"
            >
              <CheckCircle2 className="w-4 h-4 text-primary" />
              <p className="text-sm font-semibold">+{successPkg.tokens.toLocaleString()} tokena dodano!</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Buy tokens section */}
        <h2 className="font-bold text-sm text-muted-foreground uppercase tracking-wider mb-3">Kupi tokene</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-8">
          {PACKAGES.map(pkg => (
            <button
              key={pkg.id}
              onClick={() => setSelectedPkg(pkg)}
              className={`relative p-3 rounded-xl border text-left transition-all hover:border-primary/50 hover:bg-primary/5 ${pkg.popular ? 'border-primary/40 bg-primary/5' : 'border-border/50 bg-card'}`}
            >
              {pkg.popular && <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[10px] font-black bg-primary text-primary-foreground px-2 py-0.5 rounded-full">Popular</span>}
              <p className="font-black text-base text-primary">{pkg.tokens >= 1000 ? `${pkg.tokens/1000}K` : pkg.tokens}</p>
              <p className="text-xs text-muted-foreground">tokena</p>
              <p className="text-sm font-bold mt-1">{pkg.price}</p>
            </button>
          ))}
        </div>

        {/* Transaction history */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-sm text-muted-foreground uppercase tracking-wider">Povijest transakcija</h2>
          <select
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="text-xs bg-secondary border border-border/50 rounded-lg px-2 py-1.5 focus:outline-none"
          >
            <option value="all">Sve</option>
            <option value="purchase">Kupnje</option>
            <option value="win">Dobici</option>
            <option value="entry">Ulozi</option>
            <option value="bonus">Bonusi</option>
            <option value="refund">Povrati</option>
          </select>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <Coins className="w-10 h-10 mx-auto mb-2 opacity-20" />
            <p className="text-sm">Nema transakcija</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((tx, i) => {
              const cfg = txConfig[tx.type] || txConfig.bonus;
              const Icon = cfg.icon;
              const isPositive = cfg.sign === '+';
              return (
                <motion.div
                  key={tx.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/40"
                >
                  <div className={`w-9 h-9 rounded-xl ${cfg.bg} flex items-center justify-center shrink-0`}>
                    <Icon className={`w-4 h-4 ${cfg.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{tx.description || cfg.label}</p>
                    <p className="text-xs text-muted-foreground">{moment(tx.created_date).format('DD.MM.YYYY HH:mm')}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`font-black text-sm ${isPositive ? 'text-primary' : 'text-destructive'}`}>
                      {cfg.sign}{tx.amount?.toLocaleString()}
                    </p>
                    {tx.balance_after != null && (
                      <p className="text-[10px] text-muted-foreground">Stanje: {tx.balance_after.toLocaleString()}</p>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Purchase modal */}
      {selectedPkg && (
        <PurchaseModal
          pkg={selectedPkg}
          onClose={() => setSelectedPkg(null)}
          onConfirm={handlePurchase}
          loading={purchasing}
        />
      )}
    </div>
  );
}