import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import type { CurrentUser, Organization } from '../data/types';
import {
  getCustomers,
  getExpenses,
  getInventory,
  getProducts,
  getSales,
  getStockAdjustments,
  getStockIntakes,
} from '../services/api';
import { getSaleReversals } from '../services/posOperations';
import { appModules, appRegistry, hasAnyPermission } from './appRegistry';
import { inBranch, usePlatform } from './PlatformContext';

export function AppWorkspace({
  user,
  organization,
}: {
  user: CurrentUser;
  organization: Organization;
}) {
  const { appId } = useParams();
  const app = appRegistry.find((app) => app.id === appId)!;
  const modules = app ? appModules(app, user) : [];
  const { branchId, branches, selectedBranch, favorites, toggleFavorite } = usePlatform();
  const inventoryQuery = useQuery({
    queryKey: ['inventory'],
    queryFn: getInventory,
    enabled: appId === 'inventory' || appId === 'warehouse',
  });
  const productsQuery = useQuery({
    queryKey: ['products'],
    queryFn: getProducts,
    enabled: appId === 'products',
  });
  const canReadSales = hasAnyPermission(user, ['admin:manage', 'sales:view', 'reports:view']);
  const canReadIntakes = hasAnyPermission(user, [
    'admin:manage',
    'inventory:receive',
    'reports:view',
  ]);
  const salesQuery = useQuery({
    queryKey: ['sales'],
    queryFn: () => getSales(),
    enabled: appId === 'sales' && canReadSales,
  });
  const customersQuery = useQuery({
    queryKey: ['customers'],
    queryFn: getCustomers,
    enabled: appId === 'crm',
  });
  const expensesQuery = useQuery({
    queryKey: ['expenses'],
    queryFn: getExpenses,
    enabled:
      appId === 'finance' && hasAnyPermission(user, ['admin:manage', 'sales:view', 'reports:view']),
  });
  const receiptsQuery = useQuery({
    queryKey: ['stock-intakes'],
    queryFn: getStockIntakes,
    enabled: (appId === 'inventory' || appId === 'warehouse') && canReadIntakes,
  });
  if (!app || !modules.length || app.planned)
    return <p>This application is not available for your account.</p>;
  const inventory = inBranch(inventoryQuery.data ?? [], branchId);
  const receipts = inBranch(receiptsQuery.data ?? [], branchId);
  const sales = inBranch(salesQuery.data ?? [], branchId);
  const expenses = inBranch(expensesQuery.data ?? [], branchId);
  const customers = inBranch(customersQuery.data ?? [], branchId);
  const formatNumber = (value: number) => value.toLocaleString('en-KE');
  const money = (value: number) =>
    new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: organization.currencyCode,
      maximumFractionDigits: 0,
    }).format(value);
  let metrics: [string, string, string][] = [];
  const scope = selectedBranch?.name ?? 'All authorized branches';
  if (appId === 'inventory' || appId === 'warehouse')
    metrics = [
      [
        'Available units',
        formatNumber(inventory.reduce((sum, item) => sum + item.quantityAvailable, 0)),
        scope,
      ],
      ['Stock lines', formatNumber(inventory.length), 'Products and variants by branch'],
      [
        'Low-stock alerts',
        formatNumber(inventory.filter((item) => item.stockHealth !== 'HEALTHY').length),
        'Includes out-of-stock items',
      ],
      ['Branches in scope', String(branchId ? 1 : branches.length), 'Authorized active locations'],
    ];
  if (appId === 'products')
    metrics = [
      [
        'Catalog items',
        String(productsQuery.data?.length ?? 0),
        'Parents, variants and simple products',
      ],
      [
        'Variants',
        String(productsQuery.data?.filter((p) => p.parentProductId).length ?? 0),
        'Independent inventory items',
      ],
      [
        'Active items',
        String(productsQuery.data?.filter((p) => p.status === 'ACTIVE').length ?? 0),
        'Active catalog records',
      ],
      [
        'Product families',
        String(productsQuery.data?.filter((p) => p.productType === 'VARIABLE').length ?? 0),
        'Products with variants',
      ],
    ];
  if (appId === 'sales' && canReadSales)
    metrics = [
      [
        'Recorded sales',
        money(sales.reduce((sum, sale) => sum + sale.totalAmount, 0)),
        'Original sale values, including tax',
      ],
      ['Transactions', formatNumber(sales.length), scope],
      [
        'Items sold',
        formatNumber(
          sales.reduce(
            (sum, sale) => sum + sale.lines.reduce((n, line) => n + line.quantity, 0),
            0,
          ),
        ),
        'Original quantities, before returns',
      ],
      ['Available workspaces', String(modules.length), 'History, quotations and invoices'],
    ];
  if (appId === 'crm')
    metrics = [
      ['Customers', String(customers.length), scope],
      [
        'Active accounts',
        String(customers.filter((c) => c.status === 'ACTIVE').length),
        'Customer directory',
      ],
      [
        'Business customers',
        String(customers.filter((c) => c.customerType === 'BUSINESS').length),
        'Registered business accounts',
      ],
      ['Available workspaces', String(modules.length), 'Relationships and customer records'],
    ];
  if (appId === 'finance' && expensesQuery.isEnabled)
    metrics = [
      [
        'Recorded expenses',
        money(expenses.filter((e) => e.status !== 'VOID').reduce((sum, e) => sum + e.amount, 0)),
        scope,
      ],
      [
        'Paid expenses',
        String(expenses.filter((e) => e.status === 'PAID').length),
        'Recorded paid expense entries',
      ],
      [
        'Pending expenses',
        String(expenses.filter((e) => e.status === 'PENDING').length),
        'Awaiting payment',
      ],
      ['Available workspaces', String(modules.length), 'Authorized finance tools'],
    ];
  const activeQuery =
    appId === 'products'
      ? productsQuery
      : appId === 'sales'
        ? salesQuery
        : appId === 'crm'
          ? customersQuery
          : appId === 'finance'
            ? expensesQuery
            : appId === 'inventory' || appId === 'warehouse'
              ? inventoryQuery
              : undefined;
  const balances = branches
    .filter((branch) => !branchId || branch.id === branchId)
    .map((branch) => ({ branch, items: inventory.filter((item) => item.branchId === branch.id) }));
  const alerts = inventory.filter((item) => item.stockHealth !== 'HEALTHY').slice(0, 5);
  return (
    <section className="platform-workspace">
      <header className="platform-workspace-header">
        <div className="platform-workspace-title">
          <span className={`platform-app-icon tone-${app.tone}`}>
            <i aria-hidden="true" className={`bi ${app.icon}`} />
          </span>
          <div>
            <h1>{app.title} Overview</h1>
            <p>{app.description}</p>
          </div>
        </div>
        <button
          className="secondary-action compact-action"
          type="button"
          aria-pressed={favorites.includes(app.id)}
          onClick={() => toggleFavorite(app.id)}
        >
          <i
            aria-hidden="true"
            className={`bi ${favorites.includes(app.id) ? 'bi-star-fill' : 'bi-star'}`}
          />
          {favorites.includes(app.id) ? 'Favorited' : 'Add to favorites'}
        </button>
      </header>
      <nav className="platform-workspace-tools" aria-label={`${app.title} workspaces`}>
        {modules.map((module) => (
          <Link key={module.to} to={module.to}>
            <i aria-hidden="true" className={`bi ${module.icon}`} />
            {module.label}
            <i aria-hidden="true" className="bi bi-arrow-up-right" />
          </Link>
        ))}
      </nav>
      {activeQuery?.error && (
        <p className="message-banner error" role="alert">
          Overview data could not be loaded. {activeQuery.error.message}
        </p>
      )}
      {!!metrics.length && (
        <div className="platform-kpis">
          {metrics.map(([label, value, detail]) => (
            <div key={label}>
              <small>{label}</small>
              <strong>
                {activeQuery?.isPending ? '…' : activeQuery?.isError ? 'Unavailable' : value}
              </strong>
              <span>{detail}</span>
            </div>
          ))}
        </div>
      )}
      {(appId === 'inventory' || appId === 'warehouse') && (
        <>
          <div className="platform-workspace-panels">
            <section className="platform-workspace-panel platform-branch-balances">
              <h2>Branch balances</h2>
              <div className="responsive-table">
                <table>
                  <thead>
                    <tr>
                      <th>Branch</th>
                      <th>Stock lines</th>
                      <th>Available units</th>
                      <th>Alerts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {balances.map(({ branch, items }) => (
                      <tr key={branch.id}>
                        <td>{branch.name}</td>
                        <td>{items.length}</td>
                        <td>
                          {formatNumber(
                            items.reduce((sum, item) => sum + item.quantityAvailable, 0),
                          )}
                        </td>
                        <td>{items.filter((item) => item.stockHealth !== 'HEALTHY').length}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!inventory.length && !inventoryQuery.isPending && (
                <p>No stock recorded in the current scope.</p>
              )}
            </section>
            <section className="platform-workspace-panel platform-stock-alerts">
              <h2>Stock needs attention</h2>
              {alerts.map((item) => (
                <Link className="platform-alert-link" to="/low-stock" key={item.id}>
                  <span>
                    {item.productName}
                    <small className="table-subtext">
                      {item.branchName} · {item.sku}
                    </small>
                  </span>
                  <strong>{item.quantityAvailable} left</strong>
                </Link>
              ))}
              {!alerts.length && (
                <p>
                  {inventoryQuery.isPending
                    ? 'Loading stock alerts…'
                    : 'No low-stock alerts in the current scope.'}
                </p>
              )}
            </section>
          </div>
          {canReadIntakes && (
            <section className="platform-workspace-panel">
              <h2>Recent goods received</h2>
              {receiptsQuery.error ? (
                <p role="alert">Receipts could not be loaded.</p>
              ) : receipts.length ? (
                <div className="responsive-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Product / variant</th>
                        <th>Branch</th>
                        <th>Supplier</th>
                        <th>Quantity</th>
                        <th>Received</th>
                      </tr>
                    </thead>
                    <tbody>
                      {receipts.slice(0, 5).map((receipt) => (
                        <tr key={receipt.id}>
                          <td>
                            {receipt.productName}
                            <small className="table-subtext">{receipt.sku}</small>
                          </td>
                          <td>{receipt.branchName}</td>
                          <td>{receipt.supplierName}</td>
                          <td>{receipt.quantity}</td>
                          <td>{new Date(receipt.receivedAt).toLocaleDateString('en-KE')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p>
                  {receiptsQuery.isPending
                    ? 'Loading receipts…'
                    : 'Goods received will appear here after stock is posted.'}
                </p>
              )}
            </section>
          )}
        </>
      )}
      {app.upcoming && (
        <div className="platform-upcoming">
          <strong>Planned for this app</strong>
          {app.upcoming.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      )}
      {appId !== 'inventory' && appId !== 'warehouse' && (
        <section className="platform-workspace-panel">
          <h2>Your {app.title.toLowerCase()} workspace</h2>
          <p>
            Use the menu to open a workspace. Your branch selection stays with you as you move
            between applications.
          </p>
          {appId === 'pos' && (
            <p>
              Checkout keeps its focused register layout, with quick access to the app launcher.
            </p>
          )}
          {appId === 'reports' && (
            <p>
              Business Overview keeps Today's Dashboard available. The reports center includes daily
              sales summaries and detailed stock and sales reports, according to your permissions.
            </p>
          )}
        </section>
      )}
    </section>
  );
}

type Movement = {
  id: string;
  product: string;
  sku: string;
  branchId: string;
  branch: string;
  kind: string;
  quantity: number;
  reference: string;
  at: string;
};
export function StockActivity({
  user,
  mode = 'activity',
}: {
  user: CurrentUser;
  mode?: 'activity' | 'adjustments' | 'receipts';
}) {
  const { branchId } = usePlatform();
  const [search, setSearch] = useState('');
  const [kind, setKind] = useState('All activity');
  const canReceive = hasAnyPermission(user, ['admin:manage', 'inventory:receive', 'reports:view']);
  const canAdjust = hasAnyPermission(user, ['admin:manage', 'inventory:adjust', 'reports:view']);
  const canSales = hasAnyPermission(user, ['admin:manage', 'sales:view', 'reports:view']);
  const receipts = useQuery({
    queryKey: ['stock-intakes'],
    queryFn: getStockIntakes,
    enabled: mode !== 'adjustments' && canReceive,
  });
  const adjustments = useQuery({
    queryKey: ['stock-adjustments'],
    queryFn: getStockAdjustments,
    enabled: mode !== 'receipts' && canAdjust,
  });
  const sales = useQuery({
    queryKey: ['sales'],
    queryFn: () => getSales(),
    enabled: mode === 'activity' && canSales,
  });
  const reversals = useQuery({
    queryKey: ['sale-reversals'],
    queryFn: getSaleReversals,
    enabled: mode === 'activity' && canSales,
  });
  const movements: Movement[] = [
    ...(mode !== 'adjustments' && canReceive ? (receipts.data ?? []) : []).map((item) => ({
      id: item.id,
      product: item.productName,
      sku: item.sku,
      branchId: item.branchId,
      branch: item.branchName,
      kind: 'Goods received',
      quantity: item.quantity,
      reference: item.referenceNumber || item.supplierName,
      at: item.receivedAt,
    })),
    ...(mode !== 'receipts' && canAdjust ? (adjustments.data ?? []) : []).map((item) => ({
      id: item.id,
      product: item.productName,
      sku: item.sku,
      branchId: item.branchId,
      branch: item.branchName,
      kind: 'Stock adjustment',
      quantity: item.varianceQuantity,
      reference: item.reason,
      at: item.adjustedAt,
    })),
    ...(mode === 'activity' && canSales ? (sales.data ?? []) : []).flatMap((sale) =>
      sale.lines.map((line, index) => ({
        id: `${sale.id}:${index}`,
        product: line.productName,
        sku: line.sku,
        branchId: sale.branchId,
        branch: sale.branchName,
        kind: 'Sale',
        quantity: -line.quantity,
        reference: sale.saleNumber,
        at: sale.soldAt,
      })),
    ),
    ...(mode === 'activity' && canSales ? (reversals.data ?? []) : []).flatMap((reversal) => {
      const sale = sales.data?.find((sale) => sale.id === reversal.sale_id);
      return (
        sale?.lines.map((line, index) => ({
          id: `${reversal.id}:${index}`,
          product: line.productName,
          sku: line.sku,
          branchId: sale.branchId,
          branch: sale.branchName,
          kind: reversal.kind === 'REFUND' ? 'Return' : 'Cancellation',
          quantity: line.quantity,
          reference: sale.saleNumber,
          at: reversal.created_at,
        })) ?? []
      );
    }),
  ];
  const scoped = inBranch(movements, branchId)
    .filter(
      (item) =>
        (kind === 'All activity' || item.kind === kind) &&
        `${item.product} ${item.sku} ${item.reference} ${item.branch}`
          .toLowerCase()
          .includes(search.toLowerCase()),
    )
    .sort((a, b) => b.at.localeCompare(a.at));
  const title =
    mode === 'receipts'
      ? 'Goods received'
      : mode === 'adjustments'
        ? 'Adjustments & discrepancies'
        : 'Stock movements';
  const queries = [receipts, adjustments, sales, reversals].filter((query) => query.isEnabled);
  return (
    <section className="platform-workspace">
      <header className="platform-workspace-header">
        <div>
          <h1>{title}</h1>
          <p className="apps-quiet">
            Recorded stock activity for your authorized scope. Available sources follow your
            permissions.
          </p>
        </div>
        {mode === 'adjustments' ? (
          <Link className="primary-action compact-action" to="/inventory">
            Adjust from stock balances
          </Link>
        ) : (
          canAccessReceive(user) && (
            <Link className="primary-action compact-action" to="/add-stock">
              Receive stock
            </Link>
          )
        )}
      </header>
      <div className="platform-activity-filters">
        <input
          type="search"
          aria-label="Search stock activity"
          placeholder="Search product, variant, SKU or reference…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {mode === 'activity' && (
          <select
            aria-label="Stock activity type"
            value={kind}
            onChange={(e) => setKind(e.target.value)}
          >
            {[
              'All activity',
              ...new Set(inBranch(movements, branchId).map((item) => item.kind)),
            ].map((kind) => (
              <option key={kind}>{kind}</option>
            ))}
          </select>
        )}
        <span className="apps-quiet">{scoped.length} records</span>
      </div>
      {queries.some((query) => query.isError) && (
        <p role="alert" className="message-banner error">
          Some activity sources could not be loaded. The table shows the sources currently
          available.
        </p>
      )}
      <section className="platform-workspace-panel platform-activity-table">
        <div className="responsive-table">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Product / variant</th>
                <th>Branch</th>
                <th>Activity</th>
                <th>Quantity</th>
                <th>Reference</th>
              </tr>
            </thead>
            <tbody>
              {scoped.map((item) => (
                <tr key={item.id}>
                  <td>{new Date(item.at).toLocaleString('en-KE')}</td>
                  <td>
                    <strong>{item.product}</strong>
                    <small className="table-subtext">{item.sku}</small>
                  </td>
                  <td>{item.branch}</td>
                  <td>
                    <span className="platform-activity-type">{item.kind}</span>
                  </td>
                  <td className={item.quantity < 0 ? 'negative-text' : 'positive-text'}>
                    {item.quantity > 0 ? '+' : ''}
                    {item.quantity}
                  </td>
                  <td>{item.reference}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!scoped.length && (
          <p style={{ padding: '20px' }}>
            {queries.some((query) => query.isPending)
              ? 'Loading stock activity…'
              : 'No matching stock activity.'}
          </p>
        )}
      </section>
    </section>
  );
}
const canAccessReceive = (user: CurrentUser) =>
  hasAnyPermission(user, ['admin:manage', 'inventory:receive']);
