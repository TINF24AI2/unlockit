# Dieses Skript kopiert die Hooks nur und erfordert keine Administratorrechte.
# Stellt sicher, dass das Zielverzeichnis existiert
$hookDir = ".\.git\hooks"
if (-not (Test-Path $hookDir)) {
    New-Item -ItemType Directory -Path $hookDir | Out-Null
}

# Kopiert das pre-commit Skript in das .git/hooks Verzeichnis
Copy-Item -Path "..\..\scripts\pre-commit.sh" -Destination ".\.git\hooks\pre-commit" -Force