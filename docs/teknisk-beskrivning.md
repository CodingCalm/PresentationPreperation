# Röstdynamik Lab — teknisk beskrivning

*Senast uppdaterad: 2026-07-14. Beskriver appen som den ser ut vid commit `f253d2d`.*

## Översikt

Röstdynamik Lab är en webbapp för röst- och presentationsträning. Användaren väljer en talton (självsäker, frågande, entusiastisk, lugn eller bestämd), får ett kort övningsmanus, spelar in sig själv via mikrofonen, ser visualiseringar av tonhöjd och röststyrka, och kan få AI-feedback på sitt framförande genom en chattbaserad coach.

Appen porterades 2026-07-14 från en React/Vite-app (genererad i Google AI Studio) till .NET. React-versionen finns i git-historiken före commit `067f9d8`.

## Teknikstack

| Del | Val |
|---|---|
| Ramverk | Blazor Web App, .NET 10, Interactive Server-rendering |
| Realtidstransport | SignalR (WebSockets) — inbyggt i Blazor Server |
| AI | Google Gemini via REST (`generateContent`), ingen SDK |
| Styling | Tailwind CSS via CDN (inga npm-beroenden) |
| Ikoner | Font Awesome via CDN |
| Grafer | Handskriven SVG i Razor (inget chartbibliotek) |
| Ljudinspelning | MediaRecorder API i webbläsaren via JS interop |
| Tester | xunit (14 enhetstester) |
| NuGet-paket | Inga egna — bara det webb-SDK:n auto-refererar |

## Projektstruktur

```
RostdynamikLab.slnx           Solution (.NET 10:s XML-format)
RostdynamikLab/               Webbappen
  Program.cs                  DI, SignalR-konfig, pipeline
  Components/
    App.razor                 HTML-skal, CDN-länkar, skriptladdning
    Pages/Home.razor          Hela sidans tillstånd och flöde
    Shared/
      ScriptGenerator.razor   Tonval + ämnesfält + generera-knapp
      AudioRecorder.razor     Inspelningsknappar + uppspelare (JS interop)
      ChatInterface.razor     Coach-chatten
      VocalChart.razor        SVG-graf, återanvänds för tonhöjd & intensitet
  Models/Models.cs            Poster, enum, klassificering, ChatMessage
  Services/
    GeminiService.cs          Gemini-anrop, retry, fallbacks
    PromptBuilder.cs          All promptbyggnad (ren stränglogik)
    MockVocalDataGenerator.cs Slumpade kurvor + ordmarkörer
  wwwroot/js/audioRecorder.js MediaRecorder-hantering
RostdynamikLab.Tests/         xunit-tester
```

## Arkitektur och dataflöden

### Rendering

Interactive Server: komponenterna körs på servern och UI-uppdateringar går över en SignalR-krets. Ingen kod eller API-nyckel når webbläsaren. `MaximumReceiveMessageSize` är höjd till 50 MB i `Program.cs` eftersom ljudinspelningar skickas som base64 över kretsen.

### Manusgenerering

1. Vid sidstart laddas ett inbyggt manus lokalt via `GeminiService.GetStarterScript` — **inget API-anrop**.
2. Klick på "Generera Nytt Manus" → `PromptBuilder.ScriptPrompt` bygger en prompt som begär JSON (`{"script", "hint"}`) → `GeminiService.GeneratePracticeScriptAsync` anropar Gemini med `responseMimeType: application/json`, strippar ev. ```-staket och tolkar svaret.

### Inspelning och uppspelning

1. Blazor anropar `audioRecorder.start(dotNetRef)` via JS interop; JS begär mikrofonen och startar MediaRecorder.
2. Vid stopp skapas en blob med **inspelningens faktiska format** (`MediaRecorder.mimeType` — webm i Chrome/Edge, ogg i Firefox).
3. Uppspelning sker via `URL.createObjectURL` — ljudet stannar i webbläsarens minne (en base64-data-URL via servern var för stor för tillförlitlig uppspelning; åtgärdat i `89d0e75`).
4. Base64-kopian skickas till .NET via `[JSInvokable] OnRecordingComplete` och behålls på servern för AI-analysen.

### Visualisering

`MockVocalDataGenerator` skapar 100 datapunkter (10 s × 10/s) med slumpad tonhöjd/intensitet och placerar manusets ord jämnt över kurvan, snappade till närmaste datapunkt. **Detta är låtsasdata** — riktig ljudanalys är inte implementerad (avsiktligt arv från React-versionen). AI-coachen lyssnar däremot på det riktiga ljudet.

`VocalChart` ritar SVG: utjämnad kurva (Catmull-Rom→bezier), rutnät, axlar, ordmarkörer färgkodade via `VocalLevels.Classify` (relativt hög ≥ 70 %, låg ≤ 30 % av markörernas spann), markeringslinje och tooltip. Hover-val görs med osynliga rect-band per ord i stället för muskoordinater, eftersom koordinatmappning inte fungerar över SignalR.

### AI-coachning

Första analysen kräver klick på "Aktivera Coaching" (tokensparande — se regler nedan). Då skickas analysprompt + base64-ljud till Gemini. Chatthistoriken (endast text) skickas med i varje efterföljande anrop; gamla ljudinspelningar skickas inte om. Uppföljningsinspelningar startade från chattens "Gör ny inspelning" analyseras automatiskt, eftersom avsikten då redan är uttryckt.

`GeminiService.TryModelsAsync` provar `gemini-3.5-flash` → `gemini-flash-latest` → `gemini-flash-lite-latest`, 2 försök per modell med 800 ms paus. Vid totalt misslyckande returneras vänliga svenska fallback-texter — appen visar aldrig råa API-fel.

## Konfiguration och hemligheter

- `GEMINI_API_KEY` läses via `IConfiguration` (miljövariabel eller `dotnet user-secrets` i utveckling; UserSecretsId finns i csproj).
- Utan nyckel är appen fullt användbar med fallback-manus; endast live-AI:n saknas.

## Tester

14 xunit-tester i `RostdynamikLab.Tests/` som vaktar riktiga felmoder:

- `VocalLevelsTests` — tröskelklassificering inkl. gränsvärden och nollspann
- `PromptBuilderTests` — promptkontrakt (ljud→"LYSSNA", uppföljning→historik, trimning)
- `ModelsTests` — startmanus finns för alla tonlägen (skyddar mot `KeyNotFoundException` vid nytt tonläge)

Medvetet otestat: `GeminiService`s HTTP-logik (kräver mockad `HttpClient`) och Razor-komponenterna (kräver bUnit). Identifierade som nästa värdefulla tillskott.

## Kända begränsningar

1. **Grafdatan är slumpad** — riktig pitch-/intensitetsanalys (Web Audio API: autokorrelation + RMS) är den största funktionella luckan.
2. **Tailwind via CDN** rekommenderas inte för produktion (CSS genereras i webbläsaren per sidladdning) och kräver internet.
3. **WCAG-luckor**: ordval i graferna är musberoende (ej tangentbord), graferna saknar textalternativ för skärmläsare, viss gråtext ligger nära kontrastgränsen.
4. **Ingen CI/CD ännu** — pipelines är nästa steg (se CLAUDE.md: projektets mål är DevOps-lärande inför AZ-400).
5. Appen fungerar inte i VS Codes inbyggda webbläsare (saknar mikrofon-/ljudstöd) — använd riktig webbläsare.
