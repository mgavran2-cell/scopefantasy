import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Copy, Check, Users, Gift, Coins, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import moment from 'moment';

const REFERRAL_BONUS = 200;

export default function ReferralSection({ user, tokenBalance, loadBalance }) {
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [inputCode, setInputCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadReferrals();
  }, []);

  const loadReferrals = async () => {
    const data = await base44.entities.ReferralUse.filter({ referrer_email: user.email }, '-created_date', 50);
    setReferrals(data);
    setLoading(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(user.referral_code || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Referalni kod kopiran!');
  };

  const handleUseCode = async () => {
    if (!inputCode.trim()) return;
    const code = inputCode.trim().toUpperCase();

    if (code === user.referral_code) {
      toast.error('Ne možeš koristiti vlastiti referalni kod!');
      return;
    }

    if (user.referred_by) {
      toast.error('Već si koristio/la referalni kod!');
      return;
    }

    setSubmitting(true);

    // Find user with that referral code
    const users = await base44.entities.User.filter({ referral_code: code }, '-created_date', 1);
    if (!users || users.length === 0) {
      toast.error('Referalni kod nije pronađen!');
      setSubmitting(false);
      return;
    }

    const referrer = users[0];

    // Award bonus to current user
    const myNewBalance = (tokenBalance || 0) + REFERRAL_BONUS;
    await base44.auth.updateMe({ token_balance: myNewBalance, referred_by: code });

    // Award bonus to referrer
    const referrerNewBalance = (referrer.token_balance || 0) + REFERRAL_BONUS;
    await base44.entities.User.update(referrer.id, { token_balance: referrerNewBalance });

    // Record referral use
    await base44.entities.ReferralUse.create({
      referrer_email: referrer.email,
      referred_email: user.email,
      referred_name: user.full_name || user.email,
      bonus_tokens: REFERRAL_BONUS,
    });

    // Record transactions for both
    await Promise.all([
      base44.entities.TokenTransaction.create({
        user_email: user.email,
        type: 'bonus',
        amount: REFERRAL_BONUS,
        description: `Referalni bonus — koristio/la kod: ${code}`,
        balance_after: myNewBalance,
      }),
      base44.entities.TokenTransaction.create({
        user_email: referrer.email,
        type: 'bonus',
        amount: REFERRAL_BONUS,
        description: `Referalni bonus — prijatelj se pridružio: ${user.full_name || user.email}`,
        balance_after: referrerNewBalance,
      }),
    ]);

    await loadBalance();
    toast.success(`🎉 Obojica ste dobili ${REFERRAL_BONUS} bonus tokena!`);
    setInputCode('');
    setSubmitting(false);
  };

  const shareUrl = `Pridruži se ScopeFantasy uz moj referalni kod: ${user.referral_code} i dobij ${REFERRAL_BONUS} bonus tokena!`;

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Pozvanih', value: referrals.length, icon: Users, color: 'text-primary' },
          { label: 'Tokena zarađeno', value: (referrals.length * REFERRAL_BONUS).toLocaleString(), icon: Coins, color: 'text-accent' },
          { label: 'Bonus/pozivnica', value: REFERRAL_BONUS, icon: Gift, color: 'text-fuchsia-400' },
        ].map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
            className="p-4 rounded-2xl bg-card border border-border/50 text-center">
            <s.icon className={`w-5 h-5 mx-auto mb-2 ${s.color}`} />
            <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* My referral code */}
      <div className="p-5 rounded-2xl bg-gradient-to-br from-primary/10 to-fuchsia-500/5 border border-primary/20">
        <h3 className="font-bold mb-1 flex items-center gap-2">
          <Gift className="w-4 h-4 text-primary" />
          Tvoj referalni kod
        </h3>
        <p className="text-xs text-muted-foreground mb-4">Podijeli ovaj kod s prijateljima. Oboje dobivate {REFERRAL_BONUS} tokena!</p>
        <div className="flex items-center gap-3">
          <div className="flex-1 bg-secondary rounded-xl px-4 py-3 font-mono font-black text-xl tracking-widest text-primary text-center">
            {user.referral_code || '——'}
          </div>
          <Button onClick={handleCopy} variant="outline" className="rounded-xl px-4 shrink-0">
            {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
          </Button>
        </div>
        <button
          onClick={() => navigator.share ? navigator.share({ text: shareUrl }) : navigator.clipboard.writeText(shareUrl).then(() => toast.success('Poruka kopirana!'))}
          className="w-full mt-3 py-2 rounded-xl bg-primary/15 border border-primary/20 text-primary text-sm font-semibold hover:bg-primary/25 transition-all"
        >
          📤 Podijeli pozivnicu
        </button>
      </div>

      {/* Enter someone else's code */}
      {!user.referred_by && (
        <div className="p-5 rounded-2xl bg-card border border-border/50">
          <h3 className="font-bold mb-1 flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-accent" />
            Unesi referalni kod prijatelja
          </h3>
          <p className="text-xs text-muted-foreground mb-4">Upiši kod koji si dobio od prijatelja i osvoji {REFERRAL_BONUS} bonus tokena.</p>
          <div className="flex gap-2">
            <input
              value={inputCode}
              onChange={e => setInputCode(e.target.value.toUpperCase())}
              placeholder="npr. AB12CD"
              maxLength={8}
              className="flex-1 bg-secondary rounded-xl px-4 py-2.5 font-mono font-bold text-lg tracking-widest outline-none placeholder:text-muted-foreground placeholder:font-normal placeholder:text-base uppercase"
            />
            <Button onClick={handleUseCode} disabled={submitting || !inputCode.trim()} className="rounded-xl">
              {submitting
                ? <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                : 'Aktiviraj'
              }
            </Button>
          </div>
        </div>
      )}

      {user.referred_by && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-primary/5 border border-primary/15">
          <Check className="w-5 h-5 text-primary shrink-0" />
          <p className="text-sm text-muted-foreground">Koristio/la si referalni kod <span className="font-bold text-primary">{user.referred_by}</span></p>
        </div>
      )}

      {/* Invited friends list */}
      {!loading && referrals.length > 0 && (
        <div className="rounded-2xl bg-card border border-border/50 overflow-hidden">
          <div className="px-5 py-4 border-b border-border/50">
            <h3 className="font-bold flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              Pozvani prijatelji ({referrals.length})
            </h3>
          </div>
          <div className="divide-y divide-border/30">
            {referrals.map((r, i) => (
              <div key={r.id} className="flex items-center gap-3 px-5 py-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-fuchsia-500 flex items-center justify-center">
                  <span className="text-white font-black text-xs">{(r.referred_name || r.referred_email)?.charAt(0).toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{r.referred_name || r.referred_email}</p>
                  <p className="text-xs text-muted-foreground">{moment(r.created_date).format('DD.MM.YYYY')}</p>
                </div>
                <span className="flex items-center gap-1 text-xs font-bold text-primary">
                  <Coins className="w-3 h-3" />+{r.bonus_tokens}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}