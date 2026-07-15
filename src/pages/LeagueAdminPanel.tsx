import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import type { Challenge, LeagueMember } from '../types';
import { createChallenge, resolveEvent, deleteLeague, updateMemberRole, assignCustomPoints, distributeDailyAllowance, revokeEvent } from '../services/db';

export default function LeagueAdminPanel() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const { firebaseUser } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [members, setMembers] = useState<LeagueMember[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [recentEvents, setRecentEvents] = useState<any[]>([]);

  // Form Crea Sfida
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [points, setPoints] = useState<number | ''>('');
  
  // Form Valida Evento
  const [targetUserId, setTargetUserId] = useState('');
  const [challengeId, setChallengeId] = useState('');
  const [multiplier, setMultiplier] = useState(1);

  // Feedbacks
  const [createMsg, setCreateMsg] = useState('');
  const [resolveMsg, setResolveMsg] = useState('');
  const [roleMsg, setRoleMsg] = useState('');
  const [allowanceMsg, setAllowanceMsg] = useState('');
  const [revokeMsg, setRevokeMsg] = useState('');
  
  // Form Custom Points
  const [customUserId, setCustomUserId] = useState('');
  const [customPoints, setCustomPoints] = useState<number | ''>('');
  const [customMsg, setCustomMsg] = useState('');

  useEffect(() => {
    const initPanel = async () => {
      if (!firebaseUser || !leagueId) return;
      try {
        const memberId = `${leagueId}_${firebaseUser.uid}`;
        const memberRef = doc(db, 'league_members', memberId);
        const snap = await getDoc(memberRef);
        
        if (!snap.exists() || (snap.data().role !== 'admin' && snap.data().role !== 'co-admin')) {
          navigate(`/league/${leagueId}/dashboard`);
          return;
        }
        setIsAdmin(true);
        setIsSuperAdmin(snap.data().role === 'admin');

        const memQ = query(collection(db, 'league_members'), where('leagueId', '==', leagueId));
        const memSnap = await getDocs(memQ);
        setMembers(memSnap.docs.map(d => d.data() as LeagueMember));

        const chalQ = query(collection(db, 'challenges'), where('leagueId', '==', leagueId));
        const chalSnap = await getDocs(chalQ);
        setChallenges(chalSnap.docs.map(d => d.data() as Challenge));
        
        // Fetch recent events for Revoke
        const evQ = query(collection(db, 'completed_challenges'), where('leagueId', '==', leagueId));
        // Nota: senza un index su timestamp potremmo dover ordinare lato client se Firebase si lamenta, ma per piccole moli va bene così.
        const evSnap = await getDocs(evQ);
        const events = evSnap.docs.map(d => d.data());
        events.sort((a, b) => b.timestamp - a.timestamp);
        setRecentEvents(events.slice(0, 5));

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
      await resolveEvent(leagueId, targetUserId, challengeId, multiplier);
      setResolveMsg(`Evento validato (x${multiplier})! Premi distribuiti.`);
      setTargetUserId('');
      setChallengeId('');
      setMultiplier(1);
      setTimeout(() => setResolveMsg(''), 3000);
    } catch (err) {
      console.error(err);
      setResolveMsg('Errore durante la validazione dell\'evento.');
    }
  };

  const handleDailyAllowance = async () => {
    if (!leagueId) return;
    try {
      setAllowanceMsg('Erogazione in corso...');
      await distributeDailyAllowance(leagueId);
      setAllowanceMsg('20 TM distribuiti a tutti!');
      setTimeout(() => setAllowanceMsg(''), 3000);
    } catch (err: any) {
      setAllowanceMsg(err.message || 'Errore erogazione.');
    }
  };

  const handleCustomPoints = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leagueId || !customUserId || customPoints === '') return;
    try {
      setCustomMsg('Assegnazione in corso...');
      await assignCustomPoints(leagueId, customUserId, Number(customPoints));
      setCustomMsg('Punti assegnati con successo!');
      setCustomUserId('');
      setCustomPoints('');
      setTimeout(() => setCustomMsg(''), 3000);
    } catch (err) {
      setCustomMsg('Errore assegnazione punti.');
    }
  };

  const handleRevokeEvent = async (eventId: string) => {
    if (!leagueId) return;
    if (!window.confirm("Sei sicuro di voler annullare questo evento? Verranno sottratti i punti al giocatore.")) return;
    try {
      setRevokeMsg('Annullamento in corso...');
      await revokeEvent(leagueId, eventId);
      setRevokeMsg('Evento annullato e punti rimossi!');
      setRecentEvents(prev => prev.filter(e => e.id !== eventId));
      setTimeout(() => setRevokeMsg(''), 3000);
    } catch (err) {
      console.error(err);
      setRevokeMsg('Errore durante l\'annullamento.');
    }
  };

  const handleRoleChange = async (userId: string, newRole: 'admin' | 'co-admin' | 'player') => {
    if (!leagueId) return;
    try {
      await updateMemberRole(leagueId, userId, newRole);
      setRoleMsg('Ruolo aggiornato con successo!');
      setMembers(members.map(m => m.userId === userId ? { ...m, role: newRole } : m));
      setTimeout(() => setRoleMsg(''), 3000);
    } catch (err) {
      setRoleMsg('Errore aggiornamento ruolo.');
    }
  };

  const handleDeleteLeague = async () => {
    if (!leagueId) return;
    if (window.confirm("Sei sicuro di voler ELIMINARE DEFINITIVAMENTE questa lega? Tutti i dati (sfide, giocatori, scommesse) verranno distrutti irreversibilmente.")) {
      try {
        await deleteLeague(leagueId);
        navigate('/hub');
      } catch (err) {
        console.error("Errore eliminazione lega:", err);
        alert("Impossibile eliminare la lega.");
      }
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
            className="px-4 py-2 border border-gray-800 text-gray-300 hover:text-white hover:border-purple-500 rounded-lg transition-all cursor-pointer"
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
                <label className="block text-sm font-medium text-gray-400 mb-1">Punti (anche negativi)</label>
                <input 
                  type="number" required value={points} onChange={e => setPoints(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full bg-gray-950 border border-gray-800 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500"
                  placeholder="Es. 100 oppure -50"
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
            
            <form onSubmit={handleResolveEvent} className="space-y-5 mb-8">
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

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-400 mb-1">Sfida Completata</label>
                  <select 
                    required value={challengeId} onChange={e => setChallengeId(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-800 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 appearance-none"
                  >
                    <option value="" disabled>Quale sfida?</option>
                    {challenges.map(c => <option key={c.id} value={c.id}>{c.title} ({c.points} PT)</option>)}
                  </select>
                </div>
                <div className="w-24">
                  <label className="block text-sm font-medium text-gray-400 mb-1">Volte (x)</label>
                  <input 
                    type="number" min="1" required value={multiplier} onChange={e => setMultiplier(Number(e.target.value))}
                    className="w-full bg-gray-950 border border-gray-800 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 text-center"
                  />
                </div>
              </div>

              <button type="submit" className="w-full border border-purple-600 text-purple-400 hover:bg-purple-600/10 hover:text-purple-300 font-bold py-3 rounded-xl transition-all">
                Conferma e Distribuisci Premi
              </button>

              {resolveMsg && (
                <div className={`text-sm font-medium mt-2 text-center ${resolveMsg.includes('Errore') ? 'text-red-500' : 'text-green-400'}`}>
                  {resolveMsg}
                </div>
              )}
            </form>

            <div className="border-t border-gray-800 pt-6">
              <h3 className="text-lg font-semibold text-gray-300 mb-3">Ultime Validazioni (Tasto Oops!)</h3>
              {revokeMsg && <div className="text-sm font-medium text-red-400 mb-2">{revokeMsg}</div>}
              {recentEvents.length === 0 ? (
                <p className="text-xs text-gray-500">Nessun evento recente.</p>
              ) : (
                <div className="space-y-2">
                  {recentEvents.map(ev => {
                    const uName = members.find(m => m.userId === ev.userId)?.username || 'User';
                    const cName = challenges.find(c => c.id === ev.challengeId)?.title || 'Sfida';
                    return (
                      <div key={ev.id} className="flex justify-between items-center bg-gray-950 p-3 rounded-lg border border-gray-800 text-sm">
                        <div>
                          <span className="text-purple-400 font-medium">{uName}</span>: {cName} <span className="text-gray-500">(x{ev.count || 1})</span>
                        </div>
                        <button 
                          onClick={() => handleRevokeEvent(ev.id)}
                          className="bg-red-900/30 hover:bg-red-900/60 text-red-400 border border-red-500/30 px-2 py-1 rounded text-xs transition-colors cursor-pointer"
                        >
                          Annulla
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

        </div>

        <div className="bg-gradient-to-r from-green-900/40 to-emerald-900/40 border border-green-500/30 p-6 sm:p-8 rounded-2xl shadow-xl mt-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h2 className="text-2xl font-semibold text-green-400 mb-2 flex items-center gap-2">
                <span>💰</span> Paghetta Giornaliera
              </h2>
              <p className="text-gray-300 text-sm">Distribuisci automaticamente 20 TripMoney a tutti i giocatori della lega. (Cliccabile solo una volta ogni 24h).</p>
            </div>
            <button 
              onClick={handleDailyAllowance}
              className="w-full md:w-auto bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg shadow-green-900/20 whitespace-nowrap cursor-pointer"
            >
              Eroga 20 TM a Tutti
            </button>
          </div>
          {allowanceMsg && <div className="text-sm font-medium text-green-400 mt-4 text-center md:text-right">{allowanceMsg}</div>}
        </div>

        <div className="bg-gray-900 border border-blue-500/20 p-6 sm:p-8 rounded-2xl shadow-xl shadow-blue-900/10 mt-8">
          <h2 className="text-2xl font-semibold text-white mb-2">Assegnazione Rapida Punti / Penalità</h2>
          <p className="text-gray-400 text-sm mb-6">Aggiungi o rimuovi punti liberamente a un giocatore senza dover passare per una sfida.</p>
          
          <form onSubmit={handleCustomPoints} className="space-y-5 max-w-xl">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-400 mb-1">Giocatore</label>
                <select 
                  required value={customUserId} onChange={e => setCustomUserId(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 appearance-none"
                >
                  <option value="" disabled>Seleziona Giocatore</option>
                  {members.map(m => <option key={m.id} value={m.userId}>{m.username}</option>)}
                </select>
              </div>
              <div className="w-full sm:w-32">
                <label className="block text-sm font-medium text-gray-400 mb-1">Punti (es. 10 o -5)</label>
                <input 
                  type="number" required value={customPoints} onChange={e => setCustomPoints(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full bg-gray-950 border border-gray-800 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="+ / -"
                />
              </div>
            </div>
            
            <button type="submit" className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg shadow-blue-900/20">
              Aggiorna Classifica
            </button>
            {customMsg && <span className="ml-4 text-sm font-medium text-blue-400">{customMsg}</span>}
          </form>
        </div>

        {isSuperAdmin && (
          <div className="bg-gray-900 border border-gray-800 p-6 sm:p-8 rounded-2xl shadow-xl mt-8">
            <h2 className="text-2xl font-semibold text-white mb-2">Gestione Ruoli</h2>
            <p className="text-gray-400 text-sm mb-6">Promuovi i giocatori a Co-Admin per farti aiutare nella validazione degli eventi.</p>
            
            {roleMsg && <div className="text-sm font-medium text-green-400 mb-4">{roleMsg}</div>}

            <div className="space-y-3">
              {members.map(m => (
                <div key={m.id} className="flex items-center justify-between bg-gray-950 p-4 rounded-xl border border-gray-800">
                  <div>
                    <span className="text-white font-bold">{m.username}</span>
                    <span className="ml-2 text-xs px-2 py-1 bg-purple-900/30 text-purple-400 rounded-full">{m.role}</span>
                  </div>
                  {m.role !== 'admin' && (
                    <div className="flex gap-2">
                      {m.role === 'player' ? (
                        <button onClick={() => handleRoleChange(m.userId, 'co-admin')} className="text-sm bg-purple-600 hover:bg-purple-500 text-white px-3 py-1 rounded cursor-pointer transition-colors">
                          Promuovi Co-Admin
                        </button>
                      ) : (
                        <button onClick={() => handleRoleChange(m.userId, 'player')} className="text-sm bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded cursor-pointer transition-colors">
                          Retrocedi a Player
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {isSuperAdmin && (
          <div className="pt-8 border-t border-red-900/30 flex flex-col items-center mt-8">
            <h3 className="text-red-500 font-bold mb-2">Zona Pericolosa</h3>
            <p className="text-gray-500 text-sm mb-4 text-center max-w-md">Eliminando questa lega distruggerai tutti i record, i punteggi, le scommesse e le sfide per tutti i giocatori. L'azione è irreversibile.</p>
            <button 
              onClick={handleDeleteLeague}
              className="border border-red-800 text-red-500 hover:bg-red-900/20 hover:text-red-400 font-bold py-2 px-6 rounded-lg transition-colors cursor-pointer"
            >
              Distruggi Lega
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
