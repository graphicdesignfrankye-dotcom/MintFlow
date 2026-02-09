
import { GoogleGenAI, Type } from "@google/genai";
import { Expense, Category } from "../types";

const getAi = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getGeminiInsights = async (expenses: Expense[]) => {
  const ai = getAi();
  
  const expenseSummary = expenses.map(e => ({
    date: e.date,
    amount: e.amount,
    category: e.category,
    desc: e.description
  }));

  const prompt = `Analizza queste spese mensili e fornisci 3 insight utili per risparmiare o capire meglio le abitudini di spesa.
  Spese: ${JSON.stringify(expenseSummary.slice(0, 50))}
  
  Sii amichevole, conciso e motivante. Parla in italiano.
  Ritorna un array JSON di oggetti con title, advice e type ('saving', 'warning', 'tip').`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              advice: { type: Type.STRING },
              type: { type: Type.STRING }
            },
            required: ["title", "advice", "type"]
          }
        }
      }
    });

    return JSON.parse(response.text || "[]");
  } catch (error) {
    console.error("Gemini Error:", error);
    return [];
  }
};

export const analyzeReceipt = async (base64Image: string) => {
  const ai = getAi();
  
  const prompt = `Analizza questa immagine di uno scontrino o ricevuta. 
  Estrai:
  1. Una breve descrizione (es: Nome negozio o prodotto principale)
  2. L'importo totale (numero decimale)
  3. La categoria più adatta tra: Alimentari, Trasporti, Casa, Svago, Salute, Shopping, Utenze, Altro.
  
  Ritorna solo JSON.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: base64Image.split(',')[1] || base64Image
          }
        },
        { text: prompt }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            description: { type: Type.STRING },
            amount: { type: Type.NUMBER },
            category: { 
              type: Type.STRING,
              enum: Object.values(Category)
            }
          },
          required: ["description", "amount", "category"]
        }
      }
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Receipt analysis failed:", error);
    return null;
  }
};
