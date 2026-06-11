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

// Single shared (SharePoint) system: no local/shared switch — just the live
// connection status, a sign-in button when needed, and a manual refresh.
export function ShareControls() {
  const { remoteStatus, signIn, refreshNow } = useStore()
  if (!isRemoteConfigured()) return null
  const st = STATUS[remoteStatus]
  const showRefresh = ['synced', 'offline', 'conflict', 'readonly'].includes(remoteStatus)

  return (
    <div className="share-controls">
      {remoteStatus === 'signedout' && (
        <button className="btn btn-sm btn-primary" onClick={signIn}>התחבר</button>
      )}
      {st && (
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
