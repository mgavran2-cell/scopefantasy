import { useState, useEffect } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { User, Coins, Trophy, Target, TrendingUp, LogOut, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import moment from 'moment';

export default function Profile() {
  const { tokenBalance } = useOutletContext();
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({ total: 0, won: 0, lost: 0, tokensWon: 0, tokensSpent: 0 });
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const [me, picks, txns] = await Promise.all([
      base44.auth.me(),
      base44.entities.Pick.list('-created_date', 100),
      base44.entities.TokenTransaction.list('-created_date', 20),
    ]);
    setUser(me);
    setTransactions(txns);

    const s = { total: picks.length, won: 0, lost: 0, tokensWon: 0, tokensSpent: 0 };
    picks.forEach(p => {
      if (p.status === 'won') s.won++;
      if (p.status === 'lost') s.lost++;
      s.tokensWon += (p.tokens_won || 0);
      s.tokensSpent += (p.tokens_spent || 0);
    });
    setStats(s);
    setLoading(false);
  };

  const handleLogout = () => {
    base44.auth.logout();
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const winRate = stats.total > 0 ? ((stats.won / stats.total) * 100).toFixed(1) : 0;

  const txnConfig = {
    purchase: { label: 'Kupnja', color: 'text-primary', icon: '+' },
    entry: { label: 'Ulaz', color: 'text-destructive', icon: '' },
    win: { label: 'Nagrada', color: 'text-primary', icon: '+' },
    bonus: { label: 'Bonus', color: 'text-accent', icon: '+' },
    refund: { label: 'Povrat', color: 'text-primary', icon: '+' },
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      {/* Profile header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-emerald-400 flex items-center justify-center">
            <span className="text-2xl font-black text-primary-foreground">
              {user?.full_name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
            </span>
          </div>
          <div>
            <h1 className="text-2xl font-black">{user?.full_name || 'Igrač'}</h1>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
        </div>

        {/* Token balance */}
        <div className="p-5 rounded-2xl bg-gradient-to-r from-accent/10 to-accent/5 border border-accent/20 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Stanje tokena</p>
              <p className="text-4xl font-black text-accent">{tokenBalance?.toLocaleString()}</p>
            </div>
            <Link
              to="/kupnja-tokena"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-accent-foreground font-bold text-sm hover:opacity-90 transition-all"
            >
              <Coins className="w-4 h-4" />
              Kupi Tokene
            </Link>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {[
            { label: 'Igre', value: stats.total, icon: Target },
            { label: 'Pobjede', value: stats.won, icon: Trophy },
            { label: 'Win Rate', value: `${winRate}%`, icon: TrendingUp },
            { label: 'Zarađeno', value: stats.tokensWon.toLocaleString(), icon: Coins },
          ].map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="p-4 rounded-2xl bg-card border border-border/50 text-center"
            >
              <s.icon className="w-5 h-5 mx-auto mb-2 text-primary" />
              <p className="text-xl font-black">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Transactions */}
      <div className="mb-8">
        <h2 className="text-lg font-bold mb-4">Zadnje transakcije</h2>
        {transactions.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nema transakcija</p>
        ) : (
          <div className="space-y-2">
            {transactions.map((tx, i) => {
              const cfg = txnConfig[tx.type] || txnConfig.entry;
              return (
                <div key={tx.id} className="flex items-center justify-between p-3 rounded-xl bg-card border border-border/50">
                  <div>
                    <p className="text-sm font-semibold">{cfg.label}</p>
                    <p className="text-xs text-muted-foreground">{tx.description || ''} · {moment(tx.created_date).format('DD.MM. HH:mm')}</p>
                  </div>
                  <span className={`font-bold text-sm ${cfg.color}`}>
                    {cfg.icon}{Math.abs(tx.amount).toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Button variant="outline" className="w-full rounded-xl" onClick={handleLogout}>
        <LogOut className="w-4 h-4 mr-2" />
        Odjava
      </Button>
    </div>
  );
}