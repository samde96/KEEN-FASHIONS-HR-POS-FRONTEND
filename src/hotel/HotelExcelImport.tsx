import { useState } from 'react';
import * as XLSX from 'xlsx';
import { changeHotelStock, saveHotelItem, saveHotelMenuItem } from './api';
import type { HotelItem, HotelItemRequest, HotelMenuItemRequest } from './types';

type MenuRow = Omit<HotelMenuItemRequest, 'branchId'> & { rowNumber: number };
type InventoryRow = Omit<HotelItemRequest, 'branchId'> & {
  openingStock: number;
  openingUnitCost: number;
  rowNumber: number;
};
type WorksheetRow = Record<string, unknown>;

const menuHeaders = ['Dish Name', 'Category', 'Description', 'Selling Price', 'Available'];
const inventoryHeaders = [
  'Item Name',
  'Category',
  'Stock Unit',
  'Selling Price',
  'Purchase Cost per Stock Unit',
  'Opening Stock',
  'Low Stock Level',
  'Sellable',
  'Active',
];

export default function HotelExcelImport({
  kind,
  branchId,
  existingNames,
  saved,
}: {
  kind: 'menu' | 'inventory';
  branchId: string;
  existingNames: string[];
  saved: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const label = kind === 'menu' ? 'food menu' : 'hotel inventory';

  function downloadTemplate() {
    const headers = kind === 'menu' ? menuHeaders : inventoryHeaders;
    const worksheet = XLSX.utils.aoa_to_sheet([headers]);
    worksheet['!cols'] = headers.map((header) => ({ wch: Math.max(16, header.length + 2) }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, kind === 'menu' ? 'Food menu' : 'Inventory');
    const bytes = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const url = URL.createObjectURL(
      new Blob([bytes], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = `hotel-${kind}-template.xlsx`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  async function upload(file: File) {
    setBusy(true);
    setError('');
    setMessage('');
    let completed = 0;
    let createdWithoutStock: string | undefined;
    try {
      const worksheetRows = await readWorksheet(file);
      const rows =
        kind === 'menu'
          ? parseMenuRows(worksheetRows, existingNames)
          : parseInventoryRows(worksheetRows, existingNames);
      if (!rows.length) throw new Error('The worksheet has no data rows.');

      for (const row of rows) {
        try {
          if (kind === 'menu') {
            const { rowNumber: _rowNumber, ...menu } = row as MenuRow;
            await saveHotelMenuItem({ ...menu, branchId });
          } else {
            const {
              rowNumber: _rowNumber,
              openingStock,
              openingUnitCost,
              ...itemRequest
            } = row as InventoryRow;
            const item = await saveHotelItem({ ...itemRequest, branchId });
            if (openingStock > 0) {
              createdWithoutStock = item.name;
              await changeHotelStock(item.id, {
                requestId: crypto.randomUUID(),
                quantity: openingStock,
                kind: 'RECEIPT',
                note: 'Opening stock imported from Excel',
                ...(item.category === 'INGREDIENT' ? { unitCost: openingUnitCost } : {}),
              });
              createdWithoutStock = undefined;
            }
          }
          completed += 1;
        } catch (caught) {
          await saved();
          const rowName = row.name;
          const detail = errorMessage(caught);
          if (createdWithoutStock) {
            throw new Error(
              `Imported ${completed} of ${rows.length} rows. "${createdWithoutStock}" was created, but its opening stock could not be recorded: ${detail}`,
            );
          }
          throw new Error(
            `Imported ${completed} of ${rows.length} rows. Row ${row.rowNumber} ("${rowName}") failed: ${detail}`,
          );
        }
      }

      await saved();
      setMessage(
        `Imported ${completed} ${kind === 'menu' ? 'dish' : 'inventory item'}${completed === 1 ? '' : 's'}.`,
      );
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="hotel-import">
      <button type="button" disabled={busy} onClick={downloadTemplate}>
        Download Excel template
      </button>
      <label className="hotel-import-upload">
        {busy ? 'Importing…' : 'Upload Excel'}
        <input
          type="file"
          accept=".xlsx,.xls,.csv"
          aria-label={`Upload ${label} Excel`}
          disabled={busy}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void upload(file);
            event.target.value = '';
          }}
        />
      </label>
      {message && <span role="status">{message}</span>}
      {error && <span role="alert">{error}</span>}
      <p className="hotel-import-hint">
        {kind === 'menu'
          ? 'Columns: Dish Name, Category, Description, Selling Price, Available.'
          : 'Columns: Item Name, Category (PRODUCT, INGREDIENT or SUPPLY), Stock Unit, Selling Price, Purchase Cost per Stock Unit, Opening Stock, Low Stock Level, Sellable and Active. Purchase cost is required for ingredient opening stock.'}
      </p>
    </div>
  );
}

async function readWorksheet(file: File): Promise<WorksheetRow[]> {
  const workbook = XLSX.read(await fileBytes(file), { type: 'array', cellDates: false });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error('The Excel file does not contain a worksheet.');
  const rows = XLSX.utils.sheet_to_json<WorksheetRow>(workbook.Sheets[sheetName], {
    defval: '',
    raw: false,
  });
  return rows.filter((row) => Object.values(row).some((value) => String(value ?? '').trim()));
}

function fileBytes(file: File): Promise<ArrayBuffer> {
  if (typeof file.arrayBuffer === 'function') return file.arrayBuffer();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error('Unable to read the Excel file.'));
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) resolve(reader.result);
      else reject(new Error('Unable to read the Excel file.'));
    };
    reader.readAsArrayBuffer(file);
  });
}

function parseMenuRows(rows: WorksheetRow[], existingNames: string[]): MenuRow[] {
  const names = new Set(existingNames.map(normalizeName));
  return rows.map((row, index) => {
    const rowNumber = index + 2;
    const name = text(row, 'Dish Name', rowNumber);
    assertNewName(name, names, rowNumber);
    const category = text(row, 'Category', rowNumber);
    const description = text(row, 'Description', rowNumber, false);
    if (category.length > 80 || description.length > 500 || name.length > 160)
      throw new Error(`Row ${rowNumber}: one or more text fields exceed the allowed length.`);
    const price = numberValue(row, 'Selling Price', rowNumber, 0.01, 999999999999.99, 2);
    return {
      rowNumber,
      name,
      category,
      description,
      price,
      available: booleanValue(row, 'Available', rowNumber, true),
    };
  });
}

function parseInventoryRows(rows: WorksheetRow[], existingNames: string[]): InventoryRow[] {
  const names = new Set(existingNames.map(normalizeName));
  return rows.map((row, index) => {
    const rowNumber = index + 2;
    const name = text(row, 'Item Name', rowNumber);
    assertNewName(name, names, rowNumber);
    const categoryValue = text(row, 'Category', rowNumber).toUpperCase();
    const categoryAliases: Record<string, HotelItem['category']> = {
      PRODUCT: 'PRODUCT',
      'STOCKED PRODUCT': 'PRODUCT',
      INGREDIENT: 'INGREDIENT',
      'KITCHEN INGREDIENT': 'INGREDIENT',
      SUPPLY: 'SUPPLY',
      'HOTEL SUPPLY': 'SUPPLY',
    };
    const category = categoryAliases[categoryValue];
    if (!category)
      throw new Error(`Row ${rowNumber}: Category must be PRODUCT, INGREDIENT or SUPPLY.`);
    const unit = text(row, 'Stock Unit', rowNumber);
    if (name.length > 160 || unit.length > 30)
      throw new Error(`Row ${rowNumber}: item name or stock unit exceeds the allowed length.`);
    const sellable = booleanValue(row, 'Sellable', rowNumber, category === 'PRODUCT');
    if (sellable && category !== 'PRODUCT')
      throw new Error(`Row ${rowNumber}: only PRODUCT items can be sellable.`);
    const price = numberValue(
      row,
      'Selling Price',
      rowNumber,
      sellable ? 0.01 : 0,
      999999999999.99,
      2,
    );
    const openingStock = numberValue(row, 'Opening Stock', rowNumber, 0, 99999999999.999, 3, 0);
    const openingUnitCost =
      category === 'INGREDIENT' && openingStock > 0
        ? numberValue(row, 'Purchase Cost per Stock Unit', rowNumber, 0.0001, 999999999999.9999, 4)
        : 0;
    return {
      rowNumber,
      name,
      category,
      unit,
      sellable,
      price,
      openingStock,
      openingUnitCost,
      reorderLevel: numberValue(row, 'Low Stock Level', rowNumber, 0, 99999999999.999, 3, 0),
      active: booleanValue(row, 'Active', rowNumber, true),
    };
  });
}

function text(row: WorksheetRow, header: string, rowNumber: number, required = true): string {
  const value = getCell(row, header);
  const result = String(value ?? '').trim();
  if (required && !result) throw new Error(`Row ${rowNumber}: ${header} is required.`);
  return result;
}

function numberValue(
  row: WorksheetRow,
  header: string,
  rowNumber: number,
  minimum: number,
  maximum: number,
  decimals: number,
  defaultValue?: number,
) {
  const raw = getCell(row, header);
  if (String(raw ?? '').trim() === '' && defaultValue !== undefined) return defaultValue;
  const value = Number(String(raw).replace(/,/g, '').trim());
  if (
    !Number.isFinite(value) ||
    value < minimum ||
    value > maximum ||
    decimalPlaces(value) > decimals
  )
    throw new Error(
      `Row ${rowNumber}: ${header} must be between ${minimum} and ${maximum} with at most ${decimals} decimal places.`,
    );
  return value;
}

function booleanValue(row: WorksheetRow, header: string, rowNumber: number, defaultValue: boolean) {
  const value = String(getCell(row, header) ?? '')
    .trim()
    .toLowerCase();
  if (!value) return defaultValue;
  if (['true', 'yes', '1', 'available', 'active'].includes(value)) return true;
  if (['false', 'no', '0', 'unavailable', 'inactive'].includes(value)) return false;
  throw new Error(`Row ${rowNumber}: ${header} must be Yes or No.`);
}

function getCell(row: WorksheetRow, header: string) {
  const key = normalizeHeader(header);
  return Object.entries(row).find(([name]) => normalizeHeader(name) === key)?.[1] ?? '';
}

function normalizeHeader(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function normalizeName(value: string) {
  return value.trim().toLowerCase();
}

function assertNewName(name: string, names: Set<string>, rowNumber: number) {
  const normalized = normalizeName(name);
  if (names.has(normalized))
    throw new Error(`Row ${rowNumber}: "${name}" already exists or appears more than once.`);
  names.add(normalized);
}

function decimalPlaces(value: number) {
  return (String(value).split('.')[1] ?? '').length;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unable to import this Excel file.';
}
