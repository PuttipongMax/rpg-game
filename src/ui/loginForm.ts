// src/ui/loginForm.ts
import { setContent, navigate } from '../router';
import { handleLogin } from '../api/auth';

export function renderLogin() {
  const html = `
    <div class="form-container">
      <h1>Login</h1>
      <form id="login-form">
        <div class="form-group">
          <label for="email">Email</label>
          <input type="email" id="email" required>
        </div>
        <div class="form-group">
          <label for="password">Password</label>
          <input type="password" id="password" required>
        </div>
        <button type="submit" class="submit-btn">Login</button>
        <p id="error-message" class="error-message"></p>
      </form>
      <p class="switch-form-text">
        Don't have an account? <a href="/register" data-link>Register here</a>
      </p>
    </div>
  `;
  setContent(html);

  const form = document.getElementById('login-form')!;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    handleLogin();
  });
}