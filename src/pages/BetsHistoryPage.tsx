import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import type { Bet, LeagueMember, Challenge } from '../types';
import { useAuth } from '../context/AuthContext';

export default function BetsHistoryPage() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const { firebaseUser } = useAuth();
  const navigate = useNavigate();
  
  const [bets, setBets] = useState<Bet[]>([]);
  const [members, setMembers] = useState<Record<string, LeagueMember>>({});
  const [challenges, setChallenges] = useState<Record<string, Challenge>>({});
  const [sortBy, setSortBy] = useState<'status' | 'newest'>('status');
  const [filterMode, setFilterMode] = useState<'mine' | 'others'>('mine');

  useEffect(() => {
    if (!leagueId) return;

    // Fetch members per mostrare i nomi
    const memUnsub = onSnapshot(query(collection(db, 'league_members'), where('leagueId', '==', leagueId)), (snap) => {
      const mems: Record<string, LeagueMember> = {};
      snap.docs.forEach(d => mems[d.data().userId] = d.data() as LeagueMember);
      setMembers(mems);
    });

    // Fetch sfide per mostrare i titoli
    const chalUnsub = onSnapshot(query(collection(db, 'challenges'), where('leagueId', '==', leagueId)), (snap) => {
      const chals: Record<string, Challenge> = {};
      snap.docs.forEach(d => chals[d.data().id] = d.data() as Challenge);
      setChallenges(chals);
    });

    // Fetch scommesse
    const betsUnsub = onSnapshot(query(collection(db, 'bets'), where('leagueId', '==', leagueId)), (snap) => {
      setBets(snap.docs.map(d => d.data() as Bet));
    });

    return () => { memUnsub(); chalUnsub(); betsUnsub(); };
  }, [leagueId]);

  const TWELVE_HOURS = 12 * 60 * 60 * 1000;

  const enrichedBets = bets.map(bet => {
    const expiration = bet.expiresAt || (bet.createdAt + TWELVE_HOURS);
    const isExpired = bet.status === 'pending' && (Date.now() > expiration);
    return {
      ...bet,
      computedStatus: isExpired ? 'expired' : bet.status,
      computedExpiration: expiration
    };
  });

  const sortedBets = enrichedBets.sort((a, b) => {
    if (sortBy === 'newest') {
      return b.createdAt - a.createdAt;
    } else {
      const order: Record<string, number> = { pending: 1, won: 2, lost: 3, expired: 4 };
      if (order[a.computedStatus] !== order[b.computedStatus]) {
        return order[a.computedStatus] - order[b.computedStatus];
      }
      return b.createdAt - a.createdAt;
    }
  });

  const displayedBets = sortedBets.filter(b => 
    filterMode === 'mine' ? b.bettorId === firebaseUser?.uid : b.bettorId !== firebaseUser?.uid
  );

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'pending': return <span className="bg-yellow-900/30 text-yellow-400 border border-yellow-500/20 px-2 py-1 rounded text-xs font-bold">In Corso</span>;
      case 'won': return <span className="bg-green-900/30 text-green-400 border border-green-500/20 px-2 py-1 rounded text-xs font-bold">Vinta</span>;
      case 'lost': return <span className="bg-red-900/30 text-red-400 border border-red-500/20 px-2 py-1 rounded text-xs font-bold">Persa</span>;
      case 'expired': return <span className="bg-gray-800 text-gray-400 border border-gray-600 px-2 py-1 rounded text-xs font-bold">Scaduta</span>;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 p-4 md:p-6 text-gray-100">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-gray-800 pb-4">
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <span className="text-purple-500">🎟️</span> Scommesse
          </h1>
          <div className="flex gap-4 items-center">
            <select 
              value={sortBy} 
              onChange={e => setSortBy(e.target.value as any)}
              className="bg-gray-900 border border-gray-700 text-white px-3 py-2 rounded-lg text-sm outline-none focus:border-purple-500 cursor-pointer"
            >
              <option value="status">Ordina per Stato (In corso prima)</option>
              <option value="newest">Ordina per Data (Più recenti prima)</option>
            </select>
            <button 
              onClick={() => navigate(`/league/${leagueId}/dashboard`)}
              className="px-4 py-2 border border-gray-800 text-gray-300 hover:text-white hover:border-purple-500 rounded-lg transition-all cursor-pointer whitespace-nowrap"
            >
              Torna indietro
            </button>
          </div>
        </header>

        <div className="flex bg-gray-900 p-1 rounded-xl mb-6">
          <button 
            onClick={() => setFilterMode('mine')}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${filterMode === 'mine' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}
          >
            Le mie scommesse
          </button>
          <button 
            onClick={() => setFilterMode('others')}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${filterMode === 'others' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}
          >
            Scommesse degli altri
          </button>
        </div>

        <div className="space-y-4">
          {displayedBets.length === 0 ? (
            <p className="text-gray-400 text-center py-8">Nessuna scommessa trovata in questa sezione.</p>
          ) : (
            displayedBets.map(bet => {
              const bettorName = members[bet.bettorId]?.username || 'Sconosciuto';
              const targetName = members[bet.targetUserId]?.username || 'Sconosciuto';
              const challengeTitle = challenges[bet.challengeId]?.title || 'Sfida Eliminata';
              
              return (
                <div key={bet.id} className="bg-gray-900 border border-gray-800 p-4 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-2">
                      {getStatusBadge(bet.computedStatus)}
                      <span className="text-gray-500 text-xs">Piazzata: {new Date(bet.createdAt).toLocaleString()}</span>
                      {bet.computedStatus === 'pending' && (
                        <span className="text-yellow-500/80 text-xs">Scade: {new Date(bet.computedExpiration).toLocaleString()}</span>
                      )}
                    </div>
                    <p className="text-white font-medium">
                      <span className="text-purple-400">{bettorName}</span> ha scommesso su <span className="text-blue-400">{targetName}</span> <span className="text-gray-500 font-normal">(x{bet.multiplier || 1})</span>
                    </p>
                    <p className="text-gray-400 text-sm mt-1">Sfida: "{challengeTitle}"</p>
                  </div>
                  <div className="text-right bg-gray-950 p-3 rounded-lg border border-gray-800 min-w-[120px]">
                    <p className="text-xs text-gray-500 uppercase font-semibold">Importo</p>
                    <p className="text-lg font-bold text-white">{bet.amount} <span className="text-sm text-gray-400">TM (x{bet.odds.toFixed(2)})</span></p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
