import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { apiClient } from '../utils/api'

const AVAILABLE_EVENTS = ['user.created', 'user.modified', 'payment.completed']

export default function WebhookModal({ isOpen, onClose, onSuccess, webhook = null }) {
  const isEditMode = !!webhook
  const [formData, setFormData] = useState({
    url: '',
    event_types: [],
    is_enabled: true,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Populate form when webhook is provided (edit mode)
  useEffect(() => {
    if (webhook) {
      setFormData({
        url: webhook.url,
        event_types: webhook.event_types || [],
        is_enabled: webhook.is_enabled,
      })
    } else {
      setFormData({
        url: '',
        event_types: [],
        is_enabled: true,
      })
    }
  }, [webhook])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
    setError(null)
  }

  const handleEventTypeChange = (eventType) => {
    setFormData((prev) => {
      const eventTypes = prev.event_types.includes(eventType)
        ? prev.event_types.filter((et) => et !== eventType)
        : [...prev.event_types, eventType]
      return { ...prev, event_types: eventTypes }
    })
    setError(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    if (formData.event_types.length === 0) {
      setError('Please select at least one event type')
      return
    }

    setLoading(true)

    try {
      if (isEditMode) {
        await apiClient.put(`/api/webhooks/${webhook.id}`, formData)
      } else {
        await apiClient.post('/api/webhooks', formData)
      }
      onSuccess?.()
      handleClose()
    } catch (err) {
      const errorMessage = err.response?.data?.detail || err.message || `Failed to ${isEditMode ? 'update' : 'create'} webhook`
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setFormData({
      url: '',
      event_types: [],
      is_enabled: true,
    })
    setError(null)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-800">
            {isEditMode ? 'Edit Webhook' : 'Add New Webhook'}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-1">
                Webhook URL <span className="text-red-500">*</span>
              </label>
              <input
                type="url"
                id="url"
                name="url"
                value={formData.url}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://example.com/webhook"
              />
              {!formData.url.startsWith('https://') && formData.url && (
                <p className="mt-1 text-xs text-yellow-600">
                  Warning: Non-HTTPS URLs are not recommended for security
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Event Types <span className="text-red-500">*</span>
              </label>
              <div className="space-y-2">
                {AVAILABLE_EVENTS.map((eventType) => (
                  <label key={eventType} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.event_types.includes(eventType)}
                      onChange={() => handleEventTypeChange(eventType)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">{eventType}</span>
                  </label>
                ))}
              </div>
              {formData.event_types.length === 0 && (
                <p className="mt-1 text-xs text-red-600">Please select at least one event type</p>
              )}
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_enabled"
                name="is_enabled"
                checked={formData.is_enabled}
                onChange={handleChange}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="is_enabled" className="ml-2 text-sm font-medium text-gray-700">
                Enabled
              </label>
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading || formData.event_types.length === 0}
            >
              {loading ? (isEditMode ? 'Updating...' : 'Creating...') : (isEditMode ? 'Update Webhook' : 'Create Webhook')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

