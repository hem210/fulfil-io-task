import { useEffect, useRef, useState } from 'react'

const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL || 'ws://localhost:8000/ws'

export function useWebSocket(jobId) {
  const [logs, setLogs] = useState([])
  const [progress, setProgress] = useState(0)
  const [total, setTotal] = useState(0)
  const [percentage, setPercentage] = useState(0)
  const [status, setStatus] = useState('disconnected') // 'disconnected', 'connecting', 'connected', 'error'
  const [error, setError] = useState(null)
  const wsRef = useRef(null)
  const reconnectTimeoutRef = useRef(null)
  const statusRef = useRef('disconnected')
  const shouldReconnectRef = useRef(true)

  // Keep statusRef in sync with status state
  useEffect(() => {
    statusRef.current = status
  }, [status])

  useEffect(() => {
    if (!jobId) {
      return
    }

    shouldReconnectRef.current = true

    const connect = () => {
      // Don't connect if we shouldn't reconnect
      if (!shouldReconnectRef.current) {
        return
      }

      try {
        setStatus('connecting')
        setError(null)
        const wsUrl = `${WS_BASE_URL}/${jobId}`
        const ws = new WebSocket(wsUrl)

        ws.onopen = () => {
          if (!shouldReconnectRef.current) {
            ws.close()
            return
          }
          setStatus('connected')
          setLogs((prev) => [...prev, { type: 'system', message: 'Connected to server', timestamp: new Date() }])
        }

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)

            if (data.type === 'log') {
              setLogs((prev) => [
                ...prev,
                { type: 'log', message: data.message, timestamp: new Date() },
              ])
            } else if (data.type === 'progress') {
              setProgress(data.processed || 0)
              setTotal(data.total || 0)
              setPercentage(data.percentage || 0)
              setLogs((prev) => [
                ...prev,
                {
                  type: 'progress',
                  message: data.message,
                  processed: data.processed,
                  total: data.total,
                  percentage: data.percentage,
                  timestamp: new Date(),
                },
              ])
            } else if (data.type === 'error') {
              shouldReconnectRef.current = false
              setStatus('error')
              setError(data.message)
              setLogs((prev) => [
                ...prev,
                { type: 'error', message: data.message, detail: data.detail, timestamp: new Date() },
              ])
              // Close WebSocket after error
              if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                wsRef.current.close()
              }
            } else if (data.type === 'complete') {
              shouldReconnectRef.current = false
              setStatus('complete')
              setProgress(data.processed || 0)
              setTotal(data.total || data.processed || 0)
              setPercentage(100)
              setLogs((prev) => [
                ...prev,
                {
                  type: 'complete',
                  message: data.message,
                  processed: data.processed,
                  total: data.total || data.processed,
                  timestamp: new Date(),
                },
              ])
              // Close WebSocket after completion
              if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                wsRef.current.close()
              }
            }
          } catch (err) {
            console.error('Error parsing WebSocket message:', err)
          }
        }

        ws.onerror = (error) => {
          console.error('WebSocket error:', error)
          setStatus('error')
          setError('WebSocket connection error')
        }

        ws.onclose = () => {
          setStatus('disconnected')
          // Only attempt reconnect if we should and not complete/error
          if (shouldReconnectRef.current && statusRef.current !== 'complete' && statusRef.current !== 'error') {
            reconnectTimeoutRef.current = setTimeout(() => {
              if (shouldReconnectRef.current) {
                connect()
              }
            }, 3000)
          }
        }

        wsRef.current = ws
      } catch (err) {
        setStatus('error')
        setError(err.message)
      }
    }

    connect()

    return () => {
      shouldReconnectRef.current = false
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
      setLogs([])
      setProgress(0)
      setTotal(0)
      setPercentage(0)
      setStatus('disconnected')
    }
  }, [jobId]) // Only depend on jobId, not status

  return {
    logs,
    progress,
    total,
    percentage,
    status,
    error,
  }
}

