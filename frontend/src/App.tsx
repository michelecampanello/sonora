import { Route, Routes } from "react-router";
import { Layout } from "@/components/layout/Layout";
import { CartPage } from "@/pages/CartPage";
import { CatalogPage } from "@/pages/CatalogPage";
import { CategoriesPage } from "@/pages/CategoriesPage";
import { CheckoutPage } from "@/pages/CheckoutPage";
import { LandingPage } from "@/pages/LandingPage";
import { LoginPage } from "@/pages/LoginPage";
import { RegisterPage } from "@/pages/RegisterPage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { OrderConfirmedPage } from "@/pages/OrderConfirmedPage";
import { ProductPage } from "@/pages/ProductPage";
import { SubcategoriesPage } from "@/pages/SubcategoriesPage";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<LandingPage />} />
        <Route path="catalogo" element={<CatalogPage />} />
        <Route path="categorie" element={<CategoriesPage />} />
        <Route path="categorie/:slug" element={<SubcategoriesPage />} />
        <Route path="prodotti/:slug" element={<ProductPage />} />
        <Route path="accedi" element={<LoginPage />} />
        <Route path="registrati" element={<RegisterPage />} />
        <Route path="carrello" element={<CartPage />} />
        <Route path="checkout" element={<CheckoutPage />} />
        <Route path="ordine-confermato" element={<OrderConfirmedPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
