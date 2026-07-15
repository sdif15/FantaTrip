import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import type { Challenge } from '../types';
import { calculateOdds } from '../services/oddsCalculator';
import BettingModal from './BettingModal';

interface Props {
  leagueId: string;
}

export default function ChallengeList({ leagueId }: Props) {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);
  const [sortBy, setSortBy] = useState<'pointsAsc' | 'pointsDesc' | 'alphaAsc' | 'alphaDesc'>('pointsDesc');

  useEffect(() => {
    const q = query(collection(db, 'challenges'), where('leagueId', '==', leagueId));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched = snapshot.docs.map(doc => doc.data() as Challenge);
      setChallenges(fetched);
    });

    return () => unsubscribe();
  }, [leagueId]);

  const sortedChallenges = [...challenges].sort((a, b) => {
    switch (sortBy) {
      case 'pointsDesc': return b.points - a.points;
      case 'pointsAsc': return a.points - b.points;
      case 'alphaAsc': return a.title.localeCompare(b.title);
      case 'alphaDesc': return b.title.localeCompare(a.title);
      default: return 0;
    }
  });

  return (
    <div className="bg-gray-900 border border-gray-800 p-6 sm:p-8 rounded-2xl shadow-xl shadow-purple-900/10">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <span className="text-purple-500">🎯</span> Sfide Attive
        </h2>
        <select 
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="bg-gray-950 border border-gray-800 text-gray-300 text-sm rounded-lg focus:ring-purple-500 focus:border-purple-500 block p-2 outline-none cursor-pointer"
        >
          <option value="pointsDesc">Punti: Dal più alto</option>
          <option value="pointsAsc">Punti: Dal più basso</option>
          <option value="alphaAsc">Alfabetico (A-Z)</option>
          <option value="alphaDesc">Alfabetico (Z-A)</option>
        </select>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {sortedChallenges.length === 0 ? (
          <div className="md:col-span-2 bg-gray-950 border border-gray-800 p-8 rounded-2xl text-center text-gray-400">
            Nessuna sfida attiva in questa lega.
          </div>
        ) : (
          sortedChallenges.map(challenge => {
            const odds = calculateOdds(challenge.points);
            
            return (
              <div key={challenge.id} className="bg-gray-950 border border-gray-800 hover:border-purple-500/50 p-5 rounded-2xl transition-all flex flex-col h-full group shadow-lg shadow-purple-900/5">
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-lg font-bold text-white group-hover:text-purple-400 transition-colors">
                      {challenge.title}
                    </h3>
                    <span className="bg-purple-900/30 border border-purple-500/20 text-purple-300 font-bold px-2.5 py-1 rounded-lg text-sm whitespace-nowrap">
                      {challenge.points} PT
                    </span>
                  </div>
                  <p className="text-gray-400 text-sm leading-relaxed mb-6">
                    {challenge.description}
                  </p>
                </div>
                
                <div className="mt-auto pt-4 border-t border-gray-800/50 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-xs text-gray-500 uppercase font-semibold">Quota</span>
                    <span className="text-xl font-black text-green-400">x{odds.toFixed(2)}</span>
                  </div>
                  <button 
                    onClick={() => setSelectedChallenge(challenge)}
                    className="bg-purple-600 hover:bg-purple-500 text-white font-medium py-2 px-6 rounded-xl transition-all shadow-lg shadow-purple-900/20 active:scale-95 cursor-pointer"
                  >
                    Scommetti
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {selectedChallenge && (
        <BettingModal 
          leagueId={leagueId} 
          challenge={selectedChallenge} 
          onClose={() => setSelectedChallenge(null)} 
        />
      )}
    </div>
  );
}
