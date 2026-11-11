import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router";
import { Skeleton } from "@/components/ui/skeleton";
import { Layout } from "@/components/layout/Layout";
import { AccountLayout } from "@/pages/account/AccountLayout";
import { AddressesPage } from "@/pages/account/AddressesPage";
import { OrderDetailPage } from "@/pages/account/OrderDetailPage";
import { OrdersPage } from "@/pages/account/OrdersPage";
import { PaymentMethodsPage } from "@/pages/account/PaymentMethodsPage";
import { SettingsPage } from "@/pages/account/SettingsPage";
import { AboutPage } from "@/pages/AboutPage";
import { CartPage } from "@/pages/CartPage";
import { CatalogPage } from "@/pages/CatalogPage";
import { CategoriesPage } from "@/pages/CategoriesPage";
import { CheckoutPage } from "@/pages/CheckoutPage";
import { LandingPage } from "@/pages/LandingPage";
import { LoginPage } from "@/pages/LoginPage";
import { RegisterPage } from "@/pages/RegisterPage";
import { ForgotPasswordPage } from "@/pages/ForgotPasswordPage";
import { ResetPasswordPage } from "@/pages/ResetPasswordPage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { OrderConfirmedPage } from "@/pages/OrderConfirmedPage";
import { ProductPage } from "@/pages/ProductPage";
import { SubcategoriesPage } from "@/pages/SubcategoriesPage";

// Il pannello admin è in un file JavaScript a parte: chi compra non lo scarica mai
const AdminRoutes = lazy(() => import("@/pages/admin/AdminRoutes"));

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<LandingPage />} />
        <Route path="catalogo" element={<CatalogPage />} />
        <Route path="categorie" element={<CategoriesPage />} />
        <Route path="categorie/:slug" element={<SubcategoriesPage />} />
        <Route path="prodotti/:slug" element={<ProductPage />} />
        <Route path="chi-siamo" element={<AboutPage />} />
        <Route path="accedi" element={<LoginPage />} />
        <Route path="registrati" element={<RegisterPage />} />
        <Route path="password-dimenticata" element={<ForgotPasswordPage />} />
        <Route path="reimposta-password" element={<ResetPasswordPage />} />
        <Route path="account" element={<AccountLayout />}>
          <Route index element={<Navigate to="ordini" replace />} />
          <Route path="ordini" element={<OrdersPage />} />
          <Route path="ordini/:id" element={<OrderDetailPage />} />
          <Route path="indirizzi" element={<AddressesPage />} />
          <Route path="pagamenti" element={<PaymentMethodsPage />} />
          <Route path="impostazioni" element={<SettingsPage />} />
        </Route>
        <Route
          path="admin/*"
          element={
            <Suspense fallback={<Skeleton className="h-96 w-full" />}>
              <AdminRoutes />
            </Suspense>
          }
        />
        <Route path="carrello" element={<CartPage />} />
        <Route path="checkout" element={<CheckoutPage />} />
        <Route path="ordine-confermato" element={<OrderConfirmedPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
