# Отчёт Adjust Report Service API в JSON (UTF-8). Токен — переменная Windows ADJUST_API_TOKEN (User).
# Пример: powershell -NoProfile -File adjust_report.ps1 -period "2026-10-12:2026-10-18" -dimensions "day,os_name" -metrics "installs,sessions,daus" -out tmp/a.json
# Доп. фильтры (необязательно): -extra "&os_name__in=ios&country_code__in=kg"
param([string]$period, [string]$dimensions = "day", [string]$metrics = "installs", [string]$extra = "", [string]$out)
$t = [Environment]::GetEnvironmentVariable("ADJUST_API_TOKEN", "User"); $h = @{Authorization = "Bearer $t"}
$u = "https://automate.adjust.com/reports-service/report?date_period=$period&dimensions=$dimensions&metrics=$metrics$extra"
try { Invoke-RestMethod -Uri $u -Headers $h | ConvertTo-Json -Depth 6 | Out-File -Encoding utf8 $out; "ok" }
catch { "ERR " + $_.Exception.Response.StatusCode.value__ + " " + $_.ErrorDetails.Message; exit 1 }
