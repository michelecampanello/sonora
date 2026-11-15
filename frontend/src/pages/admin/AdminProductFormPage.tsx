import { Link, useParams } from "react-router"
import {
  AccountSection,
  ListSkeleton,
  LoadError,
} from "@/components/account/AccountParts"
import { ProductForm } from "@/components/admin/ProductForm"
import { useFetch } from "@/hooks/useFetch"
import { adminProductPath, brandsPath, categoriesPath } from "@/lib/api"
import type { AdminProductDetail, Brand, Category } from "@/lib/types"

export function AdminProductFormPage() {
  const { id } = useParams()
  const product = useFetch<AdminProductDetail>(id ? adminProductPath(id) : null)
  const categories = useFetch<Category[]>(categoriesPath)
  const brands = useFetch<Brand[]>(brandsPath)

  const error = product.error ?? categories.error ?? brands.error
  const ready = categories.data && brands.data && (!id || product.data)

  const backLink = (
    <Link
      to="/admin/prodotti"
      className="text-silk underline underline-offset-4 hover:text-primary"
    >
      Tutti i prodotti
    </Link>
  )

  return (
    <AccountSection
      title={id ? (product.data?.name ?? "Prodotto") : "Nuovo prodotto"}
      action={backLink}
    >
      {error ? (
        <LoadError message={error} />
      ) : !ready ? (
        <ListSkeleton />
      ) : (
        // key: passando da un prodotto all'altro il form riparte dai dati giusti
        <ProductForm
          key={id ?? "nuovo"}
          product={product.data}
          categories={categories.data!}
          brands={brands.data!}
        />
      )}
    </AccountSection>
  )
}
