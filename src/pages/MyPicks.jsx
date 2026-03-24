import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { ListChecks, TrendingUp, TrendingDown, Trophy, Coins, Clock } from 'lucide-react';
import moment from 'moment';

const statusConfig = {
  active: { label: 'Aktivno', color: 'bg-accent/20 text-accent' },
  won: { label: 'Osvojeno', color: 'bg-primary/20 text-primary' },
  lost: { label: 'Izgubljeno', color: 'bg-destructive/20 text-destructive' },
  partial: { label: 'Djelomično', color: 'bg-muted text-muted-foreground' },
};

export default function MyPicks() {
  const [picks, setPicks] = useState([]);
  const [contests, setContests] = useState({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('active');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [picksData, contestsData] = await Promise.all([
      base44.entities.Pick.list('-created_date', 50),
      base44.entities.Contest.list('-created_date', 100),
    ]);
    const contestMap = {};
    contestsData.forEach(c => { contestMap[c.id] = c; });
    setContests(contestMap);
    setPicks(picksData);
    setLoading(false);
  };

  const filteredPicks = tab === 'all' ? picks : picks.filter(p => p.status === tab);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-black mb-2">Moji Odabiri</h1>
        <p className="text-muted-foreground">Prati aktivne i prošle odabire</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        {[
          { key: 'active', label: 'Aktivno' },
          { key: 'won', label: 'Osvojeno' },
          { key: 'lost', label: 'Izgubljeno' },
          { key: 'all', label: 'Sve' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
              tab === t.key ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
        </div>
      ) : filteredPicks.length === 0 ? (
        <div className="text-center py-20">
          <ListChecks className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-bold mb-2">Nema odabira</h3>
          <p className="text-muted-foreground">Sudjeluj u natjecanju da vidiš svoje odabire ovdje</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredPicks.map((pick, i) => {
            const contest = contests[pick.contest_id];
            const sc = statusConfig[pick.status] || statusConfig.active;
            return (
              <motion.div
                key={pick.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="rounded-2xl border border-border/50 bg-card p-5"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold">{contest?.title || 'Natjecanje'}</h3>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {moment(pick.created_date).format('DD.MM.YYYY HH:mm')}
                      </span>
                      <span className="flex items-center gap-1">
                        <Coins className="w-3 h-3 text-accent" />
                        {pick.tokens_spent} tokena
                      </span>
                      {pick.tokens_won > 0 && (
                        <span className="flex items-center gap-1 text-primary font-bold">
                          <Trophy className="w-3 h-3" />
                          +{pick.tokens_won}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${sc.color}`}>
                    {sc.label}
                  </span>
                </div>

                <div className="space-y-2">
                  {pick.selections?.map((sel, j) => (
                    <div key={j} className="flex items-center justify-between py-2 px-3 rounded-xl bg-secondary/50">
                      <div className="flex items-center gap-2">
                        {sel.choice === 'over' ? (
                          <TrendingUp className="w-4 h-4 text-primary" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-destructive" />
                        )}
                        <span className="text-sm font-medium">{sel.player_name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-muted-foreground">{sel.stat_type} {sel.choice === 'over' ? '>' : '<'} {sel.over_under}</span>
                        {sel.result && sel.result !== 'pending' && (
                          <span className={`px-2 py-0.5 rounded-full font-bold ${
                            sel.result === 'win' ? 'bg-primary/20 text-primary' : 'bg-destructive/20 text-destructive'
                          }`}>
                            {sel.result === 'win' ? '✓' : '✗'}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}