import mongoose from 'mongoose';

const noteSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  transcript: {
    type: String,
    required: true,
  },
  summary: {
    type: String,
    required: true,
  },
  keyPoints: [{
    type: String,
  }],
  category: {
    type: String,
    enum: ['Lecture Notes', 'Assignments & Deadlines', 'Exams/Test Reminders', 'Events & Meetups', 'Personal Reflections'],
    default: 'Personal Reflections',
  },
  audioUrl: {
    type: String,
  },
  duration: {
    type: Number, // in seconds
  },
  highlightedSections: [{
    timestamp: Number,
    text: String,
    keyword: String, // "Important", "Write this", etc.
  }],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Text search index
noteSchema.index({ 
  transcript: 'text', 
  summary: 'text', 
  keyPoints: 'text',
  title: 'text' 
});

const Note = mongoose.model('Note', noteSchema);

export default Note;

