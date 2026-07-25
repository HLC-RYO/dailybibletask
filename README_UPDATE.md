# 宝を探そう v1.4

## 今回実装した範囲
- TOPページを6カード化。設定カードを削除し、資料置き場・伝道情報・タスクを追加
- 伝道資料の表示名を伝道情報へ変更
- じぶんの研究：カテゴリー作成、使用欄の選択、自由欄3つ、編集中/完成、家族共有
- ふたりの研究：同じカスタムフォーム方式で夫婦共有
- 研究ノート：両方の研究を統合、検索、実データがあるカテゴリーだけ表示
- 資料置き場：年代表を含む仮ページ
- 伝道情報：固定5カテゴリー、新規作成、検索、保存、削除
- 今日の話題：後続実装用の仮枠

## 上書き後
`STYLE_APPEND.css` の内容だけ `src/app/globals.css` の末尾へ追記し、同ファイルは削除して構いません。

```powershell
npm run build
git add .
git commit -m "Add customizable study workspaces"
git push
```

## 新しいFirestoreコレクション
- users/{uid}/personalStudyCategories
- users/{uid}/personalStudyEntries
- households/{householdId}/sharedPersonalStudyEntries
- households/{householdId}/coupleStudyCategories
- households/{householdId}/coupleStudyEntries

既存ルールの包括的なユーザー配下・世帯配下ルールで利用できます。旧じぶんの研究データは消えませんが、新画面へ自動移行はしません。
