import express from 'express';
import { protect } from '../middleware/auth.js';
import Task from '../models/Task.js';
import { parseDate } from '../utils/dateParser.js';

const router = express.Router();

// Get all tasks for user
router.get('/', protect, async (req, res) => {
  try {
    const { completed, upcoming, category } = req.query;

    const query = { user: req.user._id };

    if (completed !== undefined) {
      query.completed = completed === 'true';
    }

    if (upcoming === 'true') {
      query.dueDate = { $gte: new Date() };
      query.completed = false;
    }

    if (category && category !== 'all') {
      query.category = category;
    }

    const tasks = await Task.find(query)
      .populate('note', 'title category')
      .sort({ dueDate: 1 });

    res.json({ tasks });
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get single task
router.get('/:id', protect, async (req, res) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      user: req.user._id,
    }).populate('note', 'title category transcript');

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    res.json(task);
  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create task manually
router.post('/', protect, async (req, res) => {
  try {
    const { title, description, dueDate, category, noteId } = req.body;

    if (!title || !dueDate) {
      return res.status(400).json({ message: 'Title and due date are required' });
    }

    const parsedDate = parseDate(dueDate);
    if (!parsedDate) {
      return res.status(400).json({ message: 'Invalid date format' });
    }

    const task = await Task.create({
      user: req.user._id,
      note: noteId || undefined,
      title,
      description: description || '',
      dueDate: parsedDate,
      category: category || 'Other',
    });

    res.status(201).json(task);
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update task
router.put('/:id', protect, async (req, res) => {
  try {
    const { 
      title, 
      description, 
      dueDate, 
      category, 
      completed,
      status,
      progressPercentage,
      submitted,
      progressNote
    } = req.body;

    const task = await Task.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    if (title) task.title = title;
    if (description !== undefined) task.description = description;
    if (category) task.category = category;
    
    // Progress tracking updates
    if (status) {
      task.status = status;
      if (status === 'completed') {
        task.completed = true;
        task.progressPercentage = 100;
        if (!task.completedDate) {
          task.completedDate = new Date();
        }
      }
    }
    
    if (progressPercentage !== undefined) {
      task.progressPercentage = Math.min(100, Math.max(0, progressPercentage));
      
      // Auto-update status based on percentage
      if (progressPercentage === 0) {
        task.status = 'not_started';
      } else if (progressPercentage === 100) {
        task.status = 'completed';
        task.completed = true;
        if (!task.completedDate) {
          task.completedDate = new Date();
        }
      } else {
        task.status = 'in_progress';
      }
    }
    
    if (submitted !== undefined) {
      task.submitted = submitted;
      if (submitted && !task.submittedDate) {
        task.submittedDate = new Date();
        task.status = 'completed';
        task.completed = true;
        task.progressPercentage = 100;
      }
    }
    
    if (progressNote) {
      task.progressNotes.push({
        note: progressNote,
        timestamp: new Date(),
      });
    }
    
    if (completed !== undefined) {
      task.completed = completed;
      if (completed) {
        task.status = 'completed';
        task.progressPercentage = 100;
        if (!task.completedDate) {
          task.completedDate = new Date();
        }
      }
    }
    
    if (dueDate) {
      const parsedDate = parseDate(dueDate);
      if (parsedDate) {
        task.dueDate = parsedDate;
      }
    }

    task.updatedAt = new Date();
    await task.save();

    res.json(task);
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete task
router.delete('/:id', protect, async (req, res) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    await task.deleteOne();

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get upcoming deadlines (next 7 days)
router.get('/calendar/upcoming', protect, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    const tasks = await Task.find({
      user: req.user._id,
      dueDate: { $gte: today, $lte: nextWeek },
      completed: false,
    })
      .populate('note', 'title category')
      .sort({ dueDate: 1 });

    res.json({ tasks });
  } catch (error) {
    console.error('Get upcoming tasks error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get progress statistics
router.get('/stats/progress', protect, async (req, res) => {
  try {
    const allTasks = await Task.find({ user: req.user._id });
    
    const stats = {
      total: allTasks.length,
      completed: allTasks.filter(t => t.status === 'completed').length,
      inProgress: allTasks.filter(t => t.status === 'in_progress').length,
      notStarted: allTasks.filter(t => t.status === 'not_started').length,
      submitted: allTasks.filter(t => t.submitted === true).length,
      overdue: allTasks.filter(t => !t.completed && new Date(t.dueDate) < new Date()).length,
      averageProgress: allTasks.length > 0 
        ? Math.round(allTasks.reduce((sum, t) => sum + t.progressPercentage, 0) / allTasks.length)
        : 0,
    };

    res.json(stats);
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;

