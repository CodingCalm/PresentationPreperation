# Steg 1: bygg och publicera med SDK-imagen (stor, behövs bara under bygget).
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Kopiera csproj först och restore separat — då cachar Docker paketen
# och hoppar över restore när bara källkoden ändrats.
COPY RostdynamikLab/RostdynamikLab.csproj RostdynamikLab/
RUN dotnet restore RostdynamikLab/RostdynamikLab.csproj

COPY RostdynamikLab/ RostdynamikLab/
# --no-restore: raden ovan har redan gjort det, annars körs restore två gånger.
RUN dotnet publish RostdynamikLab/RostdynamikLab.csproj -c Release -o /app --no-restore

# Steg 2: kör på chiseled — Ubuntu nedskalad till exakt det .NET behöver.
# Varken shell eller pakethanterare följer med, vilket halverar storleken och
# tar bort de verktyg en angripare annars hade kunnat använda efter ett intrång.
# Priset: felsökning sker via `podman logs`, inte `podman exec ... bash`.
#
# -extra är obligatoriskt — den varianten innehåller ICU, som krävs eftersom
# projektet kör med InvariantGlobalization=false. Utan ICU startar appen inte alls.
FROM mcr.microsoft.com/dotnet/aspnet:10.0-noble-chiseled-extra

# Kopplar imagen till källkoden, t.ex. när den pushas till GitHub Packages.
LABEL org.opencontainers.image.source="https://github.com/CodingCalm/PresentationPreperation"

WORKDIR /app
COPY --from=build /app .

# APP_UID är en icke-root-användare som finns i imagen. Därför lyssnar
# appen på 8080 och inte 80 — portar under 1024 kräver root.
USER $APP_UID
EXPOSE 8080

ENTRYPOINT ["dotnet", "RostdynamikLab.dll"]
