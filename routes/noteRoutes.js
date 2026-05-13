import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { protect } from '../middleware/auth.js';
import Note from '../models/Note.js';
import Task from '../models/Task.js';
import { transcribeAudio, processTranscript, detectKeywords } from '../utils/geminiService.js';
import { parseDate } from '../utils/dateParser.js';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'audio-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'audio/mpeg',
      'audio/wav',
      'audio/webm',
      'audio/ogg',
      'audio/mp4',
      'audio/x-m4a',
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only audio files are allowed.'));
    }
  },
});

// Process audio and create note
router.post('/process', protect, upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No audio file provided' });
    }

    const audioPath = req.file.path;
    const audioBuffer = fs.readFileSync(audioPath);
    const mimeType = req.file.mimetype;

    // Step 1: Transcribe audio
    console.log('Transcribing audio...');
    const transcript = await transcribeAudio(audioBuffer, mimeType);

    // Step 2: Process transcript with AI
    console.log('Processing transcript...');
    const analysis = await processTranscript(transcript);

    // Step 3: Detect companion mode keywords
    console.log('Detecting keywords...');
    const highlights = await detectKeywords(transcript);

    // Step 4: Create note
    const note = await Note.create({
      user: req.user._id,
      title: analysis.title,
      transcript: transcript,
      summary: analysis.summary,
      keyPoints: analysis.keyPoints,
      category: analysis.category,
      audioUrl: audioPath,
      duration: req.body.duration || 0,
      highlightedSections: highlights,
    });

    // Step 5: Create tasks if any
    const createdTasks = [];
    if (analysis.tasks && analysis.tasks.length > 0) {
      for (const taskData of analysis.tasks) {
        const dueDate = parseDate(taskData.dueDate);
        
        if (dueDate) {
          const task = await Task.create({
            user: req.user._id,
            note: note._id,
            title: taskData.title,
            description: taskData.description || '',
            dueDate: dueDate,
            category: taskData.type || 'Other',
          });
          createdTasks.push(task);
        }
      }
    }

    // Step 6: Return response
    res.status(201).json({
      note: note,
      tasks: createdTasks,
    });
  } catch (error) {
    console.error('Process audio error:', error);
    res.status(500).json({ 
      message: 'Failed to process audio', 
      error: error.message 
    });
  }
});

// Get all notes for user
router.get('/', protect, async (req, res) => {
  try {
    const { category, limit = 20, page = 1 } = req.query;

    const query = { user: req.user._id };
    
    if (category && category !== 'all') {
      query.category = category;
    }

    const notes = await Note.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Note.countDocuments(query);

    res.json({
      notes,
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      total,
    });
  } catch (error) {
    console.error('Get notes error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get single note
router.get('/:id', protect, async (req, res) => {
  try {
    const note = await Note.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }

    res.json(note);
  } catch (error) {
    console.error('Get note error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update note
router.put('/:id', protect, async (req, res) => {
  try {
    const { title, summary, keyPoints, category } = req.body;

    const note = await Note.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }

    if (title) note.title = title;
    if (summary) note.summary = summary;
    if (keyPoints) note.keyPoints = keyPoints;
    if (category) note.category = category;
    note.updatedAt = Date.now();

    await note.save();

    res.json(note);
  } catch (error) {
    console.error('Update note error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete note
router.delete('/:id', protect, async (req, res) => {
  try {
    const note = await Note.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }

    // Delete associated audio file
    if (note.audioUrl && fs.existsSync(note.audioUrl)) {
      fs.unlinkSync(note.audioUrl);
    }

    // Delete associated tasks
    await Task.deleteMany({ note: note._id });

    await note.deleteOne();

    res.json({ message: 'Note deleted successfully' });
  } catch (error) {
    console.error('Delete note error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Search notes
router.get('/search/query', protect, async (req, res) => {
  try {
    const { q, category } = req.query;

    if (!q) {
      return res.status(400).json({ message: 'Search query required' });
    }

    const query = {
      user: req.user._id,
      $text: { $search: q },
    };

    if (category && category !== 'all') {
      query.category = category;
    }

    const notes = await Note.find(query, {
      score: { $meta: 'textScore' },
    })
      .sort({ score: { $meta: 'textScore' } })
      .limit(50);

    res.json({ notes });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;

