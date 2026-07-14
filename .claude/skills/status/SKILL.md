---
name: status
description: Visa repots läge — arbetsträdets status, aktuell branch, senaste commits och ev. öppen PR. Använd när användaren vill ha en snabb överblick av git-läget.
---

Ge en snabb, läsbar överblick av repots läge på svenska.

## Steg

1. Kör `git status` och `git log --oneline -5`.
2. Kör `git branch --show-current` och notera ahead/behind mot origin (syns i status).
3. Står vi på en feature-branch: kolla om den har en öppen PR med `gh pr view --json number,title,state,statusCheckRollup` och visa i så fall PR-status och checkarnas läge (grönt/rött/pågår).
4. Sammanfatta kort: branch, rent/smutsigt arbetsträd (vilka filer i så fall), synk med origin, senaste commits, PR-läge.

## Regler

- Enbart läsande kommandon — ändra ingenting.
- Om `gh pr view` visar att ingen PR finns är det inget fel — säg bara att branchen saknar PR.
