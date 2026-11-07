import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { HotelItem, HotelMenuItem, HotelRecipe } from './types';
import { getHotelRecipes, saveHotelMenuItem, saveHotelRecipe } from './api';
import { money } from './utils';
import { Empty, Field, HotelForm, Modal, Status, useCommandId } from './HotelUI';
import HotelExcelImport from './HotelExcelImport';

export default function HotelMenu({
  items,
  ingredients,
  branchId,
  canManage,
  currency,
  saved,
}: {
  items: HotelMenuItem[];
  ingredients: HotelItem[];
  branchId: string;
  canManage: boolean;
  currency: string;
  saved: () => Promise<void>;
}) {
  const client = useQueryClient();
  const [editor, setEditor] = useState<HotelMenuItem | 'new'>(),
    [recipeEditor, setRecipeEditor] = useState<HotelMenuItem>(),
    [search, setSearch] = useState('');
  const recipesQuery = useQuery({
    queryKey: ['hotel-recipes', branchId],
    queryFn: () => getHotelRecipes(branchId),
    enabled: canManage,
  });
  const recipes = recipesQuery.data ?? [];
  const currentRecipes = useMemo(
    () =>
      new Map(
        recipes.filter((recipe) => recipe.current).map((recipe) => [recipe.menuItemId, recipe]),
      ),
    [recipes],
  );
  const versionsByMenuItem = useMemo(() => {
    const versions = new Map<string, HotelRecipe[]>();
    for (const recipe of recipes) {
      const current = versions.get(recipe.menuItemId) ?? [];
      current.push(recipe);
      versions.set(recipe.menuItemId, current);
    }
    return versions;
  }, [recipes]);
  const refresh = async () => {
    await saved();
    await client.invalidateQueries({ queryKey: ['hotel-recipes', branchId] });
  };
  const shown = items.filter((i) =>
    `${i.name} ${i.category}`.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <section className="hotel-panel">
      <div className="hotel-toolbar">
        <h2>Prepared food menu</h2>
        <input
          type="search"
          aria-label="Search food menu"
          placeholder="Search dishes…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {canManage && (
          <>
            <HotelExcelImport
              kind="menu"
              branchId={branchId}
              existingNames={items.map((item) => item.name)}
              saved={saved}
            />
            <button type="button" className="hotel-primary" onClick={() => setEditor('new')}>
              + Add dish
            </button>
          </>
        )}
      </div>
      <p className="hotel-hint">
        Set the dishes you prepare, their prices and availability. Prepared food can be sold without
        receiving stock. Use Inventory for stocked products, ingredients and supplies. Recipes show
        estimated ingredient contribution; kitchen consumption and operating profit are not recorded
        yet.
      </p>
      {!shown.length ? (
        <Empty>
          No dishes yet. Add meals such as rice, breakfast, stew or tea, ready for waiters to sell.
        </Empty>
      ) : (
        <div className="hotel-table-wrap">
          {recipesQuery.isError ? (
            <p className="hotel-error" role="alert">
              Recipe costing could not be loaded: {recipesQuery.error.message}
            </p>
          ) : null}
          {recipesQuery.isPending && canManage ? (
            <p className="hotel-hint" role="status">
              Loading recipe costs…
            </p>
          ) : null}
          <table>
            <thead>
              <tr>
                <th>Dish</th>
                <th>Category</th>
                <th className="hotel-numeric">Price</th>
                <th className="hotel-numeric">Estimated ingredient cost / serving</th>
                <th className="hotel-numeric">Contribution before other costs</th>
                <th>Availability</th>
                {canManage && <th>Action</th>}
              </tr>
            </thead>
            <tbody>
              {shown.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.name}</strong>
                    <small>{item.description}</small>
                    {currentRecipes.get(item.id) ? (
                      <small>
                        Recipe v{currentRecipes.get(item.id)?.version} ·{' '}
                        {currentRecipes.get(item.id)?.servingLabel}
                      </small>
                    ) : null}
                  </td>
                  <td>{item.category}</td>
                  <td className="hotel-numeric">{money(item.price, currency)}</td>
                  <td className="hotel-numeric">
                    {currentRecipes.get(item.id)?.estimatedCost == null
                      ? currentRecipes.has(item.id)
                        ? 'Cost unavailable'
                        : 'Not set'
                      : money(currentRecipes.get(item.id)!.estimatedCost!, currency)}
                  </td>
                  <td className="hotel-numeric">
                    {currentRecipes.get(item.id)?.contribution == null
                      ? '—'
                      : money(currentRecipes.get(item.id)!.contribution!, currency)}
                    {currentRecipes.get(item.id)?.ingredientCostPercent != null ? (
                      <small>
                        {currentRecipes.get(item.id)?.ingredientCostPercent}% ingredient cost
                      </small>
                    ) : null}
                  </td>
                  <td>
                    <Status value={item.available ? 'AVAILABLE' : 'UNAVAILABLE'} />
                  </td>
                  {canManage && (
                    <td>
                      <div className="hotel-actions">
                        <button
                          type="button"
                          disabled={recipesQuery.isPending || recipesQuery.isError}
                          onClick={() => setRecipeEditor(item)}
                        >
                          {currentRecipes.has(item.id) ? 'New recipe version' : 'Add recipe'}
                        </button>
                        <button type="button" onClick={() => setEditor(item)}>
                          Edit dish
                        </button>
                        {(versionsByMenuItem.get(item.id)?.length ?? 0) > 1 ? (
                          <details>
                            <summary>Recipe history</summary>
                            <ul>
                              {versionsByMenuItem.get(item.id)?.map((version) => (
                                <li key={version.id}>
                                  v{version.version}
                                  {version.current ? ' (current)' : ''}
                                </li>
                              ))}
                            </ul>
                          </details>
                        ) : null}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {editor && (
        <MenuEditor
          key={editor === 'new' ? 'new' : editor.id}
          item={editor === 'new' ? undefined : editor}
          branchId={branchId}
          saved={refresh}
          close={() => setEditor(undefined)}
        />
      )}
      {recipeEditor ? (
        <RecipeEditor
          key={recipeEditor.id}
          item={recipeEditor}
          ingredients={ingredients}
          current={currentRecipes.get(recipeEditor.id)}
          branchId={branchId}
          currency={currency}
          saved={refresh}
          close={() => setRecipeEditor(undefined)}
        />
      ) : null}
    </section>
  );
}
function MenuEditor({
  item,
  branchId,
  saved,
  close,
}: {
  item?: HotelMenuItem;
  branchId: string;
  saved: () => Promise<void>;
  close: () => void;
}) {
  const [form, setForm] = useState({
    name: item?.name ?? '',
    category: item?.category ?? 'Main meals',
    description: item?.description ?? '',
    price: item?.price ?? 0,
    available: item?.available ?? true,
  });
  return (
    <Modal title={item ? 'Edit dish' : 'Add prepared dish'} onClose={close}>
      <HotelForm
        label={item ? 'Save dish' : 'Add dish'}
        save={async () => {
          await saveHotelMenuItem({ ...form, branchId }, item?.id);
          await saved();
        }}
        afterSave={close}
      >
        <Field label="Dish name">
          <input
            required
            maxLength={160}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </Field>
        <div className="hotel-form-grid">
          <Field label="Menu category">
            <input
              required
              maxLength={80}
              placeholder="Breakfast, Main meals, Drinks…"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            />
          </Field>
          <Field label="Selling price">
            <input
              required
              type="number"
              min="0.01"
              max="999999999999.99"
              step="0.01"
              value={form.price || ''}
              onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
            />
          </Field>
        </div>
        <Field label="Description (optional)">
          <textarea
            maxLength={500}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </Field>
        <label className="hotel-check">
          <input
            type="checkbox"
            checked={form.available}
            onChange={(e) => setForm({ ...form, available: e.target.checked })}
          />
          Available to order
        </label>
      </HotelForm>
    </Modal>
  );
}

type RecipeLineDraft = {
  itemId: string;
  quantity: string;
  unit: string;
  optional: boolean;
};

function RecipeEditor({
  item,
  ingredients,
  current,
  branchId,
  currency,
  saved,
  close,
}: {
  item: HotelMenuItem;
  ingredients: HotelItem[];
  current?: HotelRecipe;
  branchId: string;
  currency: string;
  saved: () => Promise<void>;
  close: () => void;
}) {
  const requestId = useCommandId();
  const [servingLabel, setServingLabel] = useState(current?.servingLabel ?? '1 serving');
  const [lines, setLines] = useState<RecipeLineDraft[]>(
    current?.ingredients.map((line) => ({
      itemId: line.itemId,
      quantity: String(line.quantity),
      unit: line.unit,
      optional: line.optional,
    })) ?? [{ itemId: '', quantity: '', unit: '', optional: false }],
  );
  const ingredientById = new Map(ingredients.map((ingredient) => [ingredient.id, ingredient]));
  const updateLine = (index: number, patch: Partial<RecipeLineDraft>) =>
    setLines((currentLines) =>
      currentLines.map((line, lineIndex) => (lineIndex === index ? { ...line, ...patch } : line)),
    );
  return (
    <Modal title={`Recipe · ${item.name}`} onClose={close} wide>
      {current ? (
        <p className="hotel-hint">
          Saving creates an immutable recipe version. Ingredient costs on this screen use current
          inventory valuation; historical food-sale costs are not yet captured in this phase.
        </p>
      ) : null}
      <HotelForm
        label={current ? 'Save new recipe version' : 'Save recipe'}
        save={async () => {
          const body = {
            servingLabel,
            ingredients: lines.map((line) => ({
              itemId: line.itemId,
              quantity: Number(line.quantity),
              unit: line.unit,
              optional: line.optional,
            })),
          };
          await saveHotelRecipe(item.id, { ...body, requestId: requestId(body) });
          await saved();
        }}
        afterSave={close}
      >
        <Field label="Serving size / label">
          <input
            required
            maxLength={80}
            value={servingLabel}
            onChange={(event) => setServingLabel(event.target.value)}
          />
        </Field>
        <div className="hotel-recipe-lines">
          {lines.map((line, index) => {
            const selected = ingredientById.get(line.itemId);
            return (
              <div className="hotel-form-grid" key={`${index}-${line.itemId}`}>
                <Field label="Ingredient">
                  <select
                    required
                    value={line.itemId}
                    onChange={(event) => {
                      const next = ingredientById.get(event.target.value);
                      updateLine(index, {
                        itemId: event.target.value,
                        unit: next?.unit ?? '',
                      });
                    }}
                  >
                    <option value="">Choose ingredient</option>
                    {ingredients.map((ingredient) => (
                      <option key={ingredient.id} value={ingredient.id}>
                        {ingredient.name} · {ingredient.stock} {ingredient.unit}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Quantity per serving">
                  <input
                    required
                    type="number"
                    min="0.001"
                    max="99999999999.999"
                    step="0.001"
                    value={line.quantity}
                    onChange={(event) => updateLine(index, { quantity: event.target.value })}
                  />
                </Field>
                <Field label="Recipe unit">
                  <input
                    required
                    list={`recipe-unit-options-${item.id}-${index}`}
                    maxLength={30}
                    value={line.unit}
                    onChange={(event) => updateLine(index, { unit: event.target.value })}
                  />
                  <datalist id={`recipe-unit-options-${item.id}-${index}`}>
                    {unitOptions(selected?.unit ?? '').map((unit) => (
                      <option key={unit} value={unit} />
                    ))}
                  </datalist>
                </Field>
                <label className="hotel-check">
                  <input
                    type="checkbox"
                    checked={line.optional}
                    onChange={(event) => updateLine(index, { optional: event.target.checked })}
                  />
                  Optional
                </label>
                <span className="hotel-hint">
                  {selected
                    ? selected.unitCost == null
                      ? `Purchase cost not recorded per ${selected.unit}`
                      : `${selected.unitCostEstimated ? 'Estimated from ' : ''}${money(selected.unitCost, currency)} per ${selected.unit}`
                    : 'Choose an ingredient to view its current purchase cost'}
                </span>
                {lines.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => setLines(lines.filter((_, lineIndex) => lineIndex !== index))}
                  >
                    Remove ingredient
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() =>
            setLines([...lines, { itemId: '', quantity: '', unit: '', optional: false }])
          }
        >
          + Add ingredient
        </button>
        {!ingredients.length ? (
          <p className="hotel-hint">
            Add and value kitchen ingredients in Hotel Inventory before creating recipes.
          </p>
        ) : null}
        {current?.estimatedCost != null ? (
          <p className="hotel-estimate">
            Current estimated ingredient cost per serving:{' '}
            <strong>{money(current.estimatedCost, currency)}</strong>
          </p>
        ) : null}
      </HotelForm>
    </Modal>
  );
}

function unitOptions(stockUnit: string) {
  const unit = stockUnit.trim().toLowerCase();
  if (['g', 'gram', 'grams', 'kg', 'kilogram', 'kilograms'].includes(unit))
    return [...new Set([stockUnit, 'g', 'kg'])];
  if (
    [
      'ml',
      'milliliter',
      'milliliters',
      'millilitre',
      'millilitres',
      'l',
      'liter',
      'liters',
      'litre',
      'litres',
    ].includes(unit)
  )
    return [...new Set([stockUnit, 'ml', 'l'])];
  return stockUnit ? [stockUnit] : [];
}
