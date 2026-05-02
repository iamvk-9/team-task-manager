const Project = require('../models/Project');

// @desc    Create a new project
// @route   POST /api/projects
// @access  Private
const createProject = async (req, res) => {
  const { name, description, members } = req.body;

  if (!name) {
    return res.status(400).json({ message: 'Project name is required' });
  }

  const project = await Project.create({
    name,
    description,
    owner: req.user._id,
    members: members || [],
  });

  res.status(201).json(project);
};

// @desc    Get all projects for the logged-in user
// @route   GET /api/projects
// @access  Private
const getProjects = async (req, res) => {
  const projects = await Project.find({
    $or: [{ owner: req.user._id }, { members: req.user._id }],
  })
    .populate('owner', 'name email')
    .populate('members', 'name email')
    .sort({ createdAt: -1 });

  res.json(projects);
};

// @desc    Get a single project by ID
// @route   GET /api/projects/:id
// @access  Private
const getProjectById = async (req, res) => {
  const project = await Project.findById(req.params.id)
    .populate('owner', 'name email')
    .populate('members', 'name email');

  if (!project) {
    return res.status(404).json({ message: 'Project not found' });
  }

  const isMember =
    project.owner._id.toString() === req.user._id.toString() ||
    project.members.some((m) => m._id.toString() === req.user._id.toString());

  if (!isMember) {
    return res.status(403).json({ message: 'Access denied' });
  }

  res.json(project);
};

// @desc    Update a project
// @route   PUT /api/projects/:id
// @access  Private (owner only)
const updateProject = async (req, res) => {
  const project = await Project.findById(req.params.id);

  if (!project) {
    return res.status(404).json({ message: 'Project not found' });
  }

  if (project.owner.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'Only the project owner can update it' });
  }

  const { name, description, members, status } = req.body;
  if (name !== undefined) project.name = name;
  if (description !== undefined) project.description = description;
  if (members !== undefined) project.members = members;
  if (status !== undefined) project.status = status;

  const updated = await project.save();
  res.json(updated);
};

// @desc    Delete a project
// @route   DELETE /api/projects/:id
// @access  Private (owner only)
const deleteProject = async (req, res) => {
  const project = await Project.findById(req.params.id);

  if (!project) {
    return res.status(404).json({ message: 'Project not found' });
  }

  if (project.owner.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'Only the project owner can delete it' });
  }

  await project.deleteOne();
  res.json({ message: 'Project deleted successfully' });
};

module.exports = { createProject, getProjects, getProjectById, updateProject, deleteProject };
