import { Expense } from "../types";
import { supabase } from "./supabase";

// Le chiamate a Gemini passano da /api/gemini (api/gemini.ts): la chiave resta sul server.
const callGemini = async (payload: Record<string, unknown>) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Sessione non valida");

  const response = await fetch("/api/gemini", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `Errore ${response.status}`);
  }
  return response.json();
};

export const getGeminiInsights = async (expenses: Expense[]) => {
  try {
    const { insights } = await callGemini({
      action: "insights",
      expenses: expenses.slice(0, 50).map(e => ({
        date: e.date,
        amount: e.amount,
        category: e.category,
        paymentMethod: e.paymentMethod,
        description: e.description
      }))
    });
    return insights || [];
  } catch (error) {
    console.error("Gemini Error:", error);
    return [];
  }
};

export const analyzeReceipt = async (base64Image: string) => {
  try {
    const { receipt } = await callGemini({ action: "receipt", image: base64Image });
    return receipt || null;
  } catch (error) {
    console.error("Receipt analysis failed:", error);
    return null;
  }
};
