# RecollectAI Backend

AI-powered voice note-taking application backend for students.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

3. Update the `.env` file with your configuration:
   - Set your MongoDB URI (default: mongodb://localhost:27017/recollectai)
   - Set your JWT secret
   - Add your Google Gemini API key
   - Set NODE_ENV to 'development' or 'production'

4. Make sure MongoDB is running locally:
```bash
# macOS with Homebrew
brew services start mongodb-community

# Or manually
mongod --config /usr/local/etc/mongod.conf
```

5. Start the server:
```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

The server will start on http://localhost:5006

## API Endpoints

### Authentication
- POST `/api/auth/register` - Register new user
- POST `/api/auth/login` - Login user
- POST `/api/auth/forgot-password` - Generate password reset token
- POST `/api/auth/reset-password/:token` - Reset password

### Notes
- POST `/api/notes/process` - Upload and process audio recording
- GET `/api/notes` - Get all notes (with pagination and filtering)
- GET `/api/notes/:id` - Get single note
- PUT `/api/notes/:id` - Update note
- DELETE `/api/notes/:id` - Delete note
- GET `/api/notes/search/query` - Search notes

### Tasks
- GET `/api/tasks` - Get all tasks
- GET `/api/tasks/:id` - Get single task
- POST `/api/tasks` - Create task manually
- PUT `/api/tasks/:id` - Update task
- DELETE `/api/tasks/:id` - Delete task
- GET `/api/tasks/calendar/upcoming` - Get upcoming tasks (next 7 days)

## Features

- **Audio Processing**: Upload audio files and get AI-powered transcription
- **Smart Categorization**: Automatically categorize notes into:
  - Lecture Notes
  - Assignments & Deadlines
  - Exams/Test Reminders
  - Events & Meetups
  - Personal Reflections
- **Task Extraction**: Automatically detect and create tasks from deadlines mentioned in audio
- **Keyword Detection**: Student companion mode - detects keywords like "Important", "Write this", "Key point"
- **Full-text Search**: Search across transcripts, summaries, and key points
- **Authentication**: JWT-based authentication with password reset

## Tech Stack

- Node.js + Express
- MongoDB + Mongoose
- Google Gemini AI for transcription and processing
- JWT for authentication
- Multer for file uploads

