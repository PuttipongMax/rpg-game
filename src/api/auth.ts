// src/api/auth.ts
import { navigate } from '../router';

const API_BASE_URL = 'http://localhost:3000/api/auth'; // URL ของ Backend

export async function handleLogin() {
  const emailInput = document.getElementById('email') as HTMLInputElement;
  const passwordInput = document.getElementById('password') as HTMLInputElement;
  const errorP = document.getElementById('error-message')!;

  try {
    const response = await fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailInput.value, password: passwordInput.value }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Login failed');
    }

    localStorage.setItem('jwt_token', data.token); // เก็บ Token
    navigate('/game'); // ไปที่หน้าเกม

  } catch (error: any) {
    errorP.textContent = error.message;
  }
}

export async function handleRegister() {
    const usernameInput = document.getElementById('username') as HTMLInputElement;
    const emailInput = document.getElementById('email') as HTMLInputElement;
    const passwordInput = document.getElementById('password') as HTMLInputElement;
    const errorP = document.getElementById('error-message')!;

    try {
        const response = await fetch(`${API_BASE_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: usernameInput.value,
                email: emailInput.value,
                password: passwordInput.value
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Registration failed');
        }
        
        alert('Registration successful! Please login.');
        navigate('/login');

    } catch (error: any) {
        errorP.textContent = error.message;
    }
}