import mongoose, { Schema, type SchemaDefinition } from "mongoose";
import type { FieldSpec } from "@/modules/civil-at-hand/lib/entity-spec";

/** Builds a Mongoose schema definition from shared field specs so storage and validation never drift apart. */
export function schemaFields(specs: FieldSpec[]): SchemaDefinition {
  const definition: Record<string, unknown> = {};
  for (const spec of specs) definition[spec.key] = fieldType(spec);
  return definition as SchemaDefinition;
}

function fieldType(spec: FieldSpec): unknown {
  switch (spec.kind) {
    case "text": case "textarea": case "select": case "ref":
      return { type: String, trim: true, maxlength: spec.kind === "ref" ? 24 : Math.max(spec.max ?? 4000, 24), default: typeof spec.defaultValue === "string" ? spec.defaultValue : "" };
    case "number": case "money": case "percent":
      return { type: Number, default: typeof spec.defaultValue === "number" ? spec.defaultValue : null };
    case "date": case "datetime":
      return { type: Date, default: null };
    case "bool":
      return { type: Boolean, default: false };
    case "tags":
      return { type: [String], default: [] };
    case "items":
      return { type: [new Schema(schemaFields(spec.itemFields || []), { _id: true })], default: [] };
    default:
      return { type: Schema.Types.Mixed };
  }
}

/** Reuses an already-compiled model during hot reloads. */
export function getModel<T>(name: string, schema: Schema): mongoose.Model<T> {
  return (mongoose.models[name] || mongoose.model(name, schema)) as unknown as mongoose.Model<T>;
}
