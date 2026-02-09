
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

    if (d.includes('pizza') || d.includes('pasta') || d.includes('spesa') || d.includes('conad') || d.includes('esselunga') || d.includes('cibo')) {
      suggested = Category.Alimentari;
    } else if (d.includes('benzina') || d.includes('treno') || d.includes('bus') || d.includes('taxi') || d.includes('parcheggio')) {
      suggested = Category.Trasporti;
    } else if (d.includes('affitto') || d.includes('mutuo') || d.includes('mobili') || d.includes('ikea')) {
      suggested = Category.Casa;
    } else if (d.includes('netflix') || d.includes('cinema') || d.includes('bar') || d.includes('aperitivo') || d.includes('birra')) {
      suggested = Category.Svago;
    } else if (d.includes('luce') || d.includes('gas') || d.includes('acqua') || d.includes('bolletta') || d.includes('internet')) {
      suggested = Category.Utenze;
    } else if (d.includes('vestiti') || d.includes('amazon') || d.includes('scarpe')) {
      suggested = Category.Shopping;
    } else if (d.includes('farmacia') || d.includes('dentista') || d.includes('visita')) {
      suggested = Category.Salute;
    }

    setSuggestion(suggested);
  }, [description]);

  if (!suggestion) return null;

  return (
    <div 
      onClick={() => onSuggest(suggestion)}
      className="mt-2 flex items-center gap-2 text-xs text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg cursor-pointer hover:bg-emerald-100 transition-colors border border-emerald-100 animate-in slide-in-from-top-1"
    >
      <Sparkles size={12} />
      <span>Sugerimento AI: <strong>{suggestion}</strong>. Clicca per impostare.</span>
    </div>
  );
};
