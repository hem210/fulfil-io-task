import { useState } from 'react'
import HealthCheck from './components/HealthCheck'
import UploadWidget from './components/UploadWidget'
import ProductTable from './components/ProductTable'

function App() {
  const [refreshKey, setRefreshKey] = useState(0)

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
                Manage your products with ease
              </p>
            </div>
            <div className="max-w-xs">
              <HealthCheck />
            </div>
          </div>
        </header>

        <main className="space-y-6">
          {/* Upload Widget */}
          <UploadWidget onUploadComplete={handleUploadComplete} />

          {/* Product Table */}
          <ProductTable key={refreshKey} />
        </main>
      </div>
    </div>
  )
}

export default App

