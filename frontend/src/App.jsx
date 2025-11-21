import { useState } from 'react'
import HealthCheck from './components/HealthCheck'
import UploadWidget from './components/UploadWidget'
import ProductTable from './components/ProductTable'
import WebhookTable from './components/WebhookTable'

function App() {
  const [refreshKey, setRefreshKey] = useState(0)
  const [activeTab, setActiveTab] = useState('products')

  const handleUploadComplete = () => {
    // Trigger refresh of product table
    setRefreshKey((prev) => prev + 1)
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <header className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                Product Management System
              </h1>
              <p className="text-gray-600">
                Manage your products and webhooks with ease
              </p>
            </div>
            <div className="max-w-xs">
              <HealthCheck />
            </div>
          </div>
        </header>

        {/* Navigation Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('products')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'products'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Products
            </button>
            <button
              onClick={() => setActiveTab('webhooks')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'webhooks'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Webhooks
            </button>
          </nav>
        </div>

        <main className="space-y-6">
          {activeTab === 'products' && (
            <>
              {/* Upload Widget */}
              <UploadWidget onUploadComplete={handleUploadComplete} />

              {/* Product Table */}
              <ProductTable key={refreshKey} />
            </>
          )}

          {activeTab === 'webhooks' && (
            <>
              {/* Webhook Table */}
              <WebhookTable />
            </>
          )}
        </main>
      </div>
    </div>
  )
}

export default App

