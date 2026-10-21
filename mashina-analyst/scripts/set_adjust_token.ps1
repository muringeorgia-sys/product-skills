# Запрашивает API-токен Adjust в скрытом окне и сохраняет в переменную Windows ADJUST_API_TOKEN (User).
# Токен не печатается и не пишется в файлы.
Add-Type -AssemblyName System.Windows.Forms
$f = New-Object Windows.Forms.Form -Property @{Text = "Adjust API token"; Width = 420; Height = 150; StartPosition = "CenterScreen"; TopMost = $true}
$tb = New-Object Windows.Forms.TextBox -Property @{Left = 10; Top = 15; Width = 380; UseSystemPasswordChar = $true}
$ok = New-Object Windows.Forms.Button -Property @{Text = "Сохранить"; Left = 290; Top = 50; Width = 100; DialogResult = "OK"}
$f.Controls.AddRange(@($tb, $ok)); $f.AcceptButton = $ok
if ($f.ShowDialog() -eq "OK" -and $tb.Text.Trim()) {
  [Environment]::SetEnvironmentVariable("ADJUST_API_TOKEN", $tb.Text.Trim(), "User"); "saved, length " + $tb.Text.Trim().Length
} else { "cancelled" }
