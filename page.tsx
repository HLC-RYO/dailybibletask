"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { useAppContext } from "@/context/AppContext";
import { useHouseholdCollection } from "@/hooks/useHouseholdCollection";
import { formatJapaneseDate } from "@/lib/date";
import type { TaskFrame, TaskFrameRow, TaskItem } from "@/lib/types";

function makeId(prefix: string) {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function TasksPage() {
  const { firebaseUser, memberNames } = useAppContext();
  const { items: tasks, addItem, updateItem, removeItem } = useHouseholdCollection<TaskItem>("tasks");
  const {
    items: taskFrames,
    addItem: addFrame,
    updateItem: updateFrame,
    removeItem: removeFrame,
  } = useHouseholdCollection<TaskFrame>("taskFrames");

  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [assignee, setAssignee] = useState<TaskItem["assignee"]>("both");
  const [newFrameTitle, setNewFrameTitle] = useState("");
  const [rowDrafts, setRowDrafts] = useState<Record<string, { name: string; detail: string }>>({});
  const [editingFrameId, setEditingFrameId] = useState("");
  const [editingFrameTitle, setEditingFrameTitle] = useState("");

  const sorted = useMemo(
    () =>
      [...tasks].sort(
        (a, b) =>
          Number(a.completed) - Number(b.completed) ||
          (a.dueDate || "9999").localeCompare(b.dueDate || "9999"),
      ),
    [tasks],
  );

  const sortedFrames = useMemo(
    () => [...taskFrames].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [taskFrames],
  );

  const add = async () => {
    if (!firebaseUser || !title.trim()) return;
    await addItem({
      id: makeId("task"),
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

  const createFrame = async () => {
    if (!firebaseUser || !newFrameTitle.trim()) return;
    const now = new Date().toISOString();
    await addFrame({
      id: makeId("frame"),
      title: newFrameTitle.trim(),
      rows: [],
      createdAt: now,
      updatedAt: now,
      createdBy: firebaseUser.uid,
    });
    setNewFrameTitle("");
  };

  const addRow = async (frame: TaskFrame) => {
    const draft = rowDrafts[frame.id] ?? { name: "", detail: "" };
    if (!draft.name.trim() && !draft.detail.trim()) return;
    const row: TaskFrameRow = {
      id: makeId("row"),
      name: draft.name.trim(),
      detail: draft.detail.trim(),
      completed: false,
      createdAt: new Date().toISOString(),
    };
    await updateFrame(frame.id, {
      rows: [...frame.rows, row],
      updatedAt: new Date().toISOString(),
    });
    setRowDrafts((current) => ({ ...current, [frame.id]: { name: "", detail: "" } }));
  };

  const updateRow = async (frame: TaskFrame, rowId: string, patch: Partial<TaskFrameRow>) => {
    await updateFrame(frame.id, {
      rows: frame.rows.map((row) => (row.id === rowId ? { ...row, ...patch } : row)),
      updatedAt: new Date().toISOString(),
    });
  };

  const deleteRow = async (frame: TaskFrame, rowId: string) => {
    await updateFrame(frame.id, {
      rows: frame.rows.filter((row) => row.id !== rowId),
      updatedAt: new Date().toISOString(),
    });
  };

  const saveFrameTitle = async (frame: TaskFrame) => {
    if (!editingFrameTitle.trim()) return;
    await updateFrame(frame.id, {
      title: editingFrameTitle.trim(),
      updatedAt: new Date().toISOString(),
    });
    setEditingFrameId("");
    setEditingFrameTitle("");
  };

  const deleteFrame = async (frame: TaskFrame) => {
    const suffix = frame.rows.length ? `\n中の${frame.rows.length}件も削除されます。` : "";
    if (!confirm(`「${frame.title}」を削除しますか？${suffix}`)) return;
    await removeFrame(frame.id);
  };

  return (
    <>
      <PageHeader title="タスク" subtitle="単発の用事と、用途別のチェックリストを管理します" />

      <section className="panel">
        <div className="panel-title"><h2>新しいリスト枠</h2></div>
        <div className="task-frame-create">
          <input
            className="input"
            value={newFrameTitle}
            onChange={(event) => setNewFrameTitle(event.target.value)}
            placeholder="例：お礼を言う人、買い物リスト、TODO"
          />
          <button className="button" disabled={!newFrameTitle.trim()} onClick={createFrame}>枠を作る</button>
        </div>
      </section>

      <div className="task-frame-grid">
        {sortedFrames.map((frame) => {
          const draft = rowDrafts[frame.id] ?? { name: "", detail: "" };
          const completedCount = frame.rows.filter((row) => row.completed).length;
          return (
            <section className="panel task-frame-card" key={frame.id}>
              <div className="panel-title task-frame-heading">
                {editingFrameId === frame.id ? (
                  <div className="task-frame-title-edit">
                    <input className="input" value={editingFrameTitle} onChange={(e) => setEditingFrameTitle(e.target.value)} />
                    <button className="button" onClick={() => saveFrameTitle(frame)}>保存</button>
                    <button className="button secondary" onClick={() => setEditingFrameId("")}>取消</button>
                  </div>
                ) : (
                  <>
                    <div>
                      <h2>{frame.title}</h2>
                      <span className="meta">{completedCount}/{frame.rows.length} 完了</span>
                    </div>
                    <div className="button-row">
                      <button className="button secondary" onClick={() => {
                        setEditingFrameId(frame.id);
                        setEditingFrameTitle(frame.title);
                      }}>名前変更</button>
                      <button className="button danger" onClick={() => deleteFrame(frame)}>枠を削除</button>
                    </div>
                  </>
                )}
              </div>

              <div className="task-table">
                <div className="task-table-head">
                  <span>完了</span><span>項目</span><span>内容</span><span />
                </div>
                {frame.rows.map((row) => (
                  <div className={`task-table-row ${row.completed ? "done" : ""}`} key={row.id}>
                    <input
                      className="checkbox"
                      type="checkbox"
                      checked={row.completed}
                      onChange={() => updateRow(frame, row.id, { completed: !row.completed })}
                    />
                    <input
                      className="task-cell-input"
                      value={row.name}
                      onChange={(e) => updateRow(frame, row.id, { name: e.target.value })}
                    />
                    <input
                      className="task-cell-input"
                      value={row.detail}
                      onChange={(e) => updateRow(frame, row.id, { detail: e.target.value })}
                    />
                    <button className="task-row-delete" aria-label="行を削除" onClick={() => deleteRow(frame, row.id)}>×</button>
                  </div>
                ))}
                {!frame.rows.length && <div className="empty compact">まだ項目がありません。</div>}
              </div>

              <div className="task-row-add">
                <input
                  className="input"
                  value={draft.name}
                  onChange={(e) => setRowDrafts((current) => ({
                    ...current,
                    [frame.id]: { ...draft, name: e.target.value },
                  }))}
                  placeholder="名前・品名・やること"
                />
                <input
                  className="input"
                  value={draft.detail}
                  onChange={(e) => setRowDrafts((current) => ({
                    ...current,
                    [frame.id]: { ...draft, detail: e.target.value },
                  }))}
                  placeholder="内容・数量・メモ"
                />
                <button className="button" onClick={() => addRow(frame)}>追加</button>
              </div>
            </section>
          );
        })}
      </div>

      <section className="panel">
        <div className="panel-title"><h2>単発タスク</h2></div>
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
          {!tasks.length && <div className="empty">単発タスクはありません。</div>}
        </div>
      </section>
    </>
  );
}
