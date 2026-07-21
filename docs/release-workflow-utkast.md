# Release-workflow — utkast (steg 3, ej aktiverat)

*Senast uppdaterad: 2026-07-21. Utkast/referens — ingen aktiv workflow. Aktivera när releaser ska börja skapas.*

## Syfte

Detta är det pausade sista steget i release notes-kedjan. De två första stegen är byggda och i drift:

1. **`.github/release.yml`** ✅ — grupperar release notes per PR-label.
2. **`.github/workflows/labeler.yml`** ✅ — sätter labels automatiskt utifrån branch-prefix.
3. **Release-workflow** ⏸️ — *detta dokument*. Skapar en GitHub Release med auto-genererade notes när en tag pushas.

## Release-filosofi (varför tag-triggad)

En release är en **medveten handling vid leverans**, inte något som smäller vid varje merge. Vi skiljer på tre saker:

| Begrepp | Betydelse | Frekvens |
|---|---|---|
| Deployment | Koden rullas ut till en miljö | Ofta |
| Release | Namngiven, spårbar version (tag + notes) | Vid leverans |
| Delivery | Kunden får faktiskt tillgång | Vid affärsbeslut |

Modellen: *sprint klar → skapa release (changelog för deltat) → deploy till kund*. Releasen dokumenterar vad som är nytt sedan förra leveransen. Därför triggas workflowen **på en tag** (`v1.3.0`) — inte på varje merge.

## Pre-release (RC) och "latest"

- **Stabil release** (`v1.3.0`) = det kunden får. Blir automatiskt "Latest release".
- **Pre-release** (`v1.3.0-rc.1`, bindestreck = semver pre-release) = kandidat att validera i staging/UAT. Blir *aldrig* latest.
- Man **promotar inte** en RC till latest — man skapar en **ny ren tag** `v1.3.0` (kan peka på samma commit som den godkända RC:n). RC:n ligger kvar som spår av vad som testades.

## Delta mot förra *stabila* releasen (ignorera pre-releases)

Noten ska visa "det som är nytt för kunden sedan förra leveransen" — alltså räknat från förra **stabila** releasen, inte från mellanliggande RC:er. Knepet: GitHubs endpoint `repos/{owner}/{repo}/releases/latest` returnerar bara den senaste stabila releasen (ignorerar pre-releases och drafts), och används som `--notes-start-tag`.

## Workflow (klar att lägga i `.github/workflows/release.yml`)

```yaml
name: Release
on:
  push:
    tags: ['v*']
permissions:
  contents: write
jobs:
  release:
    runs-on: ubuntu-latest
    env:
      GH_TOKEN: ${{ github.token }}
      TAG: ${{ github.ref_name }}
    steps:
      - uses: actions/checkout@v4
      - name: Skapa release med delta sedan förra STABILA releasen
        run: |
          # Förra stabila taggen – detta API ignorerar pre-releases och drafts
          prev=$(gh api "repos/${{ github.repository }}/releases/latest" --jq .tag_name 2>/dev/null || echo "")

          # Bindestreck i taggen ⇒ pre-release (v1.3.0-rc.1), annars stabil
          case "$TAG" in
            *-*) flag="--prerelease" ;;
            *)   flag="--latest" ;;
          esac

          # Har vi en tidigare stabil release: räkna deltat därifrån
          start=""
          [ -n "$prev" ] && start="--notes-start-tag $prev"

          gh release create "$TAG" --generate-notes $flag $start
```

### Beteende

- **`v1.3.0`** (stabil) → `--latest`, noten spänner från förra stabila. RC:er mellan dem hoppas över.
- **`v1.3.0-rc.1`** (pre-release) → `--prerelease` (aldrig latest), noten räknas ändå från förra stabila så hela det föreslagna deltat syns.
- **Första releasen** → `releases/latest` ger 404, `prev` blir tomt, `--notes-start-tag` hoppas → hela historiken tas med (rätt för v1.0.0).

## Så här skapar man en release (när workflowen är aktiv)

```powershell
# på main, uppdaterad och ren:
git tag -a v1.3.0 -m "v1.3.0"
git push origin v1.3.0        # triggar workflowen
```

Semver: MAJOR (brytande), MINOR (ny funktion), PATCH (fix).

## Branch-strategi

Så länge `main` = produktion räcker **GitHub Flow + tags** (tagga main). Först när `main` springer ifrån produktion (omsläppt arbete på main medan kund kör äldre version) införs `release/*`- och `hotfix/*`-brancher för att stabilisera/patcha en släppt version separat. Prefixen finns redan i branch-konventionen.
