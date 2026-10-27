"use client";

// A complete list + add/edit/delete screen for one entity, built from its shared field specs.
import { useMemo, useState, type ReactNode } from "react";
import type { EntityDef } from "@/modules/civil-at-hand/lib/entities";
import { api, Button, DataTable, EmptyState, ErrorNote, Loading, Modal, SpecForm, useConfirm, useResource, useWorkspace, type Column, type FormLayout, type IconName, type RefOptions } from "@/modules/civil-at-hand/components/ui";

export type Row = Record<string, unknown> & { _id: string };

export function useEntityList(path: string | null) {
  return useResource<Row[]>(path, (data) => (data.items as Row[]) || [], []);
}

export default function EntityManager({ def, path, query = "", columns, title, description, addLabel, emptyTitle, emptyText, emptyIcon = "file", layout, refs, defaults, toolbar, rowActions, onOpen, deletable = true, formSize = "lg", csvName, filterRows, afterSave, formTitle }: {
  def: EntityDef; path: string; query?: string; columns: Column<Row>[]; title?: string; description?: ReactNode; addLabel: string; emptyTitle: string; emptyText: ReactNode; emptyIcon?: IconName;
  layout?: FormLayout; refs?: RefOptions; defaults?: Record<string, unknown>; toolbar?: ReactNode; rowActions?: (row: Row, reload: () => void) => ReactNode; onOpen?: (row: Row) => void;
  deletable?: boolean | ((row: Row) => boolean); formSize?: "md" | "lg" | "xl"; csvName?: string; filterRows?: (rows: Row[]) => Row[]; afterSave?: (row: Row) => void; formTitle?: (row: Row | null) => string;
}) {
  const { notify } = useWorkspace();
  const confirm = useConfirm();
  const url = `${path}${query ? `?${query}` : ""}`;
  const { data, loading, error, reload } = useEntityList(url);
  const [editing, setEditing] = useState<Row | "new" | null>(null);
  const rows = useMemo(() => (filterRows ? filterRows(data) : data), [data, filterRows]);

  async function save(values: Record<string, unknown>) {
    const isNew = editing === "new";
    const result = await api<{ item: Row }>(isNew ? path : `${path}/${(editing as Row)._id}`, { method: isNew ? "POST" : "PUT", json: values });
    setEditing(null);
    notify(isNew ? `${capital(def.label)} saved.` : `${capital(def.label)} updated.`);
    reload();
    afterSave?.(result.item);
  }
  async function remove(row: Row) {
    const answer = await confirm({ title: `Delete this ${def.label}?`, message: "This cannot be undone.", confirmLabel: "Delete" });
    if (!answer.ok) return;
    try { await api(`${path}/${row._id}`, { method: "DELETE" }); notify(`${capital(def.label)} deleted.`); reload(); }
    catch (err) { notify(err instanceof Error ? err.message : "Could not delete.", "error"); }
  }
  const canDelete = (row: Row) => (typeof deletable === "function" ? deletable(row) : deletable);

  return <div className="ui-stack">
    {title ? <div className="ui-subhead"><div><h2>{title}</h2>{description ? <p>{description}</p> : null}</div><Button variant="primary" icon="plus" onClick={() => setEditing("new")}>{addLabel}</Button></div> : null}
    {error ? <ErrorNote message={error} onRetry={reload} /> : null}
    {loading && !data.length ? <Loading /> : <DataTable rows={rows} columns={columns} csvName={csvName} onRowClick={onOpen || ((row) => setEditing(row))}
      toolbar={<>{toolbar}{!title ? <Button variant="primary" size="sm" icon="plus" onClick={() => setEditing("new")}>{addLabel}</Button> : null}</>}
      empty={<EmptyState icon={emptyIcon} title={emptyTitle} action={<Button variant="primary" icon="plus" onClick={() => setEditing("new")}>{addLabel}</Button>}>{emptyText}</EmptyState>}
      rowActions={(row) => <>{rowActions?.(row, reload)}<Button size="sm" variant="quiet" icon="edit" aria-label={`Edit ${String(row[def.titleField] || def.label)}`} onClick={() => setEditing(row)} />{canDelete(row) ? <Button size="sm" variant="quiet" icon="trash" aria-label={`Delete ${String(row[def.titleField] || def.label)}`} onClick={() => void remove(row)} /> : null}</>} />}
    {editing ? <Modal size={formSize} title={formTitle ? formTitle(editing === "new" ? null : editing) : editing === "new" ? capital(addLabel) : `Edit ${def.label}`} onClose={() => setEditing(null)}>
      <SpecForm fields={def.fields} initial={editing === "new" ? { ...(defaults || {}) } : editing} onSubmit={save} onCancel={() => setEditing(null)} refs={refs} layout={layout} submitLabel={editing === "new" ? "Save" : "Save changes"} />
    </Modal> : null}
  </div>;
}

export const capital = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
