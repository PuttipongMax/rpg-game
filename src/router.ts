// src/router.ts

// สร้าง Type สำหรับ Routes ของเรา
type RouteHandler = () => void;
const routes: Record<string, RouteHandler> = {};
let appContainer: HTMLElement;

// ฟังก์ชันสำหรับ Render เนื้อหาลงใน div#app
export function setContent(html: string) {
  appContainer.innerHTML = html;
}

// ฟังก์ชันสำหรับเปลี่ยนหน้า (โดยไม่ Reload)
export function navigate(path: string) {
  window.history.pushState({}, "", path);
  handleRouting();
}

// ฟังก์ชันหลักที่คอยดู URL แล้วเรียก Handler ที่ถูกต้อง
function handleRouting() {
  const path = window.location.pathname;
  const handler = routes[path] || routes["/404"]; // ถ้าไม่เจอ ให้ไปหน้า 404
  handler();
}

// ฟังก์ชันสำหรับลงทะเบียน Route
export function addRoute(path: string, handler: RouteHandler) {
  routes[path] = handler;
}

// ฟังก์ชันเริ่มต้นการทำงานของ Router
export function initRouter() {
  appContainer = document.getElementById('app')!;
  
  // จัดการเมื่อ User กดปุ่ม Back/Forward ของเบราว์เซอร์
  window.addEventListener('popstate', handleRouting);
  
  // จัดการการคลิกลิงก์ทั้งหมดในหน้า
  document.body.addEventListener("click", (e) => {
    const target = e.target as HTMLElement;
    if (target.matches("[data-link]")) {
      e.preventDefault();
      const href = target.getAttribute("href")!;
      navigate(href);
    }
  });

  // เรียกใช้งานครั้งแรกเมื่อหน้าเว็บโหลด
  handleRouting();
}