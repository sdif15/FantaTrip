export interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
}

export interface League {
  id: string;
  name: string;
  password: string;
  adminId: string;
  createdAt: number;
}

export interface LeagueMember {
  id: string; // composizione: leagueId_userId
  leagueId: string;
  userId: string;
  username: string;
  points: number;
  tripMoney: number;
  role: 'admin' | 'co-admin' | 'player';
  leagueName?: string;
}

export interface Challenge {
  id: string;
  leagueId: string;
  title: string;
  description: string;
  points: number;
  betDurationHours?: number; // Durata personalizzata per scommessa, se non presente è 12
}

export interface Bet {
  id: string;
  leagueId: string;
  bettorId: string;
  targetUserId: string;
  challengeId: string;
  amount: number;
  odds: number;
  multiplier?: number;
  status: 'pending' | 'won' | 'lost';
  createdAt: number;
  expiresAt?: number; // Data di scadenza in timestamp. Se assente, calcolata come createdAt + 12h
}
