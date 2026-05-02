import { useEffect, useState } from 'react';
import api from '../services/api';
import { toast } from 'react-toastify';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';

const priorityColor = {
  low: 'bg-gray-100 text-gray-600',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-red-100 text-red-600',
};

const statusColor = {
  'todo': 'bg-gray-100 text-gray-700',
  'in-progress': 'bg-blue-100 text-blue-700',
  'done': 'bg-green-100 text-green-700',
};

const Tasks = () => {
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/projects').then(res => {
      setProjects(res.data);
      if (res.data.length > 0) setSelectedProject(res.data[0]._id);
    }).catch(() => toast.error('Failed to load projects'));
  }, []);

  useEffect(() => {
    if (!selectedProject) return;
    setLoading(true);
    api.get(`/tasks?projectId=${selectedProject}`)
      .then(res => setTasks(res.data))
      .catch(() => toast.error('Failed to load tasks'))
      .finally(() => setLoading(false));
  }, [selectedProject]);

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await api.put(`/tasks/${taskId}`, { status: newStatus });
      setTasks(tasks.map(t => t._id === taskId ? { ...t, status: newStatus } : t));
      toast.success('Status updated');
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async (taskId) => {
    if (!window.confirm('Delete this task?')) return;
    try {
      await api.delete(`/tasks/${taskId}`);
      setTasks(tasks.filter(t => t._id !== taskId));
      toast.success('Task deleted');
    } catch {
      toast.error('Failed to delete task');
    }
  };

  const filtered = tasks.filter(t => {
    const matchStatus = filterStatus === 'all' || t.status === filterStatus;
    const matchPriority = filterPriority === 'all' || t.priority === filterPriority;
    const matchSearch = t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.description?.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchPriority && matchSearch;
  });

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Tasks</h1>
          <p className="text-gray-500 mt-1">{filtered.length} task{filtered.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 flex flex-wrap gap-4">
        <div className="flex-1 min-w-[160px]">
          <label className="block text-xs text-gray-500 mb-1">Project</label>
          <select
            value={selectedProject}
            onChange={e => setSelectedProject(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:border-blue-500 bg-white"
          >
            {projects.map(p => (
              <option key={p._id} value={p._id}>{p.name}</option>
            ))}
          </select>
        </div>

        <div className="min-w-[120px]">
          <label className="block text-xs text-gray-500 mb-1">Status</label>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:border-blue-500 bg-white"
          >
            <option value="all">All</option>
            <option value="todo">To Do</option>
            <option value="in-progress">In Progress</option>
            <option value="done">Done</option>
          </select>
        </div>

        <div className="min-w-[120px]">
          <label className="block text-xs text-gray-500 mb-1">Priority</label>
          <select
            value={filterPriority}
            onChange={e => setFilterPriority(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:border-blue-500 bg-white"
          >
            <option value="all">All</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>

        <div className="flex-1 min-w-[180px]">
          <label className="block text-xs text-gray-500 mb-1">Search</label>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search tasks..."
            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-5xl mb-4">✅</p>
          <p className="text-xl font-medium">No tasks found</p>
          <p className="mt-2">
            {tasks.length === 0
              ? 'Create tasks from the project page'
              : 'Try adjusting your filters'}
          </p>
          {tasks.length === 0 && selectedProject && (
            <button
              onClick={() => navigate(`/projects/${selectedProject}`)}
              className="mt-4 text-blue-600 hover:underline text-sm"
            >
              Go to project →
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase px-6 py-3">Task</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Priority</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Status</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Assigned</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Due</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(task => {
                const isOverdue = task.dueDate && dayjs(task.dueDate).isBefore(dayjs()) && task.status !== 'done';
                return (
                  <tr key={task._id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-800 text-sm">{task.title}</p>
                      {task.description && (
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{task.description}</p>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${priorityColor[task.priority]}`}>
                        {task.priority}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <select
                        value={task.status}
                        onChange={e => handleStatusChange(task._id, e.target.value)}
                        className={`text-xs px-2.5 py-1 rounded-full font-medium border-0 cursor-pointer focus:outline-none ${statusColor[task.status]}`}
                      >
                        <option value="todo">To Do</option>
                        <option value="in-progress">In Progress</option>
                        <option value="done">Done</option>
                      </select>
                    </td>
                    <td className="px-4 py-4">
                      {task.assignedTo ? (
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs">
                            {task.assignedTo.name?.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm text-gray-600">{task.assignedTo.name}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">Unassigned</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {task.dueDate ? (
                        <span className={`text-sm ${isOverdue ? 'text-red-500 font-medium' : 'text-gray-500'}`}>
                          {isOverdue && '⚠ '}
                          {dayjs(task.dueDate).format('DD MMM YYYY')}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <button
                        onClick={() => handleDelete(task._id)}
                        className="text-gray-300 hover:text-red-500 transition text-lg"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Tasks;
