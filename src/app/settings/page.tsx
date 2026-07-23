"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { useAppContext } from "@/context/AppContext";
import { useSharedReadingState } from "@/hooks/useSharedReadingState";
import { bibleBooks, getBook } from "@/lib/bible";
import { defaultReadingState, getCompanionProfile } from "@/lib/defaults";
import { clearReadingPresence } from "@/lib/presence";

export default function SettingsPage() {
  const app = useAppContext();
  const [state, setState] = useSharedReadingState();
  const [displayName, setDisplayName] = useState(app.profile?.displayName ?? "");
  const [dogName, setDogName] = useState("");
  const [copied, setCopied] = useState(false);
  const [busyRequestId, setBusyRequestId] = useState("");
  const companion = getCompanionProfile(state);
  const cursor = state.members[app.memberId].normalNext;
  const sharePresence = state.members[app.memberId].shareReadingPresence !== false;

  useEffect(() => setDisplayName(app.profile?.displayName ?? ""), [app.profile?.displayName]);
  useEffect(() => setDogName(companion.name), [companion.name]);

  const updateCursor = async (bookId: string, chapter: number) => {
    const book = getBook(bookId);
    const safeChapter = Math.min(Math.max(1, chapter), book.chapters);
    await setState((current) => ({
      ...current,
      members: {
        ...current.members,
        [app.memberId]: {
          ...current.members[app.memberId],
          normalNext: { bookId, chapter: safeChapter },
        },
      },
    }));
  };

  const updatePresenceSharing = async (enabled: boolean) => {
    if (!enabled && app.household && app.firebaseUser) {
      await clearReadingPresence(app.household.id, app.firebaseUser.uid);
    }
    await setState((current) => ({
      ...current,
      members: {
        ...current.members,
        [app.memberId]: {
          ...current.members[app.memberId],
          shareReadingPresence: enabled,
        },
      },
    }));
  };

  const copyInviteCode = async () => {
    if (!app.household) return;
    await navigator.clipboard.writeText(app.household.inviteCode);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const handleRequest = async (requestId: string, action: () => Promise<void>) => {
    setBusyRequestId(requestId);
    try {
      await action();
    } finally {
      setBusyRequestId("");
    }
  };

  return (
    <>
      <PageHeader title="設定" subtitle="夫婦共有、通常通読、ワンちゃんの設定を調整します" />

      <section className="panel">
        <div className="panel-title"><h2>あなたのプロフィール</h2></div>
        <div className="form-row">
          <label>表示名
            <input className="input" value={displayName} maxLength={20} onChange={(event) => setDisplayName(event.target.value)} />
          </label>
          <label>区分
            <input className="input" value={app.memberId === "husband" ? "夫" : "妻"} disabled />
          </label>
        </div>
        <div className="button-row">
          <button className="button" onClick={() => app.updateDisplayName(displayName)}>表示名を保存</button>
          <button className="button secondary" onClick={app.signOut}>ログアウト</button>
        </div>
      </section>

      <section className="panel invite-panel">
        <div className="panel-title"><h2>夫婦の共有設定</h2></div>
        <p className="setting-help">奥さんは別のGoogleアカウントでログインし、このコードから参加申請します。申請後、ここで承認してください。</p>
        <div className="invite-code-box">
          <span>招待コード</span>
          <strong>{app.household?.inviteCode}</strong>
          <button className="button secondary" onClick={copyInviteCode}>{copied ? "コピーしました" : "コピー"}</button>
        </div>
        <div className="member-summary">
          {app.householdMembers.map((member) => (
            <div key={member.uid}>
              <span>{member.memberId === "husband" ? "夫" : "妻"}</span>
              <strong>{member.displayName}</strong>
            </div>
          ))}
          {app.householdMembers.length < 2 && <div className="member-empty">パートナーの参加待ち</div>}
        </div>
      </section>

      {app.joinRequests.length > 0 && (
        <section className="panel request-panel">
          <div className="panel-title"><h2>参加申請</h2><strong>{app.joinRequests.length}件</strong></div>
          <div className="list">
            {app.joinRequests.map((request) => (
              <article className="list-item" key={request.id}>
                <div className="grow">
                  <span className="meta">{request.email}</span>
                  <h3>{request.displayName}</h3>
                  <p>{request.requestedMemberId === "husband" ? "夫" : "妻"}として参加を申請しています。</p>
                </div>
                <div className="button-row">
                  <button className="button" disabled={busyRequestId === request.id} onClick={() => handleRequest(request.id, () => app.approveJoinRequest(request))}>承認</button>
                  <button className="button danger" disabled={busyRequestId === request.id} onClick={() => handleRequest(request.id, () => app.rejectJoinRequest(request))}>拒否</button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="panel">
        <div className="panel-title"><h2>ふたりのワンちゃん</h2></div>
        <label>名前
          <input className="input" value={dogName} maxLength={12} onChange={(event) => setDogName(event.target.value)} placeholder="ルカ" />
        </label>
        <div className="button-row">
          <button className="button" onClick={() => setState((current) => ({
            ...current,
            companion: { ...getCompanionProfile(current), name: dogName.trim() || "ルカ" },
          }))}>名前を保存</button>
        </div>
        <p className="setting-help">成長やごほうびは2人の読書記録から自動計算されます。休んでも成長段階は下がりません。</p>
      </section>

      <section className="panel">
        <div className="panel-title"><h2>{app.memberNames[app.memberId]}の通常通読</h2></div>
        <div className="form-row">
          <label>書
            <select className="select" value={cursor.bookId} onChange={(event) => void updateCursor(event.target.value, 1)}>
              {bibleBooks.map((book) => <option key={book.id} value={book.id}>{book.name}</option>)}
            </select>
          </label>
          <label>次に読む章
            <input className="input" type="number" min="1" max={getBook(cursor.bookId).chapters} value={cursor.chapter} onChange={(event) => void updateCursor(cursor.bookId, Number(event.target.value) || 1)} />
          </label>
        </div>
        <label className="toggle-row">
          <input type="checkbox" checked={sharePresence} onChange={(event) => void updatePresenceSharing(event.target.checked)} />
          <span><strong>読書中の章を相手に表示</strong><small>「読み始める」を押している間だけ表示します</small></span>
        </label>
      </section>

      <section className="panel">
        <div className="panel-title"><h2>データ管理</h2></div>
        <p className="setting-help">初期化すると2人分の通読履歴、集会範囲、ワンちゃんの成長が消えます。研究ノートやタスクは消えません。</p>
        <button className="button danger" onClick={() => {
          if (confirm("2人の聖書通読とワンちゃんのデータを初期化しますか？")) void setState(defaultReadingState);
        }}>通読データを初期化</button>
      </section>
    </>
  );
}
