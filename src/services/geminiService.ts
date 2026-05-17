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

export async function generateCustomerReply(customerName: string, message: string, knowledgeBaseContext?: string): Promise<string> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `You are a professional customer support AI for "PROJECT-N", a high-end corporate and financial intelligence platform.
      
      ${knowledgeBaseContext ? `Use the following business information as context for your reply:
      ${knowledgeBaseContext}` : ''}
      
      Generate a professional, helpful, and concise response to the following customer query.
      Customer Name: ${customerName}
      Message: "${message}"
      
      The tone should be sophisticated, technical, yet empathetic. Acknowledge their issue and provide a standard professional resolution or assurance.`,
    });

    return response.text || "I am currently processing your request. An agent will be with you shortly.";
  } catch (error) {
    console.error("Gemini Reply Error:", error);
    return "Thank you for reaching out. We have received your query and are investigating the matter. We will get back to you with a detailed resolution shortly.";
  }
}
