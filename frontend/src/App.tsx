import { type ComponentType, lazy } from "react";
import { Navigate, Route, Routes } from "react-router";
import { Layout } from "@/components/layout/Layout";
import { AccountLayout } from "@/pages/account/AccountLayout";
import { LandingPage } from "@/pages/LandingPage";

/**
 * Ogni pagina è in un file JavaScript a parte, scaricato solo quando serve: la home parte con il minimo indispensabile.
 * La home resta nel file principale, perché è la prima pagina che vede quasi chiunque.
 */
function page<K extends string>(load: () => Promise<Record<K, ComponentType>>, name: K) {
  return lazy(async () => ({ default: (await load())[name] }));
}

const AddressesPage = page(() => import("@/pages/account/AddressesPage"), "AddressesPage");
const OrderDetailPage = page(() => import("@/pages/account/OrderDetailPage"), "OrderDetailPage");
const OrdersPage = page(() => import("@/pages/account/OrdersPage"), "OrdersPage");
const PaymentMethodsPage = page(() => import("@/pages/account/PaymentMethodsPage"), "PaymentMethodsPage");
const SettingsPage = page(() => import("@/pages/account/SettingsPage"), "SettingsPage");
const AboutPage = page(() => import("@/pages/AboutPage"), "AboutPage");
const CartPage = page(() => import("@/pages/CartPage"), "CartPage");
const CatalogPage = page(() => import("@/pages/CatalogPage"), "CatalogPage");
const CategoriesPage = page(() => import("@/pages/CategoriesPage"), "CategoriesPage");
const CheckoutPage = page(() => import("@/pages/CheckoutPage"), "CheckoutPage");
const LoginPage = page(() => import("@/pages/LoginPage"), "LoginPage");
const RegisterPage = page(() => import("@/pages/RegisterPage"), "RegisterPage");
const ForgotPasswordPage = page(() => import("@/pages/ForgotPasswordPage"), "ForgotPasswordPage");
const ResetPasswordPage = page(() => import("@/pages/ResetPasswordPage"), "ResetPasswordPage");
const NotFoundPage = page(() => import("@/pages/NotFoundPage"), "NotFoundPage");
const OrderConfirmedPage = page(() => import("@/pages/OrderConfirmedPage"), "OrderConfirmedPage");
const ProductPage = page(() => import("@/pages/ProductPage"), "ProductPage");
const SubcategoriesPage = page(() => import("@/pages/SubcategoriesPage"), "SubcategoriesPage");

// Il pannello admin è in un file a parte anche lui: chi compra non lo scarica mai
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
        <Route path="admin/*" element={<AdminRoutes />} />
        <Route path="carrello" element={<CartPage />} />
        <Route path="checkout" element={<CheckoutPage />} />
        <Route path="ordine-confermato" element={<OrderConfirmedPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
