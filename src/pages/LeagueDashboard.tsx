import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import ChallengeList from '../components/ChallengeList';
import Logo from '../components/Logo';

export default function LeagueDashboard() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const { firebaseUser, dbUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isMember, setIsMember] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [leagueName, setLeagueName] = useState('');

  useEffect(() => {
    const checkMembership = async () => {
      if (!firebaseUser || !leagueId) return;
      try {
        const memberId = `${leagueId}_${firebaseUser.uid}`;
        const memberRef = doc(db, 'league_members', memberId);
        const snap = await getDoc(memberRef);
        
        if (snap.exists()) {
          setIsMember(true);
          setIsAdmin(snap.data().role === 'admin');

          const leagueRef = doc(db, 'leagues', leagueId);
          const leagueSnap = await getDoc(leagueRef);
          if (leagueSnap.exists()) {
            setLeagueName(leagueSnap.data().name);
          }
        } else {
          navigate('/hub');
        }
      } catch (err) {
        console.error("Errore verifica membership:", err);
        navigate('/hub');
      } finally {
        setLoading(false);
      }
    };

    checkMembership();
  }, [firebaseUser, leagueId, navigate]);

  if (loading) {
    return <div className="min-h-screen bg-gray-950 flex items-center justify-center text-purple-500 font-bold text-xl">Caricamento Lega...</div>;
  }

  if (!isMember || !leagueId) return null;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        
        <header className="flex flex-col md:flex-row items-center justify-between border-b border-gray-800 pb-4 gap-4">
          <div className="flex flex-col items-center md:items-start text-center md:text-left">
            <h1 className="text-3xl md:text-4xl font-bold text-white flex items-center justify-center md:justify-start gap-2">
              <Logo className="w-10 h-10 text-purple-500" /> {leagueName || 'Lega Sconosciuta'}
            </h1>
            <p className="text-gray-400 mt-1 text-sm font-medium">Giocatore: <span className="text-white bg-gray-800 px-2 py-0.5 rounded-full border border-gray-700">{dbUser?.username}</span></p>
          </div>
          
          <div className="flex flex-wrap justify-center gap-3 w-full md:w-auto">
            <button 
              onClick={() => navigate(`/league/${leagueId}/leaderboard`)}
              className="px-4 py-2 bg-gray-900 border border-gray-700 text-white hover:border-purple-500 rounded-lg transition-all font-medium cursor-pointer flex-1 md:flex-none text-center"
            >
              🏆 Classifica
            </button>
            <button 
              onClick={() => navigate(`/league/${leagueId}/bets`)}
              className="px-4 py-2 bg-gray-900 border border-gray-700 text-white hover:border-purple-500 rounded-lg transition-all font-medium cursor-pointer flex-1 md:flex-none text-center"
            >
              🎟️ Scommesse
            </button>
            <button 
              onClick={() => navigate(`/league/${leagueId}/history`)}
              className="px-4 py-2 bg-gray-900 border border-gray-700 text-white hover:border-purple-500 rounded-lg transition-all font-medium cursor-pointer flex-1 md:flex-none text-center"
            >
              📚 Storico
            </button>
            <button 
              onClick={() => navigate(`/league/${leagueId}/rules`)}
              className="px-4 py-2 bg-gray-900 border border-gray-700 text-white hover:border-purple-500 rounded-lg transition-all font-medium cursor-pointer flex-1 md:flex-none text-center"
            >
              📜 Regole
            </button>
            {isAdmin && (
              <button 
                onClick={() => navigate(`/league/${leagueId}/admin`)}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-all font-medium cursor-pointer flex-1 md:flex-none text-center"
              >
                🛠 Admin
              </button>
            )}
            <button 
              onClick={() => navigate('/hub')}
              className="px-4 py-2 bg-gray-950 border border-gray-800 text-gray-400 hover:text-white hover:border-purple-500 rounded-lg transition-all cursor-pointer flex-1 md:flex-none text-center"
            >
              Esci
            </button>
          </div>
        </header>

        <main>
          <ChallengeList leagueId={leagueId} />
        </main>
      </div>
    </div>
  );
}
