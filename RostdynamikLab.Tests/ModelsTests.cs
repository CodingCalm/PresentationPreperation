using RostdynamikLab.Models;
using RostdynamikLab.Services;

namespace RostdynamikLab.Tests;

public class ModelsTests
{
    [Fact]
    public void GetStarterScript_FinnsForAllaTonlagen()
    {
        foreach (var mode in Enum.GetValues<PracticeMode>())
        {
            var (script, hint) = GeminiService.GetStarterScript(mode);

            Assert.False(string.IsNullOrWhiteSpace(script));
            Assert.False(string.IsNullOrWhiteSpace(hint));
        }
    }
}
