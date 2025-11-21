import { useState, useEffect, useCallback } from 'react'
import { Plus, RefreshCw, Edit, Trash2, Play, Search, Zap } from 'lucide-react'
import {
  getWebhooks,
  deleteWebhook,
  testWebhook,
  simulateUserCreated,
  simulateUserModified,
  simulatePaymentCompleted,
} from '../utils/api'
import WebhookModal from './WebhookModal'
import WebhookTestResult from './WebhookTestResult'

const AVAILABLE_EVENTS = ['user.created', 'user.modified', 'payment.completed']

export default function WebhookTable() {
  const [webhooks, setWebhooks] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [offset, setOffset] = useState(0)
  const [limit] = useState(50)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingWebhook, setEditingWebhook] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [testingId, setTestingId] = useState(null)
  const [testResult, setTestResult] = useState(null)
  const [simulatingEvent, setSimulatingEvent] = useState(null)
  const [simulationMessage, setSimulationMessage] = useState(null)

  const fetchWebhooks = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getWebhooks(offset, limit)
      setWebhooks(data)
    } catch (err) {
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to fetch webhooks'
      setError(errorMessage)
      setWebhooks([])
    } finally {
      setLoading(false)
    }
  }, [offset, limit])

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      setOffset(0) // Reset to first page on new search
    }, 1000)

    return () => clearTimeout(debounceTimer)
  }, [search])

  useEffect(() => {
    fetchWebhooks()
  }, [fetchWebhooks])

  const handleRefresh = () => {
    fetchWebhooks()
  }

  const handleWebhookCreated = () => {
    fetchWebhooks()
  }

  const handleDeleteWebhook = async (webhook) => {
    if (!window.confirm(`Are you sure you want to delete webhook for "${webhook.url}"? This action cannot be undone.`)) {
      return
    }

    setDeletingId(webhook.id)
    try {
      await deleteWebhook(webhook.id)
      await fetchWebhooks()
    } catch (err) {
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to delete webhook'
      alert(errorMessage)
    } finally {
      setDeletingId(null)
    }
  }

  const handleTestWebhook = async (webhook) => {
    setTestingId(webhook.id)
    try {
      const result = await testWebhook(webhook.id)
      setTestResult(result)
    } catch (err) {
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to test webhook'
      setTestResult({
        success: false,
        status_code: null,
        response_time_ms: null,
        error_message: errorMessage,
      })
    } finally {
      setTestingId(null)
    }
  }

  const handleSimulateEvent = async (eventType) => {
    setSimulatingEvent(eventType)
    setSimulationMessage(null)
    try {
      let result
      switch (eventType) {
        case 'user.created':
          result = await simulateUserCreated()
          break
        case 'user.modified':
          result = await simulateUserModified()
          break
        case 'payment.completed':
          result = await simulatePaymentCompleted()
          break
        default:
          throw new Error(`Unknown event type: ${eventType}`)
      }
      setSimulationMessage({
        type: 'success',
        text: `Event "${eventType}" triggered successfully. All subscribed webhooks will receive the payload.`,
      })
      // Clear message after 5 seconds
      setTimeout(() => setSimulationMessage(null), 5000)
    } catch (err) {
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to simulate event'
      setSimulationMessage({
        type: 'error',
        text: errorMessage,
      })
      // Clear error message after 5 seconds
      setTimeout(() => setSimulationMessage(null), 5000)
    } finally {
      setSimulatingEvent(null)
    }
  }

  // Filter webhooks based on search
  const filteredWebhooks = webhooks.filter((webhook) => {
    if (!search.trim()) return true
    const searchLower = search.toLowerCase()
    return (
      webhook.url.toLowerCase().includes(searchLower) ||
      webhook.event_types.some((et) => et.toLowerCase().includes(searchLower))
    )
  })

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Webhooks</h2>
        <div className="flex gap-2">
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => {
              setEditingWebhook(null)
              setIsModalOpen(true)
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Webhook
          </button>
        </div>
      </div>

      {/* Event Simulation Section */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-800">Simulate Events</h3>
        </div>
        <p className="text-sm text-gray-600 mb-3">
          Trigger events to test your webhooks. All enabled webhooks subscribed to the event will receive the payload.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleSimulateEvent('user.created')}
            disabled={simulatingEvent !== null}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
          >
            {simulatingEvent === 'user.created' ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Triggering...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                user.created
              </>
            )}
          </button>
          <button
            onClick={() => handleSimulateEvent('user.modified')}
            disabled={simulatingEvent !== null}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
          >
            {simulatingEvent === 'user.modified' ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Triggering...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                user.modified
              </>
            )}
          </button>
          <button
            onClick={() => handleSimulateEvent('payment.completed')}
            disabled={simulatingEvent !== null}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
          >
            {simulatingEvent === 'payment.completed' ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Triggering...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                payment.completed
              </>
            )}
          </button>
        </div>
        {simulationMessage && (
          <div
            className={`mt-3 p-3 rounded-lg text-sm ${
              simulationMessage.type === 'success'
                ? 'bg-green-100 text-green-800 border border-green-200'
                : 'bg-red-100 text-red-800 border border-red-200'
            }`}
          >
            {simulationMessage.text}
          </div>
        )}
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by URL or event type..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Table */}
      {loading && webhooks.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Loading webhooks...</p>
        </div>
      ) : filteredWebhooks.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">
            {search ? 'No webhooks found matching your search.' : 'No webhooks found. Add your first webhook!'}
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    URL
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Event Types
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredWebhooks.map((webhook) => (
                  <tr key={webhook.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900 break-all">
                      {webhook.url}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {webhook.event_types.map((eventType) => (
                          <span
                            key={eventType}
                            className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded"
                          >
                            {eventType}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          webhook.is_enabled
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {webhook.is_enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleTestWebhook(webhook)}
                          disabled={testingId === webhook.id || !webhook.is_enabled}
                          className="text-green-600 hover:text-green-800 transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Test webhook"
                        >
                          <Play className="w-4 h-4" />
                          {testingId === webhook.id ? 'Testing...' : 'Test'}
                        </button>
                        <button
                          onClick={() => {
                            setEditingWebhook(webhook)
                            setIsModalOpen(true)
                          }}
                          className="text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1"
                          title="Edit webhook"
                          disabled={deletingId === webhook.id}
                        >
                          <Edit className="w-4 h-4" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteWebhook(webhook)}
                          className="text-red-600 hover:text-red-800 transition-colors flex items-center gap-1 disabled:opacity-50"
                          title="Delete webhook"
                          disabled={deletingId === webhook.id}
                        >
                          <Trash2 className="w-4 h-4" />
                          {deletingId === webhook.id ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing {offset + 1} to {Math.min(offset + limit, offset + filteredWebhooks.length)} of{' '}
              {filteredWebhooks.length < limit ? offset + filteredWebhooks.length : 'many'} webhooks
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setOffset(Math.max(0, offset - limit))}
                disabled={offset === 0 || loading}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setOffset(offset + limit)}
                disabled={filteredWebhooks.length < limit || loading}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}

      {/* Webhook Modal */}
      <WebhookModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setEditingWebhook(null)
        }}
        onSuccess={handleWebhookCreated}
        webhook={editingWebhook}
      />

      {/* Test Result Modal */}
      <WebhookTestResult
        result={testResult}
        onClose={() => setTestResult(null)}
      />
    </div>
  )
}

