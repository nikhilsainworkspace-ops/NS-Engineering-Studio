import test from "node:test";
import assert from "node:assert/strict";
import { normalizePrivateNoteInput } from "@/lib/private-notes";
import { InputError } from "@/lib/errors";

test("private note normalization trims the title and normalizes unique comma-separated tags", () => {
  const note = normalizePrivateNoteInput({
    title: "  Site visit notes  ",
    content: "Gate width needs checking.\nAsk the client about access.",
    tags: " site, follow-up, site, ",
    pinned: true,
    archived: false,
  });
  assert.equal(note.title, "Site visit notes");
  assert.equal(note.content, "Gate width needs checking.\nAsk the client about access.");
  assert.deepEqual(note.tags, ["site", "follow-up"]);
  assert.equal(note.pinned, true);
  assert.equal(note.archived, false);
});

test("private note normalization accepts an empty body but requires a title", () => {
  assert.equal(normalizePrivateNoteInput({ title: "Reminder" }).content, "");
  assert.throws(() => normalizePrivateNoteInput({ title: "   ", content: "Body" }), InputError);
});

test("private note normalization rejects oversized title, content and tag values", () => {
  assert.throws(() => normalizePrivateNoteInput({ title: "a".repeat(161) }), /title must be 160 characters or fewer/i);
  assert.throws(() => normalizePrivateNoteInput({ title: "ok", content: "x".repeat(20_001) }), /note must be .* characters or fewer/i);
  assert.throws(() => normalizePrivateNoteInput({ title: "ok", tags: ["x".repeat(31)] }), /each tag must be 30 characters or fewer/i);
  assert.throws(() => normalizePrivateNoteInput({ title: "ok", tags: ["one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven"] }), /no more than 10 tags/i);
});

test("private note normalization rejects invalid state and tag input types", () => {
  assert.throws(() => normalizePrivateNoteInput({ title: "ok", pinned: "yes" }), /pin status must be true or false/i);
  assert.throws(() => normalizePrivateNoteInput({ title: "ok", archived: 1 }), /archive status must be true or false/i);
  assert.throws(() => normalizePrivateNoteInput({ title: "ok", tags: 123 }), /tags must be a list/i);
  assert.throws(() => normalizePrivateNoteInput({ title: "ok", content: 123 }), /note content must be text/i);
});


test("private note normalization persists folders, categories, project links, favourites and due dates", () => {
  const dueAt = "2026-11-05";
  const note = normalizePrivateNoteInput({
    title: "  Startup follow-up  ", content: "See https://example.com", tags: ["startup"],
    favorite: true, folder: "Startup ideas", category: "Startup", projectId: "0123456789abcdef01234567", dueAt,
  });
  assert.equal(note.title, "Startup follow-up");
  assert.equal(note.favorite, true);
  assert.equal(note.folder, "Startup ideas");
  assert.equal(note.category, "Startup");
  assert.equal(note.projectId, "0123456789abcdef01234567");
  assert.ok(note.dueAt instanceof Date);
  assert.equal(note.dueAt?.toISOString().slice(0, 10), dueAt);
});

test("private note normalization rejects malformed linked project IDs and due dates", () => {
  assert.throws(() => normalizePrivateNoteInput({ title: "Note", projectId: "not-an-id" }), /valid linked project/i);
  assert.throws(() => normalizePrivateNoteInput({ title: "Note", dueAt: "not-a-date" }), /valid note due date/i);
});
