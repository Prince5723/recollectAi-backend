import express from 'express';
import { protect } from '../middleware/auth.js';
import Note from '../models/Note.js';
import Task from '../models/Task.js';
import ChatMessage from '../models/ChatMessage.js';
import { chatWithMemories } from '../utils/geminiService.js';

const router = express.Router();

// Send a message and get AI response with context
router.post('/message', protect, async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ message: 'Message is required' });
    }

    // Get all user's notes for context
    const allNotes = await Note.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .select('title transcript summary keyPoints category createdAt');

    // Get all user's tasks for context
    const allTasks = await Task.find({ user: req.user._id })
      .sort({ dueDate: 1 })
      .select('title description dueDate category status progressPercentage submitted completedDate progressNotes');

    // Get recent chat history (last 10 messages)
    const chatHistory = await ChatMessage.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('role message');

    // Reverse to get chronological order
    chatHistory.reverse();

    // Save user message
    const userMessage = await ChatMessage.create({
      user: req.user._id,
      role: 'user',
      message: message,
    });

    // Get AI response with context (now includes tasks)
    console.log('Generating AI response with context from', allNotes.length, 'notes and', allTasks.length, 'tasks...');
    const aiResponse = await chatWithMemories(message, allNotes, chatHistory, allTasks);

    // Save AI response
    const assistantMessage = await ChatMessage.create({
      user: req.user._id,
      role: 'assistant',
      message: aiResponse,
    });

    res.json({
      userMessage,
      assistantMessage,
    });
  } catch (error) {
    console.error('Chat message error:', error);
    res.status(500).json({ 
      message: 'Failed to process chat message', 
      error: error.message 
    });
  }
});

// Get chat history
router.get('/history', protect, async (req, res) => {
  try {
    const { limit = 50 } = req.query;

    const messages = await ChatMessage.find({ user: req.user._id })
      .sort({ createdAt: 1 }) // Chronological order
      .limit(parseInt(limit));

    res.json({ messages });
  } catch (error) {
    console.error('Get chat history error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Clear chat history
router.delete('/history', protect, async (req, res) => {
  try {
    await ChatMessage.deleteMany({ user: req.user._id });
    res.json({ message: 'Chat history cleared successfully' });
  } catch (error) {
    console.error('Clear chat history error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;

