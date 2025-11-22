import React, { useEffect, useState } from 'react';
import { getAllLogs } from '../services/supabaseClient';
import { DBMessage, AppSettings } from '../types';
import { Database, RefreshCw, Search, ServerOff } from 'lucide-react';

interface DatabaseViewProps {
  settings: AppSettings;
}

const DatabaseView: React.FC<DatabaseViewProps> = ({ settings }) => {
  const [logs, setLogs] = useState<DBMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchLogs = async () => {
    if (!settings.supabaseUrl || !settings.supabaseKey) {
      setError("Supabase not configured.");
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await getAllLogs();
      setLogs(data);
      if (data.length === 0) {
        setError("No logs found or connection failed (check console).");
      }
    } catch (e) {
      setError("Failed to fetch logs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  if (!settings.supabaseUrl || !settings.supabaseKey) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-slate-400">
        <ServerOff className="w-16 h-16 mb-4" />
        <h3 className="text-xl font-semibold">Database Not Connected</h3>
        <p>Please configure Supabase in Settings to view chat logs.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <Database className="w-6 h-6 text-indigo-600" />
          <h2 className="text-2xl font-bold text-slate-800">Conversation Logs</h2>
        </div>
        <button 
          onClick={fetchLogs} 
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 text-sm transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-amber-50 text-amber-800 p-4 rounded-lg mb-6 border border-amber-200 text-sm">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                <th className="p-4 font-semibold">Time</th>
                <th className="p-4 font-semibold">Session ID</th>
                <th className="p-4 font-semibold">Role</th>
                <th className="p-4 font-semibold">Content</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((log, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition-colors text-sm">
                  <td className="p-4 whitespace-nowrap text-slate-500">
                    {log.created_at ? new Date(log.created_at).toLocaleString() : '-'}
                  </td>
                  <td className="p-4 text-slate-500 font-mono text-xs">{log.session_id.slice(0, 8)}...</td>
                  <td className="p-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      log.role === 'user' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {log.role}
                    </span>
                  </td>
                  <td className="p-4 text-slate-700 max-w-md truncate" title={log.content}>
                    {log.content}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && !loading && !error && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-400">
                    No messages recorded yet. Use the simulator to generate data.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DatabaseView;