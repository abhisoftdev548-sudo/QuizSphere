export type PrizeRule = { rank: number; sharePercent: number };
export type PrizeParticipant = { id: string; userId: string; score: number };
export type PrizeWinner = { attemptId: string; userId: string; rank: number; amount: number };

export function distributePrize(rules: PrizeRule[], participants: PrizeParticipant[], fundedAmount: number): PrizeWinner[] {
  const winners: PrizeWinner[] = [];
  let index = 0;
  while (index < participants.length) {
    let tieEnd = index + 1;
    while (tieEnd < participants.length && participants[tieEnd]!.score === participants[index]!.score) tieEnd += 1;
    const tied = participants.slice(index, tieEnd);
    const rank = index + 1;
    const rule = rules.find((item) => item.rank === rank);
    if (rule) {
      const totalForRank = Math.floor(fundedAmount * rule.sharePercent / 100);
      const base = Math.floor(totalForRank / tied.length);
      let remainder = totalForRank % tied.length;
      for (const participant of tied) {
        const amount = base + (remainder > 0 ? 1 : 0);
        if (remainder > 0) remainder -= 1;
        winners.push({ attemptId: participant.id, userId: participant.userId, rank, amount });
      }
    }
    index = tieEnd;
  }
  return winners;
}
