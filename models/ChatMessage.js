import mongoose from 'mongoose';

const chatMessageSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  role: {
    type: String,
    enum: ['user', 'assistant'],
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  contextNotes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Note',
  }],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Index for efficient querying of user's chat history
chatMessageSchema.index({ user: 1, createdAt: -1 });

const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema);

export default ChatMessage;

