export interface User {
  id: string;
  username: string;
  email: string;
}

export interface League {
  id: string;
  name: string;
  password?: string;
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
  role: 'admin' | 'player';
}

export interface Challenge {
  id: string;
  leagueId: string;
  title: string;
  description: string;
  points: number;
}

export interface Bet {
  id: string;
  leagueId: string;
  bettorId: string;
  targetUserId: string;
  challengeId: string;
  amount: number;
  odds: number;
  status: 'pending' | 'won' | 'lost';
  createdAt: number;
}
