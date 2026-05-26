interface LowStockBadgeProps {
  stock?: number;
}

const LOW_STOCK_THRESHOLD = 10;

export default function LowStockBadge({ stock }: LowStockBadgeProps) {
  if (stock === undefined || stock >= LOW_STOCK_THRESHOLD) {
    return null;
  }

  const tooltipText = `Only ${stock} left in stock`;

  return (
    <span
      className="absolute top-2 right-2 bg-red-600 text-white text-xs font-semibold px-2 py-1 rounded"
      title={tooltipText}
    >
      Low stock
    </span>
  );
}
