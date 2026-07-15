import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import type { LeagueMember, Challenge } from '../types';

interface CompletedEvent {
  id: string;
  leagueId: string;
  userId: string;
  challengeId: string;
  points: number;
  count?: number;
  timestamp: number;
}

export default function ChallengesHistoryPage() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const navigate = useNavigate();
  
  const [events, setEvents] = useState<CompletedEvent[]>([]);
  const [members, setMembers] = useState<Record<string, LeagueMember>>({});
  const [challenges, setChallenges] = useState<Record<string, Challenge>>({});

  useEffect(() => {
    if (!leagueId) return;

    const memUnsub = onSnapshot(query(collection(db, 'league_members'), where('leagueId', '==', leagueId)), (snap) => {
      const mems: Record<string, LeagueMember> = {};
      snap.docs.forEach(d => mems[d.data().userId] = d.data() as LeagueMember);
      setMembers(mems);
    });

    const chalUnsub = onSnapshot(query(collection(db, 'challenges'), where('leagueId', '==', leagueId)), (snap) => {
      const chals: Record<string, Challenge> = {};
      snap.docs.forEach(d => chals[d.data().id] = d.data() as Challenge);
      setChallenges(chals);
    });

    const evUnsub = onSnapshot(query(collection(db, 'completed_challenges'), where('leagueId', '==', leagueId)), (snap) => {
      setEvents(snap.docs.map(d => d.data() as CompletedEvent));
    });

    return () => { memUnsub(); chalUnsub(); evUnsub(); };
  }, [leagueId]);

  // Raggruppa per utente e per sfida
  // { userId: { challengeId: { count: 3, totalPoints: 60 } } }
  const groupedStats: Record<string, Record<string, { count: number, totalPoints: number }>> = {};

  events.forEach(ev => {
    if (!groupedStats[ev.userId]) {
      groupedStats[ev.userId] = {};
    }
    if (!groupedStats[ev.userId][ev.challengeId]) {
      groupedStats[ev.userId][ev.challengeId] = { count: 0, totalPoints: 0 };
    }
    groupedStats[ev.userId][ev.challengeId].count += (ev.count || 1);
    groupedStats[ev.userId][ev.challengeId].totalPoints += ev.points;
  });

  return (
    <div className="min-h-screen bg-gray-950 p-4 md:p-6 text-gray-100">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="flex items-center justify-between border-b border-gray-800 pb-4">
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <span className="text-purple-500">📚</span> Registro Sfide
          </h1>
          <button 
            onClick={() => navigate(`/league/${leagueId}/dashboard`)}
            className="px-4 py-2 border border-gray-800 text-gray-300 hover:text-white hover:border-purple-500 rounded-lg transition-all cursor-pointer"
          >
            Torna indietro
          </button>
        </header>

        <div className="space-y-8">
          {Object.keys(groupedStats).length === 0 ? (
            <p className="text-gray-400 text-center py-8">Nessuna sfida completata registrata finora.</p>
          ) : (
            Object.entries(groupedStats).map(([userId, userChallenges]) => {
              const userName = members[userId]?.username || 'Sconosciuto';
              
              return (
                <div key={userId} className="bg-gray-900 border border-purple-500/20 p-6 rounded-2xl shadow-lg">
                  <h2 className="text-xl font-bold text-purple-400 mb-4 pb-2 border-b border-gray-800 flex items-center gap-2">
                    <span>👤</span> {userName}
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {Object.entries(userChallenges).map(([challengeId, stats]) => {
                      const challengeTitle = challenges[challengeId]?.title || 'Sfida Eliminata';
                      return (
                        <div key={challengeId} className="bg-gray-950 border border-gray-800 p-4 rounded-xl flex justify-between items-center">
                          <div>
                            <p className="text-white font-medium">{challengeTitle}</p>
                            <p className="text-sm font-bold text-gray-500 mt-1">Fatto <span className="text-blue-400">x{stats.count}</span> volte</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-purple-500 uppercase font-bold">Punti Totali</p>
                            <p className="text-xl font-black text-white">+{stats.totalPoints}</p>
                          </div>
                        </div>
                      );
                    })}
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
