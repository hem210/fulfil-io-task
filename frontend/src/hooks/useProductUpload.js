import { useState } from 'react'
import { gzip } from 'fflate'
import { apiClient } from '../utils/api'

export function useProductUpload() {
  const [uploading, setUploading] = useState(false)
  const [jobId, setJobId] = useState(null)
  const [error, setError] = useState(null)

  const uploadFile = async (file) => {
    if (!file) {
      setError('No file selected')
      return null
    }

    // Validate file type
    if (!file.name.endsWith('.csv') && !file.name.endsWith('.CSV')) {
      setError('File must be a CSV file')
      return null
    }

    setUploading(true)
    setError(null)
    setJobId(null)

    try {
      // Read file as text
      const fileText = await file.text()

      // Convert text to Uint8Array for compression
      const fileData = new TextEncoder().encode(fileText)

      // Compress using fflate
      const compressed = await new Promise((resolve, reject) => {
        gzip(fileData, (err, compressed) => {
          if (err) {
            reject(err)
          } else {
            resolve(compressed)
          }
        })
      })

      // Create blob from compressed data
      const compressedBlob = new Blob([compressed], { type: 'application/gzip' })

      // Create FormData and upload
      const formData = new FormData()
      formData.append('file', compressedBlob, `${file.name}.gz`)

      const response = await apiClient.post('/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      const newJobId = response.data.job_id
      setJobId(newJobId)
      setUploading(false)
      return newJobId
    } catch (err) {
      const errorMessage = err.response?.data?.detail || err.message || 'Upload failed'
      setError(errorMessage)
      setUploading(false)
      return null
    }
  }

  const reset = () => {
    setUploading(false)
    setJobId(null)
    setError(null)
  }

  return {
    uploadFile,
    uploading,
    jobId,
    error,
    reset,
  }
}

