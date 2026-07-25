# 宝を探そう v1.4 再構築版

## 実装内容
- TOPページを6カード化
- 伝道資料を伝道情報へ変更
- 資料置き場の仮ページ
- じぶんの研究：カスタムカテゴリー、自由入力欄、編集中保存、家族共有
- ふたりの研究：カスタムカテゴリー、夫婦共有
- 研究ノート：上記2種類を統合、検索、カテゴリー絞り込み
- 伝道情報：5カテゴリー、新規作成、検索、保存、削除
- 今日の話題：仮枠

## 反映方法
1. ZIPをプロジェクト直下で展開し、同名ファイルを上書き
2. STYLE_APPEND.css の内容を src/app/globals.css の末尾へ追記
3. STYLE_APPEND.css は削除して構いません
4. 実行

npm run build
git add .
git commit -m "Add customizable study workspaces"
git push

## 新しいFirestoreコレクション
- personalStudyCategories
- personalStudyEntries
- sharedPersonalStudyEntries
- coupleStudyCategories
- coupleStudyEntries

既存の旧データは削除されません。旧データの自動移行は未実装です。
