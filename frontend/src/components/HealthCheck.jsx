import { useState, useEffect } from 'react'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { healthCheck } from '../utils/api'

export default function HealthCheck() {
  const [status, setStatus] = useState('loading') // 'loading', 'healthy', 'error'
  const [message, setMessage] = useState('')
  const [error, setError] = useState(null)

  useEffect(() => {
    const checkHealth = async () => {
      try {
        setStatus('loading')
        setError(null)
        const data = await healthCheck()
        setStatus('healthy')
        setMessage(data.status || 'OK')
      } catch (err) {
        setStatus('error')
        setError(err.message || 'Failed to connect to backend')
      }
    }

    checkHealth()
    // Optionally refresh every 30 seconds
    const interval = setInterval(checkHealth, 30000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex items-center gap-3 p-4 bg-white rounded-lg shadow-md">
      <div className="flex-shrink-0">
        {status === 'loading' && (
          <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
        )}
        {status === 'healthy' && (
          <CheckCircle2 className="w-6 h-6 text-green-500" />
        )}
        {status === 'error' && (
          <XCircle className="w-6 h-6 text-red-500" />
        )}
      </div>
      <div className="flex-1">
        <h3 className="text-lg font-semibold text-gray-800">Backend Status</h3>
        {status === 'loading' && (
          <p className="text-sm text-gray-600">Checking connection...</p>
        )}
        {status === 'healthy' && (
          <p className="text-sm text-green-600">Connected - {message}</p>
        )}
        {status === 'error' && (
          <p className="text-sm text-red-600">Error: {error}</p>
        )}
      </div>
    </div>
  )
}

