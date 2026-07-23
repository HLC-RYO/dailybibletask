# ふたりの聖書の旅 v0.3.0

夫婦で、毎日の聖書通読、週1回の研究、研究ノート、伝道資料、タスクを共有するNext.js PWAです。

## v0.3.0で追加したもの

- Firebase AuthenticationによるGoogleログイン
- Cloud Firestoreによる夫婦2人のリアルタイム共有
- Realtime Databaseによる「相手が今読んでいる章」の表示
- 家庭グループの作成
- 8文字の招待コード
- パートナーからの参加申請
- 作成者による承認・拒否
- 承認されるまで家庭データを読めないセキュリティルール
- 通読、夫婦の研究、研究ノート、伝道資料、タスクのFirebase保存
- 表示名、ワンちゃん名、通常通読位置、読書中公開設定の共有

## 聖書通読の動き

1. 今週の「生活と奉仕の集会」の聖書範囲に未読章があれば、月曜日以降、その範囲を1日1章ずつ表示します。
2. 本人が今週の範囲を全部読み終えたら、翌日から通常通読の続きへ戻ります。
3. 夫婦の進捗は別々に保存します。
4. 読めなかった章は飛ばさず、次に開いた時も同じ未読章を表示します。

初期デモ値は、2026年7月20日の週がエレミヤ18–19章、通常通読の再開地点が使徒11章です。アプリ内で変更できます。

## Firebaseの準備

### 1. Firebaseプロジェクトを作る

Firebaseコンソールで新しいプロジェクトを作り、Webアプリを追加します。

### 2. Authenticationを有効化

Authenticationのログイン方法で「Google」を有効にします。

公開先がVercelの場合は、Authenticationの承認済みドメインに次を追加します。

- Vercelの本番ドメイン
- 独自ドメインを使う場合はそのドメイン
- ローカル確認に使う場合は `localhost`

### 3. Cloud Firestoreを作る

Cloud Firestoreのデフォルトデータベースを作成します。最初は本番モードで構いません。付属の`firestore.rules`を後で配備します。

### 4. Realtime Databaseを作る

Realtime Databaseを1つ作成します。表示されたDatabase URLを控えます。

例：

```text
https://YOUR_PROJECT_ID-default-rtdb.asia-southeast1.firebasedatabase.app
```

### 5. 環境変数を設定

`.env.example`を`.env.local`へコピーし、FirebaseのWebアプリ設定を入力します。

```bash
cp .env.example .env.local
```

```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_DATABASE_URL=
```

これらはFirebase Web SDK用の公開設定値です。実際のアクセス制御はAuthenticationとSecurity Rulesで行います。

### 6. Security Rulesを配備

Firebase CLIをインストールしてログインします。

```bash
npm install -g firebase-tools
firebase login
```

`.firebaserc.example`を`.firebaserc`へコピーし、FirebaseのプロジェクトIDを入力します。

```bash
cp .firebaserc.example .firebaserc
```

FirestoreとRealtime Databaseのルールを配備します。

```bash
firebase deploy --only firestore,database
```

付属ファイル：

- `firestore.rules`
- `database.rules.json`
- `firebase.json`

## ローカル起動

Node.js 20.9以上を使用します。

```bash
npm install
npm run dev
```

ブラウザで次を開きます。

```text
http://localhost:3000
```

## 最初の2人の登録方法

### 1人目

1. Googleでログイン
2. 「新しく作る」を選択
3. 表示名、家庭グループ名、「夫」または「妻」を設定
4. 設定画面の8文字の招待コードをパートナーへ伝える

### 2人目

1. 別のGoogleアカウントでログイン
2. 「招待で参加」を選択
3. 表示名と招待コードを入力
4. 参加申請を送る

### 1人目が承認

1. 設定画面を開く
2. 「参加申請」の内容を確認
3. 「承認」を押す

承認後、2人目の画面は自動的に共有アプリへ切り替わります。

## Vercelへの公開

1. GitHubへこのフォルダをpush
2. Vercelでリポジトリをインポート
3. `.env.local`と同じ7つの環境変数をVercelへ登録
4. デプロイ
5. VercelのドメインをFirebase Authenticationの承認済みドメインへ追加

## データ構造

詳細は`docs/data-model.md`を参照してください。

主な保存先：

```text
users/{uid}
households/{householdId}
households/{householdId}/members/{uid}
households/{householdId}/app/reading
households/{householdId}/studyPlans/{id}
households/{householdId}/notes/{id}
households/{householdId}/ministryItems/{id}
households/{householdId}/tasks/{id}
presenceHouseholds/{householdId}/reading/{uid}
```

## セキュリティ方針

- ログインしていない人はデータを読み書きできません。
- 家庭グループのメンバーだけが、その家庭の恒久データを読み書きできます。
- 招待コードを入力しただけでは参加できず、既存メンバーの承認が必要です。
- 読書中表示は本人だけが書き換えられます。
- 家庭グループは2人までです。

## 現在の仕様

- 集会範囲は手動で設定します。
- jw.orgの予定ページからの自動取得は今後追加する想定です。
- 研究ノートは現在、夫婦共有が基本です。
- ワンちゃんは仮の絵文字キャラクターです。後で専用イラストへ差し替えられます。
