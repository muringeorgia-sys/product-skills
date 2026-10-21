# Выбор JSON-ключа сервисного аккаунта GA4 в окне, копия в ~/.secrets/ga4-mashina-sa.json,
# путь — в переменную Windows GA4_SA_KEY_FILE (User). Содержимое ключа не печатается.
Add-Type -AssemblyName System.Windows.Forms
$d = New-Object Windows.Forms.OpenFileDialog -Property @{Title = "JSON-ключ сервисного аккаунта GA4"; Filter = "JSON (*.json)|*.json"; InitialDirectory = "$env:USERPROFILE\Downloads"}
if ($d.ShowDialog() -ne "OK") { "cancelled"; exit 1 }
$j = Get-Content -Raw $d.FileName | ConvertFrom-Json
if ($j.type -ne "service_account" -or -not $j.client_email) { "not a service account key"; exit 1 }
$dir = Join-Path $env:USERPROFILE ".secrets"; New-Item -ItemType Directory -Force $dir | Out-Null
$dst = Join-Path $dir "ga4-mashina-sa.json"; Copy-Item $d.FileName $dst -Force
[Environment]::SetEnvironmentVariable("GA4_SA_KEY_FILE", $dst, "User")
"saved: " + $dst + " | service account: " + $j.client_email
