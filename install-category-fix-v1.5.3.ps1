param([string]$ProjectPath = ".")

$ErrorActionPreference = "Stop"
$ProjectPath = (Resolve-Path $ProjectPath).Path
$Target = Join-Path $ProjectPath "src\components\CustomStudyWorkspace.tsx"
$CssTarget = Join-Path $ProjectPath "src\app\globals.css"

if (-not (Test-Path (Join-Path $ProjectPath "package.json"))) {
  throw "package.json が見つかりません。DailyBibleTask のプロジェクト直下で実行してください。"
}
if (-not (Test-Path $Target)) {
  throw "src\components\CustomStudyWorkspace.tsx が見つかりません。"
}

$content = Get-Content $Target -Raw -Encoding UTF8

if ($content -notmatch "categoryBusy") {
  $content = $content.Replace(
    '  const [busy, setBusy] = useState(false);',
@'
  const [busy, setBusy] = useState(false);
  const [categoryBusy, setCategoryBusy] = useState(false);
  const [categoryMessage, setCategoryMessage] = useState("");
'@
  )
}

$start = $content.IndexOf('  const saveCategory = async () => {')
$end = $content.IndexOf('  const saveEntry = async', $start)
if ($start -lt 0 -or $end -lt 0) {
  throw "saveCategory の位置を特定できませんでした。"
}

$newSave = @'
  const saveCategory = async () => {
    const trimmedName = categoryName.trim();
    if (!trimmedName) {
      setCategoryMessage("カテゴリー名を入力してください。");
      return;
    }

    setCategoryBusy(true);
    setCategoryMessage("");

    try {
      const now = new Date().toISOString();
      const category: StudyCategory = {
        id: typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `category-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        scope,
        name: trimmedName,
        enabledFields: enabledFields.length ? enabledFields : ["title", "memo"],
        customFields: customFields.map((item) => item.trim()).filter(Boolean),
        createdAt: now,
        updatedAt: now,
      };

      if (scope === "personal") {
        if (!firebaseUser) throw new Error("ログイン情報を確認できません");
        await personalCategories.addItem(category);
      } else {
        await coupleCategories.addItem(category);
      }

      setCategoryName("");
      setEnabledFields(["title", "memo"]);
      setCustomFields(["", "", ""]);
      setShowCategoryForm(false);
      setCategoryMessage(`「${trimmedName}」を登録しました。`);
    } catch (error) {
      console.error("Failed to save study category", error);
      setCategoryMessage(
        `カテゴリーを保存できませんでした：${error instanceof Error ? error.message : "不明なエラー"}`
      );
    } finally {
      setCategoryBusy(false);
    }
  };

'@

$content = $content.Substring(0, $start) + $newSave + $content.Substring($end)

$content = $content.Replace(
  '<div className="button-row"><button className="button" onClick={saveCategory}>カテゴリーを保存</button><button className="button secondary" onClick={()=>setShowCategoryForm(false)}>閉じる</button></div>',
@'
<div className="button-row">
        <button className="button" disabled={categoryBusy} onClick={saveCategory}>
          {categoryBusy ? "保存中…" : "カテゴリーを保存"}
        </button>
        <button className="button secondary" disabled={categoryBusy} onClick={()=>setShowCategoryForm(false)}>閉じる</button>
      </div>
      {categoryMessage && <p className={categoryMessage.includes("登録しました") ? "meta save-success" : "meta save-error"}>{categoryMessage}</p>}
'@
)

$content = $content.Replace(
  '{!categories.items.length && <p className="meta">最初にカテゴリーを1つ作成してください。</p>}',
@'
{!categories.items.length && <p className="meta">最初にカテゴリーを1つ作成してください。</p>}
      {!showCategoryForm && categoryMessage && <p className={categoryMessage.includes("登録しました") ? "meta save-success" : "meta save-error"}>{categoryMessage}</p>}
'@
)

Set-Content -Path $Target -Value $content -Encoding UTF8

$marker = "/* v1.5.3 category save feedback */"
$css = Get-Content $CssTarget -Raw -Encoding UTF8
if ($css -notmatch [regex]::Escape($marker)) {
  Add-Content -Path $CssTarget -Encoding UTF8 -Value @'

/* v1.5.3 category save feedback */
.save-success { color: #39734a; font-weight: 700; }
.save-error { color: #a13c3c; font-weight: 700; white-space: pre-wrap; }
'@
}

Write-Host "カテゴリー作成処理を修正しました。" -ForegroundColor Green
Write-Host "npm run build"
Write-Host "git add ."
Write-Host 'git commit -m "Fix study category creation"'
Write-Host "git push"
