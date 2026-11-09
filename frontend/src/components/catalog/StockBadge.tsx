import { Badge } from "@/components/ui/badge";

export function StockBadge({ stock }: { stock: number }) {
  if (stock === 0) return <Badge variant="destructive">Non disponibile</Badge>;
  if (stock <= 5) return <Badge variant="secondary">Ultimi {stock} pezzi</Badge>;
  return <Badge variant="outline">Disponibile</Badge>;
}
