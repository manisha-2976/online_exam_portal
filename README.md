# ExamFlow

A modern, secure, and efficient online examination platform with advanced proctoring capabilities.

## Features

- User Authentication (JWT + Google OAuth + OTP)
- Role-based Access Control (Student, Faculty, Admin)
- Secure Exam Creation and Management
- Real-time Proctoring with Face Detection
- Browser Tab Monitoring
- Audio Level Monitoring
- File Upload Support
- WebSocket-based Real-time Alerts

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- Google OAuth Credentials
- Twilio Account (for SMS OTP)
- SMTP Server (for Email OTP)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/online-exam-portal.git
cd online-exam-portal
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory and add the following variables:
```env
# Server Configuration
PORT=5000
NODE_ENV=development

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/online-exam-portal

# JWT Configuration
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=24h

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Email Configuration (for OTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_email_app_password

# Twilio Configuration (for SMS OTP)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number

# File Upload Configuration
MAX_FILE_SIZE=5242880 # 5MB in bytes
UPLOAD_PATH=uploads/
```

4. Create the uploads directory:
```bash
mkdir uploads
```

## Running the Application

Development mode:
```bash
npm run dev
```

Production mode:
```bash
npm start
```

## API Documentation

### Authentication Endpoints

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/verify-otp` - Verify OTP
- `POST /api/auth/resend-otp` - Resend OTP
- `GET /api/auth/google` - Google OAuth login
- `POST /api/auth/logout` - Logout user
- `POST /api/auth/refresh-token` - Refresh JWT token
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password

### Exam Endpoints

- `POST /api/exams` - Create a new exam
- `GET /api/exams` - Get all exams
- `GET /api/exams/:id` - Get exam by ID
- `PUT /api/exams/:id` - Update exam
- `DELETE /api/exams/:id` - Delete exam
- `POST /api/exams/:id/start` - Start exam
- `POST /api/exams/:id/submit` - Submit exam
- `GET /api/exams/:id/results` - Get exam results

### Proctoring Endpoints

- `POST /api/proctoring/alerts` - Report proctoring violation
- `GET /api/proctoring/logs/:examId` - Get proctoring logs for an exam
- `POST /api/proctoring/face-detection` - Report face detection data
- `POST /api/proctoring/browser-tabs` - Report browser tab changes
- `POST /api/proctoring/audio-levels` - Report audio level changes

## Security Features

- JWT-based Authentication
- Role-based Access Control
- Rate Limiting
- CORS Protection
- Helmet.js Security Headers
- Input Validation
- File Upload Restrictions
- Real-time Proctoring

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Environment Setup and Security

### Initial Setup
1. Backend Setup
   ```bash
   cd backend
   cp .env.example .env
   ```
   Update the following in `backend/.env`:
   - Generate a new secure JWT secret: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
   - Set your MongoDB URI with proper credentials
   - Add your RapidAPI key for Judge0
   - Configure email settings if needed

2. Frontend Setup
   ```bash
   cd frontend
   cp .env.example .env.local
   ```
   Update the following in `frontend/.env.local`:
   - Configure API URLs
   - Add your Google Client ID
   - Set any feature flags as needed

### Security Best Practices
1. NEVER commit `.env` files to version control
2. Regularly rotate secrets and API keys
3. Use strong, unique passwords for all services
4. Keep environment files restricted to only necessary team members
5. Use different credentials for development and production
6. Monitor for any accidental commits of sensitive data


Each service has an `.env.example` file that serves as a template. Copy these files and fill in your own values.

## Development

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
# Start backend
cd backend
npm run dev

# Start frontend (in another terminal)
cd frontend
npm run dev
``` 