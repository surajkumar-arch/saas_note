import React, { useState } from 'react';
import axios from 'axios';

export default function Login({ onLogin }){
  const [email,setEmail]=useState('admin@acme.test');
  const [password,setPassword]=useState('password');
  const [err,setErr]=useState('');
  const submit = async (e) => {
    e.preventDefault();
    try{
      const res = await axios.post((import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000') + '/api/auth/login', { email, password });
      onLogin(res.data.token, res.data.user);
    }catch(e){
      setErr(e.response?.data?.error || 'Login failed');
    }
  }
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="card w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Login</h2>
        {err && <div className="text-red-600 mb-2">{err}</div>}
        <form onSubmit={submit} className="space-y-3">
          <input className="w-full p-2 border rounded" value={email} onChange={e=>setEmail(e.target.value)} />
          <input className="w-full p-2 border rounded" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
          <button className="btn btn-primary w-full">Login</button>
        </form>
        <div className="text-sm text-gray-500 mt-2">Seeded accounts: admin@acme.test / user@acme.test / admin@globex.test / user@globex.test (password)</div>
      </div>
    </div>
  );
}