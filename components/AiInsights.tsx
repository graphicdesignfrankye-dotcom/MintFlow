
import React, { useState, useEffect } from 'react';
import { Expense, AiInsight } from '../types';
import { getGeminiInsights } from '../services/gemini';
import { BrainCircuit, Sparkles, AlertCircle, TrendingDown, Lightbulb, RefreshCw } from 'lucide-react';

interface AiInsightsProps {
  expenses: Expense[];
}

export const AiInsights: React.FC<AiInsightsProps> = ({ expenses }) => {
  const [insights, setInsights] = useState<AiInsight[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchInsights = async () => {
    if (expenses.length < 3) return;
    setLoading(true);
    const data = await getGeminiInsights(expenses);
    setInsights(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchInsights();
  }, []);

  if (expenses.length < 3) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center space-y-4">
        <div className="bg-emerald-50 dark:bg-emerald-900/10 p-6 rounded-full text-emerald-400">
          <BrainCircuit size={64} />
        </div>
        <h2 className="text-xl font-bold text-gray-800 dark:text-white">Serve qualche spesa in più</h2>
        <p className="text-gray-500 dark:text-gray-400 max-w-sm">
          Aggiungi almeno 3 spese per permettere all'AI di analizzare i tuoi pattern di consumo e darti consigli personalizzati.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            AI Insights
            <Sparkles className="text-emerald-500" size={20} />
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Analisi intelligente dei tuoi consumi</p>
        </div>
        <button 
          onClick={fetchInsights}
          disabled={loading}
          className="p-3 bg-emerald-50 dark:bg-gray-800 text-emerald-600 dark:text-emerald-400 rounded-xl hover:bg-emerald-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          Array(3).fill(0).map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] border border-emerald-100 dark:border-gray-700 shadow-sm animate-pulse h-32"></div>
          ))
        ) : (
          insights.map((insight, idx) => (
            <div 
              key={idx} 
              className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] border border-emerald-100 dark:border-gray-700 shadow-sm flex gap-6 items-start hover:border-emerald-200 dark:hover:border-gray-600 transition-all hover:shadow-md"
            >
              <div className={`p-4 rounded-2xl ${
                insight.type === 'warning' ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-500' : 
                insight.type === 'saving' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500' : 
                'bg-blue-50 dark:bg-blue-900/20 text-blue-500'
              }`}>
                {insight.type === 'warning' ? <AlertCircle size={24} /> : 
                 insight.type === 'saving' ? <TrendingDown size={24} /> : 
                 <Lightbulb size={24} />}
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-800 dark:text-white mb-1">{insight.title}</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">{insight.advice}</p>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-8 rounded-[2rem] text-white">
        <h3 className="text-xl font-bold mb-2">Pianificatore Futuro</h3>
        <p className="text-emerald-50 text-sm mb-4">In base alle tue spese, il tuo budget previsto per il prossimo mese è simile a quello attuale. Vuoi impostare un obiettivo di risparmio?</p>
        <button className="bg-white text-emerald-600 px-6 py-2 rounded-xl font-bold hover:bg-emerald-50 transition-colors text-sm">
          Imposta Obiettivo
        </button>
      </div>
    </div>
  );
};
