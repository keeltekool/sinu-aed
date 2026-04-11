import type { ChainPrice } from "../lib/types";

export default function ChainPriceRow({
  chain,
  isCheapest,
}: {
  chain: ChainPrice;
  isCheapest: boolean;
}) {
  return (
    <a
      href={chain.productUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center justify-between py-2.5 px-3 rounded-lg transition-colors ${
        isCheapest
          ? "bg-surface-container-low"
          : "hover:bg-surface-container-low/50"
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: chain.chainColor }}
        />
        <span
          className={`text-sm ${isCheapest ? "font-semibold" : "font-medium"}`}
        >
          {chain.chainName}
        </span>
      </div>

      <div className="flex items-center gap-2">
        {chain.salePrice !== null && (
          <span className="text-xs text-outline line-through">
            €{chain.regularPrice.toFixed(2)}
          </span>
        )}
        <span
          className={`text-base ${
            isCheapest
              ? "font-bold text-primary"
              : "font-semibold text-on-surface"
          }`}
        >
          €{chain.effectivePrice.toFixed(2)}
        </span>
        {chain.discountPercent !== null && (
          <span className="text-[10px] font-bold bg-error text-on-error px-1.5 py-0.5 rounded">
            -{chain.discountPercent}%
          </span>
        )}
      </div>
    </a>
  );
}
