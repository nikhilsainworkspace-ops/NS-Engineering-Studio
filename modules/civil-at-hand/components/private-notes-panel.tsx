"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import type { PrivateNoteRecord, ProjectRecord, TaskRecord } from "@/modules/civil-at-hand/lib/types";

type ToastType = "success" | "error" | "info";
type Props = {
  notes: PrivateNoteRecord[];
  projects?: ProjectRecord[];
  tasks?: TaskRecord[];
  onChanged: () => Promise<void>;
  notify: (message: string, type?: ToastType) => void;
  focusNoteId?: string | null;
  onFocusHandled?: () => void;
};
type Filter = "all" | "pinned" | "favorites" | "archived" | "trash";
type NoteAsset = { _id: string; filename: string; mimeType: string; size: number; createdAt?: string; url: string };
type NoteShare = { _id: string; token: string; active: boolean; expiresAt: string; createdAt: string; shareUrl?: string };

function dateLabel(value?: string | null) {
  if (!value) return "Not set";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unknown date" : date.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
function inputDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function signatureOf(value: { title: string; content: string; tags: string; pinned: boolean; archived: boolean; favorite: boolean; folder: string; category: string; projectId: string; dueAt: string }) {
  return [value.title, value.content, value.tags, value.pinned, value.archived, value.favorite, value.folder, value.category, value.projectId, value.dueAt].join("\u001f");
}
function validHttpUrl(value: string) {
  try { const url = new URL(value); return url.protocol === "https:" || url.protocol === "http:"; } catch { return false; }
}
function renderInline(text: string, shareToken?: string): ReactNode[] {
  const pattern = /(!\[[^\]]*\]\(\/api\/notes\/assets\/[a-f\d]{24}\)|\*\*[^*]+\*\*|\*[^*\n]+\*|\[[^\]]+\]\(https?:\/\/[^\s)]+\)|https?:\/\/[^\s<>()]+)/gi;
  const output: ReactNode[] = [];
  let lastIndex = 0;
  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > lastIndex) output.push(text.slice(lastIndex, index));
    let token = match[0];
    let trailing = "";
    while (/[.,!?;:]$/.test(token)) { trailing = token.slice(-1) + trailing; token = token.slice(0, -1); }
    const image = token.match(/^!\[([^\]]*)\]\(\/api\/notes\/assets\/([a-f\d]{24})\)$/i);
    const markdownLink = token.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/i);
    if (image) {
      const src = shareToken ? `/api/civil-at-hand/workspace/shared/${shareToken}/assets/${image[2]}` : `/api/civil-at-hand/notes/assets/${image[2]}`;
      output.push(<img className="note-inline-image" key={`img-${index}`} src={src} alt={image[1] || "Note attachment"} loading="lazy" />);
    } else if (token.startsWith("**") && token.endsWith("**")) {
      output.push(<strong key={`bold-${index}`}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith("*") && token.endsWith("*")) {
      output.push(<em key={`italic-${index}`}>{token.slice(1, -1)}</em>);
    } else {
      const href = markdownLink ? markdownLink[2] : token;
      const label = markdownLink ? markdownLink[1] : token;
      output.push(validHttpUrl(href) ? <a key={`link-${index}`} href={href} target="_blank" rel="noopener noreferrer nofollow">{label}</a> : token);
    }
    if (trailing) output.push(trailing);
    lastIndex = index + match[0].length;
  }
  if (lastIndex < text.length) output.push(text.slice(lastIndex));
  return output;
}
function renderNoteContent(content: string, shareToken?: string): ReactNode {
  const lines = content.split(/\r?\n/);
  return <div className="note-rich-preview">{lines.map((line, index) => {
    const key = `line-${index}`;
    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    const checkbox = line.match(/^\s*[-*]\s+\[([ xX])\]\s+(.+)$/);
    const bullet = line.match(/^\s*[-*]\s+(.+)$/);
    if (heading) return heading[1].length === 1 ? <h2 key={key}>{renderInline(heading[2], shareToken)}</h2> : heading[1].length === 2 ? <h3 key={key}>{renderInline(heading[2], shareToken)}</h3> : <h4 key={key}>{renderInline(heading[2], shareToken)}</h4>;
    if (checkbox) return <div className="note-check-line" key={key}><span aria-label={checkbox[1].trim() ? "Completed" : "Not completed"}>{checkbox[1].trim() ? "✓" : "□"}</span><span className={checkbox[1].trim() ? "note-check-done" : ""}>{renderInline(checkbox[2], shareToken)}</span></div>;
    if (bullet) return <div className="note-bullet-line" key={key}><span>•</span><span>{renderInline(bullet[1], shareToken)}</span></div>;
    return <p key={key}>{line ? renderInline(line, shareToken) : <span className="note-rich-spacer" />}</p>;
  })}</div>;
}

async function sendNoteRequest(url: string, init?: RequestInit) {
  const response = await fetch(url, { ...init, cache: "no-store", headers: { ...(init?.headers || {}), ...(init?.body && !(init.body instanceof FormData) ? { "Content-Type": "application/json" } : {}) } });
  const data = await response.json().catch(() => ({})) as { error?: string; note?: PrivateNoteRecord; asset?: NoteAsset; shares?: NoteShare[]; share?: NoteShare; answer?: string; model?: string; provider?: string };
  if (response.status === 401) window.dispatchEvent(new Event("cah-unauthorized"));
  if (!response.ok) throw new Error(data.error || "The request could not be completed. Please try again.");
  return data;
}

export default function PrivateNotesPanel({ notes, projects = [], tasks = [], onChanged, notify, focusNoteId, onFocusHandled }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [pinned, setPinned] = useState(false);
  const [archived, setArchived] = useState(false);
  const [favorite, setFavorite] = useState(false);
  const [folder, setFolder] = useState("Inbox");
  const [category, setCategory] = useState("General");
  const [projectId, setProjectId] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [folderFilter, setFolderFilter] = useState("all");
  const [autosaveRevision, setAutosaveRevision] = useState(0);
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState("Ready");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [historyNote, setHistoryNote] = useState<PrivateNoteRecord | null>(null);
  const [shareNote, setShareNote] = useState<PrivateNoteRecord | null>(null);
  const [shareLinks, setShareLinks] = useState<NoteShare[]>([]);
  const [shareExpiry, setShareExpiry] = useState("7");
  const [newShareUrl, setNewShareUrl] = useState("");
  const [sharesLoading, setSharesLoading] = useState(false);
  const [assets, setAssets] = useState<NoteAsset[]>([]);
  const [assetLoading, setAssetLoading] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiAnswer, setAiAnswer] = useState("");
  const [aiModel, setAiModel] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [includeWorkspaceContext, setIncludeWorkspaceContext] = useState(false);
  const editorRef = useRef<HTMLTextAreaElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingRef = useRef(false);
  const lastSavedSignature = useRef("");
  const onChangedRef = useRef(onChanged);
  const notifyRef = useRef(notify);
  useEffect(() => { onChangedRef.current = onChanged; }, [onChanged]);
  useEffect(() => { notifyRef.current = notify; }, [notify]);

  const currentSignature = signatureOf({ title, content, tags: tagsInput, pinned, archived, favorite, folder, category, projectId, dueAt });
  const currentSignatureRef = useRef(currentSignature);
  currentSignatureRef.current = currentSignature;
  const noteFolders = useMemo(() => Array.from(new Set(notes.filter((note) => !note.deletedAt).map((note) => note.folder || "Inbox"))).sort((a, b) => a.localeCompare(b)), [notes]);
  const visibleNotes = useMemo(() => {
    const q = search.trim().toLocaleLowerCase();
    return notes.filter((note) => {
      if (filter === "trash" ? !note.deletedAt : Boolean(note.deletedAt)) return false;
      if (folderFilter !== "all" && (note.folder || "Inbox") !== folderFilter) return false;
      if (filter === "archived" && !note.archived) return false;
      if (filter !== "archived" && filter !== "trash" && note.archived) return false;
      if (filter === "pinned" && !note.pinned) return false;
      if (filter === "favorites" && !note.favorite) return false;
      if (!q) return true;
      return [note.title, note.content, note.folder, note.category, ...(note.tags || [])].some((value) => String(value || "").toLocaleLowerCase().includes(q));
    }).sort((a, b) => Number(b.pinned) - Number(a.pinned) || Number(Boolean(b.favorite)) - Number(Boolean(a.favorite)) || new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [notes, search, filter, folderFilter]);

  const resetEditor = useCallback(() => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = null;
    setEditingId(null); setTitle(""); setContent(""); setTagsInput(""); setPinned(false); setArchived(false); setFavorite(false); setFolder("Inbox"); setCategory("General"); setProjectId(""); setDueAt(""); setSaveStatus("Ready"); lastSavedSignature.current = ""; setAssets([]);
  }, []);
  function populateEditor(note: PrivateNoteRecord) {
    const next = { title: note.title, content: note.content, tags: (note.tags || []).join(", "), pinned: note.pinned, archived: note.archived, favorite: Boolean(note.favorite), folder: note.folder || "Inbox", category: note.category || "General", projectId: note.projectId || "", dueAt: inputDate(note.dueAt) };
    lastSavedSignature.current = signatureOf(next);
    setEditingId(note._id); setTitle(next.title); setContent(next.content); setTagsInput(next.tags); setPinned(next.pinned); setArchived(next.archived); setFavorite(next.favorite); setFolder(next.folder); setCategory(next.category); setProjectId(next.projectId); setDueAt(next.dueAt); setSaveStatus("All changes saved");
  }
  function startNew() {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    resetEditor(); setFilter("all"); setSearch("");
    window.setTimeout(() => document.getElementById("private-note-title")?.focus(), 0);
  }
  function startEdit(note: PrivateNoteRecord) {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    populateEditor(note);
    if (note.deletedAt) setFilter("trash"); else if (note.archived) setFilter("archived"); else setFilter("all");
    void loadAssets(note._id);
    document.getElementById("private-note-editor")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  useEffect(() => {
    if (!focusNoteId) return;
    const note = notes.find((item) => item._id === focusNoteId && !item.archived && !item.deletedAt);
    if (note) { populateEditor(note); setFilter("all"); setSearch(note.title); void loadAssets(note._id); document.getElementById("private-note-editor")?.scrollIntoView({ behavior: "smooth", block: "start" }); }
    onFocusHandled?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusNoteId, notes]);

  // Debounced server-side autosave. The server remains the source of truth; no private note is put in browser storage.
  useEffect(() => {
    if (!title.trim() || savingRef.current || currentSignature === lastSavedSignature.current) return;
    setSaveStatus("Unsaved changes");
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    const signature = currentSignature;
    autoSaveTimer.current = setTimeout(async () => {
      if (savingRef.current) return;
      savingRef.current = true; setSaveStatus("Saving…");
      try {
        const payload = { title, content, tags: tagsInput.split(",").map((tag) => tag.trim()).filter(Boolean), pinned, archived, favorite, folder, category, projectId, dueAt: dueAt || null };
        const response = await sendNoteRequest(editingId ? `/api/civil-at-hand/notes/${editingId}` : "/api/civil-at-hand/notes", { method: editingId ? "PUT" : "POST", body: JSON.stringify(payload) });
        if (response.note) setEditingId(response.note._id);
        lastSavedSignature.current = signature; setSaveStatus("All changes saved");
        await onChangedRef.current();
      } catch (error) { setSaveStatus("Autosave failed"); notifyRef.current(error instanceof Error ? `${error.message} Autosave will retry when you edit again.` : "Autosave failed.", "error"); }
      finally {
        savingRef.current = false;
        if (currentSignatureRef.current !== lastSavedSignature.current) setAutosaveRevision((revision) => revision + 1);
      }
    }, 950);
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, content, tagsInput, pinned, archived, favorite, folder, category, projectId, dueAt, editingId, autosaveRevision]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) { notify("Add a title for your note.", "error"); return; }
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    setSaving(true); savingRef.current = true; setSaveStatus("Saving…");
    try {
      const payload = { title, content, tags: tagsInput.split(",").map((tag) => tag.trim()).filter(Boolean), pinned, archived, favorite, folder, category, projectId, dueAt: dueAt || null };
      const response = await sendNoteRequest(editingId ? `/api/civil-at-hand/notes/${editingId}` : "/api/civil-at-hand/notes", { method: editingId ? "PUT" : "POST", body: JSON.stringify(payload) });
      if (response.note) { setEditingId(response.note._id); lastSavedSignature.current = currentSignature; }
      setSaveStatus("All changes saved");
      await onChanged();
      notify(editingId ? "Note updated in MongoDB." : "Note saved in MongoDB. You can now add images or create a private link.");
      if (response.note) void loadAssets(response.note._id);
    } catch (error) { setSaveStatus("Save failed"); notify(error instanceof Error ? error.message : "Could not save this note.", "error"); }
    finally {
      setSaving(false); savingRef.current = false;
      if (currentSignatureRef.current !== lastSavedSignature.current) setAutosaveRevision((revision) => revision + 1);
    }
  }

  async function loadAssets(noteId: string) {
    try { const data = await sendNoteRequest(`/api/civil-at-hand/notes/${noteId}/assets`); setAssets((data as unknown as { assets: NoteAsset[] }).assets || []); }
    catch (error) { if (error instanceof Error) notify(error.message, "error"); }
  }
  async function uploadImage(file?: File) {
    if (!file) return;
    if (!editingId) { notify("Save the note first. Autosave usually does this shortly after you enter a title.", "info"); return; }
    setAssetLoading(true);
    try {
      const form = new FormData(); form.append("file", file);
      const data = await sendNoteRequest(`/api/civil-at-hand/notes/${editingId}/assets`, { method: "POST", body: form });
      if (!data.asset) throw new Error("The image upload did not return an attachment.");
      setContent((existing) => `${existing}${existing.trim() ? "\n\n" : ""}![${data.asset!.filename}](/api/civil-at-hand/notes/assets/${data.asset!._id})\n`);
      setAssets((current) => [data.asset!, ...current]);
      notify("Image stored in MongoDB and added to the note.");
    } catch (error) { notify(error instanceof Error ? error.message : "Could not upload image.", "error"); }
    finally { setAssetLoading(false); if (imageInputRef.current) imageInputRef.current.value = ""; }
  }
  function insertMarkdown(before: string, after = "", sample = "Text") {
    const field = editorRef.current;
    const start = field?.selectionStart ?? content.length;
    const end = field?.selectionEnd ?? content.length;
    const selected = content.slice(start, end) || sample;
    const next = `${content.slice(0, start)}${before}${selected}${after}${content.slice(end)}`;
    setContent(next);
    window.setTimeout(() => { if (!field) return; field.focus(); field.setSelectionRange(start + before.length, start + before.length + selected.length); }, 0);
  }

  async function toggleNote(note: PrivateNoteRecord, action: "pinned" | "archived" | "favorite", value: boolean) {
    setActionId(note._id);
    try {
      await sendNoteRequest(`/api/civil-at-hand/notes/${note._id}`, { method: "PATCH", body: JSON.stringify({ action, value }) });
      await onChanged();
      notify(action === "pinned" ? (value ? "Note pinned." : "Note unpinned.") : action === "favorite" ? (value ? "Added to favourites." : "Removed from favourites.") : (value ? "Note archived." : "Note restored to your notes."));
    } catch (error) { notify(error instanceof Error ? error.message : "Could not update this note.", "error"); }
    finally { setActionId(null); }
  }
  async function remove(note: PrivateNoteRecord) {
    const permanent = Boolean(note.deletedAt);
    if (!window.confirm(permanent ? `Permanently delete “${note.title}” and its stored images? This cannot be undone.` : `Move “${note.title}” to the recycle bin? You can restore it later.`)) return;
    setActionId(note._id);
    try {
      await sendNoteRequest(`/api/civil-at-hand/notes/${note._id}${permanent ? "?permanent=true" : ""}`, { method: "DELETE" });
      if (editingId === note._id) resetEditor();
      await onChanged();
      notify(permanent ? "Note permanently deleted." : "Note moved to the recycle bin.");
    } catch (error) { notify(error instanceof Error ? error.message : "Could not delete this note.", "error"); }
    finally { setActionId(null); }
  }
  async function restore(note: PrivateNoteRecord) {
    setActionId(note._id);
    try { await sendNoteRequest(`/api/civil-at-hand/notes/${note._id}`, { method: "PATCH", body: JSON.stringify({ action: "restore" }) }); await onChanged(); notify("Note restored from the recycle bin."); }
    catch (error) { notify(error instanceof Error ? error.message : "Could not restore this note.", "error"); }
    finally { setActionId(null); }
  }
  async function copyNote(note: PrivateNoteRecord) {
    try { await navigator.clipboard.writeText(`${note.title}\n\n${note.content}${note.tags?.length ? `\n\nTags: ${note.tags.join(", ")}` : ""}`); notify("Note copied to clipboard."); }
    catch { notify("Clipboard access was blocked by your browser.", "error"); }
  }
  function downloadMarkdown() {
    if (!visibleNotes.length) { notify("There are no notes in this view to export.", "info"); return; }
    const body = visibleNotes.map((note) => `# ${note.title}\n\n${note.content || "_(No body text)_"}\n\n${note.tags?.length ? `**Tags:** ${note.tags.join(", ")}\n\n` : ""}**Folder:** ${note.folder || "Inbox"}  \n**Category:** ${note.category || "General"}  \n**Pinned:** ${note.pinned ? "Yes" : "No"}  \n**Favourite:** ${note.favorite ? "Yes" : "No"}  \n**Last updated:** ${dateLabel(note.updatedAt)}\n`).join("\n---\n\n");
    const blob = new Blob([`# NS Engineering Studio — Private Notes Export\n\nExported ${dateLabel(new Date().toISOString())}\n\n---\n\n${body}`], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = `civil-at-hand-notes-${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url); notify(`Exported ${visibleNotes.length} note(s) as Markdown.`);
  }

  async function openShare(note: PrivateNoteRecord) {
    if (note.deletedAt) { notify("Restore the note before sharing it.", "error"); return; }
    setShareNote(note); setShareLinks([]); setNewShareUrl(""); setSharesLoading(true);
    try { const data = await sendNoteRequest(`/api/civil-at-hand/notes/${note._id}/share`); setShareLinks(data.shares || []); }
    catch (error) { notify(error instanceof Error ? error.message : "Could not load sharing links.", "error"); }
    finally { setSharesLoading(false); }
  }
  async function createShare() {
    if (!shareNote) return;
    setSharesLoading(true);
    try {
      const data = await sendNoteRequest(`/api/civil-at-hand/notes/${shareNote._id}/share`, { method: "POST", body: JSON.stringify({ expiresInDays: Number(shareExpiry) }) });
      const share = data.share as NoteShare & { shareUrl: string };
      setNewShareUrl(share.shareUrl); setShareLinks((current) => [share, ...current]);
      try { await navigator.clipboard.writeText(share.shareUrl); notify("Private link created and copied. Anyone with it can read the snapshot until expiry or revocation."); }
      catch { notify("Private link created. Use Copy link to share it."); }
    } catch (error) { notify(error instanceof Error ? error.message : "Could not create a share link.", "error"); }
    finally { setSharesLoading(false); }
  }
  async function revokeShare(link: NoteShare) {
    if (!shareNote || !window.confirm("Revoke this link? Future requests will be blocked, but copies or screenshots already made cannot be removed.")) return;
    try { await sendNoteRequest(`/api/civil-at-hand/notes/${shareNote._id}/share/${link._id}`, { method: "DELETE" }); setShareLinks((current) => current.map((item) => item._id === link._id ? { ...item, active: false } : item)); if (newShareUrl.endsWith(`/workspace/shared/${link.token}`)) setNewShareUrl(""); notify("Share link revoked."); }
    catch (error) { notify(error instanceof Error ? error.message : "Could not revoke the link.", "error"); }
  }
  function shareUrl(link: NoteShare) { return link.shareUrl || `${window.location.origin}/workspace/shared/${link.token}`; }

  function selectedAiContext() {
    if (!includeWorkspaceContext) return "";
    const openTasks = tasks.filter((task) => !["done", "cancelled"].includes(task.status)).slice(0, 35);
    const recentNotes = notes.filter((note) => !note.archived && !note.deletedAt).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 12);
    const taskLines = openTasks.map((task) => `- ${task.title} | status: ${task.status} | priority: ${task.priority} | due: ${task.dueAt || "not set"}${task.description ? ` | details: ${task.description.slice(0, 180)}` : ""}`);
    const noteLines = recentNotes.map((note) => `- ${note.title} | folder: ${note.folder || "Inbox"} | category: ${note.category || "General"} | excerpt: ${(note.content || "").slice(0, 260)}`);
    return [
      `Current date: ${new Date().toLocaleDateString("en-IN")}`,
      "Open tasks (up to 35):",
      taskLines.join("\n") || "- None",
      "Recent active note summaries (up to 12):",
      noteLines.join("\n") || "- None",
    ].join("\n").slice(0, 12_000);
  }
  async function askAssistant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!aiPrompt.trim()) { notify("Enter a question or an instruction for the assistant.", "error"); return; }
    setAiBusy(true); setAiAnswer(""); setAiModel("");
    try {
      const data = await sendNoteRequest("/api/civil-at-hand/assistant", { method: "POST", body: JSON.stringify({ prompt: aiPrompt.trim(), context: selectedAiContext() || undefined }) });
      if (!data.answer) throw new Error("The assistant did not return a draft.");
      setAiAnswer(data.answer);
      setAiModel(typeof data.model === "string" ? data.model : "");
      notify("Gemini AI draft ready. Review it before saving or creating tasks.");
    } catch (error) { notify(error instanceof Error ? error.message : "The AI assistant could not complete this request.", "error"); }
    finally { setAiBusy(false); }
  }
  function useAssistantAsNewNote() {
    if (!aiAnswer.trim()) return;
    const titleFromPrompt = aiPrompt.trim().replace(/\s+/g, " ").slice(0, 130);
    startNew(); setTitle(titleFromPrompt ? `AI draft: ${titleFromPrompt}`.slice(0, 160) : "AI work draft"); setContent(aiAnswer); setCategory("Work");
    notify("Draft copied into a new note editor. It will save to MongoDB after you review and confirm the title.", "info");
    window.setTimeout(() => document.getElementById("private-note-editor")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  }
  function assistantTaskDrafts() {
    return aiAnswer.split(/\r?\n/).map((line) => line.match(/^\s*[-*]\s+\[ \]\s+(.+?)\s*$/)?.[1]?.replace(/[`*_]/g, "").trim()).filter((line): line is string => Boolean(line && line.length <= 160)).slice(0, 12);
  }
  async function createTasksFromAssistant() {
    const drafts = assistantTaskDrafts();
    if (!drafts.length) { notify("Ask the assistant to format tasks as '- [ ] Task title' first.", "info"); return; }
    if (!window.confirm(`Create ${drafts.length} task(s) from this AI draft? They will be saved in the Task Planner for your review.`)) return;
    setAiBusy(true);
    try {
      for (const title of drafts) await sendNoteRequest("/api/civil-at-hand/tasks", { method: "POST", body: JSON.stringify({ title, description: "Drafted with the NS Engineering Studio AI assistant. Review and add a due date if needed.", status: "todo", priority: "normal", relatedKind: "none", relatedId: "" }) });
      await onChanged(); notify(`${drafts.length} task(s) created in the Task Planner.`);
    } catch (error) { notify(error instanceof Error ? `${error.message} Some earlier tasks may already have been created; refresh the Task Planner before retrying.` : "Could not create the drafted tasks.", "error"); }
    finally { setAiBusy(false); }
  }

  const activeNotes = notes.filter((note) => !note.archived && !note.deletedAt).length;
  const pinnedNotes = notes.filter((note) => !note.archived && !note.deletedAt && note.pinned).length;
  const favoriteNotes = notes.filter((note) => !note.archived && !note.deletedAt && note.favorite).length;
  const archivedNotes = notes.filter((note) => note.archived && !note.deletedAt).length;
  const trashNotes = notes.filter((note) => Boolean(note.deletedAt)).length;

  return <div className="private-notes-view">
    <section className="notes-intro-strip">
      <div className="notes-intro-icon" aria-hidden="true">✎</div>
      <div className="notes-intro-copy"><span>PRIVATE WORKSPACE</span><strong>Notes, ideas and images saved in MongoDB</strong><p>Autosave, searchable folders, favourites, linked projects, note history and revocable read-only sharing. Only a signed-in admin can manage notes.</p></div>
      <button className="primary-button" type="button" onClick={startNew}>＋ New note</button>
    </section>

    <section className="notes-stats-grid" aria-label="Note summary">
      <article><span>ACTIVE NOTES</span><strong>{activeNotes}</strong><small>Saved and searchable</small></article>
      <article><span>PINNED / FAVOURITES</span><strong>{pinnedNotes} / {favoriteNotes}</strong><small>Keep important items close</small></article>
      <article><span>ARCHIVED / TRASH</span><strong>{archivedNotes} / {trashNotes}</strong><small>Restore deleted notes from trash</small></article>
    </section>

    <section className="panel notes-ai-assistant">
      <div className="panel-heading"><div><h2>AI work assistant</h2><p>Draft meeting summaries, action lists, reports and follow-up messages. It never writes to your records without your separate confirmation.</p></div><span className="notes-ai-badge"><span className="notes-ai-gemini-mark" aria-hidden="true">✦</span><span>GEMINI AI</span></span></div>
      <form className="notes-ai-form" onSubmit={(event) => void askAssistant(event)}>
        <label className="field-wrap"><span>What do you need help with?</span><textarea rows={3} maxLength={8000} value={aiPrompt} onChange={(event) => setAiPrompt(event.target.value)} placeholder={"e.g. Turn these meeting notes into a clear summary and next steps…\nOr: What should I finish today?"} /></label>
        <label className="notes-ai-context"><input type="checkbox" checked={includeWorkspaceContext} onChange={(event) => setIncludeWorkspaceContext(event.target.checked)} /><span><strong>Include my task and recent note summaries</strong><small>Optional. When selected, the titles, status and short excerpts listed below are sent to your configured AI provider for this request. Contacts and images are not sent.</small></span></label>
        <div className="notes-ai-actions"><button className="primary-button" type="submit" disabled={aiBusy || !aiPrompt.trim()}>{aiBusy ? "Preparing draft…" : "Ask AI assistant"}</button><span className="notes-ai-privacy">Powered by Gemini. Requires server-side GEMINI_API_KEY; your key is never sent to the browser. Do not paste passwords, API keys or OTPs.</span></div>
      </form>
      {aiAnswer ? <div className="notes-ai-answer"><div className="notes-ai-answer-head"><strong>Draft response</strong><span>{aiModel ? `Gemini model: ${aiModel} · Review before use` : "Review before use"}</span></div><div className="notes-ai-answer-text">{aiAnswer}</div><div className="notes-ai-actions"><button className="secondary-button" type="button" onClick={async () => { try { await navigator.clipboard.writeText(aiAnswer); notify("AI draft copied."); } catch { notify("Clipboard access was blocked by your browser.", "error"); } }}>Copy draft</button><button className="secondary-button" type="button" onClick={useAssistantAsNewNote}>Use as new note</button>{assistantTaskDrafts().length ? <button className="primary-button" type="button" disabled={aiBusy} onClick={() => void createTasksFromAssistant()}>Create {assistantTaskDrafts().length} checklist tasks</button> : null}</div></div> : null}
    </section>

    <section className="panel notes-editor-panel" id="private-note-editor">
      <div className="panel-heading"><div><h2>{editingId ? "Edit private note" : "Create a private note"}</h2><p>Autosaves to MongoDB as you type{saveStatus ? ` · ${saveStatus}` : ""}.</p></div><div className="notes-editor-heading-actions">{editingId ? <button className="secondary-button" type="button" onClick={() => void loadAssets(editingId)}>Refresh images</button> : null}<button className="secondary-button" type="button" onClick={startNew}>＋ New / Clear</button></div></div>
      <form className="private-note-form" onSubmit={save}>
        <label className="field-wrap"><span>Note title *</span><input id="private-note-title" required maxLength={160} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Steel supplier meeting — next actions" /></label>
        <label className="field-wrap"><span>Tags (comma separated)</span><input maxLength={350} value={tagsInput} onChange={(event) => setTagsInput(event.target.value)} placeholder="e.g. supplier, urgent, site A"/><small>Up to 10 tags, 30 characters each.</small></label>
        <label className="field-wrap"><span>Folder / workspace</span><input maxLength={80} value={folder} onChange={(event) => setFolder(event.target.value)} placeholder="Inbox, Personal, Startup ideas…" /></label>
        <label className="field-wrap"><span>Category</span><select value={category} onChange={(event) => setCategory(event.target.value)}><option>General</option><option>Meeting</option><option>Idea</option><option>Work</option><option>Personal</option><option>Startup</option><option>Reference</option><option>Site diary</option><option>Client</option><option>Finance</option><option>Checklist</option></select></label>
        <label className="field-wrap"><span>Due date / reminder</span><input type="date" value={dueAt} onChange={(event) => setDueAt(event.target.value)} /></label>
        <label className="field-wrap"><span>Link to a project</span><select value={projectId} onChange={(event) => setProjectId(event.target.value)}><option value="">No linked project</option>{projects.map((project) => <option key={project._id} value={project._id}>{project.title}</option>)}</select></label>
        <div className="note-markdown-toolbar" role="toolbar" aria-label="Note formatting">
          <button type="button" onClick={() => insertMarkdown("# ", "", "Heading")}>H1</button><button type="button" onClick={() => insertMarkdown("## ", "", "Heading")}>H2</button><button type="button" onClick={() => insertMarkdown("**", "**", "bold text")}>Bold</button><button type="button" onClick={() => insertMarkdown("- [ ] ", "", "Task item")}>☐ Checklist</button><button type="button" onClick={() => insertMarkdown("- ", "", "List item")}>• List</button><button type="button" onClick={() => insertMarkdown("[", "](https://example.com)", "link label")}>Add link</button><button type="button" onClick={() => imageInputRef.current?.click()} disabled={!editingId || assetLoading}>＋ Image</button><input ref={imageInputRef} className="visually-hidden" type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(event) => void uploadImage(event.target.files?.[0])} aria-label="Upload image to note" /></div>
        <label className="field-wrap private-note-body"><span>Note details · Markdown headings, [ ] checklists and links are supported</span><textarea ref={editorRef} maxLength={20000} rows={9} value={content} onChange={(event) => setContent(event.target.value)} placeholder={'Write anything you need to remember…\n\n## Next actions\n- [ ] Call supplier\n- [ ] Review quotation\n\nPaste a URL and it becomes clickable in the saved preview.'} /></label>
        <div className="private-note-options"><label><input type="checkbox" checked={pinned} onChange={(event) => setPinned(event.target.checked)} /> Pin</label><label><input type="checkbox" checked={favorite} onChange={(event) => setFavorite(event.target.checked)} /> Favourite</label><label><input type="checkbox" checked={archived} onChange={(event) => setArchived(event.target.checked)} /> Archive</label><span>{content.length.toLocaleString()} / 20,000 characters · {saveStatus}</span></div>
        {assets.length ? <div className="note-assets-strip"><strong>Saved images ({assets.length})</strong><div>{assets.map((asset) => <a key={asset._id} href={asset.url} target="_blank" rel="noreferrer"><img src={asset.url} alt={asset.filename} loading="lazy"/><span>{asset.filename}</span></a>)}</div></div> : null}
        <div className="private-note-form-actions"><button className="primary-button" type="submit" disabled={saving}>{saving ? "Saving…" : editingId ? "Save changes now" : "Save note now"}</button><span className="note-autosave-label">{saveStatus === "Autosave failed" ? "Your latest edit is not confirmed saved. Press Save changes now to retry." : saveStatus}</span></div>
      </form>
    </section>

    <section className="panel notes-list-panel">
      <div className="panel-heading notes-list-heading"><div><h2>{filter === "trash" ? "Recycle bin" : "Saved notes"}</h2><p>{visibleNotes.length} shown · Clickable links, images and expanded detail previews.</p></div><button className="secondary-button" type="button" onClick={downloadMarkdown}>Export Markdown</button></div>
      <div className="notes-toolbar"><div className="notes-filter-tabs" role="group" aria-label="Filter notes">{([ ["all", `Active (${activeNotes})`], ["pinned", `Pinned (${pinnedNotes})`], ["favorites", `★ Favourites (${favoriteNotes})`], ["archived", `Archived (${archivedNotes})`], ["trash", `Recycle bin (${trashNotes})`] ] as [Filter, string][]).map(([value, label]) => <button type="button" key={value} className={filter === value ? "notes-filter-active" : ""} onClick={() => setFilter(value)}>{label}</button>)}</div><select className="notes-folder-filter" value={folderFilter} onChange={(event) => setFolderFilter(event.target.value)} aria-label="Filter notes by folder"><option value="all">All folders</option>{noteFolders.map((item) => <option value={item} key={item}>{item}</option>)}</select><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search titles, note text, tags or folders…" aria-label="Search private notes"/><button className="secondary-button" type="button" onClick={() => void onChanged()}>Refresh</button></div>
      {visibleNotes.length ? <div className="private-notes-grid">{visibleNotes.map((note) => {
        const expanded = expandedIds.has(note._id);
        const due = note.dueAt ? new Date(note.dueAt) : null;
        const isDueOver = Boolean(due && due.getTime() < new Date(new Date().toDateString()).getTime() && !note.archived && !note.deletedAt);
        return <article className={`private-note-card ${note.pinned ? "private-note-pinned" : ""} ${note.archived ? "private-note-archived" : ""} ${note.deletedAt ? "private-note-trashed" : ""}`} key={note._id}>
          <div className="private-note-card-top"><div className="private-note-flags">{note.pinned ? <span className="private-note-flag">Pinned</span> : null}{note.favorite ? <span className="private-note-flag favorite-flag">★ Favourite</span> : null}{note.archived ? <span className="private-note-flag archived-flag">Archived</span> : null}{note.deletedAt ? <span className="private-note-flag trashed-flag">In recycle bin</span> : null}</div><span className="private-note-edited">Updated {dateLabel(note.updatedAt)}</span></div>
          <h3>{note.title}</h3>
          <div className={`private-note-preview ${expanded ? "private-note-preview-expanded" : ""}`}>{note.content.trim() ? renderNoteContent(note.content) : <span className="muted">No body text. Edit this note to add details.</span>}</div>
          {note.content.length > 320 ? <button type="button" className="note-show-more" onClick={() => setExpandedIds((current) => { const next = new Set(current); if (next.has(note._id)) next.delete(note._id); else next.add(note._id); return next; })}>{expanded ? "Show less ↑" : "Show more ↓"}</button> : null}
          <div className="private-note-metadata"><span>{note.folder || "Inbox"}</span><span>{note.category || "General"}</span>{due ? <span className={isDueOver ? "note-due-overdue" : ""}>{isDueOver ? "Overdue · " : "Due · "}{dateLabel(note.dueAt).split(",")[0]}</span> : null}{note.projectId ? <span>{projects.find((project) => project._id === note.projectId)?.title || "Linked project"}</span> : null}</div>
          {note.tags?.length ? <div className="private-note-tags">{note.tags.map((tag) => <span key={tag}>{tag}</span>)}</div> : <div className="private-note-tags note-tags-empty"><span>No tags</span></div>}
          <div className="private-note-card-actions">{note.deletedAt ? <><button className="secondary-button" type="button" disabled={actionId === note._id} onClick={() => void restore(note)}>Restore</button><button className="private-note-delete" type="button" disabled={actionId === note._id} onClick={() => void remove(note)} title="Permanently delete">Delete forever</button></> : <><button className="secondary-button" type="button" onClick={() => startEdit(note)}>Edit</button><button className="secondary-button" type="button" onClick={() => void copyNote(note)}>Copy</button><button className="secondary-button" type="button" disabled={actionId === note._id} onClick={() => void toggleNote(note, "pinned", !note.pinned)}>{note.pinned ? "Unpin" : "Pin"}</button><button className="secondary-button" type="button" disabled={actionId === note._id} onClick={() => void toggleNote(note, "favorite", !note.favorite)}>{note.favorite ? "★ Saved" : "☆ Favourite"}</button><button className="secondary-button" type="button" onClick={() => setHistoryNote(note)} title="View past versions">History {note.history?.length ? `(${note.history.length})` : ""}</button><button className="secondary-button" type="button" onClick={() => void openShare(note)}>Share link</button><button className="secondary-button" type="button" disabled={actionId === note._id} onClick={() => void toggleNote(note, "archived", !note.archived)}>{note.archived ? "Restore" : "Archive"}</button><button className="private-note-delete" type="button" disabled={actionId === note._id} onClick={() => void remove(note)} aria-label={`Move note ${note.title} to recycle bin`} title="Move to recycle bin">×</button></>}</div>
        </article>;
      })}</div> : <div className="notes-empty"><span aria-hidden="true">✎</span><h3>{search ? "No matching notes" : filter === "pinned" ? "No pinned notes" : filter === "favorites" ? "No favourites yet" : filter === "archived" ? "Your archive is empty" : filter === "trash" ? "Recycle bin is empty" : "Your private notebook is ready"}</h3><p>{search ? "Try another keyword or folder." : filter === "trash" ? "Deleted notes stay here until you permanently delete or restore them." : "Create a note for internal reminders, meeting summaries, site observations, images or ideas."}</p>{filter !== "trash" ? <button className="primary-button" type="button" onClick={startNew}>Create a note</button> : null}</div>}
      <p className="private-notes-footnote">Private notes are protected by the admin session. Shared links are unguessable, read-only, expiring snapshots and can be revoked. Screenshots and copies made by recipients cannot be remotely erased. Avoid storing passwords, OTP seeds, API keys or payment-card information in note text.</p>
    </section>

    {historyNote ? <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setHistoryNote(null); }}><section className="modal-card note-history-modal" role="dialog" aria-modal="true" aria-labelledby="note-history-title"><div className="modal-head"><div><p className="eyebrow">VERSION HISTORY</p><h2 id="note-history-title">{historyNote.title}</h2><p>Up to 20 previous versions are kept when a note changes.</p></div><button className="icon-button" onClick={() => setHistoryNote(null)} aria-label="Close history">×</button></div>{historyNote.history?.length ? <div className="note-history-list">{[...historyNote.history].reverse().map((version, index) => <article key={`${version.at}-${index}`}><div><strong>{dateLabel(version.at)}</strong><p>{version.content.slice(0, 260) || "No body text in this version."}{version.content.length > 260 ? "…" : ""}</p></div><button className="secondary-button" onClick={async () => { if (!window.confirm("Restore this version? The current content will be kept in history.")) return; try { await sendNoteRequest(`/api/civil-at-hand/notes/${historyNote._id}`, { method: "PUT", body: JSON.stringify({ title: version.title, content: version.content, tags: version.tags, pinned: historyNote.pinned, archived: historyNote.archived, favorite: historyNote.favorite, folder: historyNote.folder, category: historyNote.category, projectId: historyNote.projectId, dueAt: historyNote.dueAt }) }); await onChanged(); setHistoryNote(null); notify("Previous note version restored."); } catch (error) { notify(error instanceof Error ? error.message : "Could not restore version.", "error"); } }}>Restore version</button></article>)}</div> : <div className="notes-empty"><h3>No older versions yet</h3><p>Previous versions will appear here after you change and save the note.</p></div>}</section></div> : null}

    {shareNote ? <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShareNote(null); }}><section className="modal-card note-share-modal" role="dialog" aria-modal="true" aria-labelledby="note-share-title"><div className="modal-head"><div><p className="eyebrow">REVOCABLE LINK SHARING</p><h2 id="note-share-title">Share “{shareNote.title}”</h2><p>Recipients can read the saved snapshot without logging in. Link access can be revoked or expires automatically.</p></div><button className="icon-button" onClick={() => setShareNote(null)} aria-label="Close sharing">×</button></div><div className="note-share-create"><label className="field-wrap"><span>Link expiry</span><select value={shareExpiry} onChange={(event) => setShareExpiry(event.target.value)}><option value="1">1 day</option><option value="7">7 days</option><option value="30">30 days</option><option value="90">90 days</option></select></label><button className="primary-button" type="button" disabled={sharesLoading} onClick={() => void createShare()}>{sharesLoading ? "Working…" : "Create new link"}</button></div>{newShareUrl ? <div className="note-share-new-link"><span>{newShareUrl}</span><button className="secondary-button" onClick={async () => { try { await navigator.clipboard.writeText(newShareUrl); notify("Share URL copied."); } catch { notify("Could not access clipboard.", "error"); } }}>Copy link</button></div> : null}<div className="note-shares-list"><h3>Existing links</h3>{sharesLoading ? <p>Loading links…</p> : shareLinks.length ? shareLinks.map((link) => <article key={link._id}><div><strong>{link.active ? "Active link" : "Revoked / expired"}</strong><small>Created {dateLabel(link.createdAt)} · Expires {dateLabel(link.expiresAt)}</small></div><div className="note-share-row-actions"><button className="secondary-button" disabled={!link.active} onClick={async () => { try { await navigator.clipboard.writeText(shareUrl(link)); notify("Share URL copied."); } catch { notify("Could not access clipboard.", "error"); } }}>Copy</button>{link.active ? <button className="private-note-delete" onClick={() => void revokeShare(link)}>Revoke</button> : null}</div></article>) : <p>No share links yet.</p>}</div><p className="note-share-warning">Important: an unlisted link is not a guarantee that recipients cannot copy, photograph or screenshot the content. Revoking stops future server access but cannot erase copies already made.</p></section></div> : null}
  </div>;
}
