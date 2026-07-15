import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import { useAuth } from '../context/AuthContext';
import { Challenge, LeagueMember } from '../types';
import { calculateOdds } from '../services/oddsCalculator';
import { placeBet } from '../services/db';

interface Props {
  leagueId: string;
  challenge: Challenge;
  onClose: () => void;
}

export default function BettingModal({ leagueId, challenge, onClose }: Props) {
  const { firebaseUser } = useAuth();
  const [members, setMembers] = useState<LeagueMember[]>([]);
  const [targetUserId, setTargetUserId] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const odds = calculateOdds(challenge.points);
  const potentialWinning = amount ? (Number(amount) * odds).toFixed(2) : '0.00';

  useEffect(() => {
    const fetchMembers = async () => {
      if (!firebaseUser) return;
      const q = query(collection(db, 'league_members'), where('leagueId', '==', leagueId));
      const snap = await getDocs(q);
      const fetched = snap.docs.map(doc => doc.data() as LeagueMember);
      // Escludi l'utente corrente dalla lista dei possibili target
      setMembers(fetched.filter(m => m.userId !== firebaseUser.uid));
    };
    fetchMembers();
  }, [leagueId, firebaseUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || !targetUserId || !amount) return;
    
    const numAmount = Number(amount);
    if (numAmount <= 0) {
      setError('L\'importo deve essere maggiore di zero.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await placeBet(
        leagueId,
        firebaseUser.uid,
        targetUserId,
        challenge.id,
        numAmount,
        odds
      );
      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Errore durante il piazzamento della scommessa.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-gray-900 border border-purple-500/30 p-6 sm:p-8 rounded-2xl shadow-2xl shadow-purple-900/40 w-full max-w-md relative animate-in fade-in zoom-in duration-200">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors">
          ✕
        </button>

        <h2 className="text-2xl font-bold text-white mb-2">Piazza Scommessa</h2>
        <p className="text-purple-400 font-medium mb-6 text-sm">{challenge.title}</p>

        {success ? (
          <div className="bg-green-900/40 border border-green-500/50 text-green-200 p-6 rounded-xl text-center space-y-2">
            <div className="text-3xl mb-2">✅</div>
            <p className="font-bold text-lg">Scommessa piazzata!</p>
            <p className="text-sm opacity-80">I TripMoney sono stati prelevati dal tuo saldo.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-900/40 border border-red-500/50 text-red-200 p-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Su chi scommetti?</label>
              <select 
                value={targetUserId} 
                onChange={e => setTargetUserId(e.target.value)} 
                required
                className="w-full bg-gray-950 border border-gray-800 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 appearance-none"
              >
                <option value="" disabled>Seleziona un giocatore</option>
                {members.map(m => (
                  <option key={m.id} value={m.userId}>{m.username}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Importo (TripMoney)</label>
              <input 
                type="number" 
                min="1" 
                step="1"
                value={amount} 
                onChange={e => setAmount(e.target.value)} 
                required
                placeholder="Es. 50"
                className="w-full bg-gray-950 border border-gray-800 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
              />
            </div>

            <div className="bg-gray-950/50 p-4 rounded-xl border border-gray-800 flex justify-between items-center">
              <div>
                <p className="text-xs text-gray-500 uppercase font-semibold">Quota</p>
                <p className="text-lg font-bold text-gray-300">x{odds.toFixed(2)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-purple-400 uppercase font-semibold">Vincita Potenziale</p>
                <p className="text-2xl font-black text-green-400">{potentialWinning} TM</p>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 px-4 rounded-lg transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none mt-2 shadow-lg shadow-purple-900/20"
            >
              {loading ? 'Elaborazione...' : 'Conferma Scommessa'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
