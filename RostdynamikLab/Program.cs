using RostdynamikLab.Components;
using RostdynamikLab.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddRazorComponents()
    .AddInteractiveServerComponents();

// SignalR-meddelanden måste rymma base64-kodat ljud från inspelningar
builder.Services.AddSignalR(options =>
{
    options.MaximumReceiveMessageSize = 50 * 1024 * 1024;
});

builder.Services.AddHttpClient<GeminiService>();

var app = builder.Build();

if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Error", createScopeForErrors: true);
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseAntiforgery();

app.MapStaticAssets();
app.MapRazorComponents<App>()
    .AddInteractiveServerRenderMode();

app.Run();
