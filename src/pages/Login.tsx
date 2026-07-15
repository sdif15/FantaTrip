import React from 'react';
import { useNavigate } from 'react-router-dom';
import { loginWithGoogle, loginWithApple } from '../services/auth';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { firebaseUser, dbUser } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (firebaseUser) {
      if (dbUser) {
        navigate('/hub');
      } else {
        navigate('/onboarding');
      }
    }
  }, [firebaseUser, dbUser, navigate]);

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col justify-center items-center p-4">
      <div className="text-center mb-12">
        <h1 className="text-5xl font-extrabold text-white tracking-tight mb-4">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-purple-600">Fanta</span>Trip
        </h1>
        <p className="text-gray-400 text-lg">Sfida i tuoi amici, scommetti e domina la classifica.</p>
      </div>

      <div className="bg-gray-900 border border-gray-800 p-8 rounded-3xl w-full max-w-sm shadow-2xl shadow-purple-900/10">
        <h2 className="text-2xl font-bold text-white text-center mb-8">Accedi</h2>
        
        <div className="space-y-4">
          <button 
            onClick={() => loginWithGoogle()}
            className="w-full flex items-center justify-center gap-3 bg-white text-gray-900 hover:bg-gray-100 font-semibold py-3 px-4 rounded-xl transition-all"
          >
            Accedi con Google
          </button>
          
          <button 
            onClick={() => loginWithApple()}
            className="w-full flex items-center justify-center gap-3 bg-black text-white hover:bg-gray-900 font-semibold py-3 px-4 rounded-xl border border-gray-800 transition-all"
          >
            Accedi con Apple
          </button>
        </div>
      </div>
    </div>
  );
}
