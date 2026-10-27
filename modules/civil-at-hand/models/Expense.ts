import { Schema } from "mongoose";
import { expenseDef } from "@/modules/civil-at-hand/lib/entities";
import { getModel, schemaFields } from "@/modules/civil-at-hand/lib/model-builder";

const ExpenseSchema = new Schema(schemaFields(expenseDef.fields), { timestamps: true, minimize: false });
ExpenseSchema.index({ date: -1 });
ExpenseSchema.index({ projectId: 1, date: -1 });

export const Expense = getModel<Record<string, unknown>>("Expense", ExpenseSchema);
