import { collection, query, where, getDocs, doc, setDoc, getDoc, runTransaction, writeBatch, increment } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import { User, League, LeagueMember, Bet } from '../types';

export async function checkUsernameAvailability(username: string): Promise<boolean> {
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('username', '==', username));
  const querySnapshot = await getDocs(q);
  return querySnapshot.empty;
}

export async function placeBet(
  leagueId: string, 
  bettorId: string, 
  targetUserId: string, 
  challengeId: string, 
  amount: number, 
  odds: number
): Promise<string> {
  const bettorMemberId = `${leagueId}_${bettorId}`;
  const bettorMemberRef = doc(db, 'league_members', bettorMemberId);
  const newBetRef = doc(collection(db, 'bets'));

  await runTransaction(db, async (transaction) => {
    const memberDoc = await transaction.get(bettorMemberRef);
    if (!memberDoc.exists()) {
      throw new Error("Membro non trovato nella lega.");
    }

    const memberData = memberDoc.data() as LeagueMember;
    
    if (memberData.tripMoney < amount) {
      throw new Error("Fondi insufficienti (TripMoney).");
    }

    // Dedurre i fondi
    transaction.update(bettorMemberRef, {
      tripMoney: memberData.tripMoney - amount
    });

    // Creare la scommessa
    const bet: Bet = {
      id: newBetRef.id,
      leagueId,
      bettorId,
      targetUserId,
      challengeId,
      amount,
      odds,
      status: 'pending',
      createdAt: Date.now()
    };
    
    transaction.set(newBetRef, bet);
  });

  return newBetRef.id;
}

export async function createChallenge(challengeData: Omit<Challenge, 'id'>): Promise<string> {
  const newRef = doc(collection(db, 'challenges'));
  const challenge: Challenge = {
    ...challengeData,
    id: newRef.id,
  };
  await setDoc(newRef, challenge);
  return newRef.id;
}

export async function resolveEvent(leagueId: string, targetUserId: string, challengeId: string): Promise<void> {
  const targetMemberId = `${leagueId}_${targetUserId}`;
  const targetMemberRef = doc(db, 'league_members', targetMemberId);
  const challengeRef = doc(db, 'challenges', challengeId);

  // Leggiamo la challenge per sapere quanti punti vale
  const challengeDoc = await getDoc(challengeRef);
  if (!challengeDoc.exists()) throw new Error("Sfida non trovata.");
  const challengePoints = challengeDoc.data().points;

  // Cerchiamo le scommesse pendenti per questo evento
  const betsQuery = query(
    collection(db, 'bets'), 
    where('leagueId', '==', leagueId),
    where('targetUserId', '==', targetUserId),
    where('challengeId', '==', challengeId),
    where('status', '==', 'pending')
  );
  const pendingBetsSnap = await getDocs(betsQuery);

  const batch = writeBatch(db);

  // 1. Assegna l'intero ammontare dei Punti della sfida al bersaglio
  batch.update(targetMemberRef, {
    points: increment(challengePoints)
  });

  // 2. Risolvi ogni scommessa
  pendingBetsSnap.docs.forEach(betDoc => {
    const betData = betDoc.data();
    const bettorMemberId = `${leagueId}_${betData.bettorId}`;
    const bettorMemberRef = doc(db, 'league_members', bettorMemberId);

    // Segna vinta
    batch.update(betDoc.ref, {
      status: 'won'
    });

    const winnings = Math.round(betData.amount * betData.odds);
    const pointsWon = Math.floor(challengePoints / 2); // metà dei punti della sfida

    // Aggiungi soldi e punti allo scommettitore
    batch.update(bettorMemberRef, {
      tripMoney: increment(winnings),
      points: increment(pointsWon)
    });
  });

  await batch.commit();
}

export async function createUserProfile(userId: string, data: Omit<User, 'id'>): Promise<void> {
  const userRef = doc(db, 'users', userId);
  await setDoc(userRef, {
    id: userId,
    ...data
  });
}

export async function getUserProfile(userId: string): Promise<User | null> {
  const userRef = doc(db, 'users', userId);
  const snap = await getDoc(userRef);
  if (snap.exists()) {
    return snap.data() as User;
  }
  return null;
}

export async function getUserLeagues(userId: string): Promise<LeagueMember[]> {
  const membersRef = collection(db, 'league_members');
  const q = query(membersRef, where('userId', '==', userId));
  const snap = await getDocs(q);
  return snap.docs.map(doc => doc.data() as LeagueMember);
}

// Per entrare in una lega
export async function getLeagueByNameAndPassword(name: string, password?: string): Promise<League | null> {
  const leaguesRef = collection(db, 'leagues');
  // Firestore case-sensitive match per password
  const q = query(leaguesRef, where('name', '==', name), where('password', '==', password || ''));
  const snap = await getDocs(q);
  if (!snap.empty) {
    return snap.docs[0].data() as League;
  }
  return null;
}

export async function createLeague(leagueData: Omit<League, 'id' | 'createdAt'>): Promise<string> {
  const newLeagueRef = doc(collection(db, 'leagues'));
  const league: League = {
    ...leagueData,
    id: newLeagueRef.id,
    createdAt: Date.now()
  };
  await setDoc(newLeagueRef, league);
  return newLeagueRef.id;
}

export async function createLeagueMember(memberData: Omit<LeagueMember, 'id'>): Promise<string> {
  const id = `${memberData.leagueId}_${memberData.userId}`;
  const newMemberRef = doc(db, 'league_members', id);
  const member: LeagueMember = { ...memberData, id };
  await setDoc(newMemberRef, member);
  return id;
}
