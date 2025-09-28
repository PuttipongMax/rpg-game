// src/main.ts
import './style.css';
import { navigate, initRouter, addRoute, setContent } from './router';
import { renderLogin } from './ui/loginForm';
import { renderRegister } from './ui/registerForm';
import { startGame } from './game/mainGame';
// import { updateInventoryUI } from './ui/inventoryUI';

document.addEventListener('DOMContentLoaded', () => {
  // ลงทะเบียนทุกหน้าของเรากับ Router
  addRoute('/', () => navigate('/login')); // หน้าแรกสุดให้ไปที่ login
  addRoute('/login', renderLogin);
  addRoute('/register', renderRegister);
  addRoute('/game', () => {
    // ตรวจสอบ Token ก่อนเข้าเกม
    const token = localStorage.getItem('jwt_token');
    if (token) {
      startGame();
    } else {
      alert('Please login first!');
      navigate('/login');
    }
  });
  addRoute('/404', () => setContent('<h1>404 Not Found</h1>'));

  // เริ่มการทำงานของ Router
  initRouter();
});