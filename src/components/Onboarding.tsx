import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { checkUsernameAvailability, createUserProfile } from '../services/db';

export default function Onboarding() {
  const { firebaseUser, refreshDbUser } = useAuth();
  const navigate = useNavigate();
  
  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  
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
        firstName,
        lastName,
        dateOfBirth
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
        <h1 className="text-3xl font-bold text-center text-purple-500 mb-2">Completiamo il Profilo!</h1>
        <p className="text-gray-400 text-center mb-8">Scegli il tuo username e inserisci i tuoi dati anagrafici.</p>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Username (Univoco)</label>
            <input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              className="w-full bg-gray-950 border border-gray-800 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent transition-all"
              placeholder="es. fanta_master_99"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Nome</label>
              <input 
                type="text" 
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent transition-all"
                placeholder="Mario"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Cognome</label>
              <input 
                type="text" 
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent transition-all"
                placeholder="Rossi"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Data di Nascita</label>
            <input 
              type="date" 
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              className="w-full bg-gray-950 border border-gray-800 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent transition-all"
              required
            />
          </div>

          {error && <p className="text-red-400 text-sm font-medium bg-red-900/20 p-3 rounded-lg border border-red-500/20">{error}</p>}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 px-4 rounded-lg transition-colors shadow-lg shadow-purple-900/20 disabled:opacity-50 mt-4"
          >
            {loading ? 'Salvataggio...' : 'Conferma e Inizia!'}
          </button>
        </form>
      </div>
    </div>
  );
}
