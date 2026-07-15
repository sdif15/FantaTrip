import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginWithGoogle, loginWithApple, registerWithEmail, loginWithEmail, resetPassword } from '../services/auth';
import { useAuth } from '../context/AuthContext';
import Logo from '../components/Logo';

export default function Login() {
  const { firebaseUser, dbUser } = useAuth();
  const navigate = useNavigate();

  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  useEffect(() => {
    if (firebaseUser) {
      if (dbUser) {
        navigate('/hub');
      } else {
        navigate('/onboarding');
      }
    }
  }, [firebaseUser, dbUser, navigate]);

  const validatePassword = (pass: string) => {
    if (pass.length < 8) return "La password deve contenere almeno 8 caratteri.";
    if (!/[A-Z]/.test(pass)) return "La password deve contenere almeno una lettera maiuscola.";
    if (!/[0-9]/.test(pass)) return "La password deve contenere almeno un numero.";
    if (!/[^a-zA-Z0-9]/.test(pass)) return "La password deve contenere almeno un carattere speciale.";
    return null;
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setShowForgotPassword(false);
    setLoading(true);

    try {
      if (isRegistering) {
        if (password !== confirmPassword) {
          setErrorMsg("Le password non coincidono.");
          setLoading(false);
          return;
        }

        const passError = validatePassword(password);
        if (passError) {
          setErrorMsg(passError);
          setLoading(false);
          return;
        }
        await registerWithEmail(email, password);
      } else {
        await loginWithEmail(email, password);
      }
    } catch (error: any) {
      console.error(error);
      if (error.code === 'auth/email-already-in-use') {
        setErrorMsg("Questa email è già registrata.");
      } else if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        setErrorMsg("Email o password non corretti.");
        setShowForgotPassword(true);
      } else {
        setErrorMsg("Errore durante l'autenticazione. Riprova.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      setErrorMsg("Inserisci la tua email qui sopra e clicca su 'Password Dimenticata?'");
      return;
    }
    try {
      setLoading(true);
      await resetPassword(email);
      setSuccessMsg("Ti abbiamo inviato un'email per ripristinare la password! Controlla la tua casella di posta (e lo spam).");
      setErrorMsg('');
    } catch (err: any) {
      setErrorMsg("Errore invio email di recupero. Verifica che l'indirizzo sia corretto.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col justify-center items-center p-4">
      <div className="text-center mb-10">
        <h1 className="text-5xl font-extrabold text-white tracking-tight mb-4 flex items-center justify-center gap-3">
          <Logo />
          <span><span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-purple-600">Fanta</span>Trip</span>
        </h1>
        <p className="text-gray-400 text-lg">Sfida i tuoi amici, scommetti e domina la classifica.</p>
      </div>

      <div className="bg-gray-900 border border-gray-800 p-8 rounded-3xl w-full max-w-sm shadow-2xl shadow-purple-900/10">
        <h2 className="text-2xl font-bold text-white text-center mb-6">
          {isRegistering ? 'Crea un Account' : 'Accedi'}
        </h2>
        
        <form onSubmit={handleEmailAuth} className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Email</label>
            <input 
              type="email" 
              required 
              value={email} 
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-gray-950 border border-gray-800 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-purple-500 transition-colors"
              placeholder="es. mario@email.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Password</label>
            <input 
              type="password" 
              required 
              value={password} 
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-gray-950 border border-gray-800 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-purple-500 transition-colors"
              placeholder="••••••••"
            />
          </div>

          {isRegistering && (
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Conferma Password</label>
              <input 
                type="password" 
                required 
                value={confirmPassword} 
                onChange={e => setConfirmPassword(e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-purple-500 transition-colors"
                placeholder="••••••••"
              />
            </div>
          )}

          {errorMsg && (
            <div className="text-red-400 text-sm font-medium bg-red-900/20 p-3 rounded-lg border border-red-500/20">
              {errorMsg}
            </div>
          )}
          {successMsg && (
            <div className="text-green-400 text-sm font-medium bg-green-900/20 p-3 rounded-lg border border-green-500/20">
              {successMsg}
            </div>
          )}

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-lg shadow-purple-900/20"
          >
            {loading ? 'Caricamento...' : (isRegistering ? 'Registrati' : 'Accedi')}
          </button>
        </form>

        {!isRegistering && showForgotPassword && (
          <div className="text-center mb-6">
            <button 
              type="button"
              onClick={handleResetPassword}
              disabled={loading}
              className="text-sm text-purple-400 hover:text-purple-300 transition-colors font-medium cursor-pointer"
            >
              Password Dimenticata?
            </button>
          </div>
        )}

        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 h-px bg-gray-800"></div>
          <span className="text-sm text-gray-500">oppure</span>
          <div className="flex-1 h-px bg-gray-800"></div>
        </div>
        
        <div className="space-y-3">
          <button 
            onClick={() => loginWithGoogle()}
            type="button"
            className="w-full flex items-center justify-center bg-white text-gray-900 hover:bg-gray-100 font-semibold py-3 px-4 rounded-xl transition-all"
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            Accedi con Google
          </button>
          
          <button 
            onClick={() => loginWithApple()}
            type="button"
            className="w-full flex items-center justify-center bg-gray-950 text-white hover:bg-black font-semibold py-3 px-4 rounded-xl border border-gray-800 transition-all"
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.85 2.13-1.89 3.57-2.53 4.08zM12.03 7.25C11.52 4.6 13.98 2 16.41 2c.5 2.87-2.31 5.39-4.38 5.25z"/>
            </svg>
            Accedi con Apple
          </button>
        </div>

        <div className="mt-8 text-center text-sm text-gray-400">
          {isRegistering ? 'Hai già un account? ' : 'Non hai un account? '}
          <button 
            type="button"
            onClick={() => {
              setIsRegistering(!isRegistering);
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className="text-purple-400 hover:text-purple-300 font-bold transition-colors"
          >
            {isRegistering ? 'Accedi' : 'Registrati ora'}
          </button>
        </div>
      </div>
    </div>
  );
}
