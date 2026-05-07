// POWER PLAY multipliers (all must hit)
export const POWER_ODDS = {
  2: 3,
  3: 5,
  4: 10,
  5: 20,
  6: 35,
};

// FLEX PLAY payout table: flexOdds[numPicks][numCorrect] = multiplier
export const FLEX_ODDS = {
  3: { 3: 2.25, 2: 1.25 },
  4: { 4: 5,    3: 1.5  },
  5: { 5: 10,   4: 2,   3: 0.4 },
  6: { 6: 25,   5: 2,   4: 0.4 },
};

export function getPowerMultiplier(numPicks) {
  return POWER_ODDS[numPicks] ?? null;
}

export function getFlexMultiplier(numPicks, numCorrect) {
  return FLEX_ODDS[numPicks]?.[numCorrect] ?? 0;
}

// Returns array of {correct, multiplier} for flex display
export function getFlexPayoutBreakdown(numPicks) {
  const table = FLEX_ODDS[numPicks];
  if (!table) return [];
  return Object.entries(table)
    .map(([correct, multiplier]) => ({ correct: parseInt(correct), multiplier }))
    .sort((a, b) => b.correct - a.correct);
}

export function calcPowerPotential(stake, numPicks) {
  const mult = getPowerMultiplier(numPicks);
  if (!mult) return 0;
  return Math.round(stake * mult);
}

export function calcFlexPayout(stake, numPicks, numCorrect) {
  const mult = getFlexMultiplier(numPicks, numCorrect);
  return Math.round(stake * mult);
}