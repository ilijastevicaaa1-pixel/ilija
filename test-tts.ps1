$body = '{"text":"Pozdrav"}'
try {
    $resp = Invoke-WebRequest -Uri "https://knjigovodstvo-backend.onrender.com/tts" -Method POST -Body $body -ContentType "application/json" -ErrorAction Stop
    Write-Host "Status:" $resp.StatusCode
    Write-Host "Content:" $resp.Content
} catch {
    Write-Host "Error:" $_.Exception.Message
    Write-Host "Status Code:" $_.Exception.Response.StatusCode.value__
}