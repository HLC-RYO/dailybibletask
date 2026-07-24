適用方法

1. このZIPを解凍する
2. 中の src と public を、dailybibletaskプロジェクト直下へ上書きコピーする
3. src/components/AppGate.tsx 内の「ふたりの聖書の旅」を2か所、「宝を探そう」へ変更する
   - ログイン画面の h1
   - account-brand の表示文字
4. PowerShellで以下を実行

npm run build
git add .
git commit -m "Update app title and dachshund mascot"
git push

Vercelが自動再デプロイします。
