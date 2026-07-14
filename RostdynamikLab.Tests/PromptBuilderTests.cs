using RostdynamikLab.Models;
using RostdynamikLab.Services;

namespace RostdynamikLab.Tests;

public class PromptBuilderTests
{
    [Fact]
    public void ScriptObjective_UtanAmne_NamnerBaraTonen()
    {
        var objective = PromptBuilder.ScriptObjective(PracticeMode.Lugn, "");

        Assert.Equal("Öva en lugn ton.", objective);
    }

    [Fact]
    public void ScriptObjective_MedAmne_InkluderarAmnet()
    {
        var objective = PromptBuilder.ScriptObjective(PracticeMode.Sjalvsaker, "kvartalsrapporten");

        Assert.Equal("Öva en självsäker ton angående: \"kvartalsrapporten\".", objective);
    }

    [Fact]
    public void ScriptPrompt_AnvanderEngelskTonterm()
    {
        var prompt = PromptBuilder.ScriptPrompt(PracticeMode.Entusiastisk, "");

        Assert.Contains("enthusiastic", prompt);
        Assert.Contains("giltig JSON", prompt);
    }

    [Fact]
    public void ScriptPrompt_MedAmne_InkluderarAmnet()
    {
        var prompt = PromptBuilder.ScriptPrompt(PracticeMode.Bestamd, "  löneförhandling  ");

        Assert.Contains("\"löneförhandling\"", prompt); // trimmat
        Assert.Contains("assertive", prompt);
    }

    [Fact]
    public void AnalysisPrompt_ForstaAnalysenMedLjud_BerAiLyssna()
    {
        var prompt = PromptBuilder.AnalysisPrompt(
            "Ett manus.", "Ett tips.", PracticeMode.Fragande, "",
            audioMimeType: "audio/webm", isFollowUp: false);

        Assert.Contains("LYSSNA", prompt);
        Assert.Contains("audio/webm", prompt);
        Assert.Contains("frågande", prompt);
    }

    [Fact]
    public void AnalysisPrompt_UtanLjud_BegarTextbaseradAnalys()
    {
        var prompt = PromptBuilder.AnalysisPrompt(
            "Ett manus.", "", PracticeMode.Lugn, "",
            audioMimeType: null, isFollowUp: false);

        Assert.Contains("textbaserad analys", prompt);
        Assert.DoesNotContain("LYSSNA", prompt);
    }

    [Fact]
    public void AnalysisPrompt_Uppfoljning_RefererarTillTidigareKonversation()
    {
        var prompt = PromptBuilder.AnalysisPrompt(
            "Ett manus.", "Ett tips.", PracticeMode.Sjalvsaker, "ämne",
            audioMimeType: "audio/ogg", isFollowUp: true);

        Assert.Contains("NYA inspelning", prompt);
        Assert.Contains("chatthistoriken", prompt);
    }
}
