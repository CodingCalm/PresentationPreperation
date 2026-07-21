---
name: rensa
description: Städa efter en mergad PR — växla till main, pulla, och ta bort den lokala mergade feature-branchen. Använd efter att ett /ship mergats.
---

Rensa upp lokalt efter att en feature-branch squash-mergats till main.

## Steg

1. **Hitta branchen:** nuvarande branch (`git branch --show-current`). Är den redan `main`, fråga vilken branch som ska bort.
2. **Bekräfta merge:** `gh pr view <branch> --json state` ska visa `MERGED`. Är den inte mergad — stanna och säg det, radera inget.
3. **Växla + uppdatera:** `git checkout main && git pull`.
4. **Ta bort lokalt:** `git branch -D <branch>` (stort `D` krävs eftersom squash-merge döljer att branchen är mergad).
5. **Rapportera** vad som togs bort.

## Regler

- Radera aldrig en obekräftad/omergad branch — kontrollera i steg 2 först.
- `-D`, inte `-d` (squash-merge, se CLAUDE.md).
- Saknas `gh` i PATH: prova `"C:\Program Files\GitHub CLI\gh.exe"`.
