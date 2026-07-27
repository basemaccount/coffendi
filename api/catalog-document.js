import { Readable } from "node:stream";
import { get } from "@vercel/blob";

const CATALOG_PREFIX = "coffendi/origins/2026-07-27-full/";
const SAFE_PATH = /^coffendi\/origins\/2026-07-27-full\/[a-z0-9-]+\/[a-z0-9-]+\.pdf$/;

function requestedPath(req) {
  const raw = Array.isArray(req.query?.path) ? req.query.path[0] : req.query?.path;
  return typeof raw === "string" ? raw : "";
}

function safeFilename(pathname) {
  const filename = pathname.split("/").at(-1) || "coffendi-origin-sheet.pdf";
  return filename.replace(/[^a-zA-Z0-9._-]/g, "-");
}

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const pathname = requestedPath(req);
  if (!pathname.startsWith(CATALOG_PREFIX) || !SAFE_PATH.test(pathname)) {
    return res.status(404).json({ error: "Document not found" });
  }

  try {
    const result = await get(pathname, {
      access: "private",
      ifNoneMatch: typeof req.headers["if-none-match"] === "string"
        ? req.headers["if-none-match"]
        : undefined,
    });

    if (!result) return res.status(404).json({ error: "Document not found" });
    if (result.statusCode === 304) return res.status(304).end();

    const download = req.query?.download === "1";
    const filename = safeFilename(pathname);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `${download ? "attachment" : "inline"}; filename="${filename}"`,
    );
    res.setHeader("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400");
    res.setHeader("ETag", result.blob.etag);
    res.setHeader("Content-Language", pathname.endsWith("-tr.pdf") ? "tr" : "en");
    if (Number.isFinite(result.blob.size)) {
      res.setHeader("Content-Length", String(result.blob.size));
    }
    if (result.blob.uploadedAt) {
      res.setHeader("Last-Modified", new Date(result.blob.uploadedAt).toUTCString());
    }
    res.setHeader("X-Content-Type-Options", "nosniff");

    if (req.method === "HEAD") return res.status(200).end();

    const stream = Readable.fromWeb(result.stream);
    stream.on("error", () => {
      if (!res.headersSent) res.status(502);
      res.end();
    });
    return stream.pipe(res);
  } catch (error) {
    console.error("Catalog document delivery failed", {
      name: error?.name,
      message: error?.message,
      pathname,
    });
    return res.status(502).json({ error: "Document temporarily unavailable" });
  }
}
