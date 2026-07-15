import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import type { LeagueMember } from '../types';

interface Props {
  leagueId: string;
}

export default function Leaderboard({ leagueId }: Props) {
  const [members, setMembers] = useState<LeagueMember[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'league_members'), where('leagueId', '==', leagueId));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedMembers = snapshot.docs.map(doc => doc.data() as LeagueMember);
      // Ordiniamo lato client per evitare di dover creare manualmente un Composite Index su Firestore all'inizio
      fetchedMembers.sort((a, b) => b.points - a.points);
      setMembers(fetchedMembers);
    });

    return () => unsubscribe();
  }, [leagueId]);

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow-xl shadow-purple-900/5">
      <div className="bg-gray-900 border-b border-gray-800 p-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <span className="text-purple-500">📊</span> Classifica
        </h2>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-950/50 text-gray-400 text-sm border-b border-gray-800">
              <th className="py-3 px-4 font-semibold w-16 text-center">Pos</th>
              <th className="py-3 px-4 font-semibold">Giocatore</th>
              <th className="py-3 px-4 font-semibold text-right">🏆 PT</th>
              <th className="py-3 px-4 font-semibold text-right">💸 TM</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {members.map((m, index) => (
              <tr key={m.id} className="hover:bg-gray-800/40 transition-colors">
                <td className="py-4 px-4 text-center font-bold text-gray-500">
                  {index === 0 ? <span className="text-yellow-500 text-lg">1</span> :
                   index === 1 ? <span className="text-gray-300 text-lg">2</span> :
                   index === 2 ? <span className="text-amber-600 text-lg">3</span> : 
                   index + 1}
                </td>
                <td className="py-4 px-4 font-medium text-white">
                  {m.username}
                  {m.role === 'admin' && <span className="ml-2 text-[10px] bg-purple-900/50 text-purple-300 px-2 py-0.5 rounded-full uppercase tracking-wider">Admin</span>}
                </td>
                <td className="py-4 px-4 text-right font-bold text-purple-400">{m.points}</td>
                <td className="py-4 px-4 text-right font-medium text-green-400">{m.tripMoney}</td>
              </tr>
            ))}
            {members.length === 0 && (
              <tr>
                <td colSpan={4} className="py-8 text-center text-gray-500">Nessun membro in questa lega.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
