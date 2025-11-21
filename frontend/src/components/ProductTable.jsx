import { useState, useEffect, useCallback } from 'react'
import { Search, Trash2, Plus, RefreshCw, Edit } from 'lucide-react'
import { apiClient } from '../utils/api'
import ProductModal from './ProductModal'

export default function ProductTable() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [offset, setOffset] = useState(0)
  const [limit] = useState(50)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [deletingSku, setDeletingSku] = useState(null)

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        offset: offset.toString(),
        limit: limit.toString(),
      })
      if (search.trim()) {
        params.append('search', search.trim())
      }

      const response = await apiClient.get(`/api/products?${params.toString()}`)
      setProducts(response.data)
    } catch (err) {
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to fetch products'
      setError(errorMessage)
      setProducts([])
    } finally {
      setLoading(false)
    }
  }, [offset, limit, search])

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      setOffset(0) // Reset to first page on new search
    }, 1000)

    return () => clearTimeout(debounceTimer)
  }, [search]) // Only depend on search, not fetchProducts

  useEffect(() => {
    fetchProducts()
  }, [offset, limit, search]) // Depend on the actual values, not fetchProducts

  const handleDeleteAll = async () => {
    if (!window.confirm('Are you sure you want to delete ALL products? This action cannot be undone.')) {
      return
    }

    setDeleting(true)
    try {
      await apiClient.delete('/api/products/all')
      await fetchProducts()
    } catch (err) {
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to delete products'
      alert(errorMessage)
    } finally {
      setDeleting(false)
    }
  }

  const handleRefresh = () => {
    fetchProducts()
  }

  const handleProductCreated = () => {
    fetchProducts()
  }

  const handleDeleteProduct = async (product) => {
    if (!window.confirm(`Are you sure you want to delete product "${product.name}" (SKU: ${product.sku})? This action cannot be undone.`)) {
      return
    }

    setDeletingSku(product.sku)
    try {
      await apiClient.delete(`/api/products/${product.sku}`)
      await fetchProducts()
    } catch (err) {
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to delete product'
      alert(errorMessage)
    } finally {
      setDeletingSku(null)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Products</h2>
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
              setEditingProduct(null)
              setIsModalOpen(true)
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Product
          </button>
          <button
            onClick={handleDeleteAll}
            disabled={deleting || products.length === 0}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            {deleting ? 'Deleting...' : 'Delete All'}
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by SKU or name..."
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
      {loading && products.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Loading products...</p>
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">
            {search ? 'No products found matching your search.' : 'No products found. Add your first product!'}
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    SKU
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
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
                {products.map((product) => (
                  <tr key={product.sku} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                      {product.sku}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{product.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {product.description || <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          product.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {product.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => {
                            setEditingProduct(product)
                            setIsModalOpen(true)
                          }}
                          className="text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1"
                          title="Edit product"
                          disabled={deletingSku === product.sku}
                        >
                          <Edit className="w-4 h-4" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(product)}
                          className="text-red-600 hover:text-red-800 transition-colors flex items-center gap-1 disabled:opacity-50"
                          title="Delete product"
                          disabled={deletingSku === product.sku}
                        >
                          <Trash2 className="w-4 h-4" />
                          {deletingSku === product.sku ? 'Deleting...' : 'Delete'}
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
              Showing {offset + 1} to {Math.min(offset + limit, offset + products.length)} of{' '}
              {products.length < limit ? offset + products.length : 'many'} products
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
                disabled={products.length < limit || loading}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}

      {/* Product Modal */}
      <ProductModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setEditingProduct(null)
        }}
        onSuccess={handleProductCreated}
        product={editingProduct}
      />
    </div>
  )
}

