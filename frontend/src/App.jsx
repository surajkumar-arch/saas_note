
import React, { useState, useEffect } from 'react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import axios from 'axios';

export default function App(){
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch { return null; }
  });

  // helper to set both state and localStorage synchronously
  function saveLogin(tkn, usr){
    setToken(tkn);
    setUser(usr);
    localStorage.setItem('token', tkn);
    localStorage.setItem('user', JSON.stringify(usr));
  }

  // if token exists but user is missing (page refresh), fetch /me
  useEffect(() => {
    async function fetchMe(){
      if (token && !user) {
        try {
          const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';
          const res = await axios.get(base + '/api/auth/me', { headers: { Authorization: 'Bearer ' + token }});
          saveLogin(token, res.data);
        } catch (err) {
          // token invalid -> clear
          console.warn('Could not fetch /me, clearing token', err);
          localStorage.removeItem('token'); localStorage.removeItem('user');
          setToken(null); setUser(null);
        }
      }
    }
    fetchMe();
  }, [token]);

  if (!token) return <Login onLogin={(t,u)=> saveLogin(t,u)} />
  if (!user) return <div className="min-h-screen flex items-center justify-center">Loading profile...</div>

  return <Dashboard token={token} user={user} onLogout={()=>{ localStorage.removeItem('token'); localStorage.removeItem('user'); setToken(null); setUser(null); }} />
}
