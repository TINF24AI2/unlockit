# Erstellt eine symbolische Verknüpfung für den pre-commit Hook; muss als Administrator ausgeführt werden
New-Item -ItemType SymbolicLink -Path .\.git\hooks\pre-commit -Value scripts\pre-commit.sh