import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { logout } from '../services/auth';
import { getUserLeagues, createLeague, createLeagueMember, getLeagueByNameAndPassword } from '../services/db';
import { LeagueMember } from '../types';

export default function LeagueHub() {
  const { firebaseUser, dbUser } = useAuth();
  const navigate = useNavigate();
  
  const [leagues, setLeagues] = useState<LeagueMember[]>([]);
  const [loading, setLoading] = useState(true);

  // Forms state
  const [createName, setCreateName] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [joinName, setJoinName] = useState('');
  const [joinPassword, setJoinPassword] = useState('');
  const [error, setError] = useState('');

  const fetchLeagues = async () => {
    if (!firebaseUser) return;
    try {
      const userLeagues = await getUserLeagues(firebaseUser.uid);
      setLeagues(userLeagues);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeagues();
  }, [firebaseUser]);

  const handleCreateLeague = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || !dbUser) return;
    setError('');
    try {
      const leagueId = await createLeague({
        name: createName,
        password: createPassword,
        adminId: firebaseUser.uid
      });

      await createLeagueMember({
        leagueId,
        userId: firebaseUser.uid,
        username: dbUser.username,
        points: 0,
        tripMoney: 500,
        role: 'admin'
      });

      setCreateName('');
      setCreatePassword('');
      fetchLeagues();
    } catch (err) {
      setError('Errore durante la creazione della lega.');
    }
  };

  const handleJoinLeague = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || !dbUser) return;
    setError('');
    try {
      const league = await getLeagueByNameAndPassword(joinName, joinPassword);
      if (!league) {
        setError('Lega non trovata o password errata.');
        return;
      }

      // Check if already in league
      const existing = leagues.find(l => l.leagueId === league.id);
      if (existing) {
        setError('Fai già parte di questa lega!');
        return;
      }

      await createLeagueMember({
        leagueId: league.id,
        userId: firebaseUser.uid,
        username: dbUser.username,
        points: 0,
        tripMoney: 500,
        role: 'player'
      });

      setJoinName('');
      setJoinPassword('');
      fetchLeagues();
    } catch (err) {
      setError('Errore durante l\'accesso alla lega.');
    }
  };

  if (loading) return <div className="min-h-screen bg-gray-950 flex items-center justify-center text-purple-500">Caricamento...</div>;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-12 border-b border-gray-800 pb-6">
          <div>
            <h1 className="text-3xl font-bold text-white"><span className="text-purple-500">Fanta</span>Trip</h1>
            <p className="text-gray-400 mt-1">Bentornato, <span className="text-purple-400 font-semibold">{dbUser?.username}</span>!</p>
          </div>
          <button onClick={logout} className="px-4 py-2 bg-gray-900 border border-gray-800 hover:border-purple-500 hover:text-purple-400 rounded-lg transition-all text-sm text-gray-300">
            Esci
          </button>
        </header>

        {error && (
          <div className="bg-red-900/50 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg mb-8">
            {error}
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-8">
          {/* Colonna Leghe dell'utente */}
          <div className="md:col-span-2 space-y-6">
            <h2 className="text-2xl font-semibold text-white flex items-center gap-2">
              <span className="w-2 h-8 bg-purple-600 rounded-full inline-block"></span>
              Le tue Leghe
            </h2>
            
            {leagues.length === 0 ? (
              <div className="bg-gray-900 border border-gray-800 p-8 rounded-2xl text-center">
                <p className="text-gray-400">Non sei ancora iscritto a nessuna lega.</p>
                <p className="text-gray-500 text-sm mt-2">Creane una o unisciti a una esistente!</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {leagues.map(member => (
                  <div key={member.id} className="bg-gray-900 border border-purple-500/20 hover:border-purple-500/60 p-6 rounded-2xl transition-all group cursor-pointer" onClick={() => navigate(`/league/${member.leagueId}/dashboard`)}>
                    <h3 className="text-xl font-bold text-white mb-4 group-hover:text-purple-400 transition-colors">ID Lega: {member.leagueId}</h3>
                    <div className="flex justify-between text-sm">
                      <div className="text-gray-400">
                        <span className="block text-xs text-gray-500">Ruolo</span>
                        <span className="text-purple-300 font-medium capitalize">{member.role}</span>
                      </div>
                      <div className="text-gray-400 text-right">
                        <span className="block text-xs text-gray-500">Bilancio</span>
                        <span className="text-white font-medium">{member.points} PT • {member.tripMoney} TM</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Colonna Form */}
          <div className="space-y-8">
            {/* Form Crea Lega */}
            <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-600/10 rounded-bl-full -z-0"></div>
              <h3 className="text-xl font-semibold mb-4 text-white relative z-10">Crea una Lega</h3>
              <form onSubmit={handleCreateLeague} className="space-y-4 relative z-10">
                <input 
                  type="text" placeholder="Nome Lega" value={createName} onChange={e => setCreateName(e.target.value)} required
                  className="w-full bg-gray-950 border border-gray-800 text-white px-4 py-2 rounded-lg focus:ring-1 focus:ring-purple-600 outline-none transition-all"
                />
                <input 
                  type="password" placeholder="Password (opzionale)" value={createPassword} onChange={e => setCreatePassword(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 text-white px-4 py-2 rounded-lg focus:ring-1 focus:ring-purple-600 outline-none transition-all"
                />
                <button type="submit" className="w-full bg-purple-600 hover:bg-purple-500 text-white py-2 rounded-lg font-medium transition-colors">
                  Crea e diventa Admin
                </button>
              </form>
            </div>

            {/* Form Unisciti Lega */}
            <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-32 h-32 bg-purple-600/10 rounded-br-full -z-0"></div>
              <h3 className="text-xl font-semibold mb-4 text-white relative z-10">Unisciti a una Lega</h3>
              <form onSubmit={handleJoinLeague} className="space-y-4 relative z-10">
                <input 
                  type="text" placeholder="Nome Lega" value={joinName} onChange={e => setJoinName(e.target.value)} required
                  className="w-full bg-gray-950 border border-gray-800 text-white px-4 py-2 rounded-lg focus:ring-1 focus:ring-purple-600 outline-none transition-all"
                />
                <input 
                  type="password" placeholder="Password (se richiesta)" value={joinPassword} onChange={e => setJoinPassword(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 text-white px-4 py-2 rounded-lg focus:ring-1 focus:ring-purple-600 outline-none transition-all"
                />
                <button type="submit" className="w-full border border-purple-600 text-purple-400 hover:bg-purple-600/10 py-2 rounded-lg font-medium transition-colors">
                  Entra nella Lega
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
