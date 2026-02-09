
import React, { useEffect, useState } from 'react';
import { Category } from '../types';
import { Sparkles } from 'lucide-react';

interface SmartCategorizerProps {
  description: string;
  onSuggest: (category: Category) => void;
}

export const SmartCategorizer: React.FC<SmartCategorizerProps> = ({ description, onSuggest }) => {
  const [suggestion, setSuggestion] = useState<Category | null>(null);

  useEffect(() => {
    if (description.length < 3) {
      setSuggestion(null);
      return;
    }

    const d = description.toLowerCase();
    let suggested: Category | null = null;

    if (d.includes('sigarette') || d.includes('tabacco') || d.includes('iqos') || d.includes('heets') || d.includes('cartine')) {
      suggested = Category.Sigarette;
    } else if (d.includes('benzina') || d.includes('diesel') || d.includes('carburante') || d.includes('eni') || d.includes('q8') || d.includes('distributore')) {
      suggested = Category.Benzina;
    } else if (d.includes('autostrada') || d.includes('telepass') || d.includes('pedaggio') || d.includes('casello') || d.includes('a1') || d.includes('a4')) {
      suggested = Category.Autostrada;
    } else if (d.includes('ricarica') || d.includes('chiavetta') || d.includes('caffè') || d.includes('vending') || d.includes('macchinetta')) {
      suggested = Category.RicaricaChiavetta;
    } else if (d.includes('cinema') || d.includes('bar') || d.includes('aperitivo') || d.includes('pizza') || d.includes('netflix') || d.includes('cena')) {
      suggested = Category.Svago;
    } else if (d.includes('farmacia') || d.includes('dentista') || d.includes('visita') || d.includes('medico') || d.includes('ospedale')) {
      suggested = Category.Salute;
    }

    setSuggestion(suggested);
  }, [description]);

  if (!suggestion) return null;

  return (
    <div 
      onClick={() => onSuggest(suggestion)}
      className="mt-2 flex items-center gap-2 text-xs text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5 rounded-lg cursor-pointer hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors border border-emerald-100 dark:border-emerald-800 animate-in slide-in-from-top-1"
    >
      <Sparkles size={12} />
      <span>Suggerimento AI: <strong>{suggestion}</strong>. Clicca per impostare.</span>
    </div>
  );
};
