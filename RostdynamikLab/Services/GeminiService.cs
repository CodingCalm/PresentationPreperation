using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using RostdynamikLab.Models;

namespace RostdynamikLab.Services;

public class GeminiService(HttpClient httpClient, IConfiguration configuration, ILogger<GeminiService> logger)
{
    private static readonly string[] Models = ["gemini-3.5-flash", "gemini-flash-latest", "gemini-flash-lite-latest"];
    private const string BaseUrl = "https://generativelanguage.googleapis.com/v1beta/models";

    private const string SystemInstruction =
        "Du är en vänlig och hjälpsam röstcoach-AI. Ditt mål är att hjälpa användaren att förbättra sitt tal och sin röstleverans. " +
        "Svara alltid på svenska. Om du får en ljudinspelning för den första analysen, basera din feedback primärt på den och hur användaren låter. " +
        "Ge konkreta och uppmuntrande råd. Undvik att vara repetitiv. Fråga gärna klargörande frågor om det behövs för att ge bättre råd. " +
        "Håll svaren relativt korta och fokuserade.";

    private static readonly Dictionary<string, (string Script, string Hint)> FallbackScripts = new()
    {
        ["confident"] = (
            "Jag är helt övertygad om att vårt team har den perfekta lösningen på det här problemet. Vi har analyserat all data och är redo att ta nästa steg med full kraft.",
            "Tala med en stadig, fyllig röst. Håll ett jämnt tempo och betona nyckelord som 'övertygad' och 'full kraft'."),
        ["questioning"] = (
            "Är vi verkligen helt säkra på att den här strategin är bäst på lång sikt? Vad händer om förutsättningarna plötsligt förändras i höst?",
            "Höj tonhöjden något i slutet av varje mening för att uttrycka nyfikenhet, intresse och eftertanke."),
        ["enthusiastic"] = (
            "Det här är en helt fantastisk möjlighet för oss alla! Jag kan knappt bärga mig tills vi drar igång projektet och får se resultatet av vårt arbete.",
            "Använd stor röstvariation, ett lite snabbare tempo och låt ditt engagemang och glädje skina igenom!"),
        ["calm"] = (
            "Ta ett djupt andetag. Vi har gott om tid på oss att gå igenom den här rapporten tillsammans, och vi kommer att lösa alla detaljer i lugn och ro.",
            "Tala i ett långsammare, tryggt tempo med djupa andetag och naturliga pauser efter varje mening."),
        ["assertive"] = (
            "Det här beslutet ligger fast och det är det här spåret vi ska följa nu. Jag förväntar mig att alla levererar sina delar enligt den överenskomna planen.",
            "Använd en fast, bestämd ton utan darrningar, och avsluta dina meningar med en tydlig, nedåtgående intonation.")
    };

    private string? ApiKey =>
        configuration["GEMINI_API_KEY"] ?? configuration["API_KEY"];

    // Startmanus utan API-anrop: Gemini anropas först när användaren aktivt genererar ett nytt manus
    public static (string Script, string Hint) GetStarterScript(PracticeMode mode) =>
        FallbackScripts[mode.EnglishPromptTerm()];

    public async Task<(string Script, string Hint)> GeneratePracticeScriptAsync(string prompt)
    {
        if (string.IsNullOrEmpty(ApiKey))
        {
            logger.LogWarning("GEMINI_API_KEY saknas. Använder fallback-manus.");
            return GetFallback(prompt);
        }

        var request = new JsonObject
        {
            ["contents"] = new JsonArray(new JsonObject
            {
                ["role"] = "user",
                ["parts"] = new JsonArray(new JsonObject { ["text"] = prompt })
            }),
            ["generationConfig"] = new JsonObject
            {
                ["responseMimeType"] = "application/json"
            }
        };

        var responseText = await TryModelsAsync(request);
        if (responseText is null)
        {
            logger.LogWarning("Alla modeller misslyckades eller var överbelastade. Returnerar svenskt fallback-manus.");
            return GetFallback(prompt);
        }

        try
        {
            var json = StripCodeFences(responseText);
            var parsed = JsonNode.Parse(json);
            var script = parsed?["script"]?.GetValue<string>();
            var hint = parsed?["hint"]?.GetValue<string>();
            if (!string.IsNullOrEmpty(script) && !string.IsNullOrEmpty(hint))
            {
                return (script, hint);
            }
            logger.LogWarning("Ogiltigt JSON-format från AI, använder fallback. Svar: {Response}", responseText);
        }
        catch (JsonException ex)
        {
            logger.LogWarning(ex, "Kunde inte tolka JSON-svar för manus: {Response}", responseText);
        }
        return GetFallback(prompt);
    }

    public async Task<string> ChatAsync(
        IEnumerable<ChatMessage> history,
        string userMessageText,
        string? audioData = null,
        string? audioMimeType = null)
    {
        if (string.IsNullOrEmpty(ApiKey))
        {
            return "Röstcoachen är redo! Din röstvisualisering (tonhöjd och intensitet) mäts och ritas upp helt i realtid på skärmen lokalt. Spela in din röst för att se din röstkurva!";
        }

        var contents = new JsonArray();
        foreach (var msg in history)
        {
            if (msg.Sender is not ("user" or "ai")) continue;
            contents.Add(new JsonObject
            {
                ["role"] = msg.Sender == "user" ? "user" : "model",
                ["parts"] = new JsonArray(new JsonObject { ["text"] = msg.Text })
            });
        }

        var userParts = new JsonArray();
        if (!string.IsNullOrEmpty(audioData) && !string.IsNullOrEmpty(audioMimeType))
        {
            userParts.Add(new JsonObject
            {
                ["inlineData"] = new JsonObject
                {
                    ["mimeType"] = audioMimeType,
                    ["data"] = audioData
                }
            });
        }
        userParts.Add(new JsonObject { ["text"] = userMessageText });
        contents.Add(new JsonObject { ["role"] = "user", ["parts"] = userParts });

        var request = new JsonObject
        {
            ["systemInstruction"] = new JsonObject
            {
                ["parts"] = new JsonArray(new JsonObject { ["text"] = SystemInstruction })
            },
            ["contents"] = contents
        };

        var responseText = await TryModelsAsync(request);
        if (responseText is not null)
        {
            return responseText;
        }

        logger.LogWarning("Alla chattmodeller misslyckades eller var överbelastade. Returnerar vänligt offline-meddelande.");
        return "Live AI-coachen är tillfälligt överbelastad på grund av hög efterfrågan. \n\nMen du kan fortsätta öva! Din röstvisualisering fungerar fullt ut lokalt – du kan se dina kurvor för både **tonhöjd (Pitch)** och **ljudstyrka (Intensity)** i diagrammen nedanför manuset direkt när du spelat in. Försök gärna igen om en liten stund för att få live-feedback!";
    }

    private async Task<string?> TryModelsAsync(JsonObject request)
    {
        var payload = request.ToJsonString();

        foreach (var model in Models)
        {
            for (var attempt = 1; attempt <= 2; attempt++)
            {
                try
                {
                    using var content = new StringContent(payload, Encoding.UTF8, "application/json");
                    using var httpRequest = new HttpRequestMessage(HttpMethod.Post, $"{BaseUrl}/{model}:generateContent")
                    {
                        Content = content
                    };
                    httpRequest.Headers.Add("x-goog-api-key", ApiKey);

                    using var response = await httpClient.SendAsync(httpRequest);
                    var body = await response.Content.ReadAsStringAsync();

                    if (response.IsSuccessStatusCode)
                    {
                        var text = ExtractText(body);
                        if (!string.IsNullOrEmpty(text))
                        {
                            return text;
                        }
                    }
                    else
                    {
                        logger.LogWarning("Försök {Attempt} med modell {Model} misslyckades: {Status} {Body}",
                            attempt, model, (int)response.StatusCode, Truncate(body, 500));
                    }
                }
                catch (Exception ex)
                {
                    logger.LogWarning(ex, "Försök {Attempt} med modell {Model} misslyckades", attempt, model);
                }

                if (attempt < 2)
                {
                    await Task.Delay(800);
                }
            }
        }
        return null;
    }

    private static string? ExtractText(string responseBody)
    {
        var node = JsonNode.Parse(responseBody);
        var parts = node?["candidates"]?[0]?["content"]?["parts"]?.AsArray();
        if (parts is null) return null;

        var sb = new StringBuilder();
        foreach (var part in parts)
        {
            var text = part?["text"]?.GetValue<string>();
            if (text is not null) sb.Append(text);
        }
        return sb.Length > 0 ? sb.ToString() : null;
    }

    private static (string Script, string Hint) GetFallback(string prompt)
    {
        var lower = prompt.ToLowerInvariant();
        var selected = FallbackScripts["confident"];
        if (lower.Contains("confident") || lower.Contains("självsäker")) selected = FallbackScripts["confident"];
        else if (lower.Contains("questioning") || lower.Contains("frågande")) selected = FallbackScripts["questioning"];
        else if (lower.Contains("enthusiastic") || lower.Contains("entusiastisk")) selected = FallbackScripts["enthusiastic"];
        else if (lower.Contains("calm") || lower.Contains("lugn")) selected = FallbackScripts["calm"];
        else if (lower.Contains("assertive") || lower.Contains("bestämd")) selected = FallbackScripts["assertive"];

        return (selected.Script,
            $"{selected.Hint} (Obs: Live-coachen har hög belastning just nu, så vi laddade ett beprövat övningsmanus!)");
    }

    private static string StripCodeFences(string text)
    {
        var trimmed = text.Trim();
        if (trimmed.StartsWith("```"))
        {
            var firstNewline = trimmed.IndexOf('\n');
            var lastFence = trimmed.LastIndexOf("```", StringComparison.Ordinal);
            if (firstNewline >= 0 && lastFence > firstNewline)
            {
                return trimmed[(firstNewline + 1)..lastFence].Trim();
            }
        }
        return trimmed;
    }

    private static string Truncate(string s, int max) =>
        s.Length <= max ? s : s[..max];
}
