[![Board Status](https://dev.azure.com/henriktester/67046b7b-f336-4154-b841-d296f1564202/733489d7-8ace-48ae-80b2-d7622ce3d1f1/_apis/work/boardbadge/ca667be9-0183-4068-be68-0b1b46df648a)](https://dev.azure.com/henriktester/67046b7b-f336-4154-b841-d296f1564202/_boards/board/t/733489d7-8ace-48ae-80b2-d7622ce3d1f1/Microsoft.RequirementCategory)
# Röstdynamik Lab

AI-driven träning av röst och presentation — öva olika taltoner (självsäker, frågande, entusiastisk, lugn, bestämd), spela in dig själv och få feedback från en AI-coach. Byggd med Blazor Web App på .NET 10.

## Kör lokalt

**Förkrav:** [.NET 10 SDK](https://dotnet.microsoft.com/download/dotnet/10.0)

1. Sätt din Gemini API-nyckel (engångsinställning):
   ```powershell
   cd RostdynamikLab
   dotnet user-secrets set "GEMINI_API_KEY" "din-nyckel"
   ```
   Utan nyckel fungerar appen ändå, men med inbyggda övningsmanus i stället för AI-genererade.

2. Starta appen:
   ```powershell
   dotnet run
   ```

3. Öppna http://localhost:5000 och tillåt mikrofonåtkomst.

AI-anrop görs bara när du aktivt klickar på "Generera Nytt Manus" eller "Aktivera Coaching" — inga tokens förbrukas i bakgrunden.

> Historik: projektet var ursprungligen en React/Vite-app genererad i Google AI Studio; den porterades till Blazor 2026-07-14. React-versionen finns kvar i git-historiken före den porteringscommitten.
