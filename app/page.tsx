'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (res.ok) {
        router.push('/dashboard')
      } else {
        setError('Incorrect password.')
      }
    } catch {
      setError('Something went wrong. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#13141a] flex items-center justify-center">
      <div className="w-full max-w-sm px-6">
        <div className="mb-10 text-center">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-md bg-[#7c6af5] flex items-center justify-center">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 3h8M2 6h5M2 9h7" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <span className="font-mono text-base font-semibold tracking-tight text-[#e8e5e0]">
              Velory Outreach
            </span>
          </div>
          <p className="text-xs text-[#8c909e] tracking-wide">
            Internal outreach tool
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="password"
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            required
            className="w-full bg-[#1d1e26] border border-[#30313e] rounded-lg px-4 py-3 text-[#e8e5e0] text-sm placeholder-[#4a4b5a] focus:border-[#7c6af5] transition-colors"
          />

          {error && (
            <p className="text-[#f87171] text-xs bg-[#f8717115] border border-[#f8717130] rounded-md px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#7c6af5] hover:bg-[#6d5ce6] text-white font-medium text-sm py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Checking...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
