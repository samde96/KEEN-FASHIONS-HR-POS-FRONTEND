import type { Product, ProductRequest } from '../data/types';

export function isSellableProduct(product: Product) {
  return (
    product.status === 'ACTIVE' && product.productType !== 'VARIABLE' && product.sellable !== false
  );
}

export default function VariantProductFields({
  form,
  products,
  onChange,
  parentLocked = false,
}: {
  form: ProductRequest;
  products: Product[];
  onChange: (value: ProductRequest) => void;
  parentLocked?: boolean;
}) {
  const entries = Object.entries(form.variantAttributes ?? {});
  const setAttributes = (next: [string, string][]) =>
    onChange({ ...form, variantAttributes: Object.fromEntries(next) });
  return (
    <>
      <label className="field-stack">
        <span>Product Type</span>
        <select
          disabled={parentLocked}
          value={form.productType ?? 'SIMPLE'}
          onChange={(e) =>
            onChange({
              ...form,
              productType: e.target.value as 'SIMPLE' | 'VARIABLE',
              parentProductId: undefined,
              variantAttributes: {},
            })
          }
        >
          <option value="SIMPLE">Simple Product</option>
          <option value="VARIABLE">Product with Variants</option>
        </select>
      </label>
      {form.productType !== 'VARIABLE' && (
        <label className="field-stack">
          <span>Parent Product (optional)</span>
          <select
            disabled={parentLocked}
            value={form.parentProductId ?? ''}
            onChange={(e) => {
              const parent = products.find((p) => p.id === e.target.value);
              onChange({
                ...form,
                parentProductId: parent?.id,
                categoryId: parent?.categoryId ?? form.categoryId,
              });
            }}
          >
            <option value="">Independent simple product</option>
            {products
              .filter((p) => p.productType === 'VARIABLE')
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          </select>
        </label>
      )}
      {form.productType === 'VARIABLE' ? (
        <p className="wide-field">
          Save the parent, then choose Add Variant to set each option's price, barcode and stock
          threshold.
        </p>
      ) : (
        <label className="field-stack">
          <span>Low-stock threshold</span>
          <input
            type="number"
            min="0"
            step="1"
            value={form.reorderLevel ?? 0}
            onChange={(e) => onChange({ ...form, reorderLevel: Number(e.target.value) })}
          />
        </label>
      )}
      {form.parentProductId && (
        <fieldset className="wide-field variant-attributes">
          <legend>Variant attributes</legend>
          <p>For example: Packaging = Can, Volume = 300 ml, Type = Zero Sugar.</p>
          {entries.map(([key, value], index) => (
            <div className="variant-attribute-row" key={index}>
              <input
                aria-label={`Attribute ${index + 1} name`}
                placeholder="Attribute, e.g. Volume"
                required
                maxLength={40}
                value={key}
                onChange={(e) =>
                  setAttributes(
                    entries.map((entry, n) => (n === index ? [e.target.value, entry[1]] : entry)),
                  )
                }
              />
              <input
                aria-label={`Attribute ${index + 1} value`}
                placeholder="Value, e.g. 500 ml"
                required
                maxLength={80}
                value={value}
                onChange={(e) =>
                  setAttributes(
                    entries.map((entry, n) => (n === index ? [entry[0], e.target.value] : entry)),
                  )
                }
              />
              <button
                className="text-button danger-text"
                type="button"
                onClick={() => setAttributes(entries.filter((_, n) => n !== index))}
              >
                Remove
              </button>
            </div>
          ))}
          <button
            className="secondary-action compact-action"
            type="button"
            disabled={entries.length >= 12}
            onClick={() => {
              let index = entries.length + 1;
              while (entries.some(([key]) => key === `Option ${index}`)) index++;
              setAttributes([...entries, [`Option ${index}`, '']]);
            }}
          >
            Add attribute
          </button>
        </fieldset>
      )}
    </>
  );
}
