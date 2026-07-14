# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Om projektet

Röstdynamik Lab — AI-driven röst-/presentationsträning. Blazor Web App på .NET 10 med Interactive Server-rendering, i mappen `RostdynamikLab/`. All UI-text och kommunikation med användaren är på svenska. Projektet var ursprungligen en React/Vite-app (finns i git-historiken före commit 067f9d8).

## Kommandon

Allt körs från `RostdynamikLab/`:

```powershell
dotnet build          # bygg
dotnet run            # starta på http://localhost:5000 (launchSettings)
dotnet user-secrets set "GEMINI_API_KEY" "nyckel"   # API-nyckel (engångs)
```

Inga tester finns ännu. Om appen redan kör låser den exe-filen och `dotnet build` misslyckas med MSB3021 — kompilera då mot separat output: `dotnet build -o bin/check` (och ta bort mappen efteråt).

## Arkitektur

Ingen separat API-server — komponenterna anropar `Services/GeminiService.cs` direkt (Blazor Server). GeminiService pratar med Geminis REST-API via `HttpClient` och provar modellerna `gemini-3.5-flash` → `gemini-flash-latest` → `gemini-flash-lite-latest` med 2 försök vardera; när alla misslyckas (eller nyckel saknas) returneras inbyggda svenska fallback-manus i stället för fel. Nyckeln läses från konfigurationen (`GEMINI_API_KEY`, via user secrets i utveckling).

- `Components/Pages/Home.razor` — all tillståndslogik (manus, inspelning, chatt, ordmarkörer). Motsvarar gamla App.tsx.
- `Components/Shared/VocalChart.razor` — graferna är handskriven SVG (inte chartbibliotek), en komponent för både tonhöjd och intensitet via `ChartKind`. Hover-val av ord görs med osynliga rect-band per ord, inte muskoordinater (koordinatmappning fungerar inte över SignalR).
- `Components/Shared/AudioRecorder.razor` + `wwwroot/js/audioRecorder.js` — mikrofoninspelning via MediaRecorder och JS interop; ljudet skickas som base64 till servern (SignalR-maxstorlek är höjd i Program.cs för detta).
- Styling: Tailwind och Font Awesome via CDN i `Components/App.razor`, inga npm-beroenden.

## Viktiga regler

- **Inga automatiska AI-anrop.** Gemini får bara anropas efter uttrycklig knapptryckning ("Generera Nytt Manus", "Aktivera Coaching", chattmeddelanden, uppföljningsinspelning från chatten). Startmanus laddas lokalt via `GeminiService.GetStarterScript`. Användaren har begränsad kvot — flagga alltid tokenkostnaden om ett nytt AI-anrop föreslås.
- **Graferna visar mockdata** (`GenerateMockVocalData` i Home.razor) — slumpade kurvor, ingen riktig ljudanalys. Detta är känt och avsiktligt (ärvt från React-versionen). AI-coachen lyssnar däremot på riktigt ljud.
- Razor-fälla i VocalChart: SVG:s `<text>`-element inuti `@foreach`-block måste lindas i `<g>`, annars tolkar Razor dem som sitt eget `<text>`-specialelement (RZ1023).
- **Kodstil: OOP och ren, minimal kod.** Skriv så lite kod som möjligt för att lösa uppgiften — enkel att läsa och testbar. Ta bort onödig/död kod när du stöter på den i stället för att lämna kvar den. Undvik code smells: inga långa metoder eller komponenter (bryt ut hellre), ingen duplicerad logik (återanvänd — t.ex. som VocalChart delas av båda graferna), inga magiska värden (namngivna konstanter), och håll logik som ska vara testbar i klasser under `Services/`/`Models/` i stället för inbakad i Razor-komponenter.
- **UI ska följa WCAG och fungera bra på både mobil och desktop.** Konkret: tillräcklig färgkontrast mot de mörka bakgrunderna, `aria-label` på knappar utan synlig text, fungerande tangentbordsnavigering och synligt fokus, samt responsiv layout via Tailwinds breakpoints (`sm:`/`md:` — mobile first, som befintliga komponenter). Interaktiva ytor ska vara stora nog för touch.
