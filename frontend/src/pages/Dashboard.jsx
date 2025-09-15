import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function Dashboard({ token, user, onLogout }) {
  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';
  const [notes, setNotes] = useState([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(true);

  // For editing
  const [editingId, setEditingId] = useState(null);

  // Invite form states
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');

  const headers = { Authorization: 'Bearer ' + token };
  const isAdmin = user?.role?.toLowerCase() === 'admin';

  useEffect(() => {
    if (!token) return;
    fetchNotes().finally(() => setLoading(false));
  }, [token]);

  async function fetchNotes() {
    try {
      const res = await axios.get(apiBase + '/api/notes', { headers });
      setNotes(res.data);
    } catch (e) {
      console.error(e);
      setInfo('Could not load notes');
    }
  }

  async function fetchNoteById(id) {
    try {
      const res = await axios.get(apiBase + '/api/notes/' + id, { headers });
      alert("Note Details:\n" + JSON.stringify(res.data, null, 2));
    } catch (err) {
      setInfo('Failed to fetch note');
    }
  }

  async function createOrUpdateNote(e) {
    e.preventDefault();
    try {
      if (editingId) {
        await axios.put(apiBase + '/api/notes/' + editingId, { title, content }, { headers });
        setInfo('Note updated successfully');
      } else {
        await axios.post(apiBase + '/api/notes', { title, content }, { headers });
        setInfo('Note created successfully');
      }
      setTitle('');
      setContent('');
      setEditingId(null);
      fetchNotes();
    } catch (e) {
      setInfo(e.response?.data?.error || 'Action failed');
    }
  }

  async function deleteNote(id) {
    try {
      await axios.delete(apiBase + '/api/notes/' + id, { headers });
      fetchNotes();
    } catch (e) {
      setInfo('Delete failed');
    }
  }

  async function upgrade() {
    if (!user?.tenant) return;
    try {
      await axios.post(apiBase + '/api/tenants/' + user.tenant + '/upgrade', {}, { headers });
      setInfo('Upgraded to Pro');
      fetchNotes();
    } catch (e) {
      setInfo(e.response?.data?.error || 'Upgrade failed');
    }
  }

  async function inviteUser(e) {
    e.preventDefault();
    try {
      await axios.post(
        apiBase + '/api/tenants/' + user.tenant + '/invite',
        { email: inviteEmail, role: inviteRole },
        { headers }
      );
      setInfo('User invited successfully');
      setInviteEmail('');
      setInviteRole('member');
    } catch (err) {
      setInfo(err.response?.data?.error || 'Invite failed');
    }
  }

  const freeLimitReached = notes.length >= 3;

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Loading user...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-white shadow p-4 flex justify-between items-center">
        <div className="font-bold">SaaS Notes - {user?.tenant ?? 'Unknown'}</div>
        <div className="flex items-center gap-3">
          <div className="text-sm">{user?.email} ({user?.role})</div>
          <button className="btn btn-secondary" onClick={onLogout}>Logout</button>
        </div>
      </div>

      {/* Body */}
      <div className="container mt-4">
        {info && <div className="mb-2 text-red-600">{info}</div>}

        {loading ? (
          <div>Loading notes...</div>
        ) : (
          <>
            {/* Create/Update Note */}
            <div className="card mb-4">
              <h3 className="font-semibold mb-2">{editingId ? 'Edit Note' : 'Create Note'}</h3>
              <form onSubmit={createOrUpdateNote} className="space-y-2">
                <input
                  className="w-full p-2 border rounded"
                  placeholder="Title"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                />
                <textarea
                  className="w-full p-2 border rounded"
                  placeholder="Content"
                  value={content}
                  onChange={e => setContent(e.target.value)}
                />
                <div className="flex gap-2">
                  <button className="btn btn-primary">
                    {editingId ? 'Update' : 'Create'}
                  </button>
                  {isAdmin && freeLimitReached && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={upgrade}
                    >
                      Upgrade to Pro
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* Invite User (Admin only) */}
            {isAdmin && (
              <div className="card mb-4">
                <h3 className="font-semibold mb-2">Invite User</h3>
                <form onSubmit={inviteUser} className="space-y-2">
                  <input
                    className="w-full p-2 border rounded"
                    placeholder="User email"
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                  />
                  <select
                    className="w-full p-2 border rounded"
                    value={inviteRole}
                    onChange={e => setInviteRole(e.target.value)}
                  >
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                  </select>
                  <button className="btn btn-primary">Invite</button>
                </form>
              </div>
            )}

            {/* Notes List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {notes.map(n => (
                <div key={n.id} className="note-card">
                  <div className="flex justify-between">
                    <div className="font-semibold">{n.title}</div>
                    <div className="text-sm text-gray-500">
                      {new Date(n.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <div className="mt-2 text-sm">{n.content}</div>
                  <div className="mt-3 flex gap-2">
                    <button
                      className="btn btn-secondary"
                      onClick={() => fetchNoteById(n.id)}
                    >
                      View
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={() => {
                        setTitle(n.title);
                        setContent(n.content);
                        setEditingId(n.id);
                      }}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-danger"
                      onClick={() => deleteNote(n.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Free plan notice */}
            {freeLimitReached && !isAdmin && (
              <div className="mt-4 p-3 bg-yellow-50 border rounded">
                Free plan limit reached. Ask your admin to upgrade to Pro.
              </div>
            )}
          </>
        )}
      </div>
  </div>
  );
}
