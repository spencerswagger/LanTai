import { Hono } from "hono";
import type { AppEnv } from "../env";
import { asString, readJsonBody } from "../lib/body";
import { BadRequestError } from "../lib/errors";
import { currentActor } from "../middleware/access";
import { publishDataset, stageDataset } from "../publish/publish";
import { listDataVersions } from "../publish/repository";
import { rollbackDataset } from "../publish/rollback";

export const publishAdminRoutes = new Hono<AppEnv>();

publishAdminRoutes.post("/datasets/:id/publish", async (c) => {
  const body = await readJsonBody(c);
  const result = await publishDataset(c.env, c.req.param("id"), body.payload, currentActor(c));
  return c.json(
    { dataVersion: result.version, r2Key: result.r2Key, contentHash: result.contentHash },
    201,
  );
});

publishAdminRoutes.post("/datasets/:id/stage", async (c) => {
  const body = await readJsonBody(c);
  const result = await stageDataset(c.env, c.req.param("id"), body.payload, currentActor(c));
  return c.json({ previewVersion: result.version, pointer: result.pointer }, 201);
});

publishAdminRoutes.post("/datasets/:id/rollback", async (c) => {
  const body = await readJsonBody(c);
  const version = asString(body.version);
  if (!version) throw new BadRequestError("invalid_version", "version 不能为空");
  const result = await rollbackDataset(c.env, c.req.param("id"), version, currentActor(c));
  return c.json(result);
});

publishAdminRoutes.get("/datasets/:id/versions", async (c) => {
  const versions = await listDataVersions(c.env, c.req.param("id"));
  return c.json({
    versions: versions.map((v) => ({
      version: v.version,
      status: v.status,
      publishedAt: v.published_at,
      contentHash: v.content_hash,
    })),
  });
});
