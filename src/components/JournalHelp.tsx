export default function JournalHelp({ currencyCode }: { currencyCode: string }) {
  const amount = new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: currencyCode,
    maximumFractionDigits: 0,
  }).format(5000);
  return (
    <section className="panel-card accounting-journal-help">
      <h2>What are journals for?</h2>
      <p>
        A journal entry records a financial transaction against your accounts. Use it for opening
        balances, transfers between cash and bank accounts, and accounting adjustments.
      </p>
      <ol className="accounting-journal-steps">
        <li>
          <strong>Record the transaction</strong>
          <span>Choose the date, describe what happened, and enter the affected accounts.</span>
        </li>
        <li>
          <strong>Save a draft</strong>
          <span>Review the entry. Drafts do not change the Ledger or accounting reports.</span>
        </li>
        <li>
          <strong>Post to Ledger</strong>
          <span>
            Include the entry in account balances and accounting reports. Posted entries cannot be
            edited.
          </span>
        </li>
      </ol>
      <details>
        <summary>Example: move money from Bank to Shop Cash</summary>
        <p>To record a transfer of {amount}, use these two lines. Both totals must match.</p>
        <div className="responsive-table compact-table">
          <table>
            <thead>
              <tr>
                <th>Account</th>
                <th>Debit</th>
                <th>Credit</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td data-label="Account">Shop Cash</td>
                <td data-label="Debit">{amount}</td>
                <td data-label="Credit">—</td>
              </tr>
              <tr>
                <td data-label="Account">Bank</td>
                <td data-label="Debit">—</td>
                <td data-label="Credit">{amount}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          Use the matching accounts from your chart. Recording an entry does not transfer money
          between bank accounts.
        </p>
      </details>
      <p className="accounting-journal-note">
        Journal entries are currently recorded manually. POS sales and registered expenses do not
        automatically create journal entries in this system.
      </p>
    </section>
  );
}
