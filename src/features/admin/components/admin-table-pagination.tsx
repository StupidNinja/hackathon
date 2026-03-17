import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/common/components/ui/button";

type AdminTablePaginationProps = {
  page: number;
  pageCount: number;
  onPageChange: (nextPage: number) => void;
};

function buildPageItems(page: number, pageCount: number): Array<number | "dots"> {
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, index) => index + 1);
  }

  if (page <= 4) {
    return [1, 2, 3, 4, 5, "dots", pageCount];
  }

  if (page >= pageCount - 3) {
    return [1, "dots", pageCount - 4, pageCount - 3, pageCount - 2, pageCount - 1, pageCount];
  }

  return [1, "dots", page - 1, page, page + 1, "dots", pageCount];
}

export function AdminTablePagination({
  page,
  pageCount,
  onPageChange,
}: AdminTablePaginationProps) {
  if (pageCount <= 1) return null;

  const items = buildPageItems(page, pageCount);

  return (
    <div className="flex flex-wrap items-center justify-end gap-1 border-t px-4 py-3">
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        aria-label="Previous page"
      >
        <ChevronLeft className="size-4" />
      </Button>

      {items.map((item, index) =>
        item === "dots" ? (
          <span
            key={`dots-${index}`}
            className="px-2 text-sm text-muted-foreground"
            aria-hidden
          >
            ...
          </span>
        ) : (
          <Button
            key={item}
            type="button"
            variant={item === page ? "default" : "outline"}
            size="sm"
            className="h-8 min-w-8 px-2"
            onClick={() => onPageChange(item)}
          >
            {item}
          </Button>
        ),
      )}

      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= pageCount}
        aria-label="Next page"
      >
        <ChevronRight className="size-4" />
      </Button>
    </div>
  );
}
