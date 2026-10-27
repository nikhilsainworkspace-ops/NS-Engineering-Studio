import test from "node:test";
import assert from "node:assert/strict";
import { normalizeCustomFormAnswers, normalizeCustomFormInput } from "@/lib/custom-forms";
import { InputError } from "@/lib/errors";

test("custom form definitions normalize question keys and prevent duplicates", () => {
  const form = normalizeCustomFormInput({
    title: "Group verification",
    description: "Member details",
    fields: [
      { label: "Full name", type: "text", required: true },
      { label: "Full name", type: "email", required: true },
      { label: "Member role", type: "select", options: ["Admin", "Member"] },
    ],
  });
  assert.equal(form.title, "Group verification");
  assert.equal(form.fields.length, 3);
  assert.equal(new Set(form.fields.map((field) => field.key)).size, 3);
  assert.deepEqual(form.fields[2].options, ["Admin", "Member"]);
});

test("custom form definitions reject empty choices and excessive question counts", () => {
  assert.throws(() => normalizeCustomFormInput({ title: "Bad form", fields: [{ label: "Choose", type: "select", options: [] }] }), InputError);
  assert.throws(() => normalizeCustomFormInput({ title: "Bad form", fields: [] }), InputError);
});

test("public answers enforce required questions and email formats", () => {
  const form = normalizeCustomFormInput({
    title: "Verification",
    fields: [
      { key: "email", label: "Email", type: "email", required: true },
      { key: "agree", label: "Confirm details", type: "checkbox", required: true },
    ],
  });
  assert.throws(() => normalizeCustomFormAnswers(form.fields, { email: "bad-email", agree: true }), InputError);
  assert.throws(() => normalizeCustomFormAnswers(form.fields, { email: "test@example.com", agree: false }), InputError);
});

test("answers accept only schema-defined keys and validate choice values", () => {
  const form = normalizeCustomFormInput({
    title: "Survey",
    fields: [
      { key: "role", label: "Role", type: "radio", required: true, options: ["Admin", "Member"] },
      { key: "topics", label: "Topics", type: "multi-select", options: ["Road", "Bridge"] },
    ],
  });
  const answers = normalizeCustomFormAnswers(form.fields, { role: "Member", topics: ["Bridge", "bad-value", "Road"], contactPhone: "123" });
  assert.deepEqual(answers, { role: "Member", topics: ["Bridge", "Road"] });
  assert.throws(() => normalizeCustomFormAnswers(form.fields, { role: "Owner" }), InputError);
});
