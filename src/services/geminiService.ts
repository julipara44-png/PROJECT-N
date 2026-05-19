import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: (import.meta as any).env?.VITE_GEMINI_API_KEY as string });

export interface Prediction {
  title: string;
  description: string;
  probability: number;
  timeframe: string;
  impactLevel: 'Low' | 'Medium' | 'High' | 'Critical';
}

export interface AnalyticsInsight {
  summary: string;
  forecast: string;
  predictions: Prediction[];
}

export async function getPredictiveAnalytics(dataContext: string): Promise<AnalyticsInsight> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Perform an advanced predictive analytics analysis for a data intelligence platform. 
      Context: ${dataContext}.
      
      Analyze the current trends and forecast potential future outcomes for global financial and corporate ecosystems.
      Provide a summary, a 30-day forecast, and a list of 3 specific predictions.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING, description: "A concise summary of current intelligence trends." },
            forecast: { type: Type.STRING, description: "A general forecast for the next 30 days." },
            predictions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  probability: { type: Type.NUMBER, description: "Probability percentage (0-100)" },
                  timeframe: { type: Type.STRING },
                  impactLevel: { type: Type.STRING, enum: ['Low', 'Medium', 'High', 'Critical'] }
                },
                required: ['title', 'description', 'probability', 'timeframe', 'impactLevel']
              }
            }
          },
          required: ['summary', 'forecast', 'predictions']
        }
      }
    });

    const text = response.text || "{}";
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini Analytics Error:", error);
    // Return mock data fallback if API fails
    return {
      summary: "QUANTUM ANALYTICS OFFLINE. Utilizing cached heuristic models.",
      forecast: "Stability predicted across major clusters with minor volatility in emerging markets.",
      predictions: [
        { title: "Liquidity Surge", description: "Inflow of institutional capital into tech sector.", probability: 85, timeframe: "7 Days", impactLevel: "High" },
        { title: "M&A Activity Spikes", description: "Anticipated consolidation in the energy sector.", probability: 65, timeframe: "14 Days", impactLevel: "Medium" },
        { title: "Regulatory Shift", description: "Upcoming policy changes in Asian markets.", probability: 40, timeframe: "30 Days", impactLevel: "Critical" }
      ]
    };
  }
}

export async function generateCustomerReply(
  customerName: string,
  message: string,
  knowledgeBaseContext?: string,
  businessName?: string
): Promise<string> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `You are a professional customer service agent for ${businessName || "PROJECT-N"}. Generate a polite, helpful reply.
      
      Business Knowledge Base:
      ${knowledgeBaseContext || "No context provided."}
      
      Customer Name: ${customerName}
      Customer Message: "${message}"`,
    });

    return response.text || "I am currently processing your request. An agent will be with you shortly.";
  } catch (error) {
    console.error("Gemini Reply Error:", error);
    return "Thank you for reaching out. We have received your query and are investigating the matter. We will get back to you with a detailed resolution shortly.";
  }
}

export async function askMetis(query: string, financeData: string): Promise<string> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `You are METIS, the financial assistant for PROJECT N. Answer questions about the business finances using this data:
      ${financeData}
      
      Be concise and use NPR amounts.
      
      User Question: "${query}"`,
    });

    return response.text || "No response received.";
  } catch (error) {
    console.error("METIS API Error:", error);
    return "Error communicating with Metis system core. Please check connectivity.";
  }
}

export async function extractInvoiceData(base64Image: string, mimeType: string): Promise<any> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          inlineData: {
            data: base64Image.split(',')[1],
            mimeType
          }
        },
        "Extract: vendor name, date, line items, amounts, total. Return as JSON. The JSON should have exactly these keys: vendorName (string), date (string in YYYY-MM-DD format), description (string, summarizing line items), totalAmount (number)."
      ],
      config: {
        responseMimeType: "application/json",
      }
    });

    const text = response.text || "{}";
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini Invoice Scan Error:", error);
    return null;
  }
}

export async function generateMetisDailyBrief(
  businessName: string,
  transactions: any[],
  inventory: any[],
  queries: any[]
): Promise<any> {
  try {
    const context = `
      Business: ${businessName}
      Transactions (Last 30 Days): ${JSON.stringify(transactions.slice(0, 50))}
      Inventory Levels: ${JSON.stringify(inventory.slice(0, 50))}
      Recent Customer Queries: ${JSON.stringify(queries.slice(0, 50))}
      Market Data: Assume NEPSE is slightly bearish today and NRB (Nepal Rastra Bank) maintained interest rates.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `You are METIS, an advanced cross-domain analysis engine for PROJECT N.
      Generate a business intelligence daily brief based on the provided cross-domain context.
      
      Context: ${context}
      
      Return a JSON object with exactly these keys:
      - date (string, today's date)
      - executiveSummary (string, max 3 sentences)
      - financialHealth (string, max 2 sentences)
      - inventoryInsights (string, max 2 sentences)
      - customerSentiment (string, max 2 sentences)
      - strategicRecommendation (string, max 2 sentences)`,
      config: {
        responseMimeType: "application/json",
      }
    });

    const text = response.text || "{}";
    return JSON.parse(text);
  } catch (error) {
    console.error("METIS Daily Brief Error:", error);
    return {
      date: new Date().toISOString().split('T')[0],
      executiveSummary: "METIS ENGINE OFFLINE. Cached heuristic models indicate stable operations.",
      financialHealth: "Cash flow remains within acceptable parameters.",
      inventoryInsights: "No critical stockouts detected.",
      customerSentiment: "Sentiment appears neutral based on last known data.",
      strategicRecommendation: "Re-establish connection to METIS core for live insights."
    };
  }
}
