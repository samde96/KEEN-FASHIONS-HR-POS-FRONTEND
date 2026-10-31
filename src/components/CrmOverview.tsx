import type { CSSProperties } from 'react';

type Contact = {
  id: string;
  name: string;
  company: string;
  source: string;
  status: string;
  updatedAt: string;
};

type Opportunity = {
  id: string;
  stage: string;
  expectedValue: string;
  probabilityPercent: string;
};

type Activity = {
  id: string;
  subject: string;
  dueAt: string;
  activityType: string;
  status: string;
};

type Props = {
  contacts: Contact[];
  opportunities: Opportunity[];
  activities: Activity[];
  currencyCode: string;
  timeZone: string;
  onAddContact: () => void;
  onOpenContacts: () => void;
  onOpenPipeline: () => void;
  onAddActivity: () => void;
  onEditContact: (id: string) => void;
  onEditActivity: (id: string) => void;
  onCompleteActivity: (id: string) => void;
};

const stages = [
  { key: 'NEW', label: 'New opportunity', color: '#2563eb' },
  { key: 'QUALIFIED', label: 'Qualified', color: '#14b8d4' },
  { key: 'PROPOSAL', label: 'Proposal sent', color: '#eab308' },
  { key: 'NEGOTIATION', label: 'Negotiation', color: '#f59e0b' },
  { key: 'WON', label: 'Won', color: '#16a76a' },
  { key: 'LOST', label: 'Lost', color: '#94a3b8' },
];

export default function CrmOverview({
  contacts,
  opportunities,
  activities,
  currencyCode,
  timeZone,
  onAddContact,
  onOpenContacts,
  onOpenPipeline,
  onAddActivity,
  onEditContact,
  onEditActivity,
  onCompleteActivity,
}: Props) {
  const money = (amount: number) =>
    new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: currencyCode,
      maximumFractionDigits: 0,
    }).format(amount);
  const won = opportunities.filter((opportunity) => opportunity.stage === 'WON');
  const lost = opportunities.filter((opportunity) => opportunity.stage === 'LOST');
  const winRate =
    won.length + lost.length > 0 ? Math.round((won.length / (won.length + lost.length)) * 100) : 0;
  const weightedValue = opportunities
    .filter((opportunity) => !['WON', 'LOST'].includes(opportunity.stage))
    .reduce(
      (total, opportunity) =>
        total + (Number(opportunity.expectedValue) * Number(opportunity.probabilityPercent)) / 100,
      0,
    );
  const openActivities = activities
    .filter((activity) => activity.status === 'OPEN')
    .slice()
    .sort((a, b) => (a.dueAt || '9999').localeCompare(b.dueAt || '9999'));
  const recentContacts = contacts
    .slice()
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 5);
  const sourceCounts = new Map<string, number>();
  for (const contact of contacts) {
    const source = contact.source.trim() || 'Unspecified';
    sourceCounts.set(source, (sourceCounts.get(source) ?? 0) + 1);
  }
  const sources = [...sourceCounts.entries()].sort((a, b) => b[1] - a[1]);
  const colors = ['#2563eb', '#14b8d4', '#16a76a', '#fbbf24', '#f97316', '#94a3b8'];
  let progress = 0;
  const sourceGradient = sources
    .map(([, count], index) => {
      const start = progress;
      progress += (count / contacts.length) * 100;
      return `${colors[index % colors.length]} ${start}% ${progress}%`;
    })
    .join(', ');
  const maxStageCount = Math.max(
    1,
    ...stages.map((stage) => opportunities.filter((item) => item.stage === stage.key).length),
  );

  return (
    <div className="crm-overview">
      <section className="crm-growth-banner" aria-labelledby="crm-growth-title">
        <div>
          <span className="crm-banner-eyebrow">
            <i className="bi bi-lightning-charge-fill" aria-hidden="true" /> A little follow-up. A
            lot of possibility.
          </span>
          <h2 id="crm-growth-title">
            Better relationships.
            <br />
            <em>More opportunities.</em>
          </h2>
          <p>Capture the interest. Keep the conversation going. Make the next sale happen.</p>
          <div className="crm-banner-actions">
            <button className="crm-yellow-action" type="button" onClick={onAddContact}>
              Add a contact <i className="bi bi-arrow-up-right" aria-hidden="true" />
            </button>
            <button className="crm-banner-link" type="button" onClick={onOpenPipeline}>
              Explore your pipeline <i className="bi bi-arrow-right" aria-hidden="true" />
            </button>
          </div>
        </div>
        <div className="crm-growth-visual" aria-hidden="true">
          <span className="crm-growth-orbit orbit-one" />
          <span className="crm-growth-orbit orbit-two" />
          <div className="crm-growth-bars">
            <span />
            <span />
            <span />
            <span />
          </div>
          <span className="crm-growth-arrow">
            <i className="bi bi-arrow-up-right" />
          </span>
          <span className="crm-growth-note">
            <i className="bi bi-check-circle-fill" /> Built on good connections
          </span>
        </div>
      </section>

      <div className="crm-insight-grid">
        <section
          className="crm-insight-card crm-pipeline-insight"
          aria-labelledby="crm-pipeline-title"
        >
          <div className="crm-insight-heading">
            <div>
              <span className="crm-section-kicker">FROM FIRST HELLO TO CLOSED DEAL</span>
              <h2 id="crm-pipeline-title">Pipeline performance</h2>
            </div>
            <button
              className="crm-icon-button"
              type="button"
              aria-label="Open opportunity pipeline"
              onClick={onOpenPipeline}
            >
              <i className="bi bi-arrow-up-right" aria-hidden="true" />
            </button>
          </div>
          <div
            className="crm-pipeline-chart"
            role="img"
            aria-label={stages
              .map(
                (stage) =>
                  `${stage.label}: ${opportunities.filter((item) => item.stage === stage.key).length}`,
              )
              .join(', ')}
          >
            {stages.map((stage) => {
              const count = opportunities.filter((item) => item.stage === stage.key).length;
              const value = opportunities
                .filter((item) => item.stage === stage.key)
                .reduce((total, item) => total + Number(item.expectedValue), 0);
              return (
                <div className="crm-funnel-row" key={stage.key}>
                  <span>
                    <i style={{ background: stage.color }} />
                    {stage.label}
                  </span>
                  <div className="crm-funnel-track">
                    <span
                      style={{
                        width: `${(count / maxStageCount) * 100}%`,
                        background: stage.color,
                      }}
                    />
                  </div>
                  <strong>{count}</strong>
                  <small>{money(value)}</small>
                </div>
              );
            })}
          </div>
          <div className="crm-insight-footer">
            <span>
              <i className="bi bi-info-circle" aria-hidden="true" /> Each opportunity is counted
              once.
            </span>
            <strong>{opportunities.length} total opportunities</strong>
          </div>
        </section>

        <section className="crm-insight-card" aria-labelledby="crm-win-title">
          <div className="crm-insight-heading">
            <div>
              <span className="crm-section-kicker">MAKE EVERY OPPORTUNITY COUNT</span>
              <h2 id="crm-win-title">Win rate</h2>
            </div>
            <span className="crm-color-icon green">
              <i className="bi bi-trophy" aria-hidden="true" />
            </span>
          </div>
          <div className="crm-win-chart">
            <div
              className="crm-win-ring"
              role="img"
              aria-label={`${winRate}% win rate, ${won.length} won and ${lost.length} lost`}
              style={{ '--crm-progress': `${winRate}%` } as CSSProperties}
            >
              <div>
                <strong>
                  {winRate}
                  <small>%</small>
                </strong>
                <span>of closed deals</span>
              </div>
            </div>
            <div className="crm-win-legend">
              <span>
                <i className="green" />
                Won <strong>{won.length}</strong>
              </span>
              <span>
                <i className="gray" />
                Lost <strong>{lost.length}</strong>
              </span>
            </div>
          </div>
          <div className="crm-forecast">
            <span>Weighted open pipeline</span>
            <strong>{money(weightedValue)}</strong>
            <small>Opportunity value × probability</small>
          </div>
        </section>
      </div>

      <div className="crm-insight-grid crm-detail-grid">
        <section className="crm-insight-card" aria-labelledby="crm-agenda-title">
          <div className="crm-insight-heading">
            <div>
              <span className="crm-section-kicker">KEEP THE MOMENTUM GOING</span>
              <h2 id="crm-agenda-title">
                Your next moves <span className="crm-count-badge">{openActivities.length}</span>
              </h2>
            </div>
            <button
              className="crm-icon-button"
              type="button"
              aria-label="Schedule an activity"
              onClick={onAddActivity}
            >
              <i className="bi bi-plus-lg" aria-hidden="true" />
            </button>
          </div>
          {openActivities.length === 0 ? (
            <div className="crm-friendly-empty">
              <span className="crm-color-icon amber">
                <i className="bi bi-calendar2-check" aria-hidden="true" />
              </span>
              <h3>A clear calendar. A fresh start.</h3>
              <p>Schedule a call, a meeting, or your next follow-up.</p>
              <button type="button" onClick={onAddActivity}>
                Plan your first activity <i className="bi bi-arrow-right" aria-hidden="true" />
              </button>
            </div>
          ) : (
            <div className="crm-next-moves">
              {openActivities.slice(0, 5).map((activity) => {
                const overdue = Boolean(
                  activity.dueAt && new Date(activity.dueAt).getTime() < Date.now(),
                );
                return (
                  <div className="crm-next-move" key={activity.id}>
                    <button
                      type="button"
                      className="crm-complete-button"
                      aria-label={`Complete ${activity.subject}`}
                      onClick={() => onCompleteActivity(activity.id)}
                    >
                      <i className="bi bi-check" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className="crm-activity-link"
                      onClick={() => onEditActivity(activity.id)}
                    >
                      <strong>{activity.subject}</strong>
                      <span>
                        {activity.activityType.replaceAll('_', ' ').toLowerCase()} ·{' '}
                        {activity.dueAt
                          ? new Intl.DateTimeFormat('en-KE', {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                              timeZone,
                            }).format(new Date(activity.dueAt))
                          : 'No date set'}
                      </span>
                    </button>
                    <span className={`crm-small-status ${overdue ? 'amber' : 'blue'}`}>
                      {overdue ? 'Overdue' : 'Upcoming'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="crm-insight-card" aria-labelledby="crm-sources-title">
          <div className="crm-insight-heading">
            <div>
              <span className="crm-section-kicker">KNOW WHERE CONNECTIONS BEGIN</span>
              <h2 id="crm-sources-title">Contact sources</h2>
            </div>
            <span className="crm-color-icon blue">
              <i className="bi bi-broadcast" aria-hidden="true" />
            </span>
          </div>
          <div className="crm-source-content">
            <div
              className="crm-source-ring"
              role="img"
              aria-label={
                contacts.length
                  ? sources.map(([source, count]) => `${source}: ${count}`).join(', ')
                  : 'No contacts yet'
              }
              style={{
                background: sourceGradient ? `conic-gradient(${sourceGradient})` : '#eaf0f7',
              }}
            >
              <div>
                <strong>{contacts.length}</strong>
                <span>contacts</span>
              </div>
            </div>
            <div className="crm-source-legend">
              {sources.length ? (
                sources.map(([source, count], index) => (
                  <div key={source}>
                    <i style={{ background: colors[index % colors.length] }} />
                    <span>{source}</span>
                    <strong>{count}</strong>
                  </div>
                ))
              ) : (
                <p>
                  Add a source when saving a contact to see what brings people to your business.
                </p>
              )}
            </div>
          </div>
        </section>
      </div>

      <section className="crm-insight-card" aria-labelledby="crm-recent-title">
        <div className="crm-insight-heading">
          <div>
            <span className="crm-section-kicker">PEOPLE BEHIND THE POSSIBILITIES</span>
            <h2 id="crm-recent-title">Recent contacts</h2>
          </div>
          <button className="crm-text-action" type="button" onClick={onOpenContacts}>
            View all contacts <i className="bi bi-arrow-right" aria-hidden="true" />
          </button>
        </div>
        {recentContacts.length === 0 ? (
          <div className="crm-contacts-empty">
            <span className="crm-color-icon blue">
              <i className="bi bi-people" aria-hidden="true" />
            </span>
            <div>
              <h3>Your next customer starts with a contact.</h3>
              <p>Add your first lead and keep their details, notes, and next steps together.</p>
            </div>
            <button className="crm-text-action" type="button" onClick={onAddContact}>
              Add your first contact <i className="bi bi-plus-lg" aria-hidden="true" />
            </button>
          </div>
        ) : (
          <div className="crm-recent-contacts">
            {recentContacts.map((contact) => (
              <button
                type="button"
                className="crm-contact-tile"
                key={contact.id}
                onClick={() => onEditContact(contact.id)}
              >
                <span className="crm-contact-avatar">
                  {contact.name
                    .split(/\s+/)
                    .slice(0, 2)
                    .map((part) => part[0])
                    .join('')
                    .toUpperCase()}
                </span>
                <span>
                  <strong>{contact.name}</strong>
                  <small>{contact.company || contact.source || 'Individual contact'}</small>
                </span>
                <span className={`crm-small-status ${contact.status === 'WON' ? 'green' : 'blue'}`}>
                  {contact.status.toLowerCase()}
                </span>
                <i className="bi bi-chevron-right" aria-hidden="true" />
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
