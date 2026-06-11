import { PublicClientApplication, InteractionRequiredAuthError, type AccountInfo } from '@azure/msal-browser'
import { remoteConfig, GRAPH_SCOPES } from './config'

let msal: PublicClientApplication | null = null

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
    await msal.handleRedirectPromise()
  }
  return msal
}

export async function currentAccount(): Promise<AccountInfo | null> {
  const m = await getMsal()
  return m.getActiveAccount() ?? m.getAllAccounts()[0] ?? null
}

/** Try silent SSO. Returns true if signed in, false if interaction is needed. */
export async function trySsoSilent(): Promise<boolean> {
  const m = await getMsal()
  if (m.getAllAccounts().length) {
    m.setActiveAccount(m.getAllAccounts()[0])
    return true
  }
  try {
    const r = await m.ssoSilent({ scopes: GRAPH_SCOPES })
    m.setActiveAccount(r.account)
    return true
  } catch {
    return false
  }
}

export async function login(): Promise<void> {
  const m = await getMsal()
  await m.loginRedirect({ scopes: GRAPH_SCOPES })
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
