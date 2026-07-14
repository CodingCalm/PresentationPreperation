using RostdynamikLab.Models;
using RostdynamikLab.Services;

namespace RostdynamikLab.Tests;

public class MockVocalDataGeneratorTests
{
    [Fact]
    public void GenerateCurve_GerVardenInomRimligaGranser()
    {
        var data = MockVocalDataGenerator.GenerateCurve();

        Assert.Equal(100, data.Count); // 10 sekunder × 10 punkter/sekund
        Assert.All(data, p => Assert.InRange(p.Intensity, 0, 1));
        Assert.All(data, p => Assert.True(p.Pitch > 0));
    }

    [Fact]
    public void GenerateCurve_TidenStigerMonotont()
    {
        var data = MockVocalDataGenerator.GenerateCurve();

        for (var i = 1; i < data.Count; i++)
        {
            Assert.True(data[i].Time > data[i - 1].Time);
        }
    }

    [Fact]
    public void GenerateWordMarkers_EttMarkorPerOrd()
    {
        var data = MockVocalDataGenerator.GenerateCurve();

        var markers = MockVocalDataGenerator.GenerateWordMarkers("Detta är fyra ord", data);

        Assert.Equal(4, markers.Count);
        Assert.Equal(["Detta", "är", "fyra", "ord"], markers.Select(m => m.Word));
    }

    [Fact]
    public void GenerateWordMarkers_SnapparTillDatapunkter()
    {
        var data = MockVocalDataGenerator.GenerateCurve();

        var markers = MockVocalDataGenerator.GenerateWordMarkers("hej på dig", data);

        Assert.All(markers, m => Assert.Contains(data,
            p => p.Time == m.Time && p.Pitch == m.Pitch && p.Intensity == m.Intensity));
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void GenerateWordMarkers_TomtManusGerTomLista(string script)
    {
        var data = MockVocalDataGenerator.GenerateCurve();

        Assert.Empty(MockVocalDataGenerator.GenerateWordMarkers(script, data));
    }
}
