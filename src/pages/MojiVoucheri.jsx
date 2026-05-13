import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Ticket, Copy, CheckCircle2, Gift, Clock, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment';

const STATUS_CONFIG = {
  issued:    { label: 'Aktivan',     color: 'bg-primary/15 text-primary',          icon: Gift },
  redeemed:  { label: 'Iskorišten',  color: 'bg-green-500/15 text-green-400',      icon: CheckCircle2 },
  expired:   { label: 'Istekao',     color: 'bg-muted text-muted-foreground',      icon: Clock },
  cancelled: { label: 'Otkazan',     color: 'bg-destructive/15 text-destructive',  icon: XCircle },
};

const FILTERS = [
  { key: 'all',      label: 'Svi' },
  { key: 'issued',   label: 'Aktivni' },
  { key: 'redeemed', label: 'Iskorišteni' },
  { key: 'expired',  label: 'Istekli' },
];

function VoucherCard({ voucher, index }) {
  const [copied, setCopied] = useState(false);
  const cfg = STATUS_CONFIG[voucher.status] || STATUS_CONFIG.issued;
  const Icon = cfg.icon;

  const handleCopy = () => {
    navigator.clipboard.writeText(voucher.voucher_code);
    setCopied(true);
    toast.success('Kod kopiran!');
    setTimeout(() => setCopied(false), 2000);
  };

  const isActive = voucher.status === 'issued';
  const isExpired = voucher.expires_date && new Date(voucher.expires_date) < new Date();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`rounded-2xl border overflow-hidden ${isActive && !isExpired ? 'border-primary/30 bg-gradient-to-br from-primary/5 to-accent/3' : 'border-border/50 bg-card'}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border/30">
        <div className="flex items-center gap-3">
          {voucher.partner_logo_url ? (
            <img src={voucher.partner_logo_url} alt={voucher.partner_name} className="h-9 rounded-lg object-contain bg-secondary p-1" />
          ) : (
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center font-black text-primary">
              {(voucher.partner_name || 'P').charAt(0)}
            </div>
          )}
          <div>
            <p className="font-black text-sm">{voucher.partner_name}</p>
            <p className="text-xs text-muted-foreground">{voucher.voucher_description || `${voucher.voucher_type} voucher`}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${cfg.color}`}>
            <Icon className="w-3 h-3" /> {cfg.label}
          </span>
          {voucher.voucher_type === 'cash' && (
            <span className="text-lg font-black text-primary">€{voucher.voucher_value}</span>
          )}
        </div>
      </div>

      {/* Voucher code */}
      <div className="px-5 py-4">
        <p className="text-xs text-muted-foreground mb-2">Tvoj voucher kod:</p>
        <div className="flex items-center gap-3">
          <div className={`flex-1 rounded-xl border-2 border-dashed px-4 py-3 text-center ${isActive && !isExpired ? 'border-primary/40 bg-primary/5' : 'border-border/40 bg-secondary'}`}>
            <span className={`font-mono font-black tracking-widest text-lg ${isActive && !isExpired ? 'text-primary' : 'text-muted-foreground'}`}>
              {isActive && !isExpired ? voucher.voucher_code : '● ● ● ● ● ● ● ●'}
            </span>
          </div>
          {isActive && !isExpired && (
            <button onClick={handleCopy}
              className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary/10 text-primary hover:bg-primary/20 transition-all">
              {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          )}
        </div>

        {/* Meta */}
        <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
          <span>Izdan: {moment(voucher.issued_date || voucher.created_date).format('DD.MM.YYYY')}</span>
          {voucher.expires_date && (
            <span className={isExpired ? 'text-destructive font-semibold' : ''}>
              {isExpired ? 'Istekao' : 'Vrijedi do'}: {moment(voucher.expires_date).format('DD.MM.YYYY')}
            </span>
          )}
        </div>

        {/* How to use — only for active */}
        {isActive && !isExpired && (
          <div className="mt-3 px-3 py-2.5 rounded-xl bg-secondary/70 text-xs text-muted-foreground">
            <p className="font-semibold text-foreground mb-0.5">Kako iskoristiti:</p>
            <p>Pokaži ovaj kod na blagajni ili ga unesi pri online kupnji na stranicama partnera. Kod je jednokratan.</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function MojiVoucheri() {
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [user, setUser] = useState(null);

  useEffect(() => {
    (async () => {
      const me = await base44.auth.me();
      setUser(me);
      const data = await base44.entities.PartnerVoucher.filter({ issued_to_email: me.email }, '-created_date', 50);
      setVouchers(data);
      setLoading(false);
    })();
  }, []);

  const filtered = vouchers.filter(v => filter === 'all' || v.status === filter);

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
          <Ticket className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-black">Moji voucheri</h1>
          <p className="text-sm text-muted-foreground">Nagrade od naših partnera</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        {FILTERS.map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${filter === f.key ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}>
            {f.label}
            {f.key !== 'all' && (
              <span className="ml-1.5 text-[10px] opacity-70">
                ({vouchers.filter(v => v.status === f.key).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <Gift className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
          <h3 className="text-lg font-bold mb-2">Nemaš vouchera</h3>
          <p className="text-muted-foreground text-sm">
            {filter === 'all'
              ? 'Voucheri se dobivaju kroz sponsored natjecanja i posebne nagrade od partnera.'
              : `Nema ${FILTERS.find(f => f.key === filter)?.label.toLowerCase()} vouchera.`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((v, i) => <VoucherCard key={v.id} voucher={v} index={i} />)}
        </div>
      )}
    </div>
  );
}