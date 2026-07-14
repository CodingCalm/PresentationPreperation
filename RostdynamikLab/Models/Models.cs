namespace RostdynamikLab.Models;

public record VocalDataPoint(double Time, double Pitch, double Intensity);

public record WordMarkerPoint(double Time, double Pitch, double Intensity, string Word);

public enum PracticeMode
{
    Sjalvsaker,
    Fragande,
    Entusiastisk,
    Lugn,
    Bestamd
}

public static class PracticeModeExtensions
{
    public static string DisplayName(this PracticeMode mode) => mode switch
    {
        PracticeMode.Sjalvsaker => "Självsäker",
        PracticeMode.Fragande => "Frågande",
        PracticeMode.Entusiastisk => "Entusiastisk",
        PracticeMode.Lugn => "Lugn",
        PracticeMode.Bestamd => "Bestämd",
        _ => mode.ToString()
    };

    public static string SwedishObjective(this PracticeMode mode) => mode switch
    {
        PracticeMode.Sjalvsaker => "självsäker",
        PracticeMode.Fragande => "frågande",
        PracticeMode.Entusiastisk => "entusiastisk",
        PracticeMode.Lugn => "lugn",
        PracticeMode.Bestamd => "bestämd",
        _ => mode.ToString().ToLowerInvariant()
    };

    public static string EnglishPromptTerm(this PracticeMode mode) => mode switch
    {
        PracticeMode.Sjalvsaker => "confident",
        PracticeMode.Fragande => "questioning",
        PracticeMode.Entusiastisk => "enthusiastic",
        PracticeMode.Lugn => "calm",
        PracticeMode.Bestamd => "assertive",
        _ => mode.ToString().ToLowerInvariant()
    };
}

public class ChatMessage
{
    public required string Id { get; init; }
    public required string Sender { get; init; } // "user" eller "ai"
    public required string Text { get; init; }
    public DateTime Timestamp { get; init; } = DateTime.Now;
}
