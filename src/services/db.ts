import { collection, query, where, getDocs, doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import { User, League, LeagueMember } from '../types';

export async function checkUsernameAvailability(username: string): Promise<boolean> {
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('username', '==', username));
  const querySnapshot = await getDocs(q);
  return querySnapshot.empty;
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
