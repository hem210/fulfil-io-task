import { X, CheckCircle2, XCircle, Clock } from 'lucide-react'

export default function WebhookTestResult({ result, onClose }) {
  if (!result) return null

  const isSuccess = result.success

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-800">Test Result</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          <div className={`flex items-center gap-3 mb-4 p-4 rounded-lg ${
            isSuccess ? 'bg-green-50' : 'bg-red-50'
          }`}>
            {isSuccess ? (
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            ) : (
              <XCircle className="w-8 h-8 text-red-600" />
            )}
            <div>
              <p className={`font-semibold ${isSuccess ? 'text-green-800' : 'text-red-800'}`}>
                {isSuccess ? 'Webhook Test Successful' : 'Webhook Test Failed'}
              </p>
              {result.error_message && (
                <p className={`text-sm mt-1 ${isSuccess ? 'text-green-600' : 'text-red-600'}`}>
                  {result.error_message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-3">
            {result.status_code !== null && (
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Status Code:</span>
                <span className={`text-sm font-semibold ${
                  result.status_code >= 200 && result.status_code < 300
                    ? 'text-green-600'
                    : 'text-red-600'
                }`}>
                  {result.status_code}
                </span>
              </div>
            )}

            {result.response_time_ms !== null && (
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Response Time:
                </span>
                <span className="text-sm font-semibold text-gray-900">
                  {result.response_time_ms} ms
                </span>
              </div>
            )}

            {!result.status_code && !result.response_time_ms && result.error_message && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-700">{result.error_message}</p>
              </div>
            )}
          </div>

          <div className="mt-6">
            <button
              onClick={onClose}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

