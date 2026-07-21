import { collection, query, where, getDocs, doc, setDoc, getDoc, runTransaction, writeBatch, increment, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import type { User, League, LeagueMember, Bet, Challenge } from '../types';

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
  odds: number,
  multiplier: number = 1,
  expiresAt?: number
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
      multiplier,
      status: 'pending',
      createdAt: Date.now(),
      expiresAt: expiresAt || (Date.now() + 12 * 60 * 60 * 1000)
    };

    transaction.set(newBetRef, bet);
  });

  return newBetRef.id;
}

export async function createChallenge(data: Omit<Challenge, 'id'>): Promise<string> {
  const newChalRef = doc(collection(db, 'challenges'));
  await setDoc(newChalRef, {
    ...data,
    id: newChalRef.id,
    betDurationHours: data.betDurationHours || 12
  });
  return newChalRef.id;
}

export async function deleteChallenge(leagueId: string, challengeId: string): Promise<void> {
  const chalRef = doc(db, 'challenges', challengeId);
  const chalSnap = await getDoc(chalRef);
  
  if (!chalSnap.exists()) return;
  const challengeData = chalSnap.data() as Challenge;

  const batch = writeBatch(db);

  // 1. Recupera tutte le validazioni (eventi)
  const eventsQ = query(
    collection(db, 'completed_challenges'), 
    where('leagueId', '==', leagueId),
    where('challengeId', '==', challengeId)
  );
  const eventsSnap = await getDocs(eventsQ);

  // 2. Recupera tutte le scommesse
  const betsQ = query(
    collection(db, 'bets'),
    where('leagueId', '==', leagueId),
    where('challengeId', '==', challengeId)
  );
  const betsSnap = await getDocs(betsQ);

  // Array di tracking per i net diffs (evita problemi di overlap update sullo stesso doc nel batch)
  const userDiffs: Record<string, { points: number, tripMoney: number }> = {};

  const getDiff = (userId: string) => {
    if (!userDiffs[userId]) userDiffs[userId] = { points: 0, tripMoney: 0 };
    return userDiffs[userId];
  };

  // 3. Calcola rimborsi validazioni
  eventsSnap.docs.forEach(docSnap => {
    const ev = docSnap.data();
    getDiff(ev.userId).points -= ev.points; // Togli i punti guadagnati
    batch.delete(docSnap.ref);
  });

  // 4. Calcola rimborsi scommesse
  betsSnap.docs.forEach(docSnap => {
    const bet = docSnap.data() as Bet;
    const diff = getDiff(bet.bettorId);
    
    // Rimborsa sempre i soldi giocati originariamente
    diff.tripMoney += bet.amount;

    if (bet.status === 'won') {
      // Se era vinta, dobbiamo togliergli le vincite
      const winnings = Math.round(bet.amount * bet.odds);
      const pointsWon = Math.ceil(Math.abs(challengeData.points) / 2);
      
      diff.tripMoney -= winnings;
      diff.points -= pointsWon;
    }
    
    batch.delete(docSnap.ref);
  });

  // 5. Applica i net diffs ai membri
  Object.keys(userDiffs).forEach(userId => {
    const diff = userDiffs[userId];
    if (diff.points === 0 && diff.tripMoney === 0) return;
    
    const memberRef = doc(db, 'league_members', `${leagueId}_${userId}`);
    batch.update(memberRef, {
      points: increment(diff.points),
      tripMoney: increment(diff.tripMoney)
    });
  });

  // 6. Elimina la sfida
  batch.delete(chalRef);

  await batch.commit();
}

export async function deleteLeague(leagueId: string): Promise<void> {
  const batch = writeBatch(db);

  // 1. Elimina la lega stessa
  batch.delete(doc(db, 'leagues', leagueId));

  // 2. Trova e elimina tutti i membri della lega
  const membersSnap = await getDocs(query(collection(db, 'league_members'), where('leagueId', '==', leagueId)));
  membersSnap.forEach(d => batch.delete(d.ref));

  // 3. Trova e elimina tutte le sfide
  const challengesSnap = await getDocs(query(collection(db, 'challenges'), where('leagueId', '==', leagueId)));
  challengesSnap.forEach(d => batch.delete(d.ref));

  // 4. Trova e elimina tutte le scommesse
  const betsSnap = await getDocs(query(collection(db, 'bets'), where('leagueId', '==', leagueId)));
  betsSnap.forEach(d => batch.delete(d.ref));

  // Esegui tutto atomicamente
  await batch.commit();
}

export async function updateMemberRole(leagueId: string, userId: string, newRole: 'admin' | 'co-admin' | 'player'): Promise<void> {
  const memberId = `${leagueId}_${userId}`;
  const memberRef = doc(db, 'league_members', memberId);
  await updateDoc(memberRef, { role: newRole });
}

export async function kickMember(leagueId: string, userId: string): Promise<void> {
  const memberId = `${leagueId}_${userId}`;
  const memberRef = doc(db, 'league_members', memberId);

  // Non si può eliminare il creatore (l'unico con userId == adminId nella lega vera e propria,
  // ma per sicurezza l'admin rimuove solo i 'player' o 'co-admin' dall'UI).
  await deleteDoc(memberRef);
}

export async function updateLeaguePassword(leagueId: string, newPassword: string): Promise<void> {
  const leagueRef = doc(db, 'leagues', leagueId);
  await updateDoc(leagueRef, { password: newPassword });
}

export async function resolveEvent(leagueId: string, targetUserId: string, challengeId: string, multiplier: number = 1): Promise<void> {
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

  // 1. Assegna i Punti della sfida al bersaglio (moltiplicati)
  batch.update(targetMemberRef, {
    points: increment(challengePoints * multiplier)
  });

  // 2. Registra l'evento nello storico
  const completedRef = doc(collection(db, 'completed_challenges'));
  batch.set(completedRef, {
    id: completedRef.id,
    leagueId,
    userId: targetUserId,
    challengeId,
    points: challengePoints * multiplier,
    count: multiplier,
    timestamp: Date.now()
  });

  // 3. Risolvi ogni scommessa (verificando la scadenza)
  
  pendingBetsSnap.docs.forEach(betDoc => {
    const betData = betDoc.data();
    const expiration = betData.expiresAt || (betData.createdAt + 12 * 60 * 60 * 1000);

    // Se la scommessa è scaduta, marcala come persa e non pagare
    if (Date.now() > expiration) {
      batch.update(betDoc.ref, { status: 'lost' });
      return;
    }

    // Se l'utente ha scommesso che lo faceva x volte, e l'admin ha validato y volte con y < x
    // la scommessa è persa!
    if ((betData.multiplier || 1) > multiplier) {
      batch.update(betDoc.ref, { status: 'lost' });
      return;
    }

    const bettorMemberId = `${leagueId}_${betData.bettorId}`;
    const bettorMemberRef = doc(db, 'league_members', bettorMemberId);

    // Segna vinta
    batch.update(betDoc.ref, {
      status: 'won'
    });

    const winnings = Math.round(betData.amount * betData.odds);
    const pointsWon = Math.ceil(Math.abs(challengePoints) / 2); // Metà dei punti assoluti della sfida

    // Aggiungi soldi e punti allo scommettitore (la scommessa premia 1 sola volta anche se l'azione è ripetuta)
    batch.update(bettorMemberRef, {
      tripMoney: increment(winnings),
      points: increment(pointsWon)
    });
  });

  await batch.commit();
}

export async function assignCustomPoints(leagueId: string, userId: string, pointsDelta: number): Promise<void> {
  const memberId = `${leagueId}_${userId}`;
  const memberRef = doc(db, 'league_members', memberId);
  await updateDoc(memberRef, {
    points: increment(pointsDelta)
  });
}

export async function revokeEvent(leagueId: string, eventId: string): Promise<void> {
  const eventRef = doc(db, 'completed_challenges', eventId);
  const eventSnap = await getDoc(eventRef);

  if (!eventSnap.exists()) {
    throw new Error("Evento non trovato o già rimosso.");
  }

  const eventData = eventSnap.data();
  if (eventData.leagueId !== leagueId) {
    throw new Error("Permessi insufficienti.");
  }

  const targetMemberId = `${leagueId}_${eventData.userId}`;
  const targetMemberRef = doc(db, 'league_members', targetMemberId);

  const batch = writeBatch(db);

  // Sottrarre i punti dal target user
  batch.update(targetMemberRef, {
    points: increment(-eventData.points)
  });

  // Eliminare l'evento
  batch.delete(eventRef);

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
  const members = snap.docs.map(doc => doc.data() as LeagueMember);

  // Recupera i nomi delle leghe
  const enhanced = await Promise.all(members.map(async m => {
    const lDoc = await getDoc(doc(db, 'leagues', m.leagueId));
    return {
      ...m,
      leagueName: lDoc.exists() ? lDoc.data().name : 'Lega Sconosciuta'
    };
  }));

  return enhanced;
}

export async function distributeDailyAllowance(leagueId: string): Promise<void> {
  const leagueRef = doc(db, 'leagues', leagueId);
  const leagueSnap = await getDoc(leagueRef);
  if (!leagueSnap.exists()) throw new Error("Lega non trovata");

  const lastAllowance = leagueSnap.data().lastAllowanceDate || 0;
  const ONE_DAY = 24 * 60 * 60 * 1000;

  if (Date.now() - lastAllowance < ONE_DAY) {
    throw new Error("Paghetta già distribuita nelle ultime 24 ore!");
  }

  const memQ = query(collection(db, 'league_members'), where('leagueId', '==', leagueId));
  const memSnap = await getDocs(memQ);

  const batch = writeBatch(db);
  batch.update(leagueRef, { lastAllowanceDate: Date.now() });

  memSnap.docs.forEach(docSnap => {
    batch.update(docSnap.ref, { tripMoney: increment(20) });
  });

  await batch.commit();
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
