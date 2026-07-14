using RostdynamikLab.Models;

namespace RostdynamikLab.Tests;

public class VocalLevelsTests
{
    [Theory]
    [InlineData(100, VocalLevel.Low)]    // botten av spannet
    [InlineData(129, VocalLevel.Low)]    // strax under låg-tröskeln (30 % av 100-200)
    [InlineData(150, VocalLevel.Normal)] // mitten
    [InlineData(170, VocalLevel.High)]   // exakt på hög-tröskeln (70 %)
    [InlineData(200, VocalLevel.High)]   // toppen av spannet
    public void Classify_KlassificerarVardeRelativtSpannet(double value, VocalLevel expected)
    {
        Assert.Equal(expected, VocalLevels.Classify(value, min: 100, max: 200));
    }

    [Fact]
    public void Classify_NollspannGerNormal()
    {
        // Alla ord har samma värde: inget kan vara relativt högt eller lågt
        Assert.Equal(VocalLevel.Normal, VocalLevels.Classify(150, min: 150, max: 150));
    }
}
