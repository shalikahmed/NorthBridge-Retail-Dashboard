
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Clock3,
  Database,
  Download,
  LayoutDashboard,
  Menu,
  RefreshCw,
  Search,
  Settings,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import "./App.css";

const API_URL =
  "https://northbridge-60082787813.development.catalystserverless.in/server/getChurnSignalsBasic/execute";
const FEATURE_REQUESTS_API_URL =
  "https://northbridge-60082787813.development.catalystserverless.in/server/getFeatureRequests/execute";
// Replace this placeholder with the webhook URL for your EXISTING Churn Sentinel Flow.
const CHURN_REFRESH_WEBHOOK_URL = "https://flow.zoho.in/60031212755/flow/webhook/incoming?zapikey=1001.138c09091a0d9aee50ff51a1d010b4f6.6c5908514e9fc80b2eba9ae2ee76a163&isdebug=false";
const RISK_STYLES = {
  High: "high",
  Medium: "medium",
  Low: "low",
};

function normalizeResponse(payload) {
  let parsed = payload;

  if (typeof parsed?.output === "string") {
    try {
      parsed = JSON.parse(parsed.output);
    } catch {
      throw new Error("The API returned invalid JSON.");
    }
  }

  if (parsed?.status === "failure") {
    throw new Error(parsed.message || "The server returned a failure.");
  }

  if (Array.isArray(parsed)) return parsed;
  if (Array.isArray(parsed?.data)) return parsed.data;

  throw new Error("Unexpected API response. Expected a data array.");
}

function formatDate(value) {
  if (!value) return "Not recorded";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function riskLabel(value) {
  return RISK_STYLES[value] ? value : "Unclassified";
}

function MerchantAvatar({ name }) {
  const initials = String(name || "M")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return <div className="merchant-avatar">{initials || "M"}</div>;
}

function RiskBadge({ risk }) {
  const normalized = riskLabel(risk);

  return (
    <span className={`risk-badge ${RISK_STYLES[normalized] || "unknown"}`}>
      <span className="risk-dot" />
      {normalized}
    </span>
  );
}

function MetricCard({ title, value, subtitle, icon: Icon, tone, trend }) {
  return (
    <article className="metric-card">
      <div className="metric-top">
        <span className="metric-title">{title}</span>
        <span className={`metric-icon ${tone}`}>
          <Icon size={19} />
        </span>
      </div>
      <div className="metric-value">{value}</div>
      <div className="metric-bottom">
        {trend && (
          <span className="metric-trend">
            <ArrowUpRight size={14} /> {trend}
          </span>
        )}
        <span>{subtitle}</span>
      </div>
    </article>
  );
}

function App() {
  const [merchants, setMerchants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState("dashboard");
  const [featureRequests, setFeatureRequests] = useState([]);
  const [featureLoading, setFeatureLoading] = useState(false);
  const [featureRefreshing, setFeatureRefreshing] = useState(false);
  const [featureError, setFeatureError] = useState("");
  const [featureLastUpdated, setFeatureLastUpdated] = useState(null);
  const [featureSearch, setFeatureSearch] = useState("");
  const [featureStatusFilter, setFeatureStatusFilter] = useState("All");
  const [featureDecisionFilter, setFeatureDecisionFilter] = useState("All");
  const [featurePage, setFeaturePage] = useState(1);
  const FEATURE_PAGE_SIZE = 5;
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState("All");
  const [selectedId, setSelectedId] = useState(null);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  async function handleChurnRefresh() {
    if (refreshing) return;

    if (
      !CHURN_REFRESH_WEBHOOK_URL ||
      CHURN_REFRESH_WEBHOOK_URL.includes("PASTE_YOUR_EXISTING_CHURN_FLOW_WEBHOOK_URL_HERE")
    ) {
      setError("Add your existing Churn Sentinel Zoho Flow webhook URL near the top of App.jsx before using Refresh data.");
      return;
    }

    setRefreshing(true);
    setError("");

    try {
      // no-cors allows a simple browser POST to a webhook, but the response cannot be inspected.
      await fetch(CHURN_REFRESH_WEBHOOK_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=UTF-8" },
        body: JSON.stringify({
          source: "churn-sentinel-dashboard",
          action: "refresh",
        }),
      });
    } catch {
      setError("Could not send the refresh request to Zoho Flow. Check the webhook URL and network connection.");
      setRefreshing(false);
      return;
    }

    // Keep the existing Catalyst data reload unchanged.
    await loadMerchants({ quiet: true });
  }

  async function loadMerchants({ quiet = false } = {}) {
    if (quiet) setRefreshing(true);
    else setLoading(true);

    setError("");

    try {
      const response = await fetch(API_URL, {
        method: "GET",
        headers: { Accept: "application/json" },
      });

      if (!response.ok) {
        throw new Error(`Request failed with HTTP ${response.status}.`);
      }

      const payload = await response.json();
      const records = normalizeResponse(payload);

      setMerchants(records);
      setLastUpdated(new Date());

      setSelectedId((current) => {
        if (current && records.some((item) => item.ROWID === current)) {
          return current;
        }
        return records[0]?.ROWID ?? records[0]?.merchant_account_id ?? null;
      });
    } catch (err) {
      setError(
        `${err.message || "Could not load merchants."} Check the function URL, browser CORS permissions, and Catalyst access settings.`,
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function loadFeatureRequests({ quiet = false } = {}) {
    if (quiet) setFeatureRefreshing(true);
    else setFeatureLoading(true);

    setFeatureError("");

    try {
      const response = await fetch(FEATURE_REQUESTS_API_URL, {
        method: "GET",
        headers: { Accept: "application/json" },
      });

      if (!response.ok) {
        throw new Error(`Request failed with HTTP ${response.status}.`);
      }

      const payload = await response.json();
      const records = normalizeResponse(payload);

      setFeatureRequests(records);
      setFeatureLastUpdated(new Date());
    } catch (err) {
      setFeatureError(
        `${err.message || "Could not load feature requests."} Check the API URL, browser CORS permissions, and Catalyst access settings.`,
      );
    } finally {
      setFeatureLoading(false);
      setFeatureRefreshing(false);
    }
  }

  useEffect(() => {
    loadMerchants();
  }, []);

  const enriched = useMemo(
    () =>
      merchants.map((merchant, index) => ({
        ...merchant,
        _key:
          merchant.ROWID ??
          merchant.merchant_account_id ??
          `${merchant.merchant_name}-${index}`,
        _name:
          merchant.merchant_name ||
          merchant.account_name ||
          merchant.name ||
          "Unnamed merchant",
        _risk: riskLabel(merchant.risk_level),
        _recent: Number(merchant.ticket_count_recent) || 0,
        _baseline: Number(merchant.ticket_count_baseline) || 0,
      })),
    [merchants],
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return enriched.filter((merchant) => {
      const matchesRisk =
        riskFilter === "All" || merchant._risk === riskFilter;

      const searchable = [
        merchant._name,
        merchant.merchant_account_id,
        merchant.primary_signal,
        merchant.reasoning,
        merchant.related_ticket_ids,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return matchesRisk && (!query || searchable.includes(query));
    });
  }, [enriched, search, riskFilter]);


  const filteredFeatureRequests = useMemo(() => {
    const query = featureSearch.trim().toLowerCase();

    return featureRequests.filter((feature) => {
      const statusValue = feature.feature_status ?? feature.status ?? "Unknown";
      const status = String(
        typeof statusValue === "object" ? statusValue?.name || "Unknown" : statusValue,
      );
      const decisionValue =
        feature.product_decision ?? feature.productDecision ?? feature.decision ?? "Not synced";
      const decision = String(
        typeof decisionValue === "object" ? decisionValue?.name || "Pending Review" : decisionValue,
      );
      const searchable = [
        feature.feature_title,
        status,
        decision,
        feature.project_name,
        feature.project_id,
        feature.task_prefix,
        feature.task_key,
        feature.task_id,
        feature.release_version,
        ...(feature.linked_tickets || []).map((ticket) => ticket.ticket_id),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesStatus =
        featureStatusFilter === "All" ||
        status.toLowerCase() === featureStatusFilter.toLowerCase();
      const matchesDecision =
        featureDecisionFilter === "All" ||
        decision.toLowerCase() === featureDecisionFilter.toLowerCase();

      return (!query || searchable.includes(query)) && matchesStatus && matchesDecision;
    });
  }, [featureRequests, featureSearch, featureStatusFilter, featureDecisionFilter]);

  // Reset pagination whenever the user changes search or filters.
  useEffect(() => {
    setFeaturePage(1);
  }, [featureSearch, featureStatusFilter, featureDecisionFilter]);

  const featurePageCount = Math.max(
    1,
    Math.ceil(filteredFeatureRequests.length / FEATURE_PAGE_SIZE),
  );
  const currentFeaturePage = Math.min(featurePage, featurePageCount);
  const featureStartIndex = (currentFeaturePage - 1) * FEATURE_PAGE_SIZE;
  const paginatedFeatureRequests = filteredFeatureRequests.slice(
    featureStartIndex,
    featureStartIndex + FEATURE_PAGE_SIZE,
  );

  const featureStatus = (feature) => {
    const value = feature.feature_status ?? feature.status ?? "Unknown";
    return String(typeof value === "object" ? value?.name || "Unknown" : value);
  };

  const featureDecision = (feature) => {
    const value =
      feature.product_decision ?? feature.productDecision ?? feature.decision ?? "Not synced";
    return String(typeof value === "object" ? value?.name || "Pending Review" : value);
  };


  const selected =
    filtered.find((merchant) => merchant._key === selectedId) ||
    enriched.find((merchant) => merchant._key === selectedId) ||
    filtered[0] ||
    null;

  const highCount = enriched.filter((item) => item._risk === "High").length;
  const mediumCount = enriched.filter(
    (item) => item._risk === "Medium",
  ).length;
  const unknownCount = enriched.filter(
    (item) => item._risk === "Unclassified",
  ).length;

  const totalRecent = enriched.reduce((sum, item) => sum + item._recent, 0);

  function exportCsv() {
    const columns = [
      ["Merchant", "_name"],
      ["Account ID", "merchant_account_id"],
      ["Risk", "risk_level"],
      ["Primary signal", "primary_signal"],
      ["Recent tickets", "ticket_count_recent"],
      ["Baseline tickets", "ticket_count_baseline"],
      ["Related ticket IDs", "related_ticket_ids"],
      ["Reasoning", "reasoning"],
    ];

    const escape = (value) =>
      `"${String(value ?? "").replaceAll('"', '""')}"`;

    const csv = [
      columns.map(([label]) => escape(label)).join(","),
      ...filtered.map((row) =>
        columns.map(([, key]) => escape(key === "_name" ? row._name : row[key])).join(","),
      ),
    ].join("\r\n");

    const blob = new Blob(["\uFEFF", csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "churn-sentinel-merchants.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileMenu ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark">
            <Activity size={23} strokeWidth={2.5} />
          </div>
          <div>
            <div className="brand-name">NorthBridge</div>
            <div className="brand-subtitle">CHURN SENTINEL</div>
          </div>
          <button
            className="icon-button mobile-close"
            onClick={() => setMobileMenu(false)}
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        <div className="workspace-label">WORKSPACE</div>
        <button className="workspace-switch">
          <span className="workspace-symbol">N</span>
          <span className="workspace-copy">
            <strong>NorthBridge</strong>
            <small>Development</small>
          </span>
          <ChevronDown size={15} />
        </button>

        <div className="nav-label">OVERVIEW</div>
        <nav className="main-nav">

<button
  className={`nav-item ${activeView === "dashboard" ? "active" : ""}`}
  onClick={() => {
    setActiveView("dashboard");
    setMobileMenu(false);
  }}
>
  <LayoutDashboard size={18} />
  <span>Dashboard</span>
</button>
<button
  className={`nav-item ${activeView === "features" ? "active" : ""}`}
  onClick={() => {
    setActiveView("features");
    setMobileMenu(false);
    if (featureRequests.length === 0 && !featureLoading) {
      loadFeatureRequests();
    }
  }}
>
  <Database size={18} />
  <span>Feature Requests</span>
  <span className="nav-count">{featureRequests.length}</span>
</button>

          <button className="nav-item" onClick={() => setRiskFilter("High")}>
            <ShieldAlert size={18} />
            <span>At-risk merchants</span>
            <span className="nav-count">{highCount}</span>
          </button>
          <button className="nav-item" onClick={() => setRiskFilter("All")}>
            <Users size={18} />
            <span>All merchants</span>
          </button>
        </nav>

        <div className="nav-label signals-label">INTELLIGENCE</div>
        <nav className="main-nav">
          <button className="nav-item" onClick={() => setRiskFilter("High")}>
            <TrendingUp size={18} />
            <span>Risk signals</span>
          </button>
          <button className="nav-item" onClick={() => loadMerchants({ quiet: true })}>
            <Database size={18} />
            <span>Data source</span>
          </button>
        </nav>

        <div className="sidebar-spacer" />

        <div className="sidebar-health">
          <div className="health-icon"><ShieldCheck size={17} /></div>
          <div>
            <strong>Monitoring active</strong>
            <small>Connected to Catalyst</small>
          </div>
          <span className="online-dot" />
        </div>

        <button className="nav-item sidebar-settings">
          <Settings size={18} />
          <span>Settings</span>
        </button>

        <div className="profile">
          <div className="profile-avatar">SA</div>
          <div className="profile-copy">
            <strong>Workspace admin</strong>
            <small>NorthBridge team</small>
          </div>
          <ChevronDown size={16} />
        </div>
      </aside>

      {mobileMenu && (
        <button
          className="mobile-scrim"
          onClick={() => setMobileMenu(false)}
          aria-label="Close navigation"
        />
      )}

      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumbs">
            <button
              className="icon-button mobile-menu-button"
              onClick={() => setMobileMenu(true)}
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>
            <span>Workspace</span>
            <ChevronRight size={15} />
            <strong>Dashboard</strong>
          </div>
          <div className="topbar-actions">
            <span className="environment-pill">
              <span className="online-dot" /> Development
            </span>
            <button
              className="icon-button notification-button"
              aria-label="Notifications"
              title="Notifications"
            >
              <Bell size={19} />
              <span className="notification-dot" />
            </button>
            <div className="topbar-avatar">SA</div>
          </div>
        </header>

{activeView === "dashboard" && (
  <div className="page-content">
          <section className="page-heading">
            <div>
              <div className="eyebrow"><Sparkles size={14} /> MERCHANT INTELLIGENCE</div>
              <h1>Churn overview<span>.</span></h1>
              <p>Spot the warning signs. Reach out before it's too late.</p>
            </div>
            <div className="heading-actions">
              <button className="button-secondary" onClick={exportCsv}>
                <Download size={16} /> Export
              </button>
              <button
                className="button-primary"
                onClick={handleChurnRefresh}
                disabled={refreshing}
              >
                <RefreshCw size={16} className={refreshing ? "spin" : ""} />
                {refreshing ? "Refreshing..." : "Refresh data"}
              </button>
            </div>
          </section>

          <section className="metrics-grid">
            <MetricCard
              title="Total merchants"
              value={loading && !merchants.length ? "—" : enriched.length}
              subtitle="In your workspace"
              icon={Users}
              tone="blue"
            />
            <MetricCard
              title="High risk"
              value={loading && !merchants.length ? "—" : highCount}
              subtitle="Needs immediate attention"
              icon={AlertTriangle}
              tone="red"
              trend={highCount ? `${highCount} flagged` : null}
            />
            <MetricCard
              title="Medium risk"
              value={loading && !merchants.length ? "—" : mediumCount}
              subtitle="Monitor closely"
              icon={Activity}
              tone="amber"
            />
            <MetricCard
              title="Recent tickets"
              value={loading && !merchants.length ? "—" : totalRecent}
              subtitle="Across all merchants"
              icon={Clock3}
              tone="purple"
            />
          </section>

          {unknownCount > 0 && (
            <div className="data-warning">
              <AlertTriangle size={18} />
              <div>
                <strong>{unknownCount} record{unknownCount === 1 ? "" : "s"} need risk review</strong>
                <p>At least one risk value isn't High, Medium, or Low. It is shown as Unclassified rather than silently treated as valid.</p>
              </div>
            </div>
          )}

          <section className="content-grid">
            <div className="panel merchant-panel">
              <div className="panel-heading">
                <div>
                  <h2>Merchant portfolio</h2>
                  <p>Monitor merchant health and engagement signals.</p>
                </div>
                <button
                  className="icon-button filter-icon"
                  onClick={() => setRiskFilter(riskFilter === "All" ? "High" : "All")}
                  title="Toggle high-risk filter"
                  aria-label="Toggle risk filter"
                >
                  <SlidersHorizontal size={18} />
                </button>
              </div>

              <div className="table-toolbar">
                <div className="search-box">
                  <Search size={17} />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search merchants, IDs, signals..."
                    aria-label="Search merchants"
                  />
                  {search && (
                    <button className="search-clear" onClick={() => setSearch("")} aria-label="Clear search">
                      <X size={14} />
                    </button>
                  )}
                </div>
                <div className="filter-group">
                  {["All", "High", "Medium", "Low", "Unclassified"].map((risk) => (
                    <button
                      key={risk}
                      className={`filter-chip ${riskFilter === risk ? "selected" : ""}`}
                      onClick={() => setRiskFilter(risk)}
                    >
                      {risk}
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <div className="error-panel">
                  <AlertTriangle size={20} />
                  <div>
                    <strong>Couldn't load merchant data</strong>
                    <p>{error}</p>
                    <button className="button-secondary" onClick={() => loadMerchants()}>
                      <RefreshCw size={15} /> Retry
                    </button>
                  </div>
                </div>
              )}

              {loading && !merchants.length && !error ? (
                <div className="loading-state">
                  <span className="loading-spinner" />
                  <strong>Loading merchant signals</strong>
                  <p>Connecting to your Catalyst function...</p>
                </div>
              ) : !error && filtered.length === 0 ? (
                <div className="empty-state">
                  <Search size={24} />
                  <strong>No merchants found</strong>
                  <p>Try a different search or risk filter.</p>
                  <button
                    className="button-secondary"
                    onClick={() => {
                      setSearch("");
                      setRiskFilter("All");
                    }}
                  >
                    Clear filters
                  </button>
                </div>
              ) : (
                !error && (
                  <div className="merchant-list">
                    {filtered.map((merchant) => (
                      <button
                        key={merchant._key}
                        className={`merchant-row ${selected?._key === merchant._key ? "selected" : ""}`}
                        onClick={() => setSelectedId(merchant._key)}
                      >
                        <MerchantAvatar name={merchant._name} />
                        <div className="merchant-main">
                          <strong>{merchant._name}</strong>
                          <span>{merchant.merchant_account_id || "No account ID"}</span>
                        </div>
                        <div className="merchant-signal">
                          <span className="signal-label">PRIMARY SIGNAL</span>
                          <span className="signal-text">{merchant.primary_signal || "No signal recorded"}</span>
                        </div>
                        <div className="merchant-risk">
                          <RiskBadge risk={merchant.risk_level} />
                          <span className="ticket-count">
                            {merchant._recent} recent tickets
                          </span>
                        </div>
                        <ChevronRight size={17} className="row-chevron" />
                      </button>
                    ))}
                  </div>
                )
              )}

              <div className="panel-footer">
                <span>Showing <strong>{filtered.length}</strong> of <strong>{enriched.length}</strong> merchants</span>
                <span className="footer-live"><span className="online-dot" /> Live data</span>
              </div>
            </div>

            <aside className="panel detail-panel">
              <div className="detail-heading">
                <div>
                  <span className="detail-kicker">MERCHANT PROFILE</span>
                  <h2>Risk details</h2>
                </div>
                <button className="icon-button" title="Risk details help" aria-label="Risk details help">
                  <CircleHelp size={18} />
                </button>
              </div>

              {selected ? (
                <>
                  <div className="detail-identity">
                    <MerchantAvatar name={selected._name} />
                    <h3>{selected._name}</h3>
                    <span className="account-id">{selected.merchant_account_id || "No account ID"}</span>
                    <RiskBadge risk={selected.risk_level} />
                  </div>

                  <div className="detail-stats">
                    <div>
                      <span>Recent tickets</span>
                      <strong>{selected._recent}</strong>
                    </div>
                    <div>
                      <span>Baseline tickets</span>
                      <strong>{selected.ticket_count_baseline ?? "—"}</strong>
                    </div>
                  </div>

                  <div className="detail-section">
                    <div className="section-title">
                      <span className="section-icon"><Activity size={15} /></span>
                      <h4>Primary risk signal</h4>
                    </div>
                    <p className="signal-description">{selected.primary_signal || "No primary signal recorded."}</p>
                  </div>

                  <div className="detail-section">
                    <div className="section-title">
                      <span className="section-icon amber"><ShieldAlert size={15} /></span>
                      <h4>Assessment reasoning</h4>
                    </div>
                    <p className="reasoning-text">{selected.reasoning || "No reasoning provided."}</p>
                  </div>

                  <div className="detail-section">
                    <div className="section-title">
                      <span className="section-icon purple"><Database size={15} /></span>
                      <h4>Related tickets</h4>
                    </div>
                    <div className="ticket-tags">
                      {String(selected.related_ticket_ids || "")
                        .split(",")
                        .map((id) => id.trim())
                        .filter(Boolean)
                        .map((id) => <span key={id} className="ticket-tag">{id}</span>)}
                      {!selected.related_ticket_ids && <span className="muted-text">No linked tickets</span>}
                    </div>
                  </div>

                  <div className="detail-footer">
                    <div className="detail-footer-icon"><Clock3 size={16} /></div>
                    <div>
                      <strong>Assessment record</strong>
                      <span>Updated {formatDate(selected.ModifiedTime || selected.CREATEDTIME || selected.created_at)}</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="empty-state detail-empty">
                  <Users size={24} />
                  <strong>Select a merchant</strong>
                  <p>Choose a record to inspect its churn signals.</p>
                </div>
              )}
            </aside>
          </section>

          <footer className="page-footer">
            <span>NorthBridge <span className="footer-separator">/</span> Churn Sentinel</span>
            <span>
              {lastUpdated
                ? `Last synced at ${lastUpdated.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`
                : "Awaiting first sync"}
              <span className="footer-separator"> · </span>
              <button onClick={() => loadMerchants({ quiet: true })}>Sync now <ArrowDownRight size={12} /></button>
            </span>
          </footer>
    </div>
  )}

  {activeView === "features" && (
    <div className="page-content feature-page">
      <section className="page-heading feature-page-heading">
        <div>
          <div className="eyebrow"><Database size={14} /> PRODUCT DEVELOPMENT</div>
          <h1>Feature requests<span>.</span></h1>
          <p className="page-description">
            One view of product decisions, delivery progress, and the support tickets behind each request.
          </p>
        </div>
        <div className="feature-heading-actions">
          <span className="sync-caption">
            <span className="online-dot" />
            {featureLastUpdated
              ? `Synced ${featureLastUpdated.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`
              : "Connected to Projects data"}
          </span>
          <button
            className="button-primary"
            onClick={() => loadFeatureRequests({ quiet: true })}
            disabled={featureLoading || featureRefreshing}
          >
            <RefreshCw size={16} className={featureRefreshing ? "spin" : ""} />
            {featureRefreshing ? "Refreshing..." : "Refresh data"}
          </button>
        </div>
      </section>

      <section className="feature-metrics-grid" aria-label="Feature request summary">
        <article className="feature-metric">
          <span className="feature-metric-label">Total requests</span>
          <strong>{featureRequests.length}</strong>
          <span className="feature-metric-note">Tracked in this workspace</span>
        </article>
        <article className="feature-metric">
          <span className="feature-metric-label">Pending review</span>
          <strong>{featureRequests.filter((item) => /pending|needs information/i.test(featureDecision(item))).length}</strong>
          <span className="feature-metric-note">Awaiting product direction</span>
        </article>
        <article className="feature-metric">
          <span className="feature-metric-label">In development</span>
          <strong>{featureRequests.filter((item) => /in progress|in development|blocked/i.test(featureStatus(item))).length}</strong>
          <span className="feature-metric-note">Work underway or blocked</span>
        </article>
        <article className="feature-metric">
          <span className="feature-metric-label">Completed</span>
          <strong>{featureRequests.filter((item) => /completed|done|closed/i.test(featureStatus(item))).length}</strong>
          <span className="feature-metric-note">Delivery marked complete</span>
        </article>
      </section>

      <section className="panel feature-tracker-panel">
        <div className="feature-tracker-top">
          <div>
            <h2>Development tracker</h2>
            <p>Search and filter requests without losing the link back to support.</p>
          </div>
          <span className="feature-result-count">{filteredFeatureRequests.length} <span>results</span></span>
        </div>

        <div className="feature-toolbar">
          <div className="search-box feature-search">
            <Search size={17} />
            <input
              type="text"
              placeholder="Search title, task ID, decision, or ticket..."
              value={featureSearch}
              onChange={(event) => setFeatureSearch(event.target.value)}
              aria-label="Search feature requests"
            />
            {featureSearch && (
              <button className="search-clear" onClick={() => setFeatureSearch("")} aria-label="Clear search">
                <X size={14} />
              </button>
            )}
          </div>
          <label className="feature-filter">
            <span>Development status</span>
            <select value={featureStatusFilter} onChange={(event) => setFeatureStatusFilter(event.target.value)}>
              {["All", "Not Started", "In Progress", "Blocked", "Completed", "Enquiry"].map((value) => (
                <option key={value} value={value}>{value === "All" ? "All statuses" : value}</option>
              ))}
            </select>
          </label>
          <label className="feature-filter">
            <span>Product decision</span>
            <select value={featureDecisionFilter} onChange={(event) => setFeatureDecisionFilter(event.target.value)}>
              {["All", "Pending Review", "Accepted", "Rejected", "Needs Information", "Deferred", "Not synced"].map((value) => (
                <option key={value} value={value}>{value === "All" ? "All decisions" : value}</option>
              ))}
            </select>
          </label>
          {(featureSearch || featureStatusFilter !== "All" || featureDecisionFilter !== "All") && (
            <button className="feature-clear-filters" onClick={() => {
              setFeatureSearch("");
              setFeatureStatusFilter("All");
              setFeatureDecisionFilter("All");
            }}>Clear filters</button>
          )}
        </div>

        {featureError && (
          <div className="error-message">
            <AlertTriangle size={18} />
            <div><strong>Couldn't load feature requests</strong><p>{featureError}</p></div>
            <button className="button-secondary" onClick={() => loadFeatureRequests()}>Try again</button>
          </div>
        )}

        {featureLoading ? (
          <div className="feature-empty-state"><span className="loading-spinner" /><strong>Loading feature requests</strong><p>Fetching the latest project and ticket links.</p></div>
        ) : filteredFeatureRequests.length === 0 ? (
          <div className="feature-empty-state">
            <Search size={24} />
            <strong>{featureRequests.length === 0 ? "No feature requests yet" : "No matching requests"}</strong>
            <p>{featureRequests.length === 0 ? "Requests will appear here when the dashboard sync receives them." : "Try changing your search or filters."}</p>
            {featureRequests.length > 0 && <button className="button-secondary" onClick={() => {
              setFeatureSearch("");
              setFeatureStatusFilter("All");
              setFeatureDecisionFilter("All");
            }}>Reset filters</button>}
          </div>
        ) : (
          <div className="feature-request-list">
            {paginatedFeatureRequests.map((feature) => {
              const status = featureStatus(feature);
              const decision = featureDecision(feature);
              const taskLabel = feature.task_prefix || feature.task_key || feature.task_id || "—";
              const projectLabel = feature.project_name || feature.project || feature.project_id || "—";
              return (
                <article className="feature-request-card" key={`${feature.project_id}-${feature.task_id}`}>
                  <div className="feature-card-main">
                    <div className="feature-card-icon"><Database size={18} /></div>
                    <div className="feature-card-title">
                      <h3>{feature.feature_title || "Untitled feature"}</h3>
                      <div className="feature-identifiers">
                        <span>Task <strong>{taskLabel}</strong></span>
                        <span className="identifier-separator">·</span>
                        <span>{projectLabel}</span>
                      </div>
                    </div>
                    <span className={`feature-status-badge ${status.toLowerCase().replace(/[^a-z]+/g, "-")}`}>{status}</span>
                  </div>

                  <div className="feature-card-details">
                    <div className="feature-detail-item">
                      <span>PRODUCT DECISION</span>
                      <strong className={`decision-value ${decision.toLowerCase().replace(/[^a-z]+/g, "-")}`}>{decision}</strong>
                    </div>
                    <div className="feature-detail-item">
                      <span>DEVELOPMENT STATUS</span>
                      <strong>{status}</strong>
                    </div>
                    <div className="feature-detail-item">
                      <span>RELEASE</span>
                      <strong>{feature.release_version || "Not assigned"}</strong>
                    </div>
                    <div className="feature-detail-item">
                      <span>LINKED TICKETS</span>
                      <strong>{feature.linked_tickets?.length || 0}</strong>
                    </div>
                  </div>

                  <div className="feature-linked-tickets">
                    <div className="linked-tickets-heading">
                      <strong>Support tickets</strong>
                      <span>{feature.linked_tickets?.length ? `${feature.linked_tickets.length} linked` : "No links available"}</span>
                    </div>
                    {!feature.linked_tickets?.length ? (
                      <span className="no-ticket-note">No Desk tickets are linked to this task yet.</span>
                    ) : (
                      <div className="feature-ticket-tags">
                        {feature.linked_tickets.map((ticket, index) => (
                          <span className="feature-ticket-tag" key={`${ticket.ticket_id}-${index}`}>
                            <span className="ticket-number">{ticket.ticket_id || "Ticket"}</span>
                            <span className={`ticket-status-dot ${String(ticket.ticket_status || "").toLowerCase().replace(/[^a-z]+/g, "-")}`} />
                            {ticket.ticket_status || "Unknown status"}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
        {filteredFeatureRequests.length > 0 && (
          <div className="feature-pagination" aria-label="Feature request pagination">
            <span className="feature-pagination-summary">
              Showing <strong>{featureStartIndex + 1}–{Math.min(featureStartIndex + FEATURE_PAGE_SIZE, filteredFeatureRequests.length)}</strong> of <strong>{filteredFeatureRequests.length}</strong> matching requests
            </span>
            {featurePageCount > 1 && (
              <nav className="feature-pagination-controls" aria-label="Pages">
                <button
                  type="button"
                  className="feature-page-button feature-page-nav"
                  onClick={() => setFeaturePage((page) => Math.max(1, page - 1))}
                  disabled={currentFeaturePage === 1}
                  aria-label="Previous page"
                >
                  <ChevronLeft size={14} />
                  <span>Previous</span>
                </button>
                {Array.from({ length: featurePageCount }, (_, index) => index + 1).map((page) => (
                  <button
                    type="button"
                    key={page}
                    className={`feature-page-button ${currentFeaturePage === page ? "active" : ""}`}
                    onClick={() => setFeaturePage(page)}
                    aria-label={`Page ${page}`}
                    aria-current={currentFeaturePage === page ? "page" : undefined}
                  >
                    {page}
                  </button>
                ))}
                <button
                  type="button"
                  className="feature-page-button feature-page-nav"
                  onClick={() => setFeaturePage((page) => Math.min(featurePageCount, page + 1))}
                  disabled={currentFeaturePage === featurePageCount}
                  aria-label="Next page"
                >
                  <span>Next</span>
                  <ChevronRight size={14} />
                </button>
              </nav>
            )}
          </div>
        )}
        <div className="feature-tracker-footer">
          <span><strong>{filteredFeatureRequests.length}</strong> matching · <strong>{featureRequests.length}</strong> total requests</span>
          <span><span className="online-dot" /> Source: NorthBridge Catalyst sync</span>
        </div>
      </section>
      <footer className="page-footer">
        <span>NorthBridge <span className="footer-separator">/</span> Product development</span>
        <span>Product decisions and development status are displayed separately.</span>
      </footer>
    </div>
  )}
  </main>
    </div>
  );
}

export default App;
