using RostdynamikLab.Models;

namespace RostdynamikLab.Services;

/// <summary>
/// Genererar slumpade röstkurvor och ordmarkörer. Riktig ljudanalys är inte
/// implementerad — detta beteende är avsiktligt ärvt från React-versionen.
/// </summary>
public static class MockVocalDataGenerator
{
    private const int DurationSeconds = 10;
    private const int PointsPerSecond = 10;

    private static readonly Random Rng = new();

    public static List<VocalDataPoint> GenerateCurve()
    {
        const int numPoints = DurationSeconds * PointsPerSecond;
        var data = new List<VocalDataPoint>(numPoints);
        for (var i = 0; i < numPoints; i++)
        {
            var time = (double)i / PointsPerSecond;
            var pitch = 100 + Rng.NextDouble() * 100 + Math.Sin(time * 0.5 + Rng.NextDouble() * Math.PI) * (30 + Rng.NextDouble() * 20);
            var intensity = Math.Clamp(0.4 + Math.Sin(time * 0.8 + Rng.NextDouble() * Math.PI * 0.5) * 0.3 + (Rng.NextDouble() - 0.5) * 0.2, 0, 1);
            data.Add(new VocalDataPoint(time, pitch, intensity));
        }
        return data;
    }

    /// <summary>Placerar manusets ord jämnt över kurvan och snäpper varje ord till närmaste datapunkt.</summary>
    public static List<WordMarkerPoint> GenerateWordMarkers(string script, IReadOnlyList<VocalDataPoint> data)
    {
        if (string.IsNullOrWhiteSpace(script) || data.Count == 0) return [];

        var words = script.Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries);
        var duration = data[^1].Time;
        return words.Select((word, index) =>
        {
            var estimatedTime = (index + 0.5) * (duration / words.Length);
            var closest = data.MinBy(p => Math.Abs(p.Time - estimatedTime))!;
            return new WordMarkerPoint(closest.Time, closest.Pitch, closest.Intensity, word);
        }).ToList();
    }
}
