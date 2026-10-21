# Запуск сохранённого запроса Redash с параметром-списком, результат в JSON (UTF-8).
# Пример: powershell -NoProfile -File redash_run.ps1 -qid 524 -param campaign_id -values "82,83,84" -out tmp/x.json
param([int]$qid, [string]$param = "", [string]$values = "", [string]$out)
$k = [Environment]::GetEnvironmentVariable("REDASH_API_KEY", "User"); $h = @{Authorization = "Key $k"}
$p = @{}; if ($param) { $p[$param] = @($values.Split(",") | % { $_.Trim() }) }
$body = @{parameters = $p; max_age = 0} | ConvertTo-Json -Depth 5
$j = Invoke-RestMethod -Method Post -Uri "http://92.204.189.31:8082/api/queries/$qid/results" -Headers $h -Body $body -ContentType "application/json"
if ($j.job) {
  $id = $j.job.id
  do { Start-Sleep 2; $s = Invoke-RestMethod -Uri "http://92.204.189.31:8082/api/jobs/$id" -Headers $h } while ($s.job.status -lt 3)
  if ($s.job.status -ne 3) { $s.job | ConvertTo-Json | Out-File -Encoding utf8 $out; exit 1 }
  $r = Invoke-RestMethod -Uri ("http://92.204.189.31:8082/api/query_results/" + $s.job.query_result_id) -Headers $h
} else { $r = $j }
$r.query_result.data.rows | ConvertTo-Json -Depth 4 | Out-File -Encoding utf8 $out
