import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError('Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #f0efec 0%, #e8e6e0 100%)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      <div style={{
        background: '#fff', borderRadius: 16, padding: '40px 36px',
        width: 360, boxShadow: '0 20px 60px rgba(0,0,0,0.1)',
        border: '1px solid #e3e2dc',
      }}>
        <div style={{ marginBottom: 28, textAlign: 'center' }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12, background: '#534AB7',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 14,
          }}>
            <span style={{ fontSize: 20 }}>📊</span>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a1915', margin: 0 }}>BizManager</h1>
          <p style={{ color: '#706f6b', fontSize: 13, marginTop: 4 }}>Sign in to your account</p>
        </div>

        {error && (
          <div style={{
            background: '#FCEBEB', border: '1px solid #F09595', borderRadius: 8,
            padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#A32D2D',
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#706f6b', marginBottom: 5 }}>
              Email
            </label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              required placeholder="you@company.com"
              style={{
                width: '100%', padding: '10px 12px', fontSize: 14,
                border: '1px solid #d0cfc8', borderRadius: 8, outline: 'none',
                boxSizing: 'border-box', background: '#fff', color: '#1a1915',
              }}
            />
          </div>
          <div style={{ marginBottom: 22 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#706f6b', marginBottom: 5 }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={show ? 'text' : 'password'} value={password}
                onChange={e => setPassword(e.target.value)}
                required placeholder="••••••••"
                style={{
                  width: '100%', padding: '10px 40px 10px 12px', fontSize: 14,
                  border: '1px solid #d0cfc8', borderRadius: 8, outline: 'none',
                  boxSizing: 'border-box', background: '#fff', color: '#1a1915',
                }}
              />
              <button type="button" onClick={() => setShow(!show)} style={{
                position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', color: '#706f6b', fontSize: 12,
              }}>
                {show ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>
          <button type="submit" disabled={loading} style={{
            width: '100%', padding: '11px', background: loading ? '#AFA9EC' : '#534AB7',
            color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer', transition: 'background 0.2s',
          }}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: '#a8a79f' }}>
          Contact your admin if you forgot your password
        </p>
      </div>
    </div>
  );
}
