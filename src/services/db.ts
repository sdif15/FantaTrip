import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';

/**
 * Controlla se un username è già in uso nella collection 'users'.
 * Ritorna true se l'username è disponibile (ovvero non esiste a db), false altrimenti.
 */
export async function checkUsernameAvailability(username: string): Promise<boolean> {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('username', '==', username));
    const querySnapshot = await getDocs(q);
    
    // Se è vuoto, significa che nessun utente ha questo username, quindi è disponibile.
    return querySnapshot.empty;
  } catch (error) {
    console.error('Errore durante il controllo dell\'username:', error);
    throw error;
  }
}

// ============================================================================
// PLACEHOLDERS PER LE ALTRE FUNZIONI FIRESTORE
// ============================================================================

// --- User Services ---
export async function createUserProfile(userId: string, data: any): Promise<void> {
  // TODO: implement
}

export async function getUserProfile(userId: string): Promise<any> {
  // TODO: implement
}

// --- League Services ---
export async function createLeague(leagueData: any): Promise<string> {
  // TODO: implement
  return 'new_league_id';
}

export async function joinLeague(userId: string, leagueName: string, password: string): Promise<boolean> {
  // TODO: implement
  return false;
}

export async function getLeagueMembers(leagueId: string): Promise<any[]> {
  // TODO: implement
  return [];
}

// --- Challenge & Bet Services ---
export async function createChallenge(challengeData: any): Promise<string> {
  // TODO: implement
  return 'new_challenge_id';
}

export async function placeBet(betData: any): Promise<string> {
  // TODO: implement
  return 'new_bet_id';
}

export async function resolveChallenge(challengeId: string, winnerUserId: string): Promise<void> {
  // TODO: implement
}
