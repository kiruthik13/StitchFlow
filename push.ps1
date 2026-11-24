# StitchFlow Git Push Helper Script
$gitPath = "C:\Users\Kathik\git\cmd"
if ($env:PATH -notlike "*$gitPath*") {
    $env:PATH = "$gitPath;$env:PATH"
}

Write-Host "Checking Git status..." -ForegroundColor Cyan
git status -s

Write-Host "`nPushing to https://github.com/kiruthik13/StitchFlow.git (main)..." -ForegroundColor Green
git push -u origin main
