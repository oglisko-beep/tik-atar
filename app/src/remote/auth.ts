import { PublicClientApplication, InteractionRequiredAuthError, type AccountInfo } from '@azure/msal-browser'
import { remoteConfig, GRAPH_SCOPES } from './config'

let msal: PublicClientApplication | null = null

/** Clear a stale "interaction in progress" flag left behind by an aborted
 *  redirect or a silent-iframe attempt. Without this, loginRedirect keeps
 *  throwing `interaction_in_progress` and the sign-in button does nothing. */
function clearStaleInteraction() {
  try { sessionStorage.removeItem('msal.interaction.status') } catch { /* ignore */ }
  try { localStorage.removeItem('msal.interaction.status') } catch { /* ignore */ }
}

export async function getMsal(): Promise<PublicClientApplication> {
  if (!msal) {
    msal = new PublicClientApplication({
      auth: {
        clientId: remoteConfig.clientId,
        authority: `https://login.microsoftonline.com/${remoteConfig.tenantId}`,
        redirectUri: window.location.origin + '/',
      },
      cache: { cacheLocation: 'localStorage' },
    })
    await msal.initialize()
    // Process a sign-in redirect return. Must not throw — a failure here should
    // not block account detection, and the returned account becomes active.
    try {
      const res = await msal.handleRedirectPromise()
      if (res?.account) msal.setActiveAccount(res.account)
    } catch (e) {
      console.error('[auth] handleRedirectPromise failed', e)
    }
  }
  return msal
}

export async function currentAccount(): Promise<AccountInfo | null> {
  const m = await getMsal()
  return m.getActiveAccount() ?? m.getAllAccounts()[0] ?? null
}

/** Returns true if a signed-in account is already cached (from a prior redirect
 *  sign-in) — zero-click on return visits. We deliberately do NOT call ssoSilent:
 *  its hidden iframe to login.microsoftonline.com is unreliable (third-party
 *  cookies) and is blocked outright in restricted webviews, which left the UI
 *  stuck on "loading" with no sign-in button. First-time users click "התחבר"
 *  (a single redirect that reuses their existing Microsoft session = SSO). */
export async function trySsoSilent(): Promise<boolean> {
  const m = await getMsal()
  const acct = m.getActiveAccount() ?? m.getAllAccounts()[0]
  if (acct) { m.setActiveAccount(acct); return true }
  return false
}

export async function login(): Promise<void> {
  const m = await getMsal()
  try {
    await m.loginRedirect({ scopes: GRAPH_SCOPES })
  } catch (e: any) {
    const code = e?.errorCode ?? ''
    if (code === 'interaction_in_progress' || String(e?.message).includes('interaction_in_progress')) {
      // Stale flag from an earlier aborted attempt — clear and retry once.
      clearStaleInteraction()
      await m.loginRedirect({ scopes: GRAPH_SCOPES })
    } else {
      throw e
    }
  }
}

export async function logout(): Promise<void> {
  const m = await getMsal()
  await m.logoutRedirect()
}

export async function getToken(): Promise<string> {
  const m = await getMsal()
  const account = m.getActiveAccount() ?? m.getAllAccounts()[0]
  if (!account) throw new Error('no-account')
  try {
    return (await m.acquireTokenSilent({ scopes: GRAPH_SCOPES, account })).accessToken
  } catch (e) {
    if (e instanceof InteractionRequiredAuthError) {
      await m.acquireTokenRedirect({ scopes: GRAPH_SCOPES, account })
      throw new Error('redirecting')
    }
    throw e
  }
}
