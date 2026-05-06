import moment from 'moment';

export const REWARD_TABLE = [
  { correct: 0, tokens: 0, label: '0 tokena' },
  { correct: 1, tokens: 0, label: '0 tokena' },
  { correct: 2, tokens: 0, label: '0 tokena' },
  { correct: 3, tokens: 0, label: '0 tokena' },
  { correct: 4, tokens: 500, label: '500 tokena' },
  { correct: 5, tokens: 1500, label: '1.500 tokena' },
  { correct: 6, tokens: 5000, label: '5.000 tokena' },
  { correct: 7, tokens: 15000, label: '15.000 tokena 🎉' },
];

export function getWeekStart(date = new Date()) {
  return moment(date).startOf('isoWeek').format('YYYY-MM-DD');
}

export function getDayNumber(date = new Date()) {
  return moment(date).isoWeekday(); // 1=Mon, 7=Sun
}

export function getDayLabel(dayNumber) {
  const labels = ['', 'Pon', 'Uto', 'Sri', 'Čet', 'Pet', 'Sub', 'Ned'];
  return labels[dayNumber] || '';
}

export function getRewardForCorrect(correct) {
  return REWARD_TABLE[correct]?.tokens ?? 0;
}