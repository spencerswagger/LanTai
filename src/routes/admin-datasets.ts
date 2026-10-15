import { Hono } from "hono";
import {
  addSchemaVersion,
  createDataset,
  FIRST_VERSION,
  getDatasetById,
  listDatasets,
  listSchemaVersions,
} from "../datasets/repository";
import type { AppEnv } from "../env";
import { asString, readJsonBody } from "../lib/body";
import { BadRequestError } from "../lib/errors";
import { readCatalog } from "../r2/catalog";
import { parseVersion } from "../schema/compat";
import { freezeSchemaVersion } from "../schema/freeze";
import { assertSchemaShape } from "../schema/validate";

const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,62}$/;

function actorOf(c: { get(key: "accessIdentity"): { email: string } | null }): string | null {
  return c.get("accessIdentity")?.email ?? null;
}

export const datasetsAdminRoutes = new Hono<AppEnv>();

datasetsAdminRoutes.post("/datasets", async (c) => {
  const body = await readJsonBody(c);
  const slug = asString(body.slug);
  const title = asString(body.title);
  if (!slug || !SLUG_RE.test(slug)) {
    throw new BadRequestError("invalid_slug", "slug 必须为 1-63 位小写字母、数字或连字符");
  }
  if (!title) throw new BadRequestError("invalid_title", "title 不能为空");
  assertSchemaShape(body.schema);
  const dataset = await createDataset(c.env, {
    slug,
    title,
    schema: body.schema,
    actor: actorOf(c),
  });
  return c.json({ dataset, schemaVersion: FIRST_VERSION }, 201);
});

datasetsAdminRoutes.post("/datasets/:id/schema-versions", async (c) => {
  const body = await readJsonBody(c);
  const version = asString(body.version);
  if (!version || !parseVersion(version)) {
    throw new BadRequestError("invalid_version", "version 必须形如 x.y.z");
  }
  assertSchemaShape(body.schema);
  const row = await addSchemaVersion(c.env, {
    datasetId: c.req.param("id"),
    version,
    schema: body.schema,
    actor: actorOf(c),
  });
  return c.json({ schemaVersion: { version: row.version, status: row.status } }, 201);
});

datasetsAdminRoutes.post("/datasets/:id/freeze", async (c) => {
  const body = await readJsonBody(c);
  const version = asString(body.version);
  if (!version || !parseVersion(version)) {
    throw new BadRequestError("invalid_version", "version 必须形如 x.y.z");
  }
  const result = await freezeSchemaVersion(c.env, c.req.param("id"), version, actorOf(c));
  return c.json({
    dataset: {
      id: result.dataset.id,
      slug: result.dataset.slug,
      title: result.dataset.title,
      currentSchemaVersion: version,
    },
    frozenVersion: version,
    changeKind: result.changeKind,
    catalog: result.catalog,
  });
});

datasetsAdminRoutes.get("/datasets", async (c) => {
  const datasets = await listDatasets(c.env);
  const datasetsWithVersions = await Promise.all(
    datasets.map(async (dataset) => {
      const versions = await listSchemaVersions(c.env, dataset.id);
      return {
        id: dataset.id,
        slug: dataset.slug,
        title: dataset.title,
        currentSchemaVersion: dataset.current_schema_version,
        currentDataVersion: dataset.current_data_version ?? null,
        schemaVersions: versions.map((v) => ({ version: v.version, status: v.status })),
      };
    }),
  );
  return c.json({ datasets: datasetsWithVersions });
});

datasetsAdminRoutes.get("/datasets/:id", async (c) => {
  const dataset = await getDatasetById(c.env, c.req.param("id"));
  const versions = await listSchemaVersions(c.env, dataset.id);
  return c.json({
    dataset: {
      id: dataset.id,
      slug: dataset.slug,
      title: dataset.title,
      currentSchemaVersion: dataset.current_schema_version,
      currentDataVersion: dataset.current_data_version ?? null,
    },
    schemaVersions: versions.map((v) => ({ version: v.version, status: v.status })),
  });
});

datasetsAdminRoutes.get("/catalog", async (c) => c.json(await readCatalog(c.env.BUCKET)));
