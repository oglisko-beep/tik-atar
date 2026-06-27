import { useState } from 'react'
import { IconMicrosoft } from './icons'

export function LoginScreen({ onSignIn }: { onSignIn: () => void }) {
  const [logoOk, setLogoOk] = useState(true)
  return (
    <div className="login-screen">
      <div className="login-card">
        {logoOk ? (
          <img src="./gav-yam.svg" alt="גב-ים" className="login-logo" onError={() => setLogoOk(false)} />
        ) : (
          <div className="login-logo-fallback">גב-ים</div>
        )}
        <h1 className="login-title">התחברות לתיק האתר</h1>
        <p className="login-sub">התחבר עם חשבון Microsoft של גב‑ים</p>
        <button className="login-btn" onClick={onSignIn}>
          <span>התחבר עם Microsoft</span>
          <IconMicrosoft />
        </button>
      </div>
    </div>
  )
}
