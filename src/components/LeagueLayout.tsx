import { Outlet, useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import { useAuth } from '../context/AuthContext';
import type { LeagueMember } from '../types';

export default function LeagueLayout() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const { firebaseUser } = useAuth();
  const navigate = useNavigate();

  const [members, setMembers] = useState<LeagueMember[]>([]);
  const [myMember, setMyMember] = useState<LeagueMember | null>(null);

  useEffect(() => {
    if (!leagueId || !firebaseUser) return;

    const q = query(collection(db, 'league_members'), where('leagueId', '==', leagueId));
    const unsub = onSnapshot(q, (snap) => {
      const allMems = snap.docs.map(d => d.data() as LeagueMember);
      setMembers(allMems);

      const me = allMems.find(m => m.userId === firebaseUser.uid);
      if (me) {
        setMyMember(me);
      } else {
        // Se non trovo l'utente in questa lega, lo rimando all'hub
        navigate('/hub');
      }
    });

    return () => unsub();
  }, [leagueId, firebaseUser, navigate]);

  // Calcolo la posizione in classifica
  const sortedMembers = [...members].sort((a, b) => b.points - a.points);
  const myRank = sortedMembers.findIndex(m => m.userId === firebaseUser?.uid) + 1;

  const getRankBadge = (rank: number) => {
    switch(rank) {
      case 1: return <span className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/50 px-2 py-0.5 rounded text-xs font-bold shadow-[0_0_10px_rgba(234,179,8,0.3)]">1°</span>;
      case 2: return <span className="bg-gray-300/20 text-gray-300 border border-gray-400/50 px-2 py-0.5 rounded text-xs font-bold">2°</span>;
      case 3: return <span className="bg-amber-700/20 text-amber-500 border border-amber-600/50 px-2 py-0.5 rounded text-xs font-bold">3°</span>;
      default: return <span className="bg-gray-800 text-gray-400 px-2 py-0.5 rounded text-xs font-bold">{rank}°</span>;
    }
  };

  return (
    <div className="relative min-h-screen bg-gray-950 pb-20">
      {/* Contenuto specifico della pagina */}
      <Outlet />

      {/* Barra di stato fissa in basso */}
      {myMember && (
        <div className="fixed bottom-0 left-0 right-0 bg-gray-950/90 backdrop-blur-md border-t border-gray-800 z-50 px-4 py-3 pb-safe shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            
            <div className="flex items-center gap-3">
              {getRankBadge(myRank)}
              <span className="text-white font-medium truncate max-w-[100px] sm:max-w-[200px]">
                {myMember.username}
              </span>
            </div>

            <div className="flex items-center gap-4 sm:gap-6">
              <div className="text-right">
                <span className="block text-[10px] text-gray-500 uppercase font-bold">Punti</span>
                <span className="text-purple-400 font-bold text-sm sm:text-base flex items-center gap-1">
                  {myMember.points} <span className="text-xs">🏆</span>
                </span>
              </div>
              
              <div className="w-px h-8 bg-gray-800"></div>

              <div className="text-right">
                <span className="block text-[10px] text-gray-500 uppercase font-bold">TripMoney</span>
                <span className="text-green-400 font-bold text-sm sm:text-base flex items-center gap-1">
                  {myMember.tripMoney} <span className="text-xs">💸</span>
                </span>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
