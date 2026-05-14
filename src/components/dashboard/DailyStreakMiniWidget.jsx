import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Flame } from 'lucide-react';
import { Link } from 'react-router-dom';
import moment from 'moment';
import { getWeekStart, getDayNumber } from '@/lib/streakUtils';

export default function DailyStreakMiniWidget() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  const weekStart = getWeekStart();
  const todayDayNum = getDayNumber();

  useEffect(() => {
    (async () => {
      const me = await base44.auth.me();
      const allEntries = await base44.entities.DailyStreakEntry.filter({
        user_email: me.email,
        week_start_date: weekStart,
      });
      setEntries(allEntries);
      setLoading(false);
    })();
  }, []);

  const correctCount = entries.filter(e => e.result === 'won').length;
  const todayEntry = entries.find(e => e.day_number === todayDayNum);
  const todayChosen = todayEntry && todayEntry.pick_choice;

  if (loading) return (
    <div className="rounded-2xl bg-card border border-border/50 p-5 animate-pulse h-full min-h-[200px]" />
  );

  return (
    <div className="rounded-2xl border border-orange-500/20 bg-gradient-to-br from-orange-500/5 to-card p-5 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-9 h-9 rounded-xl bg-orange-500/15 flex items-center justify-center">
          <Flame className="w-5 h-5 text-orange-400" />
        </div>
        <div>
          <h3 className="font-black text-sm">🔥 Daily Streak</h3>
          <p className="text-xs text-muted-foreground">
            {moment(weekStart).format('DD.MM')} – {moment(weekStart).add(6, 'days').format('DD.MM')}
          </p>
        </div>
        <span className="ml-auto font-black text-orange-400 text-lg">{correctCount}/7</span>
      </div>

      {/* 7-day mini squares */}
      <div className="flex gap-1.5 mb-4">
        {[1, 2, 3, 4, 5, 6, 7].map(day => {
          const entry = entries.find(e => e.day_number === day);
          const isToday = day === todayDayNum;
          const isFuture = day > todayDayNum;

          let cls = '';
          let label = '';

          if (entry?.result === 'won') {
            cls = 'bg-green-500 text-white';
            label = '✓';
          } else if (entry?.result === 'lost') {
            cls = 'bg-destructive/60 text-white';
            label = '✗';
          } else if (entry?.pick_choice) {
            cls = 'bg-yellow-500/40 border border-yellow-500/60 text-yellow-300';
            label = '?';
          } else if (isToday) {
            cls = 'bg-primary/20 border-2 border-primary border-dashed text-primary';
            label = '!';
          } else if (isFuture) {
            cls = 'bg-secondary text-muted-foreground/30';
            label = '🔒';
          } else {
            cls = 'bg-destructive/20 text-destructive/50';
            label = '–';
          }

          return (
            <div
              key={day}
              className={`flex-1 aspect-square rounded-lg flex items-center justify-center text-[10px] font-bold transition-all ${cls}`}
            >
              {label}
            </div>
          );
        })}
      </div>

      {/* Status */}
      <p className="text-xs text-muted-foreground mb-4 flex-1">
        {!todayEntry
          ? 'Pick dana još nije dostupan'
          : !todayChosen
            ? '⚡ Odaberi pick za danas!'
            : correctCount > 0
              ? `${correctCount} točnih odabira ovaj tjedan`
              : 'Nastavi ovaj tjedan!'
        }
      </p>

      {/* CTA */}
      <Link
        to="/natjecanja?tab=daily-streak"
        className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-orange-500/15 text-orange-400 text-xs font-bold hover:bg-orange-500/25 transition-all border border-orange-500/20"
      >
        <Flame className="w-3.5 h-3.5" /> Idi na Daily Streak
      </Link>
    </div>
  );
}