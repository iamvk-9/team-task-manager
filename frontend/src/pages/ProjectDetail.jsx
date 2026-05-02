import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import dayjs from 'dayjs';

const STATUSES = ['todo', 'in-progress', 'done'];

const priorityColor = {
  low: 'bg-gray-100 text-gray-600',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-red-100 text-red-600',
};

const statusLabel = {
  'todo': 'To Do',
  'in-progress': 'In Progress',
  'done': 'Done',
};

const statusColors = {
  'todo': 'bg-gray-50 border-gray-200',
  'in-progress': 'bg-blue-50 border-blue-200',
  'done': 'bg-green-50 border-green-200',
};

const ProjectDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [memberEmail, setMemberEmail] = useState('');
  const [taskForm, setTaskForm] = useState({
    title: '', description: '', assignedTo: '', priority: 'medium', dueDate: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchAll = async () => {
    try {
      const [projRes, taskRes] = await Promise.all([
        api.get(`/projects/${id}`),
        api.get(`/tasks?projectId=${id}`),
      ]);
      setProject(projRes.data);
      setTasks(taskRes.data);
    } catch {
      toast.error('Failed to load project');
      navigate('/projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, [id]);

  const isOwner = project?.owner?._id === user._id || project?.owner === user._id;

  const handleCreateTask = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/tasks', {
        ...taskForm,
        projectId: id,
        assignedTo: taskForm.assignedTo || undefined,
        dueDate: taskForm.dueDate || undefined,
      });
      toast.success('Task created!');
      setTaskForm({ title: '', description: '', assignedTo: '', priority: 'medium', dueDate: '' });
      setShowTaskModal(false);
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create task');
    }
    setSubmitting(false);
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await api.put(`/tasks/${taskId}`, { status: newStatus });
      setTasks(tasks.map(t => t._id === taskId ? { ...t, status: newStatus } : t));
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Delete this task?')) return;
    try {
      await api.delete(`/tasks/${taskId}`);
      setTasks(tasks.filter(t => t._id !== taskId));
      toast.success('Task deleted');
    } catch {
      toast.error('Failed to delete task');
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      // Find user by email then add to project members
      const res = await api.get(`/auth/users?email=${memberEmail}`);
      const memberId = res.data._id;
      const currentMembers = project.members.map(m => m._id || m);
      if (currentMembers.includes(memberId)) {
        toast.info('User is already a member');
        setSubmitting(false);
        return;
      }
      await api.put(`/projects/${id}`, { members: [...currentMembers, memberId] });
      toast.success('Member added!');
      setMemberEmail('');
      setShowMemberModal(false);
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'User not found');
    }
    setSubmitting(false);
  };

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
    </div>
  );

  const tasksByStatus = STATUSES.reduce((acc, s) => {
    acc[s] = tasks.filter(t => t.status === s);
    return acc;
  }, {});

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <button onClick={() => navigate('/projects')} className="text-sm text-gray-500 hover:text-blue-600 mb-2 flex items-center gap-1">
            ← Projects
          </button>
          <h1 className="text-3xl font-bold text-gray-800">{project.name}</h1>
          {project.description && (
            <p className="text-gray-500 mt-1">{project.description}</p>
          )}
        </div>
        <div className="flex gap-3">
          {isOwner && (
            <button
              onClick={() => setShowMemberModal(true)}
              className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
            >
              + Add Member
            </button>
          )}
          <button
            onClick={() => setShowTaskModal(true)}
            className="bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition"
          >
            + New Task
          </button>
        </div>
      </div>

      {/* Members */}
      <div className="flex items-center gap-3 mb-8">
        <span className="text-sm text-gray-500">Team:</span>
        <div className="flex -space-x-2">
          {[project.owner, ...(project.members || [])].map((member, i) => (
            <div
              key={member?._id || i}
              title={member?.name}
              className="w-8 h-8 rounded-full bg-blue-600 border-2 border-white flex items-center justify-center text-white text-xs font-semibold"
              style={{ backgroundColor: `hsl(${(i * 60) % 360}, 60%, 50%)` }}
            >
              {member?.name?.charAt(0).toUpperCase()}
            </div>
          ))}
        </div>
        <span className="text-sm text-gray-500">{1 + (project.members?.length || 0)} member{(1 + project.members?.length) !== 1 ? 's' : ''}</span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {STATUSES.map(s => (
          <div key={s} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-2xl font-bold text-gray-800">{tasksByStatus[s].length}</p>
            <p className="text-sm text-gray-500 mt-1">{statusLabel[s]}</p>
          </div>
        ))}
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {STATUSES.map(status => (
          <div key={status} className={`rounded-xl border p-4 ${statusColors[status]}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-700">{statusLabel[status]}</h3>
              <span className="bg-white text-gray-600 text-xs font-semibold px-2 py-1 rounded-full border border-gray-200">
                {tasksByStatus[status].length}
              </span>
            </div>

            <div className="space-y-3">
              {tasksByStatus[status].map(task => (
                <div key={task._id} className="bg-white rounded-lg border border-gray-200 p-4 group">
                  <div className="flex justify-between items-start">
                    <h4 className="font-medium text-gray-800 text-sm">{task.title}</h4>
                    <button
                      onClick={() => handleDeleteTask(task._id)}
                      className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition text-base leading-none ml-2"
                    >
                      ×
                    </button>
                  </div>

                  {task.description && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{task.description}</p>
                  )}

                  <div className="flex items-center gap-2 mt-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${priorityColor[task.priority]}`}>
                      {task.priority}
                    </span>
                    {task.dueDate && (
                      <span className={`text-xs ${dayjs(task.dueDate).isBefore(dayjs()) && task.status !== 'done' ? 'text-red-500' : 'text-gray-400'}`}>
                        {dayjs(task.dueDate).format('DD MMM')}
                      </span>
                    )}
                  </div>

                  {task.assignedTo && (
                    <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-gray-100">
                      <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs">
                        {task.assignedTo.name?.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-xs text-gray-500">{task.assignedTo.name}</span>
                    </div>
                  )}

                  {/* Move task buttons */}
                  <div className="flex gap-1 mt-3">
                    {STATUSES.filter(s => s !== status).map(s => (
                      <button
                        key={s}
                        onClick={() => handleStatusChange(task._id, s)}
                        className="text-xs text-gray-400 hover:text-blue-600 border border-gray-200 hover:border-blue-300 px-2 py-0.5 rounded transition"
                      >
                        → {statusLabel[s]}
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              {tasksByStatus[status].length === 0 && (
                <p className="text-center text-gray-400 text-sm py-6">No tasks</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Create Task Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center px-6 py-4 border-b sticky top-0 bg-white">
              <h2 className="text-xl font-semibold">New Task</h2>
              <button onClick={() => setShowTaskModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
            </div>
            <form onSubmit={handleCreateTask} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Title</label>
                <input
                  value={taskForm.title}
                  onChange={e => setTaskForm({ ...taskForm, title: e.target.value })}
                  className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:border-blue-500"
                  placeholder="Task title"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <textarea
                  value={taskForm.description}
                  onChange={e => setTaskForm({ ...taskForm, description: e.target.value })}
                  className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:border-blue-500 resize-none"
                  rows={3}
                  placeholder="Optional details..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Priority</label>
                  <select
                    value={taskForm.priority}
                    onChange={e => setTaskForm({ ...taskForm, priority: e.target.value })}
                    className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:border-blue-500 bg-white"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Due Date</label>
                  <input
                    type="date"
                    value={taskForm.dueDate}
                    onChange={e => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                    className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Assign To <span className="text-gray-400 font-normal">(optional)</span></label>
                <select
                  value={taskForm.assignedTo}
                  onChange={e => setTaskForm({ ...taskForm, assignedTo: e.target.value })}
                  className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:border-blue-500 bg-white"
                >
                  <option value="">Unassigned</option>
                  {[project.owner, ...(project.members || [])].map(m => (
                    <option key={m._id} value={m._id}>{m.name} ({m.email})</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowTaskModal(false)} className="flex-1 px-4 py-3 border rounded-lg font-medium text-gray-600 hover:bg-gray-50 transition">Cancel</button>
                <button type="submit" disabled={submitting} className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50">
                  {submitting ? 'Creating...' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {showMemberModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
            <div className="flex justify-between items-center px-6 py-4 border-b">
              <h2 className="text-xl font-semibold">Add Member</h2>
              <button onClick={() => setShowMemberModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
            </div>
            <form onSubmit={handleAddMember} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Member Email</label>
                <input
                  type="email"
                  value={memberEmail}
                  onChange={e => setMemberEmail(e.target.value)}
                  className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:border-blue-500"
                  placeholder="user@example.com"
                  required
                />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowMemberModal(false)} className="flex-1 px-4 py-3 border rounded-lg font-medium text-gray-600 hover:bg-gray-50 transition">Cancel</button>
                <button type="submit" disabled={submitting} className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50">
                  {submitting ? 'Adding...' : 'Add Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectDetail;
