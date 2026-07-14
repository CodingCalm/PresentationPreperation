import { ChatMessage } from "../types";

export const generatePracticeScript = async (prompt: string): Promise<string> => {
  try {
    const response = await fetch("/api/generate-script", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Server returnerade status ${response.status}`);
    }

    const data = await response.json();
    return data.text || "";
  } catch (error: any) {
    console.error("Fel vid generering av manus från servern:", error);
    return `Fel vid hämtning av manus: ${error.message || "Okänt fel"}. Kontrollera serverloggarna eller din anslutning.`;
  }
};

export const startOrContinueChat = async (
  history: ChatMessage[], 
  userMessageText: string,
  audioData?: string | null, 
  audioMimeType?: string | null
): Promise<string> => {
  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        history,
        userMessageText,
        audioData,
        audioMimeType,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Server returnerade status ${response.status}`);
    }

    const data = await response.json();
    return data.text || "";
  } catch (error: any) {
    console.error("Fel vid kommunikation med servern för AI-chatt:", error);
    throw new Error(error.message || "Internt serverfel vid kommunikation med AI-coachen.");
  }
};
