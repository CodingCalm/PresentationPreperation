using RostdynamikLab.Models;

namespace RostdynamikLab.Services;

/// <summary>Bygger alla prompter till Gemini. Ren stränglogik utan beroenden — enkel att enhetstesta.</summary>
public static class PromptBuilder
{
    private const string CommonJsonInstruction =
        "Generera ett JSON-objekt med två nycklar: \"script\" och \"hint\". \"script\" ska vara ett kort övningsmanus (2-3 meningar) på svenska. " +
        "\"hint\" ska vara ett koncist (1 mening) tips på svenska, direkt relaterat till att öva detta specifika manus med den angivna tonen. " +
        "Inkludera inte tipset inom manustexten. Se till att hela outputen är giltig JSON och att både manus och tips är på svenska.";

    public static string ScriptObjective(PracticeMode mode, string customInstructions) =>
        string.IsNullOrWhiteSpace(customInstructions)
            ? $"Öva en {mode.SwedishObjective()} ton."
            : $"Öva en {mode.SwedishObjective()} ton angående: \"{customInstructions.Trim()}\".";

    public static string ScriptPrompt(PracticeMode mode, string customInstructions)
    {
        var term = mode.EnglishPromptTerm();
        return string.IsNullOrWhiteSpace(customInstructions)
            ? $"\"script\" ska vara utformat för att hjälpa någon att öva en {term} talton och vara lämpligt för övning av röstvariation. {CommonJsonInstruction}"
            : $"\"script\" ska handla om \"{customInstructions.Trim()}\" för en {term} talton. {CommonJsonInstruction}";
    }

    public static string AnalysisPrompt(
        string script, string hint, PracticeMode mode, string customInstructions,
        string? audioMimeType, bool isFollowUp)
    {
        var tone = mode.SwedishObjective();
        var custom = string.IsNullOrEmpty(customInstructions) ? "" : $" angående ämnet: \"{customInstructions}\"";
        var hintText = string.IsNullOrEmpty(hint) ? "" : $" Manustipset var: \"{hint}\"";
        var hasAudio = audioMimeType is not null;

        if (!isFollowUp)
        {
            var prompt = $"Baserat på följande övningsmanus: \"{script}\"{hintText}, med målsättningen att öva en {tone} ton{custom}. ";
            prompt += hasAudio
                ? $"Bifogat finns en ljudinspelning **på svenska** av användarens försök (MIME-typ: {audioMimeType}). LYSSNA på den **svenska** ljudinspelningen och ge 2-3 konkreta, handlingsbara tips på svenska för hur användaren kan förbättra sitt framförande baserat på HUR DE LÄT. Fokusera på deras ton, intonation, tempo, pausering, och hur väl den avsedda tonen och ämnet kommunicerades vokalt **på svenska**. Var specifik och ge exempel från manuset om möjligt."
                : "Ge en kort textbaserad analys (2-3 konkreta, handlingsbara tips) på svenska om vad användaren kan fokusera på för att förbättra sitt framförande med den angivna tonen och ämnet, baserat på texten. Fokusera på potentiella utmaningar med att leverera detta manus med den givna tonen.";
            return prompt + " Starta direkt med analysen utan en hälsningsfras. Svara på svenska.";
        }

        return hasAudio
            ? $"Här är en ny ljudinspelning **på svenska** (MIME-typ: {audioMimeType}) för samma manus och målsättning som vi diskuterade tidigare. Manuset är: \"{script}\". Målsättningen var en {tone} ton{custom}.{hintText} Vår tidigare konversation och dina tidigare råd finns i chatthistoriken. LYSSNA noggrant på denna NYA inspelning. Jämför med eventuella tidigare försök och den feedback som getts. Vad har användaren förbättrat vokalt sedan senast? Vad kan de fortfarande arbeta på för att bättre uppnå målet med denna inspelning? Ge 2-3 konkreta, nya tips på svenska. Fokusera på förändringar, framsteg och fortsatta utvecklingsområden. Starta direkt med din uppföljningsanalys. Svara på svenska."
            : $"Användaren vill ha ytterligare feedback på manuset: \"{script}\" (Mål: {tone} ton{custom}{hintText}). Vår tidigare konversation finns i chatthistoriken. Ge ytterligare 2-3 konkreta tips baserat på vår tidigare diskussion och vad användaren kan fokusera på härnäst. Svara på svenska.";
    }
}
