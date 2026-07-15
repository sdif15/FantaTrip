import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import { Challenge, LeagueMember } from '../types';
import { createChallenge, resolveEvent } from '../services/db';

export default function LeagueAdminPanel() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const { firebaseUser } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [members, setMembers] = useState<LeagueMember[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);

  // Form Crea Sfida
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [points, setPoints] = useState<number | ''>('');
  
  // Form Valida Evento
  const [targetUserId, setTargetUserId] = useState('');
  const [challengeId, setChallengeId] = useState('');

  // Feedbacks
  const [createMsg, setCreateMsg] = useState('');
  const [resolveMsg, setResolveMsg] = useState('');

  useEffect(() => {
    const initPanel = async () => {
      if (!firebaseUser || !leagueId) return;
      try {
        const memberId = `${leagueId}_${firebaseUser.uid}`;
        const memberRef = doc(db, 'league_members', memberId);
        const snap = await getDoc(memberRef);
        
        if (!snap.exists() || snap.data().role !== 'admin') {
          navigate(`/league/${leagueId}/dashboard`);
          return;
        }
        setIsAdmin(true);

        const memQ = query(collection(db, 'league_members'), where('leagueId', '==', leagueId));
        const memSnap = await getDocs(memQ);
        setMembers(memSnap.docs.map(d => d.data() as LeagueMember));

        const chalQ = query(collection(db, 'challenges'), where('leagueId', '==', leagueId));
        const chalSnap = await getDocs(chalQ);
        setChallenges(chalSnap.docs.map(d => d.data() as Challenge));
        
      } catch (err) {
        navigate('/hub');
      } finally {
        setLoading(false);
      }
    };
    initPanel();
  }, [firebaseUser, leagueId, navigate]);

  const handleCreateChallenge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leagueId || !points) return;
    try {
      setCreateMsg('Creazione in corso...');
      const newChalId = await createChallenge({
        leagueId,
        title,
        description,
        points: Number(points)
      });
      setChallenges(prev => [...prev, {
        id: newChalId,
        leagueId,
        title,
        description,
        points: Number(points)
      }]);
      setTitle('');
      setDescription('');
      setPoints('');
      setCreateMsg('Sfida creata con successo!');
      setTimeout(() => setCreateMsg(''), 3000);
    } catch (err) {
      setCreateMsg('Errore nella creazione della sfida.');
    }
  };

  const handleResolveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leagueId || !targetUserId || !challengeId) return;
    try {
      setResolveMsg('Validazione in corso...');
      await resolveEvent(leagueId, targetUserId, challengeId);
      setResolveMsg('Evento validato! Premi e scommesse distribuiti.');
      setTargetUserId('');
      setChallengeId('');
      setTimeout(() => setResolveMsg(''), 3000);
    } catch (err) {
      console.error(err);
      setResolveMsg('Errore durante la validazione dell\'evento.');
    }
  };

  if (loading) return <div className="min-h-screen bg-gray-950 text-purple-500 flex justify-center items-center font-bold text-xl">Verifica permessi Admin...</div>;
  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-4 md:p-6">
      <div className="max-w-5xl mx-auto space-y-8">
        
        <header className="flex items-center justify-between border-b border-gray-800 pb-4">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-2">
              <span className="text-purple-500">🛠</span> Pannello Admin
            </h1>
            <p className="text-gray-400 text-sm mt-1">Gestione Sfide e Validazione - Lega: {leagueId}</p>
          </div>
          <button 
            onClick={() => navigate(`/league/${leagueId}/dashboard`)}
            className="px-4 py-2 border border-gray-800 text-gray-300 hover:text-white hover:border-purple-500 rounded-lg transition-all"
          >
            Torna alla Dashboard
          </button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          <div className="bg-gray-900 border border-purple-500/20 p-6 sm:p-8 rounded-2xl shadow-xl shadow-purple-900/10 h-max">
            <h2 className="text-2xl font-semibold text-white mb-6">Nuova Sfida</h2>
            
            <form onSubmit={handleCreateChallenge} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Titolo Sfida</label>
                <input 
                  type="text" required value={title} onChange={e => setTitle(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500"
                  placeholder="Es. Beve uno shot bendato"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Descrizione</label>
                <textarea 
                  required value={description} onChange={e => setDescription(e.target.value)} rows={3}
                  className="w-full bg-gray-950 border border-gray-800 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 resize-none"
                  placeholder="Dettagli aggiuntivi sull'azione..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Punti</label>
                <input 
                  type="number" min="1" required value={points} onChange={e => setPoints(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500"
                  placeholder="Es. 100"
                />
              </div>

              <button type="submit" className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-purple-900/20">
                Aggiungi Sfida
              </button>

              {createMsg && <div className="text-sm font-medium text-purple-400 mt-2 text-center">{createMsg}</div>}
            </form>
          </div>

          <div className="bg-gray-900 border border-gray-800 p-6 sm:p-8 rounded-2xl shadow-xl shadow-purple-900/5 h-max">
            <h2 className="text-2xl font-semibold text-white mb-6">Valida Evento</h2>
            <p className="text-gray-400 text-sm mb-6">
              Seleziona chi ha compiuto l'azione. Riceverà i punti della sfida e tutte le scommesse a suo favore verranno pagate.
            </p>
            
            <form onSubmit={handleResolveEvent} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Giocatore</label>
                <select 
                  required value={targetUserId} onChange={e => setTargetUserId(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 appearance-none"
                >
                  <option value="" disabled>Chi ha fatto l'azione?</option>
                  {members.map(m => <option key={m.id} value={m.userId}>{m.username}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Sfida Completata</label>
                <select 
                  required value={challengeId} onChange={e => setChallengeId(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 appearance-none"
                >
                  <option value="" disabled>Quale sfida?</option>
                  {challenges.map(c => <option key={c.id} value={c.id}>{c.title} ({c.points} PT)</option>)}
                </select>
              </div>

              <button type="submit" className="w-full border border-purple-600 text-purple-400 hover:bg-purple-600/10 hover:text-purple-300 font-bold py-3 rounded-xl transition-all">
                Conferma e Distribuisci Premi
              </button>

              {resolveMsg && <div className="text-sm font-medium text-green-400 mt-2 text-center">{resolveMsg}</div>}
            </form>
          </div>

        </div>
      </div>
    </div>
  );
}
