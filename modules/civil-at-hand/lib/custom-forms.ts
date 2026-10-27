import { InputError } from "@/modules/civil-at-hand/lib/errors";

export const CUSTOM_FORM_FIELD_TYPES = ["text", "textarea", "email", "tel", "number", "date", "select", "radio", "checkbox", "multi-select"] as const;
export type CustomFormFieldType = (typeof CUSTOM_FORM_FIELD_TYPES)[number];
export type CustomFormField = {
  key: string;
  label: string;
  type: CustomFormFieldType;
  required: boolean;
  placeholder: string;
  options: string[];
};
export type CustomFormDefinitionInput = { title: string; description: string; fields: CustomFormField[] };
export type CustomFormAnswer = string | boolean | string[];
export type CustomFormAnswers = Record<string, CustomFormAnswer>;

function record(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
function cleanText(value: unknown, max: number): string {
  return (typeof value === "string" ? value : "").trim().slice(0, max);
}
function fieldKey(value: unknown, label: string, index: number): string {
  const source = typeof value === "string" && value.trim() ? value : label;
  const base = source.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50);
  return (base && /^[a-z]/.test(base) ? base : "question-" + (index + 1)).slice(0, 50);
}

/** Strictly allowlists the form structure; answers are stored separately from contacts. */
export function normalizeCustomFormInput(value: unknown): CustomFormDefinitionInput {
  if (!record(value)) throw new InputError("Send a valid form definition.");
  const title = cleanText(value.title, 160);
  if (!title) throw new InputError("Add a name for this form.");
  if (!Array.isArray(value.fields) || value.fields.length < 1 || value.fields.length > 50) {
    throw new InputError("Add between 1 and 50 questions to this form.");
  }
  const usedKeys = new Set<string>();
  const fields: CustomFormField[] = value.fields.map((item, index) => {
    if (!record(item)) throw new InputError("One of the questions is invalid.");
    const label = cleanText(item.label, 160);
    if (!label) throw new InputError("Every question needs a label.");
    const type = String(item.type || "text") as CustomFormFieldType;
    if (!(CUSTOM_FORM_FIELD_TYPES as readonly string[]).includes(type)) throw new InputError("Choose a supported question type.");
    const base = fieldKey(item.key, label, index);
    let key = base;
    let suffix = 2;
    while (usedKeys.has(key)) {
      const tail = "-" + suffix++;
      key = base.slice(0, 50 - tail.length) + tail;
    }
    usedKeys.add(key);
    let options: string[] = [];
    if (type === "select" || type === "radio" || type === "multi-select") {
      const source = Array.isArray(item.options) ? item.options : typeof item.options === "string" ? item.options.split(/\r?\n/) : [];
      options = Array.from(new Set(source.map((option) => cleanText(option, 150)).filter(Boolean))).slice(0, 50);
      if (!options.length) throw new InputError("Add at least one option to each choice question.");
    }
    return {
      key,
      label,
      type,
      required: item.required === true,
      placeholder: cleanText(item.placeholder, 240),
      options,
    };
  });
  return { title, description: cleanText(value.description, 2000), fields };
}

/** Validates public answers against the exact published schema and drops unknown keys. */
export function normalizeCustomFormAnswers(fields: CustomFormField[], value: unknown): CustomFormAnswers {
  if (!record(value)) throw new InputError("Send valid answers for this form.");
  const answers: CustomFormAnswers = {};
  for (const field of fields) {
    const raw = value[field.key];
    if (field.type === "checkbox") {
      const checked = raw === true || raw === "true";
      if (field.required && !checked) throw new InputError("Please complete the required question: " + field.label + ".");
      answers[field.key] = checked;
      continue;
    }
    if (field.type === "multi-select") {
      if (raw !== undefined && raw !== null && !Array.isArray(raw)) throw new InputError("Choose valid options for: " + field.label + ".");
      const validChoices = Array.isArray(raw)
        ? raw.filter((item: unknown): item is string => typeof item === "string" && field.options.includes(item))
        : [];
      const chosen: string[] = Array.from(new Set<string>(validChoices)).slice(0, 50);
      if (field.required && !chosen.length) throw new InputError("Please complete the required question: " + field.label + ".");
      answers[field.key] = chosen;
      continue;
    }
    if (raw !== undefined && raw !== null && typeof raw !== "string" && typeof raw !== "number") {
      throw new InputError("Enter a valid answer for: " + field.label + ".");
    }
    const answer = cleanText(raw, field.type === "textarea" ? 6000 : 2000);
    if (field.required && !answer) throw new InputError("Please complete the required question: " + field.label + ".");
    if (!answer) continue;
    if (field.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(answer)) throw new InputError("Enter a valid email address for: " + field.label + ".");
    if (field.type === "number" && (!Number.isFinite(Number(answer)) || !/^-?\d+(?:\.\d+)?$/.test(answer))) throw new InputError("Enter a valid number for: " + field.label + ".");
    if (field.type === "date" && (!/^\d{4}-\d{2}-\d{2}$/.test(answer) || Number.isNaN(Date.parse(answer + "T00:00:00Z")) || new Date(answer + "T00:00:00Z").toISOString().slice(0, 10) !== answer)) throw new InputError("Enter a valid date for: " + field.label + ".");
    if ((field.type === "select" || field.type === "radio") && !field.options.includes(answer)) throw new InputError("Choose an available option for: " + field.label + ".");
    answers[field.key] = answer;
  }
  return answers;
}
