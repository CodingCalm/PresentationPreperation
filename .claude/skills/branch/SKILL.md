---
name: branch
description: Lista brancher eller skapa en ny feature-branch. Utan argument visas alla brancher; med argument skapas feature/<namn> från senaste main. Använd när användaren vill se eller byta/skapa branch.
---

Hantera brancher enligt repots GitHub Flow (se CLAUDE.md).

## Utan argument — lista

1. Kör `git branch -vv` (lokala, med tracking-info) och `git branch -r` (remotes).
2. Visa aktuell branch tydligt och flagga lokala brancher som redan är mergade till main (`git branch --merged main`) som kandidater att städa bort.

## Med argument — skapa ny branch

1. Har arbetsträdet ocommittade ändringar: fråga användaren om de ska följa med till nya branchen eller committas först — gissa inte.
2. Utgå alltid från färsk main: `git checkout main && git pull`.
3. Skapa branchen: `git checkout -b feature/<namn>` (normalisera namnet: gemener, bindestreck i stället för mellanslag; behåll prefixet om användaren redan angett t.ex. `fix/`).
4. Bekräfta med `git status`.

## Regler

- Radera aldrig brancher utan att fråga.
- Committa aldrig direkt på main.
