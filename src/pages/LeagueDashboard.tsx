import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import Leaderboard from '../components/Leaderboard';
import ChallengeList from '../components/ChallengeList';

export default function LeagueDashboard() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const { firebaseUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isMember, setIsMember] = useState(false);

  useEffect(() => {
    const checkMembership = async () => {
      if (!firebaseUser || !leagueId) return;
      try {
        const memberId = `${leagueId}_${firebaseUser.uid}`;
        const memberRef = doc(db, 'league_members', memberId);
        const snap = await getDoc(memberRef);
        
        if (snap.exists()) {
          setIsMember(true);
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
        
        <header className="flex items-center justify-between border-b border-gray-800 pb-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white">
              Dashboard <span className="text-purple-500">Lega</span>
            </h1>
            <p className="text-gray-400 mt-1 text-sm">ID Lega: {leagueId}</p>
          </div>
          <button 
            onClick={() => navigate('/hub')}
            className="px-4 py-2 bg-gray-900 border border-gray-800 text-gray-300 hover:text-white hover:border-purple-500 rounded-lg transition-all"
          >
            Torna all'Hub
          </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <Leaderboard leagueId={leagueId} />
          </div>
          <div className="lg:col-span-2">
            <ChallengeList leagueId={leagueId} />
          </div>
        </div>
      </div>
    </div>
  );
}
