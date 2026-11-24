$nodePath = "C:\Users\Kathik\nodejs\node-v22.23.5-win-x64"
if ($env:PATH -notlike "*$nodePath*") {
    $env:PATH = "$nodePath;$env:PATH"
}
Write-Host "Node version: $(node -v)" -ForegroundColor Green
Write-Host "Starting Expo Development Server (Cache Cleared)..." -ForegroundColor Cyan
npx expo start -c $args
