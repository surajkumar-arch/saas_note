import React, { useState, useEffect } from 'react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

export default function App(){
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user') || 'null'));

  useEffect(()=> {
    if(token) localStorage.setItem('token', token); else localStorage.removeItem('token');
    if(user) localStorage.setItem('user', JSON.stringify(user)); else localStorage.removeItem('user');
  }, [token, user]);

  if(!token) return <Login onLogin={(t,u)=>{ setToken(t); setUser(u); }} />
  return <Dashboard token={token} user={user} onLogout={()=>{ setToken(null); setUser(null); }} />
}