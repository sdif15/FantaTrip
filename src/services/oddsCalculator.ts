/**
 * Calcola la quota di una scommessa in base ai punti della sfida.
 * Formula: Quota = 1.2 + (Punti Sfida / 25)
 * Il risultato viene arrotondato a due decimali (es. 1.34).
 * 
 * @param challengePoints I punti messi in palio dalla sfida.
 * @returns La quota calcolata.
 */
export function calculateOdds(challengePoints: number): number {
  const odds = 1.2 + (challengePoints / 25);
  return Math.round(odds * 100) / 100;
}
