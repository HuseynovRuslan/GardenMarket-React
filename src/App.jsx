import { Routes, Route, Navigate } from 'react-router-dom';
import MenuPage from './pages/MenuPage.jsx';
import AdminPage from './pages/AdminPage.jsx';

// Single-tenant app served under /gardenmarket (see BrowserRouter basename), so
// in-app paths are '/' (storefront) and '/admin' relative to that base.
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<MenuPage />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
