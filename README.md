# Product Management System

A full-stack application for managing products and testing webhooks.

## Features

### Product Management
- **File Upload**: Upload product data files for bulk processing
- **CRUD Operations**: Create, read, update, and delete products
- Products include SKU, name, description, and active status

### Webhook Testing
- **Webhook Management**: Add, edit, and delete webhook configurations
- **Webhook Testing**: Test individual webhooks synchronously to verify connectivity
- **Event Simulation**: Trigger sample events (user.created, user.modified, payment.completed) to test if all subscribed webhooks receive the events

## Tech Stack

- **Backend**: FastAPI (Python)
- **Frontend**: React with Vite and TailwindCSS
- **Database**: PostgreSQL (via Supabase)

## Project Structure

```
├── backend/          # FastAPI backend application
├── frontend/         # React frontend application
└── README.md         # This file
```

## Future Enhancements

The following improvements can be made. I was unable to implement these due to time constraints given for the task at hand:

### Background Task Processing
- **Current**: FastAPI BackgroundTasks with temporary file storage
- **Enhancement**: Migrate to Celery for distributed task processing and Redis for job queue management, providing better scalability and reliability for asynchronous operations

### Authentication & Authorization
- Implement user authentication system to support multi-user access
- Add role-based access control for managing products and webhooks

### Webhook Security
- Add webhook secret support for HMAC signature verification
- Enable testing of secret-based webhook events to ensure secure event delivery

### Database Normalization
- **Current**: Webhook events stored as array column for simplicity
- **Enhancement**: Normalize database schema by creating a separate events table with proper foreign key relationships to webhooks, enabling better data integrity and query performance in production scenarios

