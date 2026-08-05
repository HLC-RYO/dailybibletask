param([string]$ProjectPath = ".")
$ErrorActionPreference = "Stop"
$ProjectPath = (Resolve-Path $ProjectPath).Path
$Target = Join-Path $ProjectPath "src\app\reading\page.tsx"
$CssTarget = Join-Path $ProjectPath "src\app\globals.css"

if (-not (Test-Path (Join-Path $ProjectPath "package.json"))) { throw "DailyBibleTask のプロジェクト直下で実行してください。" }
if (-not (Test-Path $Target)) { throw "src\app\reading\page.tsx が見つかりません。" }

$content = Get-Content $Target -Raw -Encoding UTF8

$content = $content.Replace('import { useEffect, useMemo, useRef, useState } from "react";','import { useEffect, useMemo, useState } from "react";')
$content = $content.Replace('import { useReadingPresence } from "@/hooks/useReadingPresence";' + "`r`n","")
$content = $content.Replace('import { getCompanionProfile, isPresenceSharingEnabled } from "@/lib/defaults";','import { getCompanionProfile } from "@/lib/defaults";')
$content = $content.Replace('import { clearReadingPresence, publishReadingPresence } from "@/lib/presence";' + "`r`n","")

$content = $content.Replace('  const { firebaseUser, household, memberId, partnerId, memberNames } = useAppContext();','  const { memberId, partnerId, memberNames } = useAppContext();')
$content = $content.Replace('  const presence = useReadingPresence();' + "`r`n","")
$content = $content.Replace('  const [isReading, setIsReading] = useState(false);' + "`r`n","")
$content = $content.Replace('  const startedAtRef = useRef<string | undefined>(undefined);' + "`r`n","")

$oldStats = @'
  const companionStats = getCompanionStats(state, presence);
  const partnerPresence = presence[partnerId];
  const sharingEnabled = isPresenceSharingEnabled(state, memberId);
'@
$newStats = @'
  const companionStats = getCompanionStats(state, {});
  const partnerLatestReading = useMemo(() => {
    const history = state.members[partnerId]?.history ?? [];
    return [...history].sort((a, b) => b.completedAt.localeCompare(a.completedAt))[0];
  }, [state.members, partnerId]);
'@
$content = $content.Replace($oldStats,$newStats)

$presenceStart = $content.IndexOf('  useEffect(() => {' + "`r`n" + '    if (!isReading || !sharingEnabled')
$completeStart = $content.IndexOf('  const complete = async () => {')
if ($presenceStart -ge 0 -and $completeStart -gt $presenceStart) {
  $content = $content.Substring(0,$presenceStart) + $content.Substring($completeStart)
}
$content = $content.Replace('    stopReading();' + "`r`n","")

$bannerStart = $content.IndexOf('      {partnerPresence && (')
$questStart = $content.IndexOf('      <section className={`panel quest ${isReading ? "reading-active" : ""}`}>')
if ($bannerStart -ge 0 -and $questStart -gt $bannerStart) {
$newBanner = @'
      <section className="partner-last-reading-card">
        <div className="partner-last-reading-icon">📖</div>
        <div>
          <span className="meta">{memberNames[partnerId]}が最後に読んだ場所</span>
          {partnerLatestReading ? (
            <>
              <strong>{formatChapter(partnerLatestReading.ref)}</strong>
              <small>{new Intl.DateTimeFormat("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(partnerLatestReading.completedAt))}</small>
            </>
          ) : (
            <strong>まだ読書記録がありません</strong>
          )}
        </div>
      </section>

'@
  $content = $content.Substring(0,$bannerStart) + $newBanner + $content.Substring($questStart)
}

$content = $content.Replace('      <section className={`panel quest ${isReading ? "reading-active" : ""}`}>','      <section className="panel quest">')

$controlStart = $content.IndexOf('        <div className="reading-presence-control">')
$formStart = $content.IndexOf('        <div className="form-grid" style={{ marginTop: 14 }}>')
if ($controlStart -ge 0 -and $formStart -gt $controlStart) {
  $content = $content.Substring(0,$controlStart) + $content.Substring($formStart)
}

Set-Content -Path $Target -Value $content -Encoding UTF8

$marker = "/* v1.8 partner last reading */"
$css = Get-Content $CssTarget -Raw -Encoding UTF8
if ($css -notmatch [regex]::Escape($marker)) {
Add-Content -Path $CssTarget -Encoding UTF8 -Value @'

/* v1.8 partner last reading */
.partner-last-reading-card {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 14px 0;
  padding: 14px 16px;
  border: 1px solid var(--line);
  border-radius: 16px;
  background: color-mix(in srgb, var(--accent) 7%, var(--surface));
}
.partner-last-reading-icon {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: var(--surface);
  font-size: 21px;
}
.partner-last-reading-card > div:last-child { display: grid; gap: 2px; }
.partner-last-reading-card strong { font-size: 17px; }
.partner-last-reading-card small { color: var(--muted); }
'@
}

Write-Host "相手の最終読書位置表示へ変更しました。" -ForegroundColor Green
Write-Host "npm run build"
Write-Host "git add ."
Write-Host 'git commit -m "Show partner last reading"'
Write-Host "git push"
