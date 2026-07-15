import { useParams, useNavigate } from 'react-router-dom';
import Leaderboard from '../components/Leaderboard';

export default function LeaderboardPage() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const navigate = useNavigate();

  if (!leagueId) return null;

  return (
    <div className="min-h-screen bg-gray-950 p-4 md:p-6 text-gray-100">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <span className="text-purple-500">🏆</span> Classifica Generale
          </h1>
          <button 
            onClick={() => navigate(`/league/${leagueId}/dashboard`)}
            className="px-4 py-2 border border-gray-800 text-gray-300 hover:text-white hover:border-purple-500 rounded-lg transition-all cursor-pointer"
          >
            Torna indietro
          </button>
        </header>
        <Leaderboard leagueId={leagueId} />
      </div>
    </div>
  );
}
