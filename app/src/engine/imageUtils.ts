import type { ImageItem } from '../types'

/** Diagram blocks accept images (PNG/JPG — shown inline and embedded in exports)
 *  and Visio files (.vsdx/.vsd/.vsdm — stored as downloadable attachments).
 *  An item is an image by its MIME type, or — when no type was stored — by its
 *  filename not ending in a Visio extension. */
export function isImageItem(it: ImageItem): boolean {
  if (it.type) return it.type.startsWith('image/')
  return !/\.(vsd[xm]?|pdf)$/i.test(it.name)
}
