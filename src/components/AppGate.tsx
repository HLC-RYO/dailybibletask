"use client";

import { useState } from "react";
import { useAppContext } from "@/context/AppContext";
import type { MemberId } from "@/lib/types";

export function AppGate({ children }: { children: React.ReactNode }) {
  const app = useAppContext();
  const [mode, setMode] = useState<"create" | "join">("create");
  const [householdName, setHouseholdName] = useState("わたしたちの家庭");
  const [displayName, setDisplayName] = useState("");
  const [memberId, setMemberId] = useState<MemberId>("husband");
  const [inviteCode, setInviteCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "処理に失敗しました。");
    } finally {
      setBusy(false);
    }
  };

  if (!app.configured) {
    return (
      <section className="auth-screen">
        <div className="auth-card">
          <span className="auth-icon">🔥</span>
          <h1>Firebaseの設定が必要です</h1>
          <p><code>.env.example</code>を<code>.env.local</code>へコピーし、Firebase Webアプリの7項目を設定してください。</p>
          <div className="setup-list">
            <span>Google Authentication</span>
            <span>Cloud Firestore</span>
            <span>Realtime Database</span>
          </div>
        </div>
      </section>
    );
  }

  if (app.loading) {
    return <section className="auth-screen"><div className="auth-card"><div className="spinner" /><p>読み込んでいます…</p></div></section>;
  }

  if (app.firebaseUser && !app.profile) {
    return <section className="auth-screen"><div className="auth-card"><div className="spinner" /><p>アカウントを確認しています…</p></div></section>;
  }

  if (!app.firebaseUser) {
    return (
      <section className="auth-screen">
        <div className="auth-card">
          <span className="auth-icon">🐶</span>
          <p className="eyebrow">Together, one chapter a day</p>
          <h1>ふたりの聖書の旅</h1>
          <p>それぞれのGoogleアカウントでログインし、通読や研究を2人で共有します。</p>
          {error && <p className="form-error">{error}</p>}
          <button className="button auth-button" disabled={busy} onClick={() => run(app.signIn)}>Googleでログイン</button>
        </div>
      </section>
    );
  }

  if (app.profile?.pendingHouseholdId && !app.profile.householdId) {
    const rejected = app.pendingRequest?.status === "rejected";
    return (
      <section className="auth-screen">
        <div className="auth-card">
          <span className="auth-icon">{rejected ? "↩️" : "📨"}</span>
          <h1>{rejected ? "参加申請が承認されませんでした" : "参加申請を送りました"}</h1>
          <p>{rejected ? "招待コードを確認し、もう一度申請できます。" : "家庭グループの作成者が承認すると、自動的にアプリへ入れます。"}</p>
          <p className="invite-code-small">申請コード：{app.profile.pendingInviteCode}</p>
          <button className="button secondary" disabled={busy} onClick={() => run(app.clearPendingJoin)}>{rejected ? "申請をやり直す" : "申請を取り消す"}</button>
          <button className="text-button" onClick={app.signOut}>別のアカウントでログイン</button>
        </div>
      </section>
    );
  }

  if (app.profile?.householdId && !app.household) {
    return <section className="auth-screen"><div className="auth-card"><div className="spinner" /><p>家庭グループを読み込んでいます…</p></div></section>;
  }

  if (!app.profile?.householdId) {
    const initialName = displayName || app.firebaseUser.displayName || "";
    return (
      <section className="auth-screen">
        <div className="auth-card onboarding-card">
          <span className="auth-icon">🏠</span>
          <h1>2人の共有場所を準備</h1>
          <div className="member-tabs">
            <button className={mode === "create" ? "active" : ""} onClick={() => setMode("create")}>新しく作る</button>
            <button className={mode === "join" ? "active" : ""} onClick={() => setMode("join")}>招待で参加</button>
          </div>
          <div className="form-grid">
            <label>あなたの表示名
              <input className="input" value={initialName} onChange={(event) => setDisplayName(event.target.value)} placeholder="遼太朗" />
            </label>
            {mode === "create" ? (
              <>
                <label>家庭グループ名
                  <input className="input" value={householdName} onChange={(event) => setHouseholdName(event.target.value)} />
                </label>
                <label>あなたの区分
                  <select className="select" value={memberId} onChange={(event) => setMemberId(event.target.value as MemberId)}>
                    <option value="husband">夫</option>
                    <option value="wife">妻</option>
                  </select>
                </label>
              </>
            ) : (
              <label>8文字の招待コード
                <input className="input invite-input" value={inviteCode} maxLength={8} onChange={(event) => setInviteCode(event.target.value.toUpperCase())} placeholder="ABCD2345" />
              </label>
            )}
          </div>
          {error && <p className="form-error">{error}</p>}
          <button
            className="button auth-button"
            disabled={busy}
            onClick={() => run(() => mode === "create"
              ? app.createHousehold({ householdName, displayName: initialName, memberId })
              : app.requestToJoin({ inviteCode, displayName: initialName }))}
          >
            {busy ? "処理中…" : mode === "create" ? "家庭グループを作成" : "参加を申請"}
          </button>
          <button className="text-button" onClick={app.signOut}>ログアウト</button>
        </div>
      </section>
    );
  }

  return (
    <>
      <header className="account-bar">
        <a href="/" className="account-brand">🐶 ふたりの聖書の旅</a>
        <div>
          <span>{app.memberNames[app.memberId]}</span>
          <a href="/settings">設定</a>
        </div>
      </header>
      {children}
    </>
  );
}
