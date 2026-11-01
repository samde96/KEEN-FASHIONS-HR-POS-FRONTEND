import { useMemo, useState } from 'react';
import type { Product } from '../data/types';
import { formatMoney } from '../services/receiptFormatting';
import '../styles/stock-receipt-products.css';

export type StockReceiptProduct = {
  productId: string;
  quantity: string;
  unitCost: string;
};

export default function StockReceiptProducts({
  products,
  value,
  currencyCode,
  disabled,
  onChange,
}: {
  products: Product[];
  value: StockReceiptProduct[];
  currencyCode: string;
  disabled: boolean;
  onChange: (lines: StockReceiptProduct[]) => void;
}) {
  const [query, setQuery] = useState('');
  const matchingProducts = useMemo(() => {
    const search = query.trim().toLowerCase();
    return products.filter((product) =>
      [
        product.name,
        product.sku,
        product.barcode ?? '',
        product.categoryName,
        product.department ?? '',
        product.description ?? '',
        ...product.sizes,
        ...product.colors,
      ]
        .join(' ')
        .toLowerCase()
        .includes(search),
    );
  }, [products, query]);
  const selectedIds = new Set(value.map((line) => line.productId));
  const productById = new Map(products.map((product) => [product.id, product]));

  function addProducts(nextProducts: Product[]) {
    onChange([
      ...value,
      ...nextProducts
        .filter((product) => !selectedIds.has(product.id))
        .map((product) => ({
          productId: product.id,
          quantity: '',
          unitCost: product.costPrice == null ? '' : String(product.costPrice),
        })),
    ]);
  }

  function removeProduct(productId: string) {
    onChange(value.filter((line) => line.productId !== productId));
  }

  function updateProduct(productId: string, changes: Partial<StockReceiptProduct>) {
    onChange(value.map((line) => (line.productId === productId ? { ...line, ...changes } : line)));
  }

  return (
    <div className="stock-receipt-products wide-field">
      <label className="field-stack">
        <span>Products</span>
        <input
          aria-label="Search products"
          disabled={disabled || products.length === 0}
          placeholder="Search name, SKU, barcode, category, size or color"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.preventDefault();
          }}
        />
      </label>
      <div className="stock-receipt-product-actions">
        <span aria-live="polite">{value.length} selected</span>
        <button
          className="text-button"
          disabled={disabled || matchingProducts.every((product) => selectedIds.has(product.id))}
          type="button"
          onClick={() => addProducts(matchingProducts)}
        >
          Select all results
        </button>
        <button
          className="text-button"
          disabled={disabled || value.length === 0}
          type="button"
          onClick={() => onChange([])}
        >
          Clear selection
        </button>
      </div>
      <div className="stock-receipt-product-results" role="group" aria-label="Available products">
        {matchingProducts.length === 0 ? (
          <p>{products.length === 0 ? 'No active products available' : 'No matching products'}</p>
        ) : (
          matchingProducts.map((product) => (
            <label className="stock-receipt-product-option" key={product.id}>
              <input
                aria-label={`Select ${product.name} (${product.sku})`}
                checked={selectedIds.has(product.id)}
                disabled={disabled}
                type="checkbox"
                onChange={(event) =>
                  event.target.checked ? addProducts([product]) : removeProduct(product.id)
                }
              />
              <span>
                <strong>{product.name}</strong>
                <small>{[product.sku, ...product.sizes, ...product.colors].join(' · ')}</small>
              </span>
            </label>
          ))
        )}
      </div>
      {value.length > 0 ? (
        <div
          className="stock-receipt-selected-products"
          role="group"
          aria-label="Selected products"
        >
          {value.map((line) => {
            const product = productById.get(line.productId);
            const name = product ? `${product.name} (${product.sku})` : 'Unavailable product';
            return (
              <div className="stock-receipt-product-row" key={line.productId}>
                <div className="stock-receipt-product-heading">
                  <strong>{name}</strong>
                  <button
                    aria-label={`Remove ${name}`}
                    className="text-button danger-text"
                    disabled={disabled}
                    type="button"
                    onClick={() => removeProduct(line.productId)}
                  >
                    Remove
                  </button>
                </div>
                <label className="field-stack">
                  <span>Quantity</span>
                  <input
                    aria-label={value.length === 1 ? 'Quantity' : `Quantity for ${name}`}
                    disabled={disabled}
                    min="1"
                    required
                    step="1"
                    type="number"
                    value={line.quantity}
                    onChange={(event) =>
                      updateProduct(line.productId, { quantity: event.target.value })
                    }
                  />
                </label>
                <label className="field-stack">
                  <span>Unit Cost</span>
                  <input
                    aria-label={value.length === 1 ? 'Unit Cost' : `Unit Cost for ${name}`}
                    disabled={disabled}
                    min="0"
                    required
                    step="0.01"
                    type="number"
                    value={line.unitCost}
                    onChange={(event) =>
                      updateProduct(line.productId, { unitCost: event.target.value })
                    }
                  />
                </label>
                <div className="stock-receipt-product-total">
                  <span>Line Total</span>
                  <strong>
                    {formatMoney(Number(line.quantity) * Number(line.unitCost), currencyCode)}
                  </strong>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="stock-receipt-product-hint">
          Select products, then enter each quantity and unit cost.
        </p>
      )}
    </div>
  );
}
