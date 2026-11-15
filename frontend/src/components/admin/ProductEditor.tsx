import { ListSkeleton, LoadError } from "@/components/account/AccountParts"
import { ProductForm } from "@/components/admin/ProductForm"
import { useFetch } from "@/hooks/useFetch"
import { adminProductPath, brandsPath, categoriesPath } from "@/lib/api"
import type { AdminProductDetail, Brand, Category } from "@/lib/types"

interface ProductEditorProps {
  productId: string
  onSaved: (product: AdminProductDetail) => void
  onCancel: () => void
}

/**
 * Il form di modifica dentro la pagina del prodotto nel negozio, per gli admin.
 * Carica da sé i dati completi (categoria, marca, foto con il loro public_id) che la pagina pubblica non ha.
 * È un export default perché la pagina lo carica con React.lazy: chi compra non scarica il codice del form.
 */
export default function ProductEditor({
  productId,
  onSaved,
  onCancel,
}: ProductEditorProps) {
  const product = useFetch<AdminProductDetail>(adminProductPath(productId))
  const categories = useFetch<Category[]>(categoriesPath)
  const brands = useFetch<Brand[]>(brandsPath)

  const error = product.error ?? categories.error ?? brands.error
  if (error) return <LoadError message={error} />
  if (!product.data || !categories.data || !brands.data) return <ListSkeleton />

  return (
    <ProductForm
      product={product.data}
      categories={categories.data}
      brands={brands.data}
      onSaved={onSaved}
      onCancel={onCancel}
    />
  )
}
