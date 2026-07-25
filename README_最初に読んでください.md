# v1.4 自動更新版

## 使い方

1. このZIPを展開します。
2. `dailybibletask` のプロジェクトフォルダを開きます。
3. 展開したフォルダにある `install-v1.4.ps1` を、プロジェクト直下で実行します。

PowerShell例:

```powershell
powershell -ExecutionPolicy Bypass -File "C:\展開した場所\dailybibletask-v1.4-installer\install-v1.4.ps1" -ProjectPath "C:\dailybibletask"
```

現在PowerShellでプロジェクト直下を開いている場合:

```powershell
powershell -ExecutionPolicy Bypass -File "C:\展開した場所\dailybibletask-v1.4-installer\install-v1.4.ps1"
```

このスクリプトは以下を自動実行します。

- TOPページを6タイルへ更新
- 「伝道資料」を「伝道情報」へ変更
- 各研究ページを正しいパスへコピー
- `globals.css`へ必要なCSSを重複なしで追記

その後:

```powershell
npm run build
git add .
git commit -m "Add customizable study workspaces"
git push
```
