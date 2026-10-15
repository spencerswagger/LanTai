import { Validator } from "@cfworker/json-schema";
import { BadRequestError } from "../lib/errors";

const JSON_SCHEMA_TYPES = new Set([
  "object",
  "array",
  "string",
  "number",
  "integer",
  "boolean",
  "null",
]);

export type JsonSchema = Record<string, unknown>;

export function assertSchemaShape(schema: unknown): asserts schema is JsonSchema {
  if (typeof schema !== "object" || schema === null || Array.isArray(schema)) {
    throw new BadRequestError("invalid_schema", "JSON Schema 必须是对象");
  }
  const s = schema as Record<string, unknown>;
  if (s.type !== undefined) {
    if (typeof s.type !== "string" || !JSON_SCHEMA_TYPES.has(s.type)) {
      throw new BadRequestError("invalid_schema", `不支持的 type：${String(s.type)}`);
    }
  }
  if (s.properties !== undefined) {
    const props = s.properties;
    if (typeof props !== "object" || props === null || Array.isArray(props)) {
      throw new BadRequestError("invalid_schema", "properties 必须是对象");
    }
  }
  if (s.required !== undefined) {
    if (!Array.isArray(s.required) || s.required.some((r) => typeof r !== "string")) {
      throw new BadRequestError("invalid_schema", "required 必须是字符串数组");
    }
  }
  if (s.items !== undefined && (typeof s.items !== "object" || s.items === null)) {
    throw new BadRequestError("invalid_schema", "items 必须是对象");
  }
}

export interface PayloadValidation {
  valid: boolean;
  errors: string[];
}

/**
 * 以冻结的 JSON Schema 校验 payload。用于发布 / 预发布前的服务端门槛。
 */
export function validatePayload(schema: unknown, payload: unknown): PayloadValidation {
  const validator = new Validator(schema as never, "2020-12", false);
  const result = validator.validate(payload);
  return {
    valid: result.valid,
    errors: result.errors.map((e) => `${e.instanceLocation || "/"}: ${e.error}`),
  };
}
