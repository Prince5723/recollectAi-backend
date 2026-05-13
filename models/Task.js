import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  note: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Note',
  },
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
  dueDate: {
    type: Date,
    required: true,
  },
  category: {
    type: String,
    enum: ['Assignment', 'Exam', 'Project', 'Event', 'Other'],
    default: 'Other',
  },
  completed: {
    type: Boolean,
    default: false,
  },
  // Progress tracking fields
  status: {
    type: String,
    enum: ['not_started', 'in_progress', 'completed'],
    default: 'not_started',
  },
  progressPercentage: {
    type: Number,
    min: 0,
    max: 100,
    default: 0,
  },
  submitted: {
    type: Boolean,
    default: false,
  },
  submittedDate: {
    type: Date,
  },
  completedDate: {
    type: Date,
  },
  progressNotes: [{
    note: String,
    timestamp: {
      type: Date,
      default: Date.now,
    },
  }],
  reminderSent: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Index for querying tasks by due date
taskSchema.index({ user: 1, dueDate: 1 });

const Task = mongoose.model('Task', taskSchema);

export default Task;

