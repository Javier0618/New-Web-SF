import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import vm from "node:vm";
import { pathToFileURL } from "node:url";

export const FIELDS = [
  "id",
  "title",
  "original_title",
  "media_type",
  "overview",
  "poster_path",
  "backdrop_path",
  "release_date",
  "vote_average",
  "genres",
  "runtime",
  "episode_run_time",
  "status",
  "original_language",
  "vote_count",
  "cast_names",
  "credits.cast",
  "display_options",
  "imported_at",
  "updated_at",
];
const DAY = 86400000;
export function decode(v) {
  if ("stringValue" in v) return v.stringValue;
  if ("integerValue" in v) return Number(v.integerValue);
  if ("doubleValue" in v) return v.doubleValue;
  if ("booleanValue" in v) return v.booleanValue;
  if ("timestampValue" in v) {
    const ms = Date.parse(v.timestampValue);
    return { seconds: Math.floor(ms / 1000), nanoseconds: (ms % 1000) * 1e6 };
  }
  if ("arrayValue" in v) return (v.arrayValue.values || []).map(decode);
  if ("mapValue" in v)
    return Object.fromEntries(
      Object.entries(v.mapValue.fields || {}).map(([k, v]) => [k, decode(v)]),
    );
  return null;
}
export function catalogItem(document) {
  const c = decode({ mapValue: { fields: document.fields || {} } });
  if (
    !Number.isFinite(c.id) ||
    c.id <= 0 ||
    typeof c.title !== "string" ||
    !c.title.trim() ||
    !["movie", "tv"].includes(c.media_type)
  )
    return null;
  const item = {
    docId: document.name.split("/").pop(),
    id: c.id,
    title: c.title,
    media_type: c.media_type,
    overview: typeof c.overview === "string" ? c.overview.slice(0, 300) : "",
    genres: Array.isArray(c.genres)
      ? c.genres.filter((g) => typeof g === "string" || typeof g === "number")
      : [],
  };
  for (const k of [
    "original_title",
    "poster_path",
    "backdrop_path",
    "release_date",
    "status",
    "original_language",
  ])
    if (typeof c[k] === "string") item[k] = c[k];
  for (const k of ["runtime", "vote_average", "vote_count"])
    if (Number.isFinite(c[k])) item[k] = c[k];
  if (Array.isArray(c.episode_run_time))
    item.episode_run_time = c.episode_run_time.filter(Number.isFinite);
  const cast = Array.isArray(c.cast_names)
    ? c.cast_names
    : Array.isArray(c.credits?.cast)
      ? c.credits.cast.map((p) => p.name)
      : [];
  item.cast_names = cast.filter((n) => typeof n === "string").slice(0, 14);
  if (c.imported_at && Number.isFinite(c.imported_at.seconds)) item.imported_at = c.imported_at;
  const display = {};
  for (const k of ["main_sections", "home_sections", "platforms"])
    if (Array.isArray(c.display_options?.[k]))
      display[k] = c.display_options[k].filter((v) => typeof v === "string");
  for (const k of ["quality", "language"])
    if (typeof c.display_options?.[k] === "string") display[k] = c.display_options[k];
  item.display_options = display;
  return item;
}
async function atomic(file, data) {
  const tmp = file + "." + process.pid + ".tmp";
  await fs.writeFile(tmp, data, { mode: 0o644 });
  await fs.rename(tmp, file);
}
async function jsonFile(file) {
  try {
    return JSON.parse(await fs.readFile(file, "utf8"));
  } catch (e) {
    if (e.code === "ENOENT") return null;
    throw e;
  }
}
export async function runSync({
  project,
  site,
  stateDir,
  fetchImpl = fetch,
  now = Date.now(),
  forceFull = false,
}) {
  if (!/^[a-z0-9-]+$/.test(project)) throw Error("Invalid catalog project");
  const base = `https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents`;
  await fs.mkdir(stateDir, { recursive: true, mode: 0o700 });
  const statePath = path.join(stateDir, "state.json");
  const previous = await jsonFile(statePath);
  if (previous && previous.project !== project) throw Error("State belongs to a different project");
  const state = previous || {
    version: 1,
    project,
    docs: {},
    deletedSeen: {},
    cursor: null,
    fullAt: 0,
    countAt: 0,
  };
  // Work on an isolated copy; no failed request advances the persisted cursor.
  const docs = Object.assign(Object.create(null), state.docs),
    seen = Object.assign(Object.create(null), state.deletedSeen);
  async function request(suffix, body, notFound = false) {
    const response = await fetchImpl(base + suffix, {
      method: body ? "POST" : "GET",
      headers: body ? { "Content-Type": "application/json" } : {},
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(20000),
    });
    if (notFound && response.status === 404) return null;
    if (!response.ok) throw Error("Firestore metadata HTTP " + response.status);
    return response.json();
  }
  async function count() {
    const rows = await request(":runAggregationQuery", {
      structuredAggregationQuery: {
        structuredQuery: { from: [{ collectionId: "content" }] },
        aggregations: [{ alias: "total", count: {} }],
      },
    });
    const value = Number(rows[0]?.result?.aggregateFields?.total?.integerValue);
    if (!Number.isInteger(value) || value < 0) throw Error("Invalid source count");
    return value;
  }
  async function query(full) {
    const structuredQuery = {
      from: [{ collectionId: "content" }],
      select: { fields: FIELDS.map((fieldPath) => ({ fieldPath })) },
    };
    if (!full)
      structuredQuery.where = {
        fieldFilter: {
          field: { fieldPath: "updated_at" },
          op: "GREATER_THAN",
          value: { timestampValue: new Date(Date.parse(state.cursor) - 120000).toISOString() },
        },
      };
    const rows = await request(":runQuery", { structuredQuery });
    if (
      !Array.isArray(rows) ||
      !rows.length ||
      !rows.every((r) => r.readTime && Number.isFinite(Date.parse(r.readTime)))
    )
      throw Error("Invalid metadata response");
    const watermark = rows.map((r) => r.readTime).sort()[0];
    return { documents: rows.filter((r) => r.document).map((r) => r.document), watermark };
  }
  let full = forceFull || !state.cursor || now - state.fullAt >= DAY;
  let countAt = state.countAt,
    sourceCount;
  if (!full && now - state.countAt >= 300000) {
    sourceCount = await count();
    countAt = now;
    if (sourceCount !== Object.keys(docs).length) full = true;
  }
  const result = await query(full);
  if (full) {
    // A partial or concurrent full scan must not remove valid cached records.
    const confirmed = await count();
    if (confirmed !== result.documents.length)
      throw Error("Source changed during full scan; retry next minute");
    for (const k of Object.keys(docs)) delete docs[k];
    countAt = now;
  }
  for (const d of result.documents) {
    if (
      !d.name?.startsWith(`projects/${project}/databases/(default)/documents/content/`) ||
      !d.updateTime
    )
      throw Error("Unexpected source document");
    const id = d.name.split("/").pop();
    if (!docs[id] || d.updateTime >= docs[id].updateTime) docs[id] = d;
  }
  const meta = await request("/web_config/content_catalog?mask.fieldPaths=deleted", null, true);
  const deleted = meta ? decode({ mapValue: { fields: meta.fields || {} } }).deleted || {} : {};
  for (const [id, stamp] of Object.entries(deleted)) {
    if (!Number.isFinite(Number(stamp)) || Number(stamp) <= Number(seen[id] || 0)) continue;
    const candidates = Object.entries(docs).filter(
      ([docId, d]) => docId === id || String(decode(d.fields?.id || {})) === id,
    );
    for (const [docId] of candidates) {
      // A tombstone may outlive a republication, or a phone may have a fast clock.
      // Verify actual existence instead of hiding a newer re-created title.
      const mask = FIELDS.map((k) => "mask.fieldPaths=" + encodeURIComponent(k)).join("&");
      const current = await request(
        "/content/" + encodeURIComponent(docId) + "?" + mask,
        null,
        true,
      );
      if (current) docs[docId] = current;
      else delete docs[docId];
    }
    seen[id] = Number(stamp);
  }
  const items = Object.values(docs)
    .map(catalogItem)
    .filter(Boolean)
    .sort(
      (a, b) =>
        (b.imported_at?.seconds || 0) - (a.imported_at?.seconds || 0) ||
        a.docId.localeCompare(b.docId, "en"),
    );
  const revision = crypto
    .createHash("sha256")
    .update(JSON.stringify(items))
    .digest("hex")
    .slice(0, 24);
  const output = path.join(site, "catalog");
  await fs.mkdir(output, { recursive: true, mode: 0o755 });
  const payload = { version: 1, revision, count: items.length, items };
  const filename = "catalog-" + revision + ".json";
  const manifest = {
    version: 1,
    revision,
    count: items.length,
    url: "/catalog/" + filename,
    updatedAt: result.watermark,
  };
  let changed = revision !== state.revision;
  const payloadExists = await fs.access(path.join(output, filename)).then(() => true, () => false);
  const published = await jsonFile(path.join(output, "version.json"));
  if (changed || !payloadExists || published?.revision !== revision) {
    await atomic(path.join(output, filename), JSON.stringify(payload));
    // Publish the pointer last: browsers can only see complete snapshots.
    await atomic(path.join(output, "version.json"), JSON.stringify(manifest));
    changed = true;
  }
  await atomic(
    statePath,
    JSON.stringify({
      version: 1,
      project,
      docs,
      deletedSeen: seen,
      cursor: result.watermark,
      fullAt: full ? now : state.fullAt,
      countAt,
      revision,
      lastRun: now,
    }),
  );
  await atomic(
    path.join(stateDir, "status.json"),
    JSON.stringify({
      ok: true,
      lastSuccess: new Date(now).toISOString(),
      count: items.length,
      revision,
      full,
    }),
  );
  // Only remove our own old, immutable snapshots; never the current version.
  for (const name of await fs.readdir(output))
    if (/^catalog-[a-f0-9]{24}\.json$/.test(name) && name !== filename) {
      const file = path.join(output, name);
      if (now - (await fs.stat(file)).mtimeMs > 7 * DAY) await fs.unlink(file);
    }
  return { count: items.length, revision, changed, full, metadataRead: result.documents.length };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2),
    arg = (name, fallback) => {
      const at = args.indexOf(name);
      return at >= 0 ? args[at + 1] : fallback;
    };
  const stateDir = arg("--state", "/var/lib/streamfusion-catalog");
  try {
    const box = { window: {} };
    vm.runInNewContext(
      await fs.readFile(arg("--config", "/www/wwwroot/streamfusion.top/dist/config.js"), "utf8"),
      box,
    );
    const result = await runSync({
      project: box.window.__APP_CONFIG__.firebase.projectId,
      site: arg("--site", "/www/wwwroot/streamfusion.top/dist"),
      stateDir,
      forceFull: args.includes("--full"),
    });
    console.log(JSON.stringify({ at: new Date().toISOString(), ...result }));
  } catch (e) {
    await fs.mkdir(stateDir, { recursive: true, mode: 0o700 });
    await atomic(
      path.join(stateDir, "status.json"),
      JSON.stringify({ ok: false, at: new Date().toISOString(), error: e.message }),
    ).catch(() => {});
    console.error(e.message);
    process.exitCode = 1;
  }
}
