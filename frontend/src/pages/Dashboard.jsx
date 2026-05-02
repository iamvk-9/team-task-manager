import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import dayjs from 'dayjs';

const statusColor = {
  'todo': 'bg-gray-100 text-gray-700',
  'in-progress': 'bg-blue-100 text-blue-700',
  'done': 'bg-green-100 text-green-700',
};

const priorityColor = {
  low: 'bg-gray-100 text-gray-600',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-red-100 text-red-600',
};

const Dashboard = () => {
  const [projects, setProjects] = useState([]);
  const [allTasks, setAllTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const projRes = await api.get('/projects');
        setProjects(projRes.data);

        // Fetch tasks for all projects in parallel
        const taskResults = await Promise.all(
          projRes.data.map(p => api.get(`/tasks?projectId=${p._id}`).then(r => r.data).catch(() => []))
        );
        setAllTasks(taskResults.flat());
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const myTasks = allTasks.filter(t => t.assignedTo?._id === user._id || t.createdBy?._id === user._id);
  const overdueTasks = myTasks.filter(t => t.dueDate && dayjs(t.dueDate).isBefore(dayjs()) && t.status !== 'done');
  const inProgress = myTasks.filter(t => t.status === 'in-progress');
  const done = myTasks.filter(t => t.status === 'done');

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Welcome back, {user?.name}! 👋</h1>
        <p className="text-gray-500 mt-1">Here's your task overview</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {[
          { label: 'Total Tasks', value: myTasks.length, color: 'text-gray-800' },
          { label: 'In Progress', value: inProgress.length, color: 'text-blue-600' },
          { label: 'Overdue', value: overdueTasks.length, color: 'text-red-600' },
          { label: 'Completed', value: done.length, color: 'text-green-600' },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-sm text-gray-500">{stat.label}</p>
            <p className={`text-4xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Projects */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Projects</h2>
            <button onClick={() => navigate('/projects')} className="text-sm text-blue-600 hover:underline">View all →</button>
          </div>
          {projects.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
              <p>No projects yet</p>
              <button onClick={() => navigate('/projects')} className="mt-3 text-blue-600 text-sm hover:underline">Create one →</button>
            </div>
          ) : (
            <div className="space-y-3">
              {projects.slice(0, 5).map(p => (
                <div
                  key={p._id}
                  onClick={() => navigate(`/projects/${p._id}`)}
                  className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between cursor-pointer hover:border-blue-300 hover:shadow-sm transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 font-bold">
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">{p.name}</p>
                      <p className="text-xs text-gray-400">{p.members?.length + 1} members</p>
                    </div>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${p.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                    {p.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Tasks */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Recent Tasks</h2>
            <button onClick={() => navigate('/tasks')} className="text-sm text-blue-600 hover:underline">View all →</button>
          </div>
          {myTasks.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
              <p>No tasks assigned to you yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {myTasks.slice(0, 5).map(task => (
                <div key={task._id} className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-gray-800 text-sm">{task.title}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${statusColor[task.status]}`}>
                      {task.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${priorityColor[task.priority]}`}>{task.priority}</span>
                    {task.dueDate && (
                      <span className={`text-xs ${dayjs(task.dueDate).isBefore(dayjs()) && task.status !== 'done' ? 'text-red-500' : 'text-gray-400'}`}>
                        Due {dayjs(task.dueDate).format('DD MMM')}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Overdue Warning */}
      {overdueTasks.length > 0 && (
        <div className="mt-8 bg-red-50 border border-red-200 rounded-xl p-5">
          <h3 className="text-red-700 font-semibold mb-3">⚠ Overdue Tasks ({overdueTasks.length})</h3>
          <div className="space-y-2">
            {overdueTasks.map(task => (
              <div key={task._id} className="flex justify-between items-center text-sm">
                <span className="text-red-800">{task.title}</span>
                <span className="text-red-500">{dayjs(task.dueDate).format('DD MMM YYYY')}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
