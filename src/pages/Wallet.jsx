import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { useOutletContext } from 'react-router-dom';
import { Wallet, TrendingUp, TrendingDown, Gift, ShoppingCart, Coins, X, CheckCircle2, Sparkles } from 'lucide-react';
import moment from 'moment';
import { TOKEN_PACKAGES } from '@/lib/tokenPackages';

const txConfig = {
  purchase: { label: 'Kupnja',     icon: ShoppingCart, color: 'text-primary',     bg: 'bg-primary/15',     sign: '+' },
  entry:    { label: 'Ulaz',       icon: TrendingDown, color: 'text-destructive', bg: 'bg-destructive/15', sign: '-' },
  win:      { label: 'Dobitak',    icon: TrendingUp,   color: 'text-primary',     bg: 'bg-primary/15',     sign: '+' },
  bonus:    { label: 'Bonus',      icon: Gift,         color: 'text-accent',      bg: 'bg-accent/15',      sign: '+' },
  refund:   { label: 'Povrat',     icon: Coins,        color: 'text-yellow-400',  bg: 'bg-yellow-400/15',  sign: '+' },
};

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
          Aplikacija je trenutno u zatvorenoj beta fazi — plaćanja nisu aktivna. Svaki novi korisnik dobiva <strong className="text-foreground">5.000 besplatnih tokena</strong> pri registraciji i dnevni poklon od <strong className="text-foreground">500 tokena</strong>.
          <br /><br />
          Trebaš više tokena za testiranje? Javi se na{' '}
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

export default function WalletPage() {
  const { tokenBalance, loadBalance } = useOutletContext();
  const [transactions, setTransactions] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showBetaModal, setShowBetaModal] = useState(false);
  const [filter, setFilter] = useState('all');
  const [claimingBonus, setClaimingBonus] = useState(false);
  const [dailyBonusClaimed, setDailyBonusClaimed] = useState(false);

  useEffect(() => { init(); }, []);

  const init = async () => {
    const [me, txs] = await Promise.all([
      base44.auth.me(),
      base44.entities.TokenTransaction.list('-created_date', 50),
    ]);
    setUser(me);
    setTransactions(txs);

    // Check if daily bonus already claimed today
    const today = moment().format('YYYY-MM-DD');
    const claimedToday = txs.some(tx =>
      tx.type === 'bonus' &&
      tx.description === 'Dnevni bonus' &&
      moment(tx.created_date).format('YYYY-MM-DD') === today
    );
    setDailyBonusClaimed(claimedToday);
    setLoading(false);
  };

  const handleDailyBonus = async () => {
    if (dailyBonusClaimed || claimingBonus) return;
    setClaimingBonus(true);
    const res = await base44.functions.invoke('claimDailyBonus', {});
    if (res.data?.error || res.data?.already_claimed) {
      setDailyBonusClaimed(true);
      setClaimingBonus(false);
      return;
    }
    setDailyBonusClaimed(true);
    await Promise.all([loadBalance(), init()]);
    setClaimingBonus(false);
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

        {/* Daily bonus */}
        <button
          onClick={handleDailyBonus}
          disabled={dailyBonusClaimed || claimingBonus}
          className={`w-full flex items-center justify-between p-4 rounded-2xl border mb-4 transition-all ${
            dailyBonusClaimed
              ? 'border-border/30 bg-secondary/50 opacity-60 cursor-not-allowed'
              : 'border-accent/30 bg-accent/5 hover:bg-accent/10'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center">
              {claimingBonus
                ? <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                : <Sparkles className="w-5 h-5 text-accent" />
              }
            </div>
            <div className="text-left">
              <p className="font-bold text-sm">Dnevni poklon</p>
              <p className="text-xs text-muted-foreground">{dailyBonusClaimed ? 'Sutra ponovno' : 'Svaki dan besplatnih 500 tokena'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {dailyBonusClaimed
              ? <CheckCircle2 className="w-5 h-5 text-muted-foreground" />
              : <span className="font-black text-accent text-sm">+500</span>
            }
          </div>
        </button>

        {/* Buy tokens section */}
        <h2 className="font-bold text-sm text-muted-foreground uppercase tracking-wider mb-3">Kupi tokene</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-8">
          {TOKEN_PACKAGES.map(pkg => {
            const total = pkg.tokens + pkg.bonus;
            return (
              <button
                key={pkg.id}
                onClick={() => setShowBetaModal(true)}
                className={`relative p-3 rounded-xl border text-left transition-all hover:border-primary/50 hover:bg-primary/5 ${pkg.badge === 'Najpopularnije' ? 'border-primary/40 bg-primary/5' : 'border-border/50 bg-card'}`}
              >
                {pkg.badge === 'Najpopularnije' && <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[10px] font-black bg-primary text-primary-foreground px-2 py-0.5 rounded-full">Najpopularnije</span>}
                <p className="font-black text-base text-primary">{total >= 1000 ? `${(total/1000).toFixed(1).replace('.0','')}K` : total}</p>
                <p className="text-xs text-muted-foreground">tokena</p>
                <p className="text-sm font-bold mt-1">{pkg.priceLabel}</p>
              </button>
            );
          })}
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
            <p className="text-sm">Nema transakcija. Odigraj natjecanje ili preuzmi dnevni poklon!</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-border/50 overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[auto_1fr_auto_auto] gap-3 px-4 py-2.5 bg-secondary/50 border-b border-border/40 text-xs font-bold text-muted-foreground uppercase tracking-wider">
              <span>Tip</span>
              <span>Opis</span>
              <span className="text-center hidden sm:block">Datum</span>
              <span className="text-right">Iznos</span>
            </div>
            {filtered.map((tx, i) => {
              const cfg = txConfig[tx.type] || txConfig.bonus;
              const Icon = cfg.icon;
              const isPositive = cfg.sign === '+';
              return (
                <motion.div
                  key={tx.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.02 }}
                  className={`grid grid-cols-[auto_1fr_auto_auto] gap-3 items-center px-4 py-3 border-b border-border/30 last:border-0 transition-colors hover:bg-white/[0.02] ${
                    isPositive ? 'bg-green-500/[0.03]' : 'bg-red-500/[0.03]'
                  }`}
                >
                  {/* Type badge */}
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${cfg.bg} shrink-0`}>
                    <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
                    <span className={`text-xs font-bold ${cfg.color} hidden sm:inline`}>{cfg.label}</span>
                  </div>

                  {/* Description */}
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{tx.description || cfg.label}</p>
                    <p className="text-xs text-muted-foreground sm:hidden">{moment(tx.created_date).format('DD.MM.YY HH:mm')}</p>
                    {tx.balance_after != null && (
                      <p className="text-[10px] text-muted-foreground/60">Stanje: {tx.balance_after.toLocaleString()}</p>
                    )}
                  </div>

                  {/* Date */}
                  <span className="text-xs text-muted-foreground whitespace-nowrap hidden sm:block">
                    {moment(tx.created_date).format('DD.MM.YYYY')}<br/>
                    <span className="opacity-60">{moment(tx.created_date).format('HH:mm')}</span>
                  </span>

                  {/* Amount */}
                  <div className={`text-right shrink-0 font-black text-sm ${
                    isPositive ? 'text-green-400' : 'text-red-400'
                  }`}>
                    <span className="text-base">{cfg.sign}{tx.amount?.toLocaleString()}</span>
                    <p className="text-[10px] font-normal opacity-60">tokena</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>

      {showBetaModal && <BetaModal onClose={() => setShowBetaModal(false)} />}
    </div>
  );
}