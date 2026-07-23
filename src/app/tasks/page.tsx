"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { useAppContext } from "@/context/AppContext";
import { useHouseholdCollection } from "@/hooks/useHouseholdCollection";
import { formatJapaneseDate } from "@/lib/date";
import type { TaskItem } from "@/lib/types";

export default function TasksPage() {
  const { firebaseUser, memberNames } = useAppContext();
  const { items: tasks, addItem, updateItem, removeItem } = useHouseholdCollection<TaskItem>("tasks");
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [assignee, setAssignee] = useState<TaskItem["assignee"]>("both");
  const sorted = useMemo(() => [...tasks].sort((a, b) => Number(a.completed) - Number(b.completed) || (a.dueDate || "9999").localeCompare(b.dueDate || "9999")), [tasks]);

  const add = async () => {
    if (!firebaseUser || !title.trim()) return;
    await addItem({
      id: crypto.randomUUID(),
      title: title.trim(),
      dueDate,
      assignee,
      completed: false,
      createdAt: new Date().toISOString(),
      createdBy: firebaseUser.uid,
    });
    setTitle("");
    setDueDate("");
  };

  return (
    <>
      <PageHeader title="タスク" subtitle="夫婦共有と個人の用事を一つの場所で管理します" />
      <section className="panel">
        <div className="form-grid">
          <label>タスク<input className="input" value={title} onChange={(event) => setTitle(event.target.value)} /></label>
          <div className="form-row">
            <label>期限<input className="input" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></label>
            <label>担当
              <select className="select" value={assignee} onChange={(event) => setAssignee(event.target.value as TaskItem["assignee"])}>
                <option value="both">2人</option>
                <option value="husband">{memberNames.husband}</option>
                <option value="wife">{memberNames.wife}</option>
              </select>
            </label>
          </div>
          <button className="button" onClick={add}>追加</button>
        </div>
      </section>
      <section className="panel">
        <div className="list">
          {sorted.map((task) => (
            <article className="list-item" key={task.id}>
              <input className="checkbox" type="checkbox" checked={task.completed} onChange={() => updateItem(task.id, { completed: !task.completed })} />
              <div className="grow">
                <span className="meta">{task.assignee === "both" ? "2人" : memberNames[task.assignee]}・{formatJapaneseDate(task.dueDate)}</span>
                <h3 className={task.completed ? "completed" : ""}>{task.title}</h3>
              </div>
              <button className="button danger" onClick={() => removeItem(task.id)}>削除</button>
            </article>
          ))}
          {!tasks.length && <div className="empty">今すべきことはありません。</div>}
        </div>
      </section>
    </>
  );
}
