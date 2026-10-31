import type { Page } from '@playwright/test';
import type { Branch, InventoryItem } from '../../src/data/types';
import {
  testBranches,
  testExpenses,
  testInventory,
  testOrganization,
  testPermissions,
  testProductCategories,
  testProducts,
  testRoles,
  testSuppliers,
  testUser,
} from '../../src/test/fixtures';

export async function mockApi(
  page: Page,
  options: { branches?: Branch[]; loseFirstOperationResponse?: boolean } = {},
) {
  const operations = new Map<string, { result: unknown; appliedAt: string }>();
  let operationCalls = 0;
  let revision = 0;
  const drafts = new Map<
    string,
    {
      id: string;
      branchId: string;
      status: string;
      payload: Record<string, unknown>;
      version: number;
      createdAt: string;
      updatedAt: string;
    }
  >();
  const inventory: InventoryItem[] =
    testInventory.length > 0
      ? structuredClone(testInventory)
      : [
          {
            id: 'inventory-001',
            branchId: testBranches[0].id,
            branchName: testBranches[0].name,
            productId: testProducts[0].id,
            productName: testProducts[0].name,
            sku: testProducts[0].sku,
            categoryName: testProducts[0].categoryName,
            unitPrice: testProducts[0].unitPrice,
            quantityOnHand: 2,
            quantityReserved: 0,
            quantityAvailable: 2,
            reorderLevel: 0,
            stockHealth: 'HEALTHY',
          },
        ];
  let sales: unknown[] = [];
  let stockIntakes: unknown[] = [
    {
      id: 'stock-intake-001',
      branchId: testBranches[0].id,
      branchName: testBranches[0].name,
      productId: testProducts[0].id,
      productName: 'Berrykey Mens Trench Coats Casual Blazers With Extended Seasonal Label',
      sku: 'BLAZER-EXT-001',
      supplierName: 'Keen Fashions Wholesale Department',
      referenceNumber: 'REFERENCE-2026-0001',
      quantity: 12,
      unitCost: 1500,
      notes: '',
      receivedAt: '2026-09-08T12:10:00Z',
    },
    {
      id: 'stock-intake-002',
      branchId: testBranches[0].id,
      branchName: testBranches[0].name,
      productId: testProducts[0].id,
      productName: 'White T-Shirt Essential Logo Soft Cotton Stop Top For Men',
      sku: 'TS003',
      supplierName: 'Keen Fashions',
      referenceNumber: '',
      quantity: 11,
      unitCost: 1000,
      notes: '',
      receivedAt: '2026-09-08T12:00:00Z',
    },
  ];

  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;

    if (path === '/api/v1/mpesa/config') {
      await route.fulfill({ json: { enabled: false } });
      return;
    }

    if (path === '/api/v1/auth/csrf') {
      await route.fulfill({ json: { headerName: 'X-XSRF-TOKEN', token: 'e2e-csrf' } });
      return;
    }
    if (path === '/api/v1/stock-operations') {
      await route.fulfill({
        json: [...drafts.values()].filter((draft) => draft.status === 'DRAFT'),
      });
      return;
    }
    if (path.startsWith('/api/v1/stock-operations/')) {
      const id = path.split('/')[4];
      if (request.method() === 'PUT') {
        const body = await request.postDataJSON();
        const draft = {
          id,
          branchId: body.branchId,
          status: 'DRAFT',
          payload: body,
          version: body.version + 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        drafts.set(id, draft);
        await route.fulfill({ json: draft });
        return;
      }
      if (request.method() === 'DELETE') {
        drafts.delete(id);
        await route.fulfill({ status: 204 });
        return;
      }
      if (path.endsWith('/complete') && request.method() === 'POST') {
        const draft = drafts.get(id);
        if (draft) draft.status = 'COMPLETED';
        await route.fulfill({ json: draft ?? { id, status: 'COMPLETED' } });
        return;
      }
    }

    if (path === '/api/v1/auth/logout') {
      await route.fulfill({ status: 204 });
      return;
    }

    if (path === '/api/v1/auth/login' || path === '/api/v1/me') {
      await route.fulfill({ json: testUser });
      return;
    }

    if (path === '/api/v1/organization/current') {
      await route.fulfill({ json: testOrganization });
      return;
    }

    if (path === '/api/v1/branches') {
      await route.fulfill({ json: options.branches ?? testBranches });
      return;
    }

    if (path === '/api/v1/roles') {
      await route.fulfill({ json: testRoles });
      return;
    }

    if (path === '/api/v1/permissions') {
      await route.fulfill({ json: testPermissions });
      return;
    }

    if (path === '/api/v1/catalog/categories') {
      await route.fulfill({ json: testProductCategories });
      return;
    }

    if (path === '/api/v1/catalog/products') {
      await route.fulfill({ json: testProducts });
      return;
    }

    if (path === '/api/v1/suppliers') {
      await route.fulfill({ json: testSuppliers });
      return;
    }

    if (path === '/api/v1/inventory') {
      await route.fulfill({ json: inventory });
      return;
    }

    if (path === '/api/v1/stock-adjustments' || path === '/api/v1/sale-reversals') {
      await route.fulfill({ json: [] });
      return;
    }
    if (path === '/api/v1/pos-preferences') {
      await route.fulfill({
        json: {
          dailySummaryEnabled: true,
          inAppEnabled: true,
          emailEnabled: false,
          recipientIds: [],
          inactivityMinutes: 2880,
          longEntryMinutes: 10,
          timeZone: 'Africa/Nairobi',
        },
      });
      return;
    }

    if (path === '/api/v1/stock-adjustments/summary') {
      await route.fulfill({
        json: {
          lossItems: 0,
          excessItems: 0,
          totalLossQuantity: 0,
          totalExcessQuantity: 0,
          totalLossValue: 0,
          totalExcessValue: 0,
          netValue: 0,
        },
      });
      return;
    }

    if (path === '/api/v1/stock-intakes') {
      if (request.method() === 'POST') {
        const postedRequest = await request.postDataJSON();
        const product = testProducts.find((item) => item.id === postedRequest.productId);
        const branch = testBranches.find((item) => item.id === postedRequest.branchId);
        const stockIntake = {
          id: `stock-intake-${stockIntakes.length + 1}`,
          branchId: postedRequest.branchId,
          branchName: branch?.name ?? 'Unknown Branch',
          productId: postedRequest.productId,
          productName: product?.name ?? 'Unknown Product',
          sku: product?.sku ?? 'N/A',
          supplierName: postedRequest.supplierName,
          referenceNumber: postedRequest.referenceNumber,
          quantity: postedRequest.quantity,
          unitCost: postedRequest.unitCost,
          notes: postedRequest.notes,
          receivedAt: '2026-09-08T12:20:00Z',
        };

        stockIntakes = [stockIntake, ...stockIntakes];
        await route.fulfill({ status: 201, json: stockIntake });
        return;
      }

      await route.fulfill({ json: stockIntakes });
      return;
    }

    if (path === '/api/v1/offline/operations') {
      const operation = request.postDataJSON();
      operationCalls++;
      let saved = operations.get(operation.id);
      if (!saved) {
        const payload = operation.payload;
        let result: unknown;
        if (operation.kind === 'SALE') {
          const sale = payload.sale;
          const lines = sale.lines.map((line: { productId: string; quantity: number }) => {
            const product = testProducts.find((p) => p.id === line.productId)!;
            const row = inventory.find(
              (i) => i.productId === line.productId && i.branchId === sale.branchId,
            )!;
            row.quantityOnHand -= line.quantity;
            row.quantityAvailable -= line.quantity;
            return {
              ...line,
              productName: product.name,
              sku: product.sku,
              categoryName: product.categoryName,
              unitPrice: product.unitPrice,
              lineTotal: product.unitPrice * line.quantity,
              vatCategory: product.vatCategory,
            };
          });
          const subtotalAmount = lines.reduce(
            (sum: number, line: { lineTotal: number }) => sum + line.lineTotal,
            0,
          );
          const totalAmount = sale.payments.reduce(
            (sum: number, p: { amount: number }) => sum + p.amount,
            0,
          );
          result = {
            id: `server-${operation.id}`,
            saleNumber: `SALE-${String(operations.size + 1).padStart(3, '0')}`,
            ...sale,
            branchName: testBranches[0].name,
            subtotalAmount,
            totalAmount,
            taxAmount: totalAmount - subtotalAmount,
            status: 'COMPLETED',
            soldAt: operation.occurredAt,
            lines,
            payments: sale.payments.map((p: object, index: number) => ({
              ...p,
              id: `${operation.id}:${index}`,
              status: 'SETTLED',
            })),
          };
          sales = [result, ...sales];
        } else if (operation.kind === 'STOCK_RECEIPT') {
          for (const [index, line] of payload.lines.entries()) {
            const row = inventory.find(
              (i) => i.productId === line.productId && i.branchId === line.branchId,
            )!;
            row.quantityOnHand += line.quantity;
            row.quantityAvailable += line.quantity;
            stockIntakes.unshift({
              ...line,
              id: `${operation.id}:${index}`,
              receivedAt: operation.occurredAt,
            });
          }
          result = {
            id: payload.draftId,
            branchId: payload.branchId,
            status: 'COMPLETED',
            payload,
            version: payload.version + 1,
            completedAt: operation.occurredAt,
          };
          drafts.delete(payload.draftId);
        } else if (operation.kind === 'STOCK_TRANSFER') {
          for (const line of payload.lines) {
            const source = inventory.find(
              (i) => i.branchId === payload.sourceBranchId && i.productId === line.productId,
            )!;
            source.quantityOnHand -= line.quantity;
            source.quantityAvailable -= line.quantity;
            let target = inventory.find(
              (i) => i.branchId === payload.destinationBranchId && i.productId === line.productId,
            );
            if (!target) {
              target = {
                ...source,
                id: `target-${operation.id}`,
                branchId: payload.destinationBranchId,
                branchName:
                  options.branches?.find((b) => b.id === payload.destinationBranchId)?.name ??
                  'Warehouse',
                quantityOnHand: 0,
                quantityAvailable: 0,
              };
              inventory.push(target);
            }
            target.quantityOnHand += line.quantity;
            target.quantityAvailable += line.quantity;
          }
          result = payload;
        } else {
          await route.fulfill({
            status: 400,
            json: { detail: 'Unsupported operation in this browser fixture' },
          });
          return;
        }
        saved = { result, appliedAt: new Date().toISOString() };
        operations.set(operation.id, saved);
        if (options.loseFirstOperationResponse && operationCalls === 1) {
          await route.abort('connectionreset');
          return;
        }
      }
      const confirmed = (operation.pendingIds ?? [operation.id])
        .filter((id: string) => operations.has(id))
        .map((id: string) => ({ id, ...operations.get(id)! }));
      await route.fulfill({
        json: { id: operation.id, ...saved, inventory, confirmed, revision: ++revision },
      });
      return;
    }
    if (path === '/api/v1/sales') {
      if (request.method() === 'POST') {
        const sale = {
          id: 'sale-001',
          saleNumber: 'SALE-001',
          branchId: testBranches[0].id,
          branchName: testBranches[0].name,
          customerName: null,
          subtotalAmount: 2800,
          discountAmount: 0,
          taxAmount: 448,
          totalAmount: 3248,
          status: 'COMPLETED',
          soldAt: '2026-09-08T10:00:00Z',
          lines: [
            {
              productId: testProducts[0].id,
              productName: testProducts[0].name,
              sku: testProducts[0].sku,
              categoryName: testProducts[0].categoryName,
              quantity: 1,
              unitPrice: testProducts[0].unitPrice,
              costPrice: testProducts[0].costPrice,
              lineTotal: testProducts[0].unitPrice,
            },
          ],
          payments: [
            {
              id: 'payment-001',
              method: 'MPESA',
              amount: 3248,
              status: 'SETTLED',
            },
          ],
        };
        sales = [sale, ...sales];
        await route.fulfill({ status: 201, json: sale });
        return;
      }

      await route.fulfill({ json: sales });
      return;
    }

    if (path === '/api/v1/expenses') {
      await route.fulfill({ json: testExpenses });
      return;
    }
    if (path === '/api/v1/shifts') {
      await route.fulfill({ json: [] });
      return;
    }

    if (path === '/api/v1/users') {
      await route.fulfill({
        json: [
          {
            id: testUser.userId,
            email: testUser.email,
            displayName: testUser.displayName,
            status: 'ACTIVE',
            roleIds: [testRoles[1].id],
            roleNames: ['Admin'],
            permissionCodes: testUser.permissionCodes,
            branchIds: [testBranches[0].id],
            branchNames: [testBranches[0].name],
          },
        ],
      });
      return;
    }
    if (path === '/api/v1/customers') {
      await route.fulfill({
        json: [
          {
            id: 'customer-001',
            customerCode: 'CUS-001',
            name: 'Amina Kimani',
            phone: '0712345678',
            email: 'amina@example.com',
            customerType: 'INDIVIDUAL',
            creditLimit: 0,
            outstandingBalance: 0,
            status: 'ACTIVE',
            createdAt: '2026-10-29T08:00:00Z',
            updatedAt: '2026-10-29T08:00:00Z',
          },
        ],
      });
      return;
    }
    if (path === '/api/v1/notifications') {
      await route.fulfill({
        json: [
          {
            id: 'notification-001',
            notificationType: 'LOW_STOCK',
            title: 'Low stock',
            message: 'Oxford Shirt needs restocking.',
            status: 'UNREAD',
            createdAt: '2026-10-29T08:00:00Z',
          },
        ],
      });
      return;
    }
    if (path === '/api/v1/audit-events') {
      await route.fulfill({
        json: [
          {
            id: 'audit-001',
            actorName: 'Admin',
            action: 'CREATE',
            targetType: 'PRODUCT',
            reason: 'Product registered',
            createdAt: '2026-10-29T08:00:00Z',
          },
        ],
      });
      return;
    }
    if (
      /^\/api\/v1\/(commercial|procurement|customers|crm|accounting|notifications)\/summary$/.test(
        path,
      )
    ) {
      await route.fulfill({
        json: {
          moduleKey: path.split('/')[3],
          title: 'Summary',
          description: 'Business records',
          metrics: [],
          workItems: [],
        },
      });
      return;
    }
    if (/^\/api\/v1\/accounting\/(accounts|periods|tax-rules|journals)$/.test(path)) {
      await route.fulfill({ json: [] });
      return;
    }

    await route.fulfill({ status: 404, json: { detail: `No browser fixture for ${path}` } });
  });
  return { operations, inventory, operationCalls: () => operationCalls };
}
