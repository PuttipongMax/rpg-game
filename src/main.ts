import './style.css';
import { navigate, initRouter, addRoute, setContent } from './router';
import { renderLogin } from './ui/loginForm';
import { renderRegister } from './ui/registerForm';
import { Game } from './game/Game';

document.addEventListener('DOMContentLoaded', () => {
    // ลงทะเบียนทุกหน้าของเรากับ Router
    addRoute('/', () => navigate('/login'));
    addRoute('/login', renderLogin);
    addRoute('/register', renderRegister);
    addRoute('/game', () => {
        // ตรวจสอบ Token ก่อนเข้าเกม
        const token = localStorage.getItem('jwt_token');
        if (token) {
            // สร้าง Instance ของเกมแล้วเริ่มเกม
            const game = new Game();
            game.start();
        } else {
            alert('Please login first!');
            navigate('/login');
        }
    });
    addRoute('/404', () => setContent('<h1>404 Not Found</h1>'));

    // เริ่มการทำงานของ Router
    initRouter();
});