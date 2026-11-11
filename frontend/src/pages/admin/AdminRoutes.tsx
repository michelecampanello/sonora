import { Route, Routes } from "react-router";
import { AdminLayout } from "@/pages/admin/AdminLayout";
import { AdminDashboardPage } from "@/pages/admin/AdminDashboardPage";
import { AdminOrderDetailPage } from "@/pages/admin/AdminOrderDetailPage";
import { AdminOrdersPage } from "@/pages/admin/AdminOrdersPage";
import { AdminProductsPage } from "@/pages/admin/AdminProductsPage";
import { NotFoundPage } from "@/pages/NotFoundPage";

/**
 * Tutte le pagine del pannello. App.tsx carica questo file con React.lazy:
 * Vite lo mette in un file JavaScript separato, scaricato solo da chi apre /admin.
 */
export default function AdminRoutes() {
  return (
    <Routes>
      <Route element={<AdminLayout />}>
        <Route index element={<AdminDashboardPage />} />
        <Route path="ordini" element={<AdminOrdersPage />} />
        <Route path="ordini/:id" element={<AdminOrderDetailPage />} />
        <Route path="prodotti" element={<AdminProductsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
