"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { useHouseholdCollection } from "@/hooks/useHouseholdCollection";
import { formatJapaneseDate } from "@/lib/date";
import type { StudyPlan } from "@/lib/types";

export default function StudyPage() {
  const { items: plans, addItem, updateItem, removeItem } = useHouseholdCollection<StudyPlan>("studyPlans");
  const [date, setDate] = useState("");
  const [theme, setTheme] = useState("");
  const [preparation, setPreparation] = useState("");
  const sorted = useMemo(() => [...plans].sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt)), [plans]);

  const add = async () => {
    if (!date || !theme.trim()) return;
    await addItem({
      id: crypto.randomUUID(),
      scheduledAt: date,
      theme: theme.trim(),
      preparation: preparation.trim(),
      status: "planned",
      reflection: "",
      createdAt: new Date().toISOString(),
    });
    setDate("");
    setTheme("");
    setPreparation("");
  };

  return (
    <>
      <PageHeader title="夫婦の研究" subtitle="週に一度の予定と、準備・振り返りを共有します" />
      <section className="panel">
        <div className="panel-title"><h2>次の研究を予定</h2></div>
        <div className="form-grid">
          <label>日付<input className="input" type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
          <label>テーマ<input className="input" value={theme} onChange={(event) => setTheme(event.target.value)} placeholder="例：平和を作る人になる" /></label>
          <label>準備すること<textarea className="textarea" value={preparation} onChange={(event) => setPreparation(event.target.value)} /></label>
          <button className="button" onClick={add}>予定を追加</button>
        </div>
      </section>
      <section className="panel">
        <div className="panel-title"><h2>予定一覧</h2></div>
        <div className="list">
          {sorted.map((plan) => (
            <article className="list-item" key={plan.id}>
              <div className="grow">
                <span className="meta">{formatJapaneseDate(plan.scheduledAt)}</span>
                <h3 className={plan.status === "done" ? "completed" : ""}>{plan.theme}</h3>
                {plan.preparation && <p>{plan.preparation}</p>}
              </div>
              <div className="button-row">
                <button className="button secondary" onClick={() => updateItem(plan.id, { status: plan.status === "done" ? "planned" : "done" })}>{plan.status === "done" ? "戻す" : "完了"}</button>
                <button className="button danger" onClick={() => removeItem(plan.id)}>削除</button>
              </div>
            </article>
          ))}
          {!plans.length && <div className="empty">次の夫婦の研究を予定してみましょう。</div>}
        </div>
      </section>
    </>
  );
}
