param([string]$ProjectPath = ".")
$ErrorActionPreference = "Stop"
$ProjectPath = (Resolve-Path $ProjectPath).Path
$Target = Join-Path $ProjectPath "src\app\reading\page.tsx"

if (-not (Test-Path (Join-Path $ProjectPath "package.json"))) { throw "DailyBibleTask のプロジェクト直下で実行してください。" }
if (-not (Test-Path $Target)) { throw "src\app\reading\page.tsx が見つかりません。" }

$content = Get-Content $Target -Raw -Encoding UTF8
$content = $content -replace 'import \{ useReadingPresence \} from "@/hooks/useReadingPresence";\r?\n', ''
$content = $content -replace 'import \{ clearReadingPresence, publishReadingPresence \} from "@/lib/presence";\r?\n', ''
$content = $content -replace '  const presence = useReadingPresence\(\);\r?\n', ''
$content = $content -replace '  const \[isReading, setIsReading\] = useState\(false\);\r?\n', ''
$content = $content -replace '  const startedAtRef = useRef<string \| undefined>\(undefined\);\r?\n', ''

$start = $content.IndexOf("  useEffect(() => {`r`n    if (!isReading || !sharingEnabled || !household || !firebaseUser) return;")
if ($start -lt 0) {
  $start = $content.IndexOf("  useEffect(() => {`n    if (!isReading || !sharingEnabled || !household || !firebaseUser) return;")
}
$complete = $content.IndexOf("  const complete = async () => {")
if ($start -ge 0 -and $complete -gt $start) {
  $content = $content.Substring(0, $start) + $content.Substring($complete)
}
$content = $content -replace '    stopReading\(\);\r?\n', ''

$bad = @("sharingEnabled","household","firebaseUser","startedAtRef","publishReadingPresence","clearReadingPresence","beginReading","stopReading","isReading","useReadingPresence")
$left = @()
foreach ($token in $bad) { if ($content.Contains($token)) { $left += $token } }
if ($left.Count -gt 0) { throw "古い読書中共有コードが残っています: $($left -join ', ')" }

Set-Content -Path $Target -Value $content -Encoding UTF8

Write-Host "v1.8.1 修復完了" -ForegroundColor Green
Write-Host "npm run build"
Write-Host "git add ."
Write-Host 'git commit -m "Repair partner last reading update"'
Write-Host "git push"
