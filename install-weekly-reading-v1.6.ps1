param([string]$ProjectPath = ".")

$ErrorActionPreference = "Stop"
$ProjectPath = (Resolve-Path $ProjectPath).Path
$Payload = Join-Path $PSScriptRoot "payload"
$ReadingPath = Join-Path $ProjectPath "src\app\reading\page.tsx"

if (-not (Test-Path (Join-Path $ProjectPath "package.json"))) {
  throw "package.json が見つかりません。dailybibletask のプロジェクト直下を指定してください。"
}

$ApiSource = Join-Path $Payload "src\app\api\weekly-reading\route.ts"
$ApiTarget = Join-Path $ProjectPath "src\app\api\weekly-reading\route.ts"
New-Item -ItemType Directory -Force -Path (Split-Path $ApiTarget -Parent) | Out-Null
Copy-Item $ApiSource $ApiTarget -Force
Write-Host "追加: src\app\api\weekly-reading\route.ts" -ForegroundColor Green

$content = Get-Content $ReadingPath -Raw -Encoding UTF8

if ($content -notmatch "type WeeklyReadingResponse") {
  $needle = 'import { clearReadingPresence, publishReadingPresence } from "@/lib/presence";'
  $addition = @'
import { clearReadingPresence, publishReadingPresence } from "@/lib/presence";

type WeeklyReadingResponse = {
  weekStart: string;
  bookId: string;
  bookName: string;
  startChapter: number;
  endChapter: number;
  sourceUrl: string;
  rangeLabel: string;
  error?: string;
};
'@
  $content = $content.Replace($needle, $addition)
}

if ($content -notmatch "autoRangeLoading") {
  $needle = '  const [busy, setBusy] = useState(false);'
  $addition = @'
  const [busy, setBusy] = useState(false);
  const [autoRangeLoading, setAutoRangeLoading] = useState(false);
  const [autoRangeMessage, setAutoRangeMessage] = useState("");
'@
  $content = $content.Replace($needle, $addition)
}

if ($content -notmatch "fetchWeeklyRange") {
  $needle = @'
  const saveCurrentRange = async () => {
'@
  $addition = @'
  const fetchWeeklyRange = async (force = false) => {
    const weekStart = getWeekStartISO();
    if (!force && state.weeklyRanges.some((range) => range.weekStart === weekStart)) return;

    setAutoRangeLoading(true);
    setAutoRangeMessage("");
    try {
      const response = await fetch("/api/weekly-reading", {
        cache: "no-store",
      });
      const data = await response.json() as WeeklyReadingResponse;
      if (!response.ok || data.error) {
        throw new Error(data.error || "今週の範囲を取得できませんでした");
      }

      const book = getBook(data.bookId);
      const startChapter = Math.min(Math.max(1, data.startChapter), book.chapters);
      const endChapter = Math.min(Math.max(startChapter, data.endChapter), book.chapters);

      await setState((current) => ({
        ...current,
        weeklyRanges: [
          ...current.weeklyRanges.filter((range) => range.weekStart !== data.weekStart),
          {
            weekStart: data.weekStart,
            bookId: data.bookId,
            startChapter,
            endChapter,
            sourceUrl: data.sourceUrl,
          },
        ],
      }));
      setAutoRangeMessage(`${data.rangeLabel}をWOLから設定しました`);
    } catch (error) {
      setAutoRangeMessage(error instanceof Error ? error.message : "自動取得に失敗しました");
    } finally {
      setAutoRangeLoading(false);
    }
  };

  useEffect(() => {
    void fetchWeeklyRange(false);
  }, [currentRange?.weekStart]);

  const saveCurrentRange = async () => {
'@
  $content = $content.Replace($needle, $addition)
}

if ($content -notmatch "WOLから再取得") {
  $needle = @'
          <button className="button secondary" onClick={() => setShowSettings((value) => !value)}>{showSettings ? "閉じる" : "変更"}</button>
'@
  $addition = @'
          <div className="button-row">
            <button className="button secondary" disabled={autoRangeLoading} onClick={() => fetchWeeklyRange(true)}>
              {autoRangeLoading ? "取得中…" : "WOLから再取得"}
            </button>
            <button className="button secondary" onClick={() => setShowSettings((value) => !value)}>{showSettings ? "閉じる" : "変更"}</button>
          </div>
'@
  $content = $content.Replace($needle, $addition)

  $needle2 = @'
        {currentRange ? <p>{getBook(currentRange.bookId).name} {currentRange.startChapter}–{currentRange.endChapter}章</p> : <p>今週の範囲は未設定です。</p>}
'@
  $addition2 = @'
        {currentRange ? (
          <>
            <p>{getBook(currentRange.bookId).name} {currentRange.startChapter}–{currentRange.endChapter}章</p>
            {currentRange.sourceUrl && <a href={currentRange.sourceUrl} target="_blank" rel="noreferrer">WOLで今週の予定を見る</a>}
          </>
        ) : <p>今週の範囲は未設定です。WOLから自動取得を試しています。</p>}
        {autoRangeMessage && <p className="meta">{autoRangeMessage}</p>}
'@
  $content = $content.Replace($needle2, $addition2)
}

Set-Content -Path $ReadingPath -Value $content -Encoding UTF8
Write-Host "更新: src\app\reading\page.tsx" -ForegroundColor Green

Write-Host ""
Write-Host "v1.6 更新完了" -ForegroundColor Cyan
Write-Host "次を実行してください:"
Write-Host "npm run build"
Write-Host "git add ."
Write-Host 'git commit -m "Auto fetch weekly Bible reading from WOL"'
Write-Host "git push"
