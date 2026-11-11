import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PaginationProps {
  page: number;
  pages: number;
  onChange: (page: number) => void;
}

export function Pagination({ page, pages, onChange }: PaginationProps) {
  if (pages <= 1) return null;

  return (
    <nav aria-label="Paginazione" className="flex items-center justify-center gap-4">
      <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        <ChevronLeft /> Precedente
      </Button>
      <span className="text-silk text-muted-foreground tabular-nums">
        Pagina {page} di {pages}
      </span>
      <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => onChange(page + 1)}>
        Successiva <ChevronRight />
      </Button>
    </nav>
  );
}
