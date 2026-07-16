import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import { useAuth } from '../context/AuthContext';
import type { Challenge, LeagueMember } from '../types';
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
  const [myTripMoney, setMyTripMoney] = useState<number>(0);
  const [multiplier, setMultiplier] = useState<number>(1);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const baseOdds = calculateOdds(challenge.points);
  const odds = baseOdds * multiplier;
  const potentialWinning = amount ? (Number(amount) * odds).toFixed(2) : '0.00';
  const potentialPoints = Math.ceil(Math.abs(challenge.points) / 2) * multiplier;

  useEffect(() => {
    const fetchMembers = async () => {
      if (!firebaseUser) return;
      const q = query(collection(db, 'league_members'), where('leagueId', '==', leagueId));
      const snap = await getDocs(q);
      const fetched = snap.docs.map(doc => doc.data() as LeagueMember);
      
      const me = fetched.find(m => m.userId === firebaseUser.uid);
      if (me) {
        setMyTripMoney(me.tripMoney);
      }

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
    
    if (numAmount > myTripMoney) {
      setError(`Non hai abbastanza TripMoney. Saldo attuale: ${myTripMoney} TM`);
      return;
    }

    setError('');
    setLoading(true);

    try {
      const durationHours = challenge.betDurationHours || 12;
      const expiresAt = Date.now() + durationHours * 60 * 60 * 1000;

      await placeBet(
        leagueId,
        firebaseUser.uid,
        targetUserId,
        challenge.id,
        numAmount,
        odds,
        multiplier,
        expiresAt
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
        ) : myTripMoney <= 0 ? (
          <div className="bg-red-900/40 border border-red-500/50 text-red-200 p-6 rounded-xl text-center space-y-2">
            <div className="text-3xl mb-2">💸</div>
            <p className="font-bold text-lg">Sei al verde!</p>
            <p className="text-sm opacity-80">Non hai abbastanza TripMoney per scommettere. Chiedi all'Admin se può sganciare la paghetta!</p>
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

            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-300 mb-2">Importo (Max {myTripMoney})</label>
                <input 
                  type="number" 
                  min="1"
                  max={myTripMoney}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full bg-gray-950 border border-gray-800 text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-purple-500"
                  placeholder="Es. 50"
                  required
                />
              </div>
              <div className="w-1/3">
                <label className="block text-sm font-medium text-gray-300 mb-2">Volte (x)</label>
                <input 
                  type="number" 
                  min="1"
                  value={multiplier}
                  onChange={(e) => setMultiplier(Number(e.target.value) || 1)}
                  className="w-full bg-gray-950 border border-gray-800 text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-purple-500 text-center"
                  required
                />
              </div>
            </div>

            <p className="text-yellow-500/80 text-sm font-bold flex items-center gap-1">⏱️ Scade in {challenge.betDurationHours || 12} ore!</p>

            <div className="bg-gray-950/50 p-4 rounded-xl border border-gray-800 flex justify-between items-center mt-2">
              <div>
                <p className="text-xs text-gray-500 uppercase font-semibold">Quota</p>
                <p className="text-lg font-bold text-gray-300">x{odds.toFixed(2)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-purple-400 uppercase font-semibold">Vincita (TM)</p>
                <p className="text-2xl font-black text-green-400">{potentialWinning}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-purple-400 uppercase font-semibold">Bonus Punti</p>
                <p className="text-2xl font-black text-purple-400">+{potentialPoints}</p>
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
