using RostdynamikLab.Models;
using RostdynamikLab.Services;

namespace RostdynamikLab.Tests;

public class ModelsTests
{
    [Fact]
    public void ChatMessage_FromUser_MarkerasSomAnvandare()
    {
        var msg = ChatMessage.FromUser("hej");

        Assert.True(msg.IsUser);
        Assert.Equal("hej", msg.Text);
        Assert.StartsWith("user-", msg.Id);
    }

    [Fact]
    public void ChatMessage_FromAi_MarkerasInteSomAnvandare()
    {
        var msg = ChatMessage.FromAi("svar");

        Assert.False(msg.IsUser);
        Assert.StartsWith("ai-", msg.Id);
    }

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
