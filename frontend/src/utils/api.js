import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

export const healthCheck = async () => {
  try {
    const response = await apiClient.get('/api/health')
    return response.data
  } catch (error) {
    console.error('Health check failed:', error)
    throw error
  }
}

// Webhook API functions
export const getWebhooks = async (offset = 0, limit = 50) => {
  try {
    const response = await apiClient.get(`/api/webhooks?offset=${offset}&limit=${limit}`)
    return response.data
  } catch (error) {
    console.error('Failed to fetch webhooks:', error)
    throw error
  }
}

export const getWebhook = async (webhookId) => {
  try {
    const response = await apiClient.get(`/api/webhooks/${webhookId}`)
    return response.data
  } catch (error) {
    console.error('Failed to fetch webhook:', error)
    throw error
  }
}

export const createWebhook = async (webhookData) => {
  try {
    const response = await apiClient.post('/api/webhooks', webhookData)
    return response.data
  } catch (error) {
    console.error('Failed to create webhook:', error)
    throw error
  }
}

export const updateWebhook = async (webhookId, webhookData) => {
  try {
    const response = await apiClient.put(`/api/webhooks/${webhookId}`, webhookData)
    return response.data
  } catch (error) {
    console.error('Failed to update webhook:', error)
    throw error
  }
}

export const deleteWebhook = async (webhookId) => {
  try {
    await apiClient.delete(`/api/webhooks/${webhookId}`)
  } catch (error) {
    console.error('Failed to delete webhook:', error)
    throw error
  }
}

export const testWebhook = async (webhookId) => {
  try {
    const response = await apiClient.post(`/api/webhooks/${webhookId}/test`)
    // Map backend response to frontend expected format
    const data = response.data
    return {
      success: data.status === 'success',
      status_code: data.response_code,
      response_time_ms: data.response_time_ms,
      error_message: data.error,
      response_body: data.response_body,
    }
  } catch (error) {
    console.error('Failed to test webhook:', error)
    throw error
  }
}

export const getAvailableEvents = async () => {
  try {
    const response = await apiClient.get('/api/webhooks/events')
    return response.data
  } catch (error) {
    console.error('Failed to fetch available events:', error)
    throw error
  }
}

// Event simulation functions
export const simulateUserCreated = async () => {
  try {
    const response = await apiClient.post('/simulate/user-created')
    return response.data
  } catch (error) {
    console.error('Failed to simulate user.created event:', error)
    throw error
  }
}

export const simulateUserModified = async () => {
  try {
    const response = await apiClient.post('/simulate/user-modified')
    return response.data
  } catch (error) {
    console.error('Failed to simulate user.modified event:', error)
    throw error
  }
}

export const simulatePaymentCompleted = async () => {
  try {
    const response = await apiClient.post('/simulate/payment-completed')
    return response.data
  } catch (error) {
    console.error('Failed to simulate payment.completed event:', error)
    throw error
  }
}

