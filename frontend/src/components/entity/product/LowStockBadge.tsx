interface LowStockBadgeProps {
  stock?: number;
}

export default function LowStockBadge({ stock }: LowStockBadgeProps) {
  if (stock === undefined || stock >= 10) {
    return null;
  }

  return (
    <span
      className="absolute top-2 right-2 bg-red-600 text-white text-xs font-semibold px-2 py-1 rounded"
      title={`Only ${stock} left in stock`}
    >
      Low stock
    </span>
  );
}
