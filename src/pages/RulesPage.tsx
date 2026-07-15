import { useParams, useNavigate } from 'react-router-dom';

export default function RulesPage() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-950 p-4 md:p-6 text-gray-100">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="flex items-center justify-between border-b border-gray-800 pb-4">
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <span className="text-purple-500">📜</span> Regolamento Ufficiale
          </h1>
          <button 
            onClick={() => navigate(`/league/${leagueId}/dashboard`)}
            className="px-4 py-2 border border-gray-800 text-gray-300 hover:text-white hover:border-purple-500 rounded-lg transition-all cursor-pointer"
          >
            Torna indietro
          </button>
        </header>

        <div className="space-y-6 bg-gray-900 border border-purple-500/20 p-6 rounded-2xl shadow-xl shadow-purple-900/10">
          
          <section className="bg-gray-950 p-5 rounded-xl border border-gray-800">
            <h2 className="text-2xl font-bold text-purple-400 mb-3 flex items-center gap-2">
              <span>✈️</span> Lo Scopo del Gioco
            </h2>
            <p className="text-gray-300 leading-relaxed text-lg">
              FantaTrip trasforma la tua vacanza in un'avventura epica. Il gioco ruota attorno a <strong>Sfide</strong> assurde o divertenti decise dai creatori della lega. L'obiettivo? Raggiungere la vetta della classifica accumulando più <strong>Punti Classifica (🏆)</strong> di tutti gli altri.
            </p>
          </section>

          <section className="bg-gray-950 p-5 rounded-xl border border-gray-800">
            <h2 className="text-2xl font-bold text-purple-400 mb-3 flex items-center gap-2">
              <span>🎯</span> Come si fanno i Punti?
            </h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              I Punti determinano chi comanda e possono essere ottenuti in due modi principali:
            </p>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <span className="text-xl">🏃‍♂️</span>
                <div>
                  <strong className="text-white">Facendo le sfide:</strong> Se porti a termine una sfida (dal vivo) e un Admin te la convalida, becchi tutti i punti previsti. Più volte la fai, più punti prendi!
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-xl">🎟️</span>
                <div>
                  <strong className="text-white">Vincendo le scommesse (Novità!):</strong> Se scommetti in modo vincente su un amico, oltre a vincere i TripMoney intascherai <strong>la metà dei punti</strong> originali di quella sfida (anche se è una sfida negativa!). 
                  <br/><span className="text-sm text-purple-400 mt-1 block">Puoi persino scommettere sul "Moltiplicatore": se scommetti che farà un'azione 3 volte, ma la fa solo 2, perderai la scommessa! Se invece scommetti 3 e lui la fa 4 volte, vinci!</span>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-xl">⚖️</span>
                <div>
                  <strong className="text-white">Bonus o Penalità dell'Admin:</strong> Gli Admin possono assegnare o togliere punti arbitrariamente. Possono anche creare <strong>Sfide Negative (Malus)</strong>: se fai un disastro e l'admin ti convalida una sfida da "-50 punti", perderai punti!
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-xl">✖️</span>
                <div>
                  <strong className="text-white">Sfide Consecutive (Moltiplicatori):</strong> Se compi un'azione più volte, l'admin può usare un moltiplicatore (es. x3) per darti tutti i punti in un colpo solo. (Le scommesse però verranno pagate una singola volta).
                </div>
              </li>
            </ul>
          </section>

          <section className="bg-gray-950 p-5 rounded-xl border border-gray-800">
            <h2 className="text-2xl font-bold text-green-400 mb-3 flex items-center gap-2">
              <span>💸</span> TripMoney e Scommesse
            </h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              Tutti iniziano con <strong>500 TripMoney (TM)</strong>. Usali per scommettere su chi avrà il coraggio (o l'incoscienza) di compiere le sfide in corso. Le quote (es. x1.5, x2.0) dipendono dalla difficoltà!
            </p>
            <div className="bg-yellow-900/20 border border-yellow-700/50 p-4 rounded-lg">
              <h3 className="text-yellow-500 font-bold mb-2">⚠️ ATTENZIONE: La Regola delle 12 Ore</h3>
              <p className="text-yellow-100/80 text-sm">
                Ogni scommessa ha una durata massima di <strong>12 Ore</strong>. Se il tuo bersaglio non compie l'azione entro 12 ore da quando hai scommesso, la scommessa scadrà e sarà considerata <strong>Persa</strong>. I TripMoney investiti non ti verranno restituiti! Tempismo è tutto.
              </p>
            </div>
            
            <div className="bg-green-900/20 border border-green-700/50 p-4 rounded-lg mt-4">
              <h3 className="text-green-500 font-bold mb-2">💰 La Paghetta Giornaliera</h3>
              <p className="text-green-100/80 text-sm">
                Hai finito i soldi per colpa di scommesse scellerate? Nessun problema! L'Admin ha a disposizione il pulsante magico della <strong>Paghetta</strong> che eroga a tutti i membri 20 TripMoney freschi freschi. Ma attenzione: può essere usato al massimo <strong>una volta al giorno</strong>.
              </p>
            </div>
          </section>

          <section className="bg-gray-950 p-5 rounded-xl border border-gray-800">
            <h2 className="text-2xl font-bold text-blue-400 mb-3 flex items-center gap-2">
              <span>🛠</span> I Poteri degli Admin
            </h2>
            <p className="text-gray-300 leading-relaxed">
              Il creatore (Super Admin) può promuovere altre persone a <strong>Co-Admin</strong>. Gli Admin hanno il compito sacro di:
            </p>
            <ul className="list-disc list-inside text-gray-300 mt-2 space-y-1">
              <li>Creare le Sfide.</li>
              <li>Validare gli eventi quando qualcuno compie l'azione.</li>
              <li>Sganciare punti bonus o dare penalità in caso di scorrettezze.</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
