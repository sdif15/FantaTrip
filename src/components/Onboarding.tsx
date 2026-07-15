import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { checkUsernameAvailability, createUserProfile } from '../services/db';

export default function Onboarding() {
  const { firebaseUser, refreshDbUser } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!firebaseUser) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (username.length < 3) {
      setError('L\'username deve avere almeno 3 caratteri.');
      return;
    }

    setLoading(true);
    try {
      const isAvailable = await checkUsernameAvailability(username);
      if (!isAvailable) {
        setError('Username già in uso. Scegline un altro.');
        setLoading(false);
        return;
      }

      await createUserProfile(firebaseUser.uid, {
        username,
        email: firebaseUser.email || '',
      });

      await refreshDbUser();
      navigate('/hub');
    } catch (err) {
      setError('Errore durante la creazione del profilo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4 text-gray-100">
      <div className="max-w-md w-full bg-gray-900 border border-purple-500/30 p-8 rounded-2xl shadow-2xl shadow-purple-900/20">
        <h1 className="text-3xl font-bold text-center text-purple-500 mb-2">Benvenuto su FantaTrip!</h1>
        <p className="text-gray-400 text-center mb-8">Scegli il tuo username univoco per iniziare.</p>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Username</label>
            <input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              className="w-full bg-gray-950 border border-gray-800 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent transition-all"
              placeholder="es. fanta_master_99"
              required
            />
            {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? 'Salvataggio...' : 'Conferma Username'}
          </button>
        </form>
      </div>
    </div>
  );
}
