# Visio File Attachments in Diagram Blocks — Design

**Date:** 2026-06-19
**Status:** Approved (design), implementing

## Goal

Let users attach Visio files (`.vsdx`, `.vsd`, `.vsdm`) to diagram/image blocks, alongside PNG/JPG. Visio can't be previewed or embedded in a browser/document, so it's stored as a downloadable attachment and represented as a file card on screen and a short note in exports. The 3.7 network-diagram block becomes multi-file so a PNG (for display) and a Visio (for editing) can live together.

## Behavior

- **Accept:** the file picker accepts `image/*` plus `.vsdx,.vsd,.vsdm`.
- **Images (PNG/JPG):** unchanged — downscaled, shown inline, embedded in print/Word.
- **Visio:** stored as a raw data URL (no canvas downscale). On screen → a **file card**: file icon + extension + filename + download. In Print/PDF and Word → a note line **"תרשים מצורף (Visio): <filename>"** (cannot embed).
- **Size cap:** 10 MB per file. Larger files are rejected with an inline message ("הקובץ גדול מ‑10MB ולא נוסף") — Visio embeds into the per-site data synced to SharePoint, so very large files would bloat/slow sync.
- **3.7 network diagram (`s3-diagram`):** becomes `multi: true` so PNG + Visio can both be attached. Hint updated to mention both.

## Data model

`ImageItem` gains an optional `type?: string` (the file MIME). Backward compatible — existing items have none. An item is an image when `type` starts with `image/`, or (no type) when its name does not end in `.vsd|.vsdx|.vsdm`.

## Files

| File | Change |
|------|--------|
| `types.ts` | `ImageItem.type?: string` |
| `engine/imageUtils.ts` (new) | `isImageItem(it): boolean` — single source of truth |
| `engine/imageUtils.test.ts` (new) | unit tests for `isImageItem` |
| `engine/ImageBlock.tsx` | accept Visio; raw data URL for non-images; 10 MB cap + inline error; store `type`; render file card for non-images (download link) |
| `print/PrintView.tsx` | image block: `<img>` for images, note line for non-images |
| `print/docxExport.ts` | `processImages` skips non-images; `blockToDocx` adds a note paragraph per non-image attachment |
| `schema/s3-network.ts` | `s3-diagram` → `multi: true`, hint mentions PNG + Visio |
| `styles/engine.css` | `.image-item.is-file` file-card + `.image-err` styles |

## Testing

`imageUtils.test.ts`: `isImageItem` returns true for `image/png` type, true for a `.png` name without type, false for `.vsdx`/`.vsd`/`.vsdm` names, false for a Visio MIME type.

## Out of scope

In-browser Visio rendering/conversion (would need a server or heavy library); thumbnail extraction from Visio.
