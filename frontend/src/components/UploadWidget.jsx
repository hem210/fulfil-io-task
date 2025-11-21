import { useRef, useState } from 'react'
import { Upload, X, FileText } from 'lucide-react'
import { useProductUpload } from '../hooks/useProductUpload'
import { useWebSocket } from '../hooks/useWebSocket'

export default function UploadWidget({ onUploadComplete }) {
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef(null)
  const { uploadFile, uploading, jobId, error: uploadError, reset } = useProductUpload()
  const { logs, progress, total, percentage, status, error: wsError } = useWebSocket(jobId)

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = async (e) => {
    e.preventDefault()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files)
    const csvFile = files.find((f) => f.name.endsWith('.csv') || f.name.endsWith('.CSV'))

    if (csvFile) {
      await uploadFile(csvFile)
    }
  }

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0]
    if (file) {
      await uploadFile(file)
    }
  }

  const handleReset = () => {
    reset()
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const error = uploadError || wsError
  const isComplete = status === 'complete'
  const isProcessing = uploading || (jobId && status !== 'complete' && status !== 'error' && status !== 'disconnected')

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-gray-800">Upload Products (CSV)</h2>
        {jobId && (
          <button
            onClick={handleReset}
            className="text-gray-500 hover:text-gray-700 transition-colors"
            title="Reset upload"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Upload Area */}
      {!jobId && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
            ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'}
            ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.CSV"
            onChange={handleFileSelect}
            className="hidden"
            disabled={uploading}
          />
          <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="text-lg font-medium text-gray-700 mb-2">
            {uploading ? 'Uploading...' : 'Drag & drop CSV file here'}
          </p>
          <p className="text-sm text-gray-500">or click to browse</p>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 font-medium">Error: {error}</p>
        </div>
      )}

      {/* Progress Bar */}
      {isProcessing && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Processing...</span>
            {progress > 0 && (
              <span className="text-sm text-gray-600">
                {total > 0 ? `${progress}/${total} rows (${percentage}%)` : `${progress} rows processed`}
              </span>
            )}
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden relative">
            {isComplete ? (
              <div className="h-2.5 rounded-full bg-green-500 transition-all duration-300" style={{ width: '100%' }} />
            ) : percentage > 0 ? (
              <div
                className="h-2.5 rounded-full bg-blue-500 transition-all duration-500"
                style={{ width: `${Math.min(percentage, 99)}%` }}
              />
            ) : (
              /* Indeterminate progress when counting rows */
              <div className="h-2.5 rounded-full bg-blue-500 animate-pulse" style={{ width: '20%' }} />
            )}
          </div>
        </div>
      )}

      {/* Console View */}
      {jobId && logs.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-800">Upload Logs</h3>
          </div>
          <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm max-h-64 overflow-y-auto">
            {logs.map((log, index) => (
              <div key={index} className="mb-1">
                <span className="text-gray-500">
                  [{log.timestamp.toLocaleTimeString()}]
                </span>{' '}
                <span
                  className={
                    log.type === 'error'
                      ? 'text-red-400'
                      : log.type === 'complete'
                      ? 'text-green-400'
                      : log.type === 'progress'
                      ? 'text-yellow-400'
                      : 'text-green-400'
                  }
                >
                  {log.message}
                </span>
                {log.processed !== undefined && (
                  <span className="text-blue-400 ml-2">({log.processed} rows)</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Success Message */}
      {isComplete && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800 font-medium">
            ✓ Upload completed successfully!{' '}
            {total > 0 ? `${progress}/${total} rows processed` : progress > 0 ? `${progress} rows processed` : ''}
          </p>
          {onUploadComplete && (
            <button
              onClick={() => {
                onUploadComplete()
                handleReset()
              }}
              className="mt-2 text-sm text-green-700 hover:text-green-900 underline"
            >
              Refresh product list
            </button>
          )}
        </div>
      )}
    </div>
  )
}

