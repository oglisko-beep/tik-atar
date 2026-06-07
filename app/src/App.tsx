import { StoreProvider } from './store/StoreContext'
import { AppShell } from './ui/AppShell'
import { PrintView } from './print/PrintView'

export default function App() {
  return (
    <StoreProvider>
      <AppShell />
      <PrintView />
    </StoreProvider>
  )
}
