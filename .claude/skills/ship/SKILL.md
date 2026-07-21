---
name: ship
description: Skeppa aktuella ändringar till main via GitHub Flow — skapar feature-branch vid behov, committar, pushar, öppnar PR och aktiverar auto-merge (squash). Använd när användaren vill merga, skeppa eller "shippa" sitt arbete.
---

Skeppa arbetsträdets ändringar till main enligt repots branchstrategi (GitHub Flow med auto-merge, se CLAUDE.md).

## Steg

1. **Kontrollera läget:** `git status` och `git branch --show-current`.
   - Finns inga ändringar och ingen opushad branch: säg det och stanna.
2. **Branch:** Står vi på `main`, skapa en feature-branch med beskrivande namn: `git checkout -b feature/<kort-beskrivning>` (härled namnet från ändringarnas innehåll). Står vi redan på en feature-branch, använd den.
3. **Committa** ocommittade ändringar med ett bra svenskt commit-meddelande enligt repots stil (imperativ rubrik, brödtext med "vad och varför" vid behov).
4. **Pusha:** `git push -u origin <branch>`.
5. **Öppna PR:** `gh pr create --fill` (eller med utförligare `--title`/`--body` på svenska om ändringen förtjänar det).
6. **Aktivera auto-merge:** `gh pr merge --auto --squash`.
7. **Rapportera** PR-URL:en och påminn om att branch protection mergar automatiskt när `build-and-test` är grön.
8. **Städa efteråt:** när PR:en mergats — kör `/rensa` (växlar till `main`, pullar och tar bort den lokala mergade branchen).

## Regler

- Committa aldrig direkt på `main`.
- Hitta inte på ändringar — skeppa bara det som redan ligger i arbetsträdet.
- Om `gh` inte finns i PATH: prova `"C:\Program Files\GitHub CLI\gh.exe"`.
- Misslyckas CI:n: rapportera felet från `gh pr checks` i stället för att forcera merge.
