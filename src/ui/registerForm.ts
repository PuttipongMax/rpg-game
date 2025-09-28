// src/ui/registerForm.ts
import { setContent } from '../router';
import { handleRegister } from '../api/auth';

export function renderRegister() {
  const html = `
    <div class="form-container">
      <h1>Register</h1>
      <form id="register-form">
        <div class="form-group">
          <label for="username">Username</label>
          <input type="text" id="username" required>
        </div>
        <div class="form-group">
          <label for="email">Email</label>
          <input type="email" id="email" required>
        </div>
        <div class="form-group">
          <label for="password">Password</label>
          <input type="password" id="password" required>
        </div>
        <button type="submit" class="submit-btn">Register</button>
        <p id="error-message" class="error-message"></p>
      </form>
      <p class="switch-form-text">
        Already have an account? <a href="/login" data-link>Login here</a>
      </p>
    </div>
  `;
  setContent(html);

  const form = document.getElementById('register-form')!;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    handleRegister();
  });
}