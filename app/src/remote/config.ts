// Configuration for the optional "shared (SharePoint)" mode.
// Values come from Vite env vars (build-time). Empty clientId => feature hidden.

export const remoteConfig = {
  clientId: (import.meta.env.VITE_AAD_CLIENT_ID as string) || '',
  tenantId: (import.meta.env.VITE_AAD_TENANT_ID as string) || '',
  siteUrl: (import.meta.env.VITE_SP_SITE as string) || 'gavyamcoil1.sharepoint.com:/sites/GavYamPortal/IT',
  library: (import.meta.env.VITE_SP_LIBRARY as string) || 'TikAtarData',
}

export const isRemoteConfigured = () => !!(remoteConfig.clientId && remoteConfig.tenantId)

export const GRAPH = 'https://graph.microsoft.com/v1.0'
export const GRAPH_SCOPES = ['Sites.ReadWrite.All', 'User.Read']
