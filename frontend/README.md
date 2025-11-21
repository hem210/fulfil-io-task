# Product Management System - Frontend

React 18+ frontend application built with Vite and TailwindCSS for the Product Management System.

## Tech Stack

- **React 18+**: UI library
- **Vite**: Build tool and dev server
- **TailwindCSS**: Utility-first CSS framework
- **Axios**: HTTP client for API calls
- **fflate**: Client-side file compression
- **lucide-react**: Icon library

## Prerequisites

- Node.js 18+ and npm (or yarn/pnpm)
- Backend API running on `http://localhost:8000` (or configure via environment variables)

## Setup Instructions

### 1. Install Dependencies

```bash
cd frontend
npm install
```

### 2. Environment Configuration

Create a `.env` file in the `frontend` directory:

```env
# Backend API Base URL
VITE_API_BASE_URL=http://localhost:8000

# WebSocket Base URL (for real-time updates)
VITE_WS_BASE_URL=ws://localhost:8000/ws
```

**Note**: Vite requires the `VITE_` prefix for environment variables to be exposed to the client.

### 3. Start Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

### 4. Build for Production

```bash
npm run build
```

The production build will be in the `dist` directory.

### 5. Preview Production Build

```bash
npm run preview
```

## Project Structure

```
frontend/
├── public/              # Static assets
├── src/
│   ├── components/     # React components
│   │   └── HealthCheck.jsx
│   ├── hooks/          # Custom React hooks
│   ├── utils/          # Utility functions
│   │   └── api.js      # API client configuration
│   ├── App.jsx         # Main application component
│   ├── main.jsx        # Application entry point
│   └── index.css       # Global styles with Tailwind
├── index.html          # HTML template
├── package.json        # Dependencies and scripts
├── vite.config.js      # Vite configuration
├── tailwind.config.js   # TailwindCSS configuration
└── postcss.config.js   # PostCSS configuration
```

## Current Features

- ✅ Health check component that connects to backend API
- ✅ Real-time status updates (auto-refreshes every 30 seconds)
- ✅ Responsive UI with TailwindCSS
- ✅ Error handling for API failures

## Development

### Proxy Configuration

The Vite dev server is configured to proxy API requests:
- `/api/*` → `http://localhost:8000/api/*`
- `/ws/*` → `ws://localhost:8000/ws/*`

This allows you to make API calls without CORS issues during development.

### Adding New Components

1. Create component files in `src/components/`
2. Import and use in `App.jsx` or other components
3. Use TailwindCSS classes for styling

### API Integration

Use the `apiClient` from `src/utils/api.js` for making API calls:

```javascript
import { apiClient } from '../utils/api'

const response = await apiClient.get('/api/products')
```

## Next Steps

The following features will be integrated:
- File upload widget with drag & drop
- Client-side Gzip compression
- WebSocket integration for real-time upload status
- Product table with search and pagination
- Create/update product forms
- Delete all products functionality

## Troubleshooting

### Backend Connection Issues

1. Ensure the backend is running on `http://localhost:8000`
2. Check the `VITE_API_BASE_URL` in your `.env` file
3. Verify CORS is enabled on the backend (if not using proxy)

### Port Already in Use

If port 3000 is already in use, Vite will automatically try the next available port. You can also specify a port in `vite.config.js`:

```javascript
server: {
  port: 3001, // Change to your preferred port
}
```

