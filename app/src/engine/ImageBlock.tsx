import { useRef, useState } from 'react'
import type { Block, ImageItem } from '../types'
import { IconUpload, IconTrash, IconFileText } from '../ui/icons'
import { isImageItem } from './imageUtils'

type ImageBlockT = Extract<Block, { kind: 'image' }>

const MAX_BYTES = 10 * 1024 * 1024 // 10MB — attachments embed into the per-site data synced to SharePoint

function rid(): string {
  return globalThis.crypto?.randomUUID?.() ?? 'img' + Math.random().toString(36).slice(2)
}

/** Read a file and downscale large images (keeps localStorage small). Returns a data URL. */
async function fileToDataUrl(file: File, maxDim = 1400): Promise<string> {
  const original = await new Promise<string>((res, rej) => {
    const r = new FileReader()
    r.onload = () => res(String(r.result))
    r.onerror = () => rej(r.error)
    r.readAsDataURL(file)
  })
  // Non-image files (e.g. Visio) can't be decoded/downscaled — store as-is.
  if (!file.type.startsWith('image/')) return original
  try {
    const img = new Image()
    await new Promise<void>((res, rej) => {
      img.onload = () => res()
      img.onerror = () => rej(new Error('decode'))
      img.src = original
    })
    if (img.naturalWidth <= maxDim && img.naturalHeight <= maxDim) return original
    const scale = maxDim / Math.max(img.naturalWidth, img.naturalHeight)
    const w = Math.round(img.naturalWidth * scale)
    const h = Math.round(img.naturalHeight * scale)
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)
    const type = file.type === 'image/png' ? 'image/png' : 'image/jpeg'
    return canvas.toDataURL(type, 0.85)
  } catch {
    return original
  }
}

export function ImageBlock({
  block,
  value,
  onChange,
}: {
  block: ImageBlockT
  value: ImageItem[] | undefined
  onChange: (images: ImageItem[]) => void
}) {
  const images = value || []
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  async function handleFiles(files: FileList | null) {
    if (!files || !files.length) return
    setErr('')
    setBusy(true)
    const limit = block.multi ? files.length : 1
    const added: ImageItem[] = []
    let tooBig = false
    for (let i = 0; i < Math.min(files.length, limit); i++) {
      const f = files[i]
      if (f.size > MAX_BYTES) { tooBig = true; continue }
      try {
        const dataUrl = await fileToDataUrl(f)
        added.push({ id: rid(), name: f.name, dataUrl, type: f.type })
      } catch {
        /* skip unreadable file */
      }
    }
    setBusy(false)
    if (tooBig) setErr('קובץ גדול מ-10MB לא נוסף.')
    if (!added.length) return
    onChange(block.multi ? [...images, ...added] : added.slice(0, 1))
  }

  return (
    <div className="image-block">
      {images.length > 0 && (
        <div className="image-grid">
          {images.map((im) => (
            <figure className={'image-item' + (isImageItem(im) ? '' : ' is-file')} key={im.id}>
              {isImageItem(im) ? (
                <img src={im.dataUrl} alt={im.name} />
              ) : (
                <a className="image-file" href={im.dataUrl} download={im.name} title={`הורד ${im.name}`}>
                  <IconFileText width={34} height={34} />
                  <span className="image-file-ext">{(im.name.split('.').pop() || 'קובץ').toUpperCase()}</span>
                </a>
              )}
              <figcaption title={im.name}>{im.name}</figcaption>
              <button
                className="icon-btn btn-danger img-remove"
                title="הסר"
                onClick={() => onChange(images.filter((x) => x.id !== im.id))}
              >
                <IconTrash />
              </button>
            </figure>
          ))}
        </div>
      )}
      <button className="image-drop" onClick={() => inputRef.current?.click()} disabled={busy}>
        <IconUpload width={22} height={22} />
        <span className="image-drop-title">
          {busy ? 'טוען…' : block.hint || (block.multi ? 'העלאת תמונות (תרשימים / צילומים)' : 'העלאת תמונה / תרשים')}
        </span>
        <span className="muted" style={{ fontSize: 12 }}>לחצו לבחירת קובץ · PNG / JPG / Visio · עד 10MB</span>
        <input
          ref={inputRef}
          type="file"
          accept="image/*,.vsdx,.vsd,.vsdm"
          multiple={block.multi}
          hidden
          onChange={(e) => {
            handleFiles(e.target.files)
            e.target.value = ''
          }}
        />
      </button>
      {err && <div className="image-err">{err}</div>}
    </div>
  )
}
