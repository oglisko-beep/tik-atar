// Configuration for the optional "shared (SharePoint)" mode.
// Values are baked at build time via Vite `define` (see vite.config.ts), sourced from
// .env / CI env. clientId/tenantId are PUBLIC SPA identifiers — kept out of the repo,
// injected from GitHub secrets at build. Empty clientId => the feature stays hidden.

declare const __AAD_CLIENT_ID__: string
declare const __AAD_TENANT_ID__: string
declare const __SP_SITE__: string
declare const __SP_LIBRARY__: string

export const remoteConfig = {
  clientId: typeof __AAD_CLIENT_ID__ !== 'undefined' ? __AAD_CLIENT_ID__ : '',
  tenantId: typeof __AAD_TENANT_ID__ !== 'undefined' ? __AAD_TENANT_ID__ : '',
  siteUrl: (typeof __SP_SITE__ !== 'undefined' && __SP_SITE__) || 'gavyamcoil1.sharepoint.com:/sites/GavYamPortal/IT',
  library: (typeof __SP_LIBRARY__ !== 'undefined' && __SP_LIBRARY__) || 'TikAtarData',
}

export const isRemoteConfigured = () => !!(remoteConfig.clientId && remoteConfig.tenantId)

export const GRAPH = 'https://graph.microsoft.com/v1.0'
export const GRAPH_SCOPES = ['Sites.ReadWrite.All', 'User.Read']
