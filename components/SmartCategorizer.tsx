
import React, { useEffect, useState } from 'react';
import { CategoryConfig } from '../types';
import { Sparkles } from 'lucide-react';

interface SmartCategorizerProps {
  description: string;
  onSuggest: (category: string) => void;
  categories: CategoryConfig[];
}

export const SmartCategorizer: React.FC<SmartCategorizerProps> = ({ description, onSuggest, categories }) => {
  const [suggestion, setSuggestion] = useState<string | null>(null);

  useEffect(() => {
    if (description.length < 3) {
      setSuggestion(null);
      return;
    }

    const d = description.toLowerCase();
    let suggested: string | null = null;

    // Mapping logico basato su parole chiave e nomi delle categorie dell'utente
    const findCat = (keywords: string[]) => categories.find(c => keywords.some(k => c.name.toLowerCase().includes(k) || d.includes(k)));

    if (d.includes('sigarette') || d.includes('heets') || d.includes('tabacco')) suggested = findCat(['sigarette'])?.name || null;
    else if (d.includes('benzina') || d.includes('eni') || d.includes('q8')) suggested = findCat(['benzina'])?.name || null;
    else if (d.includes('autostrada') || d.includes('casello')) suggested = findCat(['autostrada'])?.name || null;
    else if (d.includes('netflix') || d.includes('spotify') || d.includes('prime')) suggested = categories.find(c => c.isSubscriptionDefault || c.name.toLowerCase().includes('abbon'))?.name || null;
    else if (d.includes('pizza') || d.includes('bar') || d.includes('ristorante')) suggested = findCat(['svago', 'divertimento'])?.name || null;
    
    setSuggestion(suggested);
  }, [description, categories]);

  if (!suggestion) return null;

  return (
    <div 
      onClick={() => onSuggest(suggestion)}
      className="mt-2 flex items-center gap-2 text-xs text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg cursor-pointer hover:bg-emerald-100 border border-emerald-100 animate-in slide-in-from-top-1"
    >
      <Sparkles size={12} />
      <span>Suggerimento AI: <strong>{suggestion}</strong>. Clicca per impostare.</span>
    </div>
  );
};
