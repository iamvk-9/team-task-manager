const Task = require('../models/Task');
const Project = require('../models/Project');

// Helper: check if user is a member/owner of the project
const isProjectMember = (project, userId) => {
  return (
    project.owner.toString() === userId.toString() ||
    project.members.some((m) => m.toString() === userId.toString())
  );
};

// @desc    Create a task within a project
// @route   POST /api/tasks
// @access  Private
const createTask = async (req, res) => {
  const { title, description, projectId, assignedTo, priority, dueDate } = req.body;

  if (!title || !projectId) {
    return res.status(400).json({ message: 'Title and projectId are required' });
  }

  const project = await Project.findById(projectId);
  if (!project) {
    return res.status(404).json({ message: 'Project not found' });
  }

  if (!isProjectMember(project, req.user._id)) {
    return res.status(403).json({ message: 'Access denied: not a project member' });
  }

  const task = await Task.create({
    title,
    description,
    project: projectId,
    assignedTo: assignedTo || null,
    createdBy: req.user._id,
    priority,
    dueDate,
  });

  res.status(201).json(task);
};

// @desc    Get all tasks for a project
// @route   GET /api/tasks?projectId=...
// @access  Private
const getTasks = async (req, res) => {
  const { projectId } = req.query;

  if (!projectId) {
    return res.status(400).json({ message: 'projectId query param is required' });
  }

  const project = await Project.findById(projectId);
  if (!project) {
    return res.status(404).json({ message: 'Project not found' });
  }

  if (!isProjectMember(project, req.user._id)) {
    return res.status(403).json({ message: 'Access denied' });
  }

  const tasks = await Task.find({ project: projectId })
    .populate('assignedTo', 'name email')
    .populate('createdBy', 'name email')
    .sort({ createdAt: -1 });

  res.json(tasks);
};

// @desc    Get a single task by ID
// @route   GET /api/tasks/:id
// @access  Private
const getTaskById = async (req, res) => {
  const task = await Task.findById(req.params.id)
    .populate('assignedTo', 'name email')
    .populate('createdBy', 'name email')
    .populate('project', 'name owner members');

  if (!task) {
    return res.status(404).json({ message: 'Task not found' });
  }

  if (!isProjectMember(task.project, req.user._id)) {
    return res.status(403).json({ message: 'Access denied' });
  }

  res.json(task);
};

// @desc    Update a task
// @route   PUT /api/tasks/:id
// @access  Private (project members)
const updateTask = async (req, res) => {
  const task = await Task.findById(req.params.id).populate('project', 'owner members');

  if (!task) {
    return res.status(404).json({ message: 'Task not found' });
  }

  if (!isProjectMember(task.project, req.user._id)) {
    return res.status(403).json({ message: 'Access denied' });
  }

  const { title, description, assignedTo, status, priority, dueDate } = req.body;
  if (title !== undefined) task.title = title;
  if (description !== undefined) task.description = description;
  if (assignedTo !== undefined) task.assignedTo = assignedTo;
  if (status !== undefined) task.status = status;
  if (priority !== undefined) task.priority = priority;
  if (dueDate !== undefined) task.dueDate = dueDate;

  const updated = await task.save();
  res.json(updated);
};

// @desc    Delete a task
// @route   DELETE /api/tasks/:id
// @access  Private (task creator or project owner)
const deleteTask = async (req, res) => {
  const task = await Task.findById(req.params.id).populate('project', 'owner members');

  if (!task) {
    return res.status(404).json({ message: 'Task not found' });
  }

  const isOwner = task.project.owner.toString() === req.user._id.toString();
  const isCreator = task.createdBy.toString() === req.user._id.toString();

  if (!isOwner && !isCreator) {
    return res.status(403).json({ message: 'Only the task creator or project owner can delete this task' });
  }

  await task.deleteOne();
  res.json({ message: 'Task deleted successfully' });
};

module.exports = { createTask, getTasks, getTaskById, updateTask, deleteTask };
