param([string]$ProjectPath = ".")

$ErrorActionPreference = "Stop"
$ProjectPath = (Resolve-Path $ProjectPath).Path
$Target = Join-Path $ProjectPath "src\components\CustomStudyWorkspace.tsx"

if (-not (Test-Path (Join-Path $ProjectPath "package.json"))) {
  throw "DailyBibleTask のプロジェクト直下で実行してください。"
}
if (-not (Test-Path $Target)) {
  throw "src\components\CustomStudyWorkspace.tsx が見つかりません。"
}

$content = Get-Content $Target -Raw -Encoding UTF8

if ($content -notmatch "STUDY_FIELD_ORDER") {
  $needle = 'const EMPTY_VALUES: StudyEntryValues = { custom: {} };'
  $addition = @'
const EMPTY_VALUES: StudyEntryValues = { custom: {} };

const STUDY_FIELD_ORDER: StudyFieldKey[] = [
  "title",
  "name",
  "year",
  "scripture",
  "labels",
  "links",
  "memo",
];

function orderStudyFields(fields: StudyFieldKey[]): StudyFieldKey[] {
  return STUDY_FIELD_ORDER.filter((field) => fields.includes(field));
}
'@
  $content = $content.Replace($needle, $addition)
}

$old = '{selectedCategory?.enabledFields.map(renderField)}'
$new = '{selectedCategory && orderStudyFields(selectedCategory.enabledFields).map(renderField)}'

if ($content -notmatch [regex]::Escape($new)) {
  if (-not $content.Contains($old)) {
    throw "新規作成フォームの入力欄コードを見つけられませんでした。"
  }
  $content = $content.Replace($old, $new)
}

Set-Content -Path $Target -Value $content -Encoding UTF8

Write-Host "研究フォームの入力欄順序を修正しました。" -ForegroundColor Green
Write-Host ""
Write-Host "npm run build"
Write-Host "git add ."
Write-Host 'git commit -m "Order study form fields"'
Write-Host "git push"
