# Delad branch-namn-konvention för hookarna (pre-push + post-checkout).
# Prefixen speglar kategorierna i .github/release.yml så att hela kedjan hänger ihop:
#   branch feature/... → PR-label "feature" → release notes-rubrik 🚀 Nya funktioner
BRANCH_PATTERN='^(feature|fix|bugfix|hotfix|docs|refactor|test|ci|devops|chore|release)/.+'
BRANCH_PREFIX_HINT='feature/  fix/  bugfix/  hotfix/  docs/  refactor/  test/  ci/  devops/  chore/  release/'

# branch_ok <namn> → returnerar 0 (ok) om namnet matchar konventionen eller är main.
branch_ok() {
  [ "$1" = "main" ] && return 0
  echo "$1" | grep -Eq "$BRANCH_PATTERN"
}
