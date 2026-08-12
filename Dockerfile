# Steg 1: bygg och publicera med SDK-imagen (stor, behövs bara under bygget).
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Kopiera csproj först och restore separat — då cachar Docker paketen
# och hoppar över restore när bara källkoden ändrats.
COPY RostdynamikLab/RostdynamikLab.csproj RostdynamikLab/
RUN dotnet restore RostdynamikLab/RostdynamikLab.csproj

COPY RostdynamikLab/ RostdynamikLab/
RUN dotnet publish RostdynamikLab/RostdynamikLab.csproj -c Release -o /app

# Steg 2: kör på runtime-imagen — bara ASP.NET, ingen kompilator följer med.
# Debian-varianten har ICU installerat, vilket krävs eftersom projektet kör
# med InvariantGlobalization=false (alpine/chiseled saknar det och kraschar).
FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=build /app .

# APP_UID är en icke-root-användare som finns i imagen. Därför lyssnar
# appen på 8080 och inte 80 — portar under 1024 kräver root.
USER $APP_UID
EXPOSE 8080

ENTRYPOINT ["dotnet", "RostdynamikLab.dll"]
