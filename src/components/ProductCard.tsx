import type { ProductGroup } from "../lib/types";
import ChainPriceRow from "./ChainPriceRow";

function proxyImg(url: string | null): string | null {
  if (!url) return null;
  return `/api/img?url=${encodeURIComponent(url)}`;
}

export default function ProductCard({ group }: { group: ProductGroup }) {
  return (
    <div className="bg-surface-container-lowest rounded-lg p-4 space-y-3">
      <div className="flex items-start gap-3">
        {group.imageUrl && (
          <img
            src={proxyImg(group.imageUrl)!}
            alt={group.displayName}
            className="w-16 h-16 object-contain rounded-md bg-surface-container-low flex-shrink-0"
          />
        )}
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-wider text-on-surface-variant">
            {group.brand}
          </p>
          <h4 className="font-semibold text-on-surface leading-tight">
            {group.displayName}
          </h4>
          {group.size && (
            <span className="text-xs text-outline">{group.size}</span>
          )}
        </div>
      </div>

      <div className="space-y-1">
        {group.chains.map((chain, i) => (
          <ChainPriceRow
            key={chain.chain}
            chain={chain}
            isCheapest={i === 0}
          />
        ))}
      </div>

      {group.priceSpread > 0 && (
        <div className="flex items-center gap-2 pt-1">
          <span className="material-symbols-outlined text-primary text-sm">
            savings
          </span>
          <span className="text-xs font-medium text-primary">
            Säästad kuni €{group.priceSpread.toFixed(2)}
            {group.savingsPercent > 0 && ` (${group.savingsPercent}%)`}
          </span>
        </div>
      )}
    </div>
  );
}
