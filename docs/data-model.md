# Firebase data model v0.3.0

## users/{uid}

本人だけが読み書きするアカウント接続情報。

- uid
- email
- displayName
- photoURL
- householdId
- memberId: husband | wife
- pendingHouseholdId
- pendingInviteCode
- createdAt
- updatedAt

## invites/{inviteCode}

ログイン済みユーザーが招待コードを照合するための文書。

- householdId
- householdName
- createdBy
- openMemberId
- active
- createdAt
- usedAt

招待コードだけでは家庭データへ入れない。参加申請と既存メンバーの承認が必要。

## households/{householdId}

- name
- ownerUid
- memberUids: 最大2人
- inviteCode
- createdAt
- updatedAt

## households/{householdId}/members/{uid}

- uid
- memberId: husband | wife
- displayName
- email
- photoURL
- joinedAt

## households/{householdId}/joinRequests/{uid}

- requesterUid
- displayName
- email
- photoURL
- inviteCode
- requestedMemberId
- status: pending | approved | rejected
- createdAt
- updatedAt

申請者本人は自分の申請だけを確認できる。家庭データは承認まで読めない。

## households/{householdId}/app/reading

- members.husband.normalNext
- members.husband.completedMeetingKeys
- members.husband.history
- members.husband.shareReadingPresence
- members.wife.*
- weeklyRanges
- companion.name

ワンちゃんの元気、きずな、成長段階、解放アイテムは履歴から計算する。休んでも累計成長は下がらない。

## Realtime Database

### presenceHouseholds/{householdId}

- ownerUid
- members/{uid}: true
- reading/{uid}
  - uid
  - memberId
  - ref.bookId
  - ref.chapter
  - startedAt
  - updatedAt

読書画面で「読み始める」を押し、画面が前面にある間だけ20秒ごとに更新する。切断時は`onDisconnect()`で削除し、90秒以上更新がない表示も無効にする。

## households/{householdId}/studyPlans/{planId}

- scheduledAt
- theme
- preparation
- status
- reflection
- createdAt

## households/{householdId}/notes/{noteId}

- title
- scripture
- tags
- body
- shared
- author
- authorUid
- createdAt
- updatedAt

## households/{householdId}/ministryItems/{itemId}

- title
- category
- scripture
- link
- note
- createdAt
- createdBy

## households/{householdId}/tasks/{taskId}

- title
- dueDate
- assignee: husband | wife | both
- completed
- createdAt
- createdBy
