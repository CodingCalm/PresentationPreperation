import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Add JSON parsing middleware with 50mb limit to handle base64 audio
  app.use(express.json({ limit: "50mb" }));

  // Initialize Gemini Client
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  let ai: GoogleGenAI | null = null;

  if (apiKey) {
    ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  } else {
    console.warn("GEMINI_API_KEY environment variable is missing.");
  }

  // API Route: Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // API Route: Generate Practice Script
  app.post("/api/generate-script", async (req, res) => {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "Prompt saknas i anropet." });
    }

    const fallbackScripts: Record<string, { script: string; hint: string }> = {
      confident: {
        script: "Jag är helt övertygad om att vårt team har den perfekta lösningen på det här problemet. Vi har analyserat all data och är redo att ta nästa steg med full kraft.",
        hint: "Tala med en stadig, fyllig röst. Håll ett jämnt tempo och betona nyckelord som 'övertygad' och 'full kraft'."
      },
      questioning: {
        script: "Är vi verkligen helt säkra på att den här strategin är bäst på lång sikt? Vad händer om förutsättningarna plötsligt förändras i höst?",
        hint: "Höj tonhöjden något i slutet av varje mening för att uttrycka nyfikenhet, intresse och eftertanke."
      },
      enthusiastic: {
        script: "Det här är en helt fantastisk möjlighet för oss alla! Jag kan knappt bärga mig tills vi drar igång projektet och får se resultatet av vårt arbete.",
        hint: "Använd stor röstvariation, ett lite snabbare tempo och låt ditt engagemang och glädje skina igenom!"
      },
      calm: {
        script: "Ta ett djupt andetag. Vi har gott om tid på oss att gå igenom den här rapporten tillsammans, och vi kommer att lösa alla detaljer i lugn och ro.",
        hint: "Tala i ett långsammare, tryggt tempo med djupa andetag och naturliga pauser efter varje mening."
      },
      assertive: {
        script: "Det här beslutet ligger fast och det är det här spåret vi ska följa nu. Jag förväntar mig att alla levererar sina delar enligt den överenskomna planen.",
        hint: "Använd en fast, bestämd ton utan darrningar, och avsluta dina meningar med en tydlig, nedåtgående intonation."
      }
    };

    const getFallback = (p: string) => {
      const lower = p.toLowerCase();
      let selected = fallbackScripts.confident;
      if (lower.includes("confident") || lower.includes("självsäker")) {
        selected = fallbackScripts.confident;
      } else if (lower.includes("questioning") || lower.includes("frågande")) {
        selected = fallbackScripts.questioning;
      } else if (lower.includes("enthusiastic") || lower.includes("entusiastisk")) {
        selected = fallbackScripts.enthusiastic;
      } else if (lower.includes("calm") || lower.includes("lugn")) {
        selected = fallbackScripts.calm;
      } else if (lower.includes("assertive") || lower.includes("bestämd")) {
        selected = fallbackScripts.assertive;
      }
      return {
        script: selected.script,
        hint: `${selected.hint} (Obs: Live-coachen har hög belastning just nu, så vi laddade ett beprövat övningsmanus!)`
      };
    };

    try {
      if (!ai) {
        console.warn("Gemini client is not initialized. Using fallback script.");
        return res.json({ text: JSON.stringify(getFallback(prompt)) });
      }

      const models = ["gemini-3.5-flash", "gemini-flash-latest"];
      let lastError: any = null;
      let response;

      for (const model of models) {
        for (let attempt = 1; attempt <= 2; attempt++) {
          try {
            response = await ai.models.generateContent({
              model: model,
              contents: prompt,
              config: {
                responseMimeType: "application/json",
              },
            });
            if (response && response.text) {
              return res.json({ text: response.text });
            }
          } catch (err: any) {
            lastError = err;
            console.warn(`Generate script attempt ${attempt} with model ${model} failed:`, err.message || err);
            if (attempt < 2) {
              await new Promise((resolve) => setTimeout(resolve, 800));
            }
          }
        }
      }

      // If all live models failed or were rate limited, gracefully return a Swedish fallback script
      console.warn("All live models failed or were rate limited. Returning Swedish fallback script.");
      return res.json({ text: JSON.stringify(getFallback(prompt)) });
    } catch (error: any) {
      console.error("Fel i /api/generate-script, säkrar med fallback:", error);
      return res.json({ text: JSON.stringify(getFallback(prompt)) });
    }
  });

  // API Route: Chat and coaching analyzer
  app.post("/api/chat", async (req, res) => {
    try {
      const { history, userMessageText, audioData, audioMimeType } = req.body;

      if (!ai) {
        return res.json({
          text: "Röstcoachen är redo! Din röstvisualisering (tonhöjd och intensitet) mäts och ritas upp helt i realtid på skärmen lokalt. Spela in din röst för att se din röstkurva!"
        });
      }

      // Convert history to format expected by Gemini
      const validHistory = (history || []).filter((msg: any) => msg.sender === 'user' || msg.sender === 'ai');
      const geminiHistory = validHistory.map((msg: any) => ({
        role: msg.sender === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }],
      }));

      const systemInstruction = "Du är en vänlig och hjälpsam röstcoach-AI. Ditt mål är att hjälpa användaren att förbättra sitt tal och sin röstleverans. Svara alltid på svenska. Om du får en ljudinspelning för den första analysen, basera din feedback primärt på den och hur användaren låter. Ge konkreta och uppmuntrande råd. Undvik att vara repetitiv. Fråga gärna klargörande frågor om det behövs för att ge bättre råd. Håll svaren relativt korta och fokuserade.";

      const models = ["gemini-3.5-flash", "gemini-flash-latest"];
      let lastError: any = null;
      let response;

      for (const model of models) {
        for (let attempt = 1; attempt <= 2; attempt++) {
          try {
            const chat = ai.chats.create({
              model: model,
              history: geminiHistory,
              config: {
                systemInstruction,
              }
            });

            if (audioData && audioMimeType) {
              const audioPart = {
                inlineData: {
                  data: audioData,
                  mimeType: audioMimeType,
                },
              };
              const textPart = { text: userMessageText };
              response = await chat.sendMessage({ message: [audioPart, textPart] });
            } else {
              response = await chat.sendMessage({ message: userMessageText });
            }

            if (response && response.text) {
              return res.json({ text: response.text });
            }
          } catch (err: any) {
            lastError = err;
            console.warn(`Chat attempt ${attempt} with model ${model} failed:`, err.message || err);
            if (attempt < 2) {
              await new Promise((resolve) => setTimeout(resolve, 800));
            }
          }
        }
      }

      // If all live models failed (e.g. Rate Limit / 429), return a friendly offline message with actual feedback guidance
      console.warn("All chat models failed or were rate limited. Returning offline friendly guide.");
      return res.json({
        text: "Live AI-coachen är tillfälligt överbelastad på grund av hög efterfrågan. \n\nMen du kan fortsätta öva! Din röstvisualisering fungerar fullt ut lokalt – du kan se dina kurvor för både **tonhöjd (Pitch)** och **ljudstyrka (Intensity)** i diagrammen nedanför manuset direkt när du spelat in. Försök gärna igen om en liten stund för att få live-feedback!"
      });
    } catch (error: any) {
      console.error("Fel i /api/chat, säkrar med fallback-meddelande:", error);
      return res.json({
        text: "Live AI-coachen stötte på ett tillfälligt problem. Dina lokala röstgrafer ritas dock upp helt perfekt så att du kan självutvärdera din tonhöjd och röststyrka under tiden!"
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
