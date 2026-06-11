import { useStore, type RemoteStatus } from '../store/StoreContext'
import { isRemoteConfigured } from '../remote/config'
import { IconRefresh } from './icons'

const STATUS: Record<RemoteStatus, { label: string; cls: string } | null> = {
  off: null,
  loading: { label: 'טוען…', cls: 'muted' },
  synced: { label: 'מסונכרן', cls: 'ok' },
  saving: { label: 'שומר…', cls: 'warn' },
  readonly: { label: 'צפייה בלבד', cls: 'warn' },
  offline: { label: 'לא מחובר', cls: 'bad' },
  conflict: { label: 'עודכן במקום אחר · רענן', cls: 'bad' },
  signedout: null,
}

export function ShareControls() {
  const { mode, setMode, remoteStatus, signIn, refreshNow } = useStore()
  if (!isRemoteConfigured()) return null
  const st = STATUS[remoteStatus]
  const showRefresh = mode === 'shared' && ['synced', 'offline', 'conflict'].includes(remoteStatus)

  return (
    <div className="share-controls">
      <div className="seg" role="group" aria-label="מקור נתונים">
        <button className={'seg-btn' + (mode === 'local' ? ' on' : '')} onClick={() => setMode('local')}>מקומי</button>
        <button className={'seg-btn' + (mode === 'shared' ? ' on' : '')} onClick={() => setMode('shared')}>משותף</button>
      </div>
      {mode === 'shared' && remoteStatus === 'signedout' && (
        <button className="btn btn-sm btn-primary" onClick={signIn}>התחבר</button>
      )}
      {mode === 'shared' && st && (
        <span className={'sync-chip ' + st.cls}>
          <span className="dot" />
          {st.label}
        </span>
      )}
      {showRefresh && (
        <button className="icon-btn" title="רענן מ-SharePoint" onClick={refreshNow}>
          <IconRefresh />
        </button>
      )}
    </div>
  )
}
