import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  Search,
  Droplets,
  Fish,
  X,
  ChevronRight,
  Settings,
  Palette,
  Check,
  LayoutDashboard,
  Activity,
  AlertTriangle,
  HeartPulse,
  BarChart3,
} from "lucide-react";

import { supabase } from "./lib/supabase";
import type {
  Tank,
  TankParameter,
  WaterChange,
} from "./types";

/* =========================================================
   TYPES
========================================================= */

type Modal =
  | "tank"
  | "parameter"
  | "change"
  | null;

type Tab =
  | "overview"
  | "parameters"
  | "changes"
  | "history";

type Page = "dashboard" | "tank";

type Theme =
  | "ocean"
  | "coral"
  | "tropical"
  | "space"
  | "sunset"
  | "planted";

type CardStyle =
  | "rounded"
  | "sharp";

type Density =
  | "comfortable"
  | "compact";

type TextSize =
  | "normal"
  | "large";

type HistoryRange =
  | "7"
  | "30"
  | "90"
  | "all";

type GraphMode =
  | "parameter"
  | "changes";

/* =========================================================
   HELPERS
========================================================= */

const num = (v: string) =>
  v === "" ? null : Number(v);

const iso = (v: string) =>
  new Date(v).toISOString();

const fmt = (v: string) =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(v));

const shortDate = (v: string) =>
  new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(new Date(v));

const daysAgo = (days: number) =>
  new Date(
    Date.now() -
      days * 24 * 60 * 60 * 1000
  );

function validNumber(
  value: number | null | undefined
) {
  return (
    value !== null &&
    value !== undefined &&
    Number.isFinite(Number(value))
  );
}

/* =========================================================
   APP
========================================================= */

function App() {
  const [tanks, setTanks] = useState<Tank[]>(
    []
  );

  const [params, setParams] = useState<
    TankParameter[]
  >([]);

  const [changes, setChanges] = useState<
    WaterChange[]
  >([]);

  const [selected, setSelected] =
    useState<string | null>(null);

  const [page, setPage] =
    useState<Page>("dashboard");

  const [tab, setTab] =
    useState<Tab>("overview");

  const [menuOpen, setMenuOpen] =
    useState(false);

  const [settingsOpen, setSettingsOpen] =
    useState(false);

  const [modal, setModal] =
    useState<Modal>(null);

  const [edit, setEdit] =
    useState<any>(null);

  const [query, setQuery] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [draggedTankId, setDraggedTankId] =
    useState<string | null>(null);

  const [theme, setTheme] =
    useState<Theme>(() => {
      const saved =
        localStorage.getItem(
          "tank-theme"
        );

      return (
        (saved as Theme) ||
        "ocean"
      );
    });

  const [cardStyle, setCardStyle] =
    useState<CardStyle>(() => {
      const saved =
        localStorage.getItem(
          "tank-card-style"
        );

      return (
        (saved as CardStyle) ||
        "rounded"
      );
    });

  const [density, setDensity] =
    useState<Density>(() => {
      const saved =
        localStorage.getItem(
          "tank-density"
        );

      return (
        (saved as Density) ||
        "comfortable"
      );
    });

  const [textSize, setTextSize] =
    useState<TextSize>(() => {
      const saved =
        localStorage.getItem(
          "tank-text-size"
        );

      return (
        (saved as TextSize) ||
        "normal"
      );
    });

  /* =======================================================
     SETTINGS PERSISTENCE
  ======================================================= */

  useEffect(() => {
    localStorage.setItem(
      "tank-theme",
      theme
    );
  }, [theme]);

  useEffect(() => {
    localStorage.setItem(
      "tank-card-style",
      cardStyle
    );
  }, [cardStyle]);

  useEffect(() => {
    localStorage.setItem(
      "tank-density",
      density
    );
  }, [density]);

  useEffect(() => {
    localStorage.setItem(
      "tank-text-size",
      textSize
    );
  }, [textSize]);

  /* =======================================================
     LOAD DATA
  ======================================================= */

  const load = async () => {
    setLoading(true);

    const [t, p, c] =
      await Promise.all([
        supabase
          .from("tanks")
          .select("*")
          .order(
            "sort_order",
            {
              ascending: true,
            }
          ),

        supabase
          .from("tank_parameters")
          .select("*")
          .order(
            "measured_at",
            {
              ascending: false,
            }
          ),

        supabase
          .from("water_changes")
          .select("*")
          .order(
            "completed_at",
            {
              ascending: false,
            }
          ),
      ]);

    if (
      t.error ||
      p.error ||
      c.error
    ) {
      alert(
        (
          t.error ||
          p.error ||
          c.error
        )?.message
      );
    }

    const tankData =
      (t.data || []) as Tank[];

    setTanks(tankData);

    setParams(
      (p.data ||
        []) as TankParameter[]
    );

    setChanges(
      (c.data ||
        []) as WaterChange[]
    );

    setSelected((current) =>
      tankData.some(
        (x) => x.id === current
      )
        ? current
        : tankData[0]?.id || null
    );

    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  /* =======================================================
     SELECTED TANK
  ======================================================= */

  const tank =
    tanks.find(
      (x) => x.id === selected
    ) || null;

  const tankParams = useMemo(
    () =>
      params
        .filter(
          (x) =>
            x.tank_id === selected
        )
        .sort(
          (a, b) =>
            +new Date(
              b.measured_at
            ) -
            +new Date(
              a.measured_at
            )
        ),
    [params, selected]
  );

  const tankChanges = useMemo(
    () =>
      changes
        .filter(
          (x) =>
            x.tank_id === selected
        )
        .sort(
          (a, b) =>
            +new Date(
              b.completed_at
            ) -
            +new Date(
              a.completed_at
            )
        ),
    [changes, selected]
  );

  /* =======================================================
     MODALS
  ======================================================= */

  const open = (
    m: Modal,
    x: any = null
  ) => {
    setEdit(x);
    setModal(m);
  };

  /* =======================================================
     NAVIGATION
  ======================================================= */

  const showDashboard = () => {
    setPage("dashboard");
    setTab("overview");
    setMenuOpen(false);
  };

  const showTank = (
    id: string
  ) => {
    setSelected(id);
    setPage("tank");
    setTab("overview");
    setMenuOpen(false);
  };

  /* =======================================================
     DELETE
  ======================================================= */

  const del = async (
    table: string,
    id: string
  ) => {
    if (
      !confirm(
        "Delete this record?"
      )
    ) {
      return;
    }

    const { error } =
      await supabase
        .from(table)
        .delete()
        .eq("id", id);

    if (error) {
      alert(error.message);
    } else {
      await load();
    }
  };

  /* =======================================================
     TANK REORDER
  ======================================================= */

  const reorderTanks = async (
    fromIndex: number,
    toIndex: number
  ) => {
    if (
      fromIndex === toIndex
    ) {
      return;
    }

    const reordered = [
      ...tanks,
    ];

    const [
      movedTank,
    ] = reordered.splice(
      fromIndex,
      1
    );

    reordered.splice(
      toIndex,
      0,
      movedTank
    );

    setTanks(reordered);

    const updates =
      reordered.map(
        (item, index) => ({
          id: item.id,
          sort_order: index,
        })
      );

    const results =
      await Promise.all(
        updates.map(
          (item) =>
            supabase
              .from("tanks")
              .update({
                sort_order:
                  item.sort_order,
              })
              .eq(
                "id",
                item.id
              )
        )
      );

    const error =
      results.find(
        (result) =>
          result.error
      )?.error;

    if (error) {
      alert(
        `Could not save tank order: ${error.message}`
      );

      await load();
    }
  };

  /* =======================================================
     MAIN UI
  ======================================================= */

  return (
    <div
      className={`app theme-${theme} cards-${cardStyle} density-${density} text-${textSize}`}
    >
      <header>
        <button
          className="menu-button"
          onClick={() =>
            setMenuOpen(true)
          }
          aria-label="Open menu"
        >
          ☰
        </button>

        <div className="brand">
          <span>🐟</span>

          <div>
            <b>
              Tank Tracker
            </b>

            <small>
              Aquarium control centre
            </small>
          </div>
        </div>

        <div className="actions">
          <button
            className="icon settings-button"
            onClick={() =>
              setSettingsOpen(
                true
              )
            }
            aria-label="Settings"
          >
            <Settings size={17} />
          </button>

          <button
            className="icon"
            onClick={load}
            aria-label="Refresh"
          >
            <RefreshCw
              size={17}
            />
          </button>

          <button
            className="primary"
            onClick={() =>
              open("tank")
            }
          >
            <Plus size={17} />
            Add tank
          </button>
        </div>
      </header>

      <main>
        <aside
          className={
            menuOpen
              ? "open"
              : ""
          }
        >
          <div className="mobile-menu-head">
            <b>
              Tank Tracker
            </b>

            <button
              className="icon"
              onClick={() =>
                setMenuOpen(
                  false
                )
              }
            >
              <X size={18} />
            </button>
          </div>

          {/* Dashboard */}

          <button
            className={`tank ${
              page ===
              "dashboard"
                ? "sel"
                : ""
            }`}
            onClick={
              showDashboard
            }
          >
            <span className="tankicon">
              <LayoutDashboard
                size={17}
              />
            </span>

            <span>
              <b>
                Dashboard
              </b>

              <small>
                All tanks
              </small>
            </span>

            <ChevronRight
              size={16}
            />
          </button>

          <div className="side-head">
            <div>
              <small>
                YOUR TANKS
              </small>

              <strong>
                {tanks.length}
              </strong>
            </div>

            <button
              className="icon"
              onClick={() =>
                open("tank")
              }
            >
              <Plus size={16} />
            </button>
          </div>

          <div className="search">
            <Search
              size={15}
            />

            <input
              value={query}
              onChange={(e) =>
                setQuery(
                  e.target.value
                )
              }
              placeholder="Find a tank..."
            />
          </div>

          {loading ? (
            <p className="muted">
              Loading…
            </p>
          ) : (
            tanks
              .filter((x) =>
                x.name
                  .toLowerCase()
                  .includes(
                    query.toLowerCase()
                  )
              )
              .map((x) => (
                <button
                  key={x.id}
                  className={
                    "tank " +
                    (page ===
                      "tank" &&
                    x.id ===
                      selected
                      ? "sel "
                      : "") +
                    (draggedTankId ===
                    x.id
                      ? "dragging"
                      : "")
                  }
                  draggable
                  onClick={() =>
                    showTank(x.id)
                  }
                  onDragStart={(
                    e
                  ) => {
                    setDraggedTankId(
                      x.id
                    );

                    e.dataTransfer.effectAllowed =
                      "move";

                    e.dataTransfer.setData(
                      "text/plain",
                      x.id
                    );
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();

                    e.dataTransfer.dropEffect =
                      "move";
                  }}
                  onDrop={(e) => {
                    e.preventDefault();

                    const draggedId =
                      e.dataTransfer.getData(
                        "text/plain"
                      );

                    const fromIndex =
                      tanks.findIndex(
                        (tank) =>
                          tank.id ===
                          draggedId
                      );

                    const toIndex =
                      tanks.findIndex(
                        (tank) =>
                          tank.id ===
                          x.id
                      );

                    if (
                      fromIndex !==
                        -1 &&
                      toIndex !==
                        -1
                    ) {
                      reorderTanks(
                        fromIndex,
                        toIndex
                      );
                    }

                    setDraggedTankId(
                      null
                    );
                  }}
                  onDragEnd={() =>
                    setDraggedTankId(
                      null
                    )
                  }
                >
                  <span className="tankicon">
                    <Fish size={17} />
                  </span>

                  <span>
                    <b>
                      {x.name}
                    </b>

                    <small>
                      {x.volume
                        ? `${x.volume} L`
                        : "No volume"}
                    </small>
                  </span>

                  <ChevronRight
                    size={16}
                  />
                </button>
              ))
          )}
        </aside>

        {menuOpen && (
          <div
            className="menu-overlay"
            onClick={() =>
              setMenuOpen(
                false
              )
            }
          />
        )}

        <section className="content">
          {page ===
            "dashboard" ? (
            <Dashboard
              tanks={tanks}
              params={params}
              changes={changes}
              loading={loading}
              openTank={showTank}
              addTank={() =>
                open("tank")
              }
            />
          ) : !tank ? (
            <div className="empty">
              <div>🐠</div>

              <h1>
                Tank not found.
              </h1>

              <button
                className="primary"
                onClick={
                  showDashboard
                }
              >
                Back to dashboard
              </button>
            </div>
          ) : (
            <TankPage
              tank={tank}
              params={tankParams}
              changes={tankChanges}
              tab={tab}
              setTab={setTab}
              open={open}
              del={del}
            />
          )}
        </section>
      </main>

      {/* =====================================================
          MODALS
      ===================================================== */}

      {modal === "tank" && (
        <TankModal
          row={edit}
          close={() =>
            setModal(null)
          }
          done={load}
        />
      )}

      {modal ===
        "parameter" &&
        tank && (
          <ParameterModal
            tank={tank.id}
            row={edit}
            close={() =>
              setModal(null)
            }
            done={load}
          />
        )}

      {modal ===
        "change" &&
        tank && (
          <ChangeModal
            tank={tank.id}
            row={edit}
            close={() =>
              setModal(null)
            }
            done={load}
          />
        )}

      {/* =====================================================
          SETTINGS
      ===================================================== */}

      {settingsOpen && (
        <SettingsPanel
          theme={theme}
          setTheme={setTheme}
          cardStyle={cardStyle}
          setCardStyle={
            setCardStyle
          }
          density={density}
          setDensity={setDensity}
          textSize={textSize}
          setTextSize={
            setTextSize
          }
          close={() =>
            setSettingsOpen(
              false
            )
          }
        />
      )}
    </div>
  );
}

/* =========================================================
   DASHBOARD
========================================================= */

function Dashboard({
  tanks,
  params,
  changes,
  loading,
  openTank,
  addTank,
}: {
  tanks: Tank[];
  params: TankParameter[];
  changes: WaterChange[];
  loading: boolean;
  openTank: (
    id: string
  ) => void;
  addTank: () => void;
}) {
  const tankStats =
    useMemo(() => {
      return tanks.map(
        (tank) => {
          const latest =
            params
              .filter(
                (x) =>
                  x.tank_id ===
                  tank.id
              )
              .sort(
                (a, b) =>
                  +new Date(
                    b.measured_at
                  ) -
                  +new Date(
                    a.measured_at
                  )
              )[0];

          const latestChange =
            changes
              .filter(
                (x) =>
                  x.tank_id ===
                  tank.id
              )
              .sort(
                (a, b) =>
                  +new Date(
                    b.completed_at
                  ) -
                  +new Date(
                    a.completed_at
                  )
              )[0];

          return {
            tank,
            latest,
            latestChange,
          };
        }
      );
    }, [
      tanks,
      params,
      changes,
    ]);

  const totalVolume =
    tanks.reduce(
      (sum, tank) =>
        sum +
        (Number(
          tank.volume
        ) || 0),
      0
    );

  const healthy =
    tankStats.filter(
      (x) =>
        getTankHealth(
          x.latest
        ).status ===
        "healthy"
    ).length;

  const needsAttention =
    tanks.length -
    healthy;

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <div className="dashboard-eyebrow">
            AQUARIUM CONTROL CENTRE
          </div>

          <h1 className="dashboard-title">
            Dashboard
          </h1>

          <p className="dashboard-subtitle">
            A quick overview of
            all your aquariums.
          </p>
        </div>

        <div className="dashboard-actions">
          <button
            className="primary"
            onClick={addTank}
          >
            <Plus size={16} />
            Add tank
          </button>
        </div>
      </div>

      {loading ? (
        <div className="panel">
          <p className="muted">
            Loading tanks…
          </p>
        </div>
      ) : !tanks.length ? (
        <div className="empty">
          <div>🐠</div>

          <h1>
            Your aquarium
            dashboard starts
            here.
          </h1>

          <p>
            Add your first tank
            to start tracking
            parameters, water
            changes and aquarium
            history.
          </p>

          <button
            className="primary"
            onClick={addTank}
          >
            <Plus size={17} />
            Add your first tank
          </button>
        </div>
      ) : (
        <>
          {/* SUMMARY */}

          <div className="metrics">
            <div className="metric">
              <small>
                TOTAL TANKS
              </small>

              <b>
                {tanks.length}
              </b>
            </div>

            <div className="metric">
              <small>
                TOTAL WATER
              </small>

              <b>
                {totalVolume
                  ? `${totalVolume} L`
                  : "—"}
              </b>
            </div>

            <div className="metric">
              <small>
                HEALTHY
              </small>

              <b>
                {healthy}
                <span
                  style={{
                    color:
                      "var(--text-muted)",
                    fontSize:
                      "12px",
                    marginLeft:
                      "5px",
                  }}
                >
                  / {tanks.length}
                </span>
              </b>
            </div>
          </div>

          {/* ATTENTION */}

          {needsAttention >
            0 && (
            <div className="dashboard-card wide">
              <div className="dashboard-card-header">
                <div>
                  <h3 className="dashboard-card-title">
                    <AlertTriangle
                      size={16}
                      style={{
                        color:
                          "var(--warning)",
                        marginRight:
                          "7px",
                        verticalAlign:
                          "middle",
                      }}
                    />
                    Tanks to check
                  </h3>

                  <p className="dashboard-card-subtitle">
                    Some tanks may need
                    your attention.
                  </p>
                </div>
              </div>

              {tankStats
                .filter(
                  (x) =>
                    getTankHealth(
                      x.latest
                    ).status !==
                    "healthy"
                )
                .map((x) => (
                  <TankAlert
                    key={
                      x.tank.id
                    }
                    tank={x.tank}
                    parameter={
                      x.latest
                    }
                    onClick={() =>
                      openTank(
                        x.tank.id
                      )
                    }
                  />
                ))}
            </div>
          )}

          {/* TANKS */}

          <div
            className="dashboard-card"
            style={{
              marginTop:
                "12px",
            }}
          >
            <div className="dashboard-card-header">
              <div>
                <h3 className="dashboard-card-title">
                  Your tanks
                </h3>

                <p className="dashboard-card-subtitle">
                  Latest recorded
                  readings.
                </p>
              </div>
            </div>

            <div className="tank-overview-grid">
              {tankStats.map(
                (x) => (
                  <TankOverviewCard
                    key={
                      x.tank.id
                    }
                    tank={
                      x.tank
                    }
                    parameter={
                      x.latest
                    }
                    change={
                      x.latestChange
                    }
                    onClick={() =>
                      openTank(
                        x.tank.id
                      )
                    }
                  />
                )
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* =========================================================
   TANK OVERVIEW CARD
========================================================= */

function TankOverviewCard({
  tank,
  parameter,
  change,
  onClick,
}: {
  tank: Tank;
  parameter?: TankParameter;
  change?: WaterChange;
  onClick: () => void;
}) {
  const health =
    getTankHealth(
      parameter
    );

  return (
    <div
      className="tank-overview-card"
      onClick={onClick}
    >
      <div className="tank-overview-header">
        <div className="tank-overview-name">
          <span className="tank-overview-name-icon">
            <Fish size={18} />
          </span>

          <span>
            <b>{tank.name}</b>

            <small>
              {tank.volume
                ? `${tank.volume} L`
                : "Volume not set"}
            </small>
          </span>
        </div>

        <span
          className={`status status-${health.status}`}
        >
          {health.label}
        </span>
      </div>

      <div className="tank-overview-params">
        <MiniParameter
          label="pH"
          value={
            parameter?.ph
          }
        />

        <MiniParameter
          label="Temp"
          value={
            validNumber(
              parameter?.temperature
            )
              ? `${parameter?.temperature}°`
              : null
          }
        />

        <MiniParameter
          label="NH₃"
          value={
            parameter?.ammonia
          }
        />

        <MiniParameter
          label="NO₂"
          value={
            parameter?.nitrite
          }
        />
      </div>

      {parameter ? (
        <p
          className="muted"
          style={{
            margin:
              "12px 0 0",
            fontSize:
              "10px",
          }}
        >
          Tested{" "}
          {fmt(
            parameter.measured_at
          )}
        </p>
      ) : (
        <p
          className="muted"
          style={{
            margin:
              "12px 0 0",
            fontSize:
              "10px",
          }}
        >
          No water tests
          recorded yet.
        </p>
      )}

      {change && (
        <p
          className="muted"
          style={{
            margin:
              "4px 0 0",
            fontSize:
              "10px",
          }}
        >
          Last change:{" "}
          {
            change.amount_changed_liters
          }{" "}
          L
        </p>
      )}
    </div>
  );
}

function MiniParameter({
  label,
  value,
}: {
  label: string;
  value:
    | string
    | number
    | null
    | undefined;
}) {
  return (
    <div className="tank-overview-param">
      <small>{label}</small>

      <b>
        {value ===
          null ||
        value ===
          undefined ||
        value === ""
          ? "—"
          : value}
      </b>
    </div>
  );
}

/* =========================================================
   HEALTH
========================================================= */

function getTankHealth(
  parameter?: TankParameter
): {
  status:
    | "healthy"
    | "warning"
    | "danger";
  label: string;
} {
  if (!parameter) {
    return {
      status: "warning",
      label: "No data",
    };
  }

  if (
    validNumber(
      parameter.ammonia
    ) &&
    Number(
      parameter.ammonia
    ) > 0.25
  ) {
    return {
      status: "danger",
      label: "Check NH₃",
    };
  }

  if (
    validNumber(
      parameter.nitrite
    ) &&
    Number(
      parameter.nitrite
    ) > 0.25
  ) {
    return {
      status: "danger",
      label: "Check NO₂",
    };
  }

  if (
    validNumber(
      parameter.ph
    ) &&
    (Number(parameter.ph) <
      5 ||
      Number(parameter.ph) >
        9)
  ) {
    return {
      status: "warning",
      label: "Check pH",
    };
  }

  if (
    validNumber(
      parameter.nitrate
    ) &&
    Number(
      parameter.nitrate
    ) > 40
  ) {
    return {
      status: "warning",
      label: "High NO₃",
    };
  }

  return {
    status: "healthy",
    label: "Healthy",
  };
}

/* =========================================================
   TANK ALERT
========================================================= */

function TankAlert({
  tank,
  parameter,
  onClick,
}: {
  tank: Tank;
  parameter?: TankParameter;
  onClick: () => void;
}) {
  const health =
    getTankHealth(
      parameter
    );

  return (
    <button
      className="alert-card"
      onClick={onClick}
      style={{
        width: "100%",
        textAlign: "left",
        cursor: "pointer",
      }}
    >
      <span className="alert-icon">
        <HeartPulse
          size={17}
        />
      </span>

      <span className="alert-card-content">
        <b>
          {tank.name} —{" "}
          {health.label}
        </b>

        <small>
          {parameter
            ? `Latest test: ${fmt(
                parameter.measured_at
              )}`
            : "No parameter data has been recorded."}
        </small>
      </span>

      <ChevronRight
        size={16}
      />
    </button>
  );
}

/* =========================================================
   TANK PAGE
========================================================= */

function TankPage({
  tank,
  params,
  changes,
  tab,
  setTab,
  open,
  del,
}: {
  tank: Tank;
  params: TankParameter[];
  changes: WaterChange[];
  tab: Tab;
  setTab: (
    tab: Tab
  ) => void;
  open: (
    modal: Modal,
    row?: any
  ) => void;
  del: (
    table: string,
    id: string
  ) => void;
}) {
  const latest =
    params[0];

  return (
    <>
      <div className="head">
        <div>
          <small>
            AQUARIUM
          </small>

          <h1>
            {tank.name}
          </h1>

          <p>
            {tank.volume
              ? `${tank.volume} L`
              : "Volume not set"}

            {tank.notes
              ? ` · ${tank.notes}`
              : ""}
          </p>
        </div>

        <div>
          <button
            className="secondary"
            onClick={() =>
              open(
                "tank",
                tank
              )
            }
          >
            <Pencil
              size={15}
            />
            Edit
          </button>

          <button
            className="danger"
            onClick={() =>
              del(
                "tanks",
                tank.id
              )
            }
          >
            <Trash2
              size={15}
            />
          </button>
        </div>
      </div>

      <div className="tabs">
        {(
          [
            "overview",
            "history",
            "parameters",
            "changes",
          ] as Tab[]
        ).map((x) => (
          <button
            key={x}
            className={
              tab === x
                ? "active"
                : ""
            }
            onClick={() =>
              setTab(x)
            }
          >
            {x ===
              "overview" &&
              "◉"}

            {x ===
              "history" &&
              "📈"}

            {x ===
              "parameters" &&
              "🧪"}

            {x ===
              "changes" &&
              "💧"}{" "}
            {x}
          </button>
        ))}
      </div>

      {tab ===
        "overview" && (
        <TankOverview
          parameter={latest}
          changes={changes}
          goParameters={() =>
            setTab(
              "parameters"
            )
          }
          goChanges={() =>
            setTab("changes")
          }
          goHistory={() =>
            setTab("history")
          }
        />
      )}

      {tab === "history" && (
        <History
          params={params}
          changes={changes}
        />
      )}

      {tab ===
        "parameters" && (
        <Parameters
          rows={params}
          add={() =>
            open(
              "parameter"
            )
          }
          edit={open}
          del={del}
        />
      )}

      {tab ===
        "changes" && (
        <Changes
          rows={changes}
          add={() =>
            open("change")
          }
          edit={open}
          del={del}
        />
      )}
    </>
  );
}

/* =========================================================
   TANK OVERVIEW
========================================================= */

function TankOverview({
  parameter,
  changes,
  goParameters,
  goChanges,
  goHistory,
}: {
  parameter?: TankParameter;
  changes: WaterChange[];
  goParameters: () => void;
  goChanges: () => void;
  goHistory: () => void;
}) {
  const values: [
    string,
    any,
    string
  ][] = [
    [
      "pH",
      parameter?.ph ??
        null,
      "",
    ],
    [
      "Temperature",
      parameter?.temperature ??
        null,
      "°C",
    ],
    [
      "Ammonia",
      parameter?.ammonia ??
        null,
      " ppm",
    ],
    [
      "Nitrite",
      parameter?.nitrite ??
        null,
      " ppm",
    ],
    [
      "Nitrate",
      parameter?.nitrate ??
        null,
      " ppm",
    ],
    [
      "GH",
      parameter?.gh ??
        null,
      " dGH",
    ],
    [
      "KH",
      parameter?.kh ??
        null,
      " dKH",
    ],
    [
      "TDS",
      parameter?.tds ??
        null,
      " ppm",
    ],
    [
      "Salinity",
      parameter?.salinity ??
        null,
      "",
    ],
  ];

  const health =
    getTankHealth(
      parameter
    );

  return (
    <>
      <div
        className={`alert-card ${
          health.status ===
          "healthy"
            ? "good"
            : health.status
        }`}
        style={{
          marginBottom:
            "16px",
        }}
      >
        <span className="alert-icon">
          <HeartPulse
            size={18}
          />
        </span>

        <span className="alert-card-content">
          <b>
            Aquarium status:{" "}
            {
              health.label
            }
          </b>

          <small>
            {parameter
              ? `Based on the latest water test from ${fmt(
                  parameter.measured_at
                )}.`
              : "Add a water test to begin monitoring this tank."}
          </small>
        </span>
      </div>

      <div className="metrics">
        {values.map(
          (x) => (
            <div
              className="metric"
              key={x[0]}
            >
              <small>
                {x[0]}
              </small>

              <b>
                {x[1] == null
                  ? "—"
                  : x[1] +
                    x[2]}
              </b>
            </div>
          )
        )}
      </div>

      <div className="twocol">
        <div className="panel">
          <div className="panelhead">
            <div>
              <small>
                LATEST
              </small>

              <h3>
                Water parameters
              </h3>
            </div>

            <button
              onClick={
                goParameters
              }
            >
              View all
            </button>
          </div>

          <p className="muted">
            {parameter
              ? `Last tested ${fmt(
                  parameter.measured_at
                )}`
              : "No parameter logs yet."}
          </p>
        </div>

        <div className="panel">
          <div className="panelhead">
            <div>
              <small>
                RECENT
              </small>

              <h3>
                Water changes
              </h3>
            </div>

            <button
              onClick={
                goChanges
              }
            >
              View all
            </button>
          </div>

          {changes
            .slice(0, 3)
            .map((x) => (
              <div
                className="activity"
                key={x.id}
              >
                <Droplets
                  size={16}
                />

                <span>
                  <b>
                    {
                      x.amount_changed_liters
                    }{" "}
                    L
                  </b>

                  <small>
                    {fmt(
                      x.completed_at
                    )}
                  </small>
                </span>
              </div>
            ))}

          {!changes.length && (
            <p className="muted">
              No water changes
              yet.
            </p>
          )}
        </div>
      </div>

      <div
        className="panel"
        style={{
          marginTop:
            "12px",
        }}
      >
        <div className="panelhead">
          <div>
            <small>
              HISTORY
            </small>

            <h3>
              Water history
            </h3>
          </div>

          <button
            onClick={
              goHistory
            }
          >
            View graphs
          </button>
        </div>

        <p className="muted">
          View how your water
          parameters and water
          changes have changed
          over time.
        </p>
      </div>
    </>
  );
}

/* =========================================================
   HISTORY
========================================================= */

function History({
  params,
  changes,
}: {
  params: TankParameter[];
  changes: WaterChange[];
}) {
  const [
    mode,
    setMode,
  ] =
    useState<GraphMode>(
      "parameter"
    );

  const [
    parameter,
    setParameter,
  ] =
    useState<
      keyof TankParameter
    >("ph");

  const [
    range,
    setRange,
  ] =
    useState<HistoryRange>(
      "30"
    );

  const filteredParams =
    useMemo(() => {
      if (
        range ===
        "all"
      ) {
        return [
          ...params,
        ];
      }

      const cutoff =
        daysAgo(
          Number(range)
        );

      return params.filter(
        (x) =>
          new Date(
            x.measured_at
          ) >= cutoff
      );
    }, [
      params,
      range,
    ]);

  const filteredChanges =
    useMemo(() => {
      if (
        range ===
        "all"
      ) {
        return [
          ...changes,
        ];
      }

      const cutoff =
        daysAgo(
          Number(range)
        );

      return changes.filter(
        (x) =>
          new Date(
            x.completed_at
          ) >= cutoff
      );
    }, [
      changes,
      range,
    ]);

  return (
    <div className="panel">
      <div className="chart-header">
        <div>
          <small className="dashboard-eyebrow">
            AQUARIUM HISTORY
          </small>

          <h3 className="chart-title">
            Water history
          </h3>

          <p className="chart-subtitle">
            Track changes to your
            aquarium over time.
          </p>
        </div>

        <div className="chart-controls">
          {(
            [
              "7",
              "30",
              "90",
              "all",
            ] as HistoryRange[]
          ).map((x) => (
            <button
              key={x}
              className={`chart-control ${
                range === x
                  ? "active"
                  : ""
              }`}
              onClick={() =>
                setRange(x)
              }
            >
              {x === "all"
                ? "All"
                : `${x}d`}
            </button>
          ))}
        </div>
      </div>

      <div className="chart-controls">
        <button
          className={`chart-control ${
            mode ===
            "parameter"
              ? "active"
              : ""
          }`}
          onClick={() =>
            setMode(
              "parameter"
            )
          }
        >
          <Activity
            size={13}
          />{" "}
          Parameters
        </button>

        <button
          className={`chart-control ${
            mode ===
            "changes"
              ? "active"
              : ""
          }`}
          onClick={() =>
            setMode("changes")
          }
        >
          <Droplets
            size={13}
          />{" "}
          Water changes
        </button>
      </div>

      {mode ===
        "parameter" && (
        <>
          <div
            className="chart-controls"
            style={{
              marginTop:
                "12px",
            }}
          >
            {[
              [
                "pH",
                "ph",
              ],
              [
                "Temperature",
                "temperature",
              ],
              [
                "Ammonia",
                "ammonia",
              ],
              [
                "Nitrite",
                "nitrite",
              ],
              [
                "Nitrate",
                "nitrate",
              ],
              [
                "GH",
                "gh",
              ],
              [
                "KH",
                "kh",
              ],
              [
                "TDS",
                "tds",
              ],
            ].map(
              ([label, key]) => (
                <button
                  key={key}
                  className={`chart-control ${
                    parameter ===
                    key
                      ? "active"
                      : ""
                  }`}
                  onClick={() =>
                    setParameter(
                      key as keyof TankParameter
                    )
                  }
                >
                  {label}
                </button>
              )
            )}
          </div>

          <ParameterGraph
            rows={
              filteredParams
            }
            parameter={
              parameter
            }
          />
        </>
      )}

      {mode ===
        "changes" && (
        <WaterChangeGraph
          rows={
            filteredChanges
          }
        />
      )}
    </div>
  );
}

/* =========================================================
   SVG PARAMETER GRAPH
========================================================= */

function ParameterGraph({
  rows,
  parameter,
}: {
  rows: TankParameter[];
  parameter: keyof TankParameter;
}) {
  const points =
    rows
      .filter((row) =>
        validNumber(
          row[
            parameter
          ] as any
        )
      )
      .map((row) => ({
        date:
          row.measured_at,
        value: Number(
          row[
            parameter
          ] as any
        ),
      }))
      .sort(
        (a, b) =>
          +new Date(
            a.date
          ) -
          +new Date(
            b.date
          )
      );

  if (!points.length) {
    return (
      <div className="chart-empty">
        <div>
          <BarChart3
            size={28}
            style={{
              marginBottom:
                "10px",
            }}
          />

          <div>
            No{" "}
            {String(
              parameter
            )}{" "}
            data available
            for this period.
          </div>
        </div>
      </div>
    );
  }

  const width = 760;
  const height = 280;

  const padding = {
    left: 48,
    right: 20,
    top: 20,
    bottom: 40,
  };

  const values =
    points.map(
      (x) => x.value
    );

  const min =
    Math.min(...values);

  const max =
    Math.max(...values);

  const range =
    max - min || 1;

  const graphWidth =
    width -
    padding.left -
    padding.right;

  const graphHeight =
    height -
    padding.top -
    padding.bottom;

  const coords =
    points.map(
      (point, index) => {
        const x =
          padding.left +
          (index /
            Math.max(
              points.length -
                1,
              1
            )) *
            graphWidth;

        const y =
          padding.top +
          (1 -
            (point.value -
              min) /
              range) *
            graphHeight;

        return {
          ...point,
          x,
          y,
        };
      }
    );

  const path =
    coords
      .map(
        (point, index) =>
          `${
            index === 0
              ? "M"
              : "L"
          } ${point.x} ${
            point.y
          }`
      )
      .join(" ");

  return (
    <div className="chart-container">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height="100%"
        preserveAspectRatio="none"
      >
        {[0, 1, 2, 3, 4].map(
          (line) => {
            const y =
              padding.top +
              (line / 4) *
                graphHeight;

            const value =
              max -
              (line / 4) *
                range;

            return (
              <g key={line}>
                <line
                  x1={
                    padding.left
                  }
                  x2={
                    width -
                    padding.right
                  }
                  y1={y}
                  y2={y}
                  stroke="var(--border)"
                  strokeWidth="1"
                />

                <text
                  x="4"
                  y={
                    y + 4
                  }
                  fill="var(--text-muted)"
                  fontSize="10"
                >
                  {value.toFixed(
                    1
                  )}
                </text>
              </g>
            );
          }
        )}

        <path
          d={path}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {coords.map(
          (
            point,
            index
          ) => (
            <g
              key={`${point.date}-${index}`}
            >
              <circle
                cx={point.x}
                cy={point.y}
                r="4"
                fill="var(--bg-card)"
                stroke="var(--accent)"
                strokeWidth="2"
              />

              {index === 0 ||
              index ===
                coords.length -
                  1 ? (
                <text
                  x={point.x}
                  y={
                    height -
                    12
                  }
                  textAnchor={
                    index ===
                    0
                      ? "start"
                      : "end"
                  }
                  fill="var(--text-muted)"
                  fontSize="9"
                >
                  {shortDate(
                    point.date
                  )}
                </text>
              ) : null}
            </g>
          )
        )}
      </svg>
    </div>
  );
}

/* =========================================================
   WATER CHANGE GRAPH
========================================================= */

function WaterChangeGraph({
  rows,
}: {
  rows: WaterChange[];
}) {
  const data =
    [...rows]
      .sort(
        (a, b) =>
          +new Date(
            a.completed_at
          ) -
          +new Date(
            b.completed_at
          )
      )
      .map((row) => ({
        date:
          row.completed_at,
        value:
          Number(
            row.amount_changed_liters
          ) || 0,
      }));

  if (!data.length) {
    return (
      <div className="chart-empty">
        <div>
          <Droplets
            size={28}
            style={{
              marginBottom:
                "10px",
            }}
          />

          <div>
            No water changes
            recorded for this
            period.
          </div>
        </div>
      </div>
    );
  }

  const max =
    Math.max(
      ...data.map(
        (x) => x.value
      ),
      1
    );

  return (
    <div className="chart-container">
      <div
        style={{
          height: "260px",
          display: "flex",
          alignItems:
            "flex-end",
          gap:
            data.length >
            15
              ? "3px"
              : "8px",
          padding:
            "20px 10px 35px",
          borderBottom:
            "1px solid var(--border)",
        }}
      >
        {data.map(
          (item, index) => {
            const height =
              Math.max(
                8,
                (item.value /
                  max) *
                  190
              );

            return (
              <div
                key={`${item.date}-${index}`}
                style={{
                  flex: 1,
                  minWidth:
                    "4px",
                  height: `${height}px`,
                  borderRadius:
                    "5px 5px 2px 2px",
                  background:
                    "var(--accent)",
                  opacity:
                    0.75,
                  position:
                    "relative",
                }}
                title={`${item.value} L — ${fmt(
                  item.date
                )}`}
              >
                {data.length <=
                  10 && (
                  <span
                    style={{
                      position:
                        "absolute",
                      bottom:
                        `${height +
                          5}px`,
                      left:
                        "50%",
                      transform:
                        "translateX(-50%)",
                      color:
                        "var(--text-muted)",
                      fontSize:
                        "9px",
                      whiteSpace:
                        "nowrap",
                    }}
                  >
                    {item.value}L
                  </span>
                )}
              </div>
            );
          }
        )}
      </div>

      <div className="chart-legend">
        <span className="chart-legend-item">
          <span className="chart-legend-dot" />
          Litres changed
        </span>
      </div>
    </div>
  );
}

/* =========================================================
   PARAMETERS TABLE
========================================================= */

function Parameters({
  rows,
  add,
  edit,
  del,
}: {
  rows: TankParameter[];
  add: () => void;
  edit: (
    modal: Modal,
    row: any
  ) => void;
  del: (
    table: string,
    id: string
  ) => void;
}) {
  return (
    <div className="panel full">
      <PanelTitle
        title={`${rows.length} parameter logs`}
        button="Add water test"
        onClick={add}
      />

      <Table
        heads={[
          "Date",
          "Temp",
          "pH",
          "NH₃",
          "NO₂",
          "NO₃",
          "GH",
          "KH",
          "TDS",
          "",
        ]}
        rows={rows.map(
          (x) => [
            fmt(
              x.measured_at
            ),
            x.temperature ??
              "—",
            x.ph ?? "—",
            x.ammonia ??
              "—",
            x.nitrite ??
              "—",
            x.nitrate ??
              "—",
            x.gh ?? "—",
            x.kh ?? "—",
            x.tds ?? "—",
            <Actions
              key={x.id}
              onEdit={() =>
                edit(
                  "parameter",
                  x
                )
              }
              onDelete={() =>
                del(
                  "tank_parameters",
                  x.id
                )
              }
            />,
          ]
        )}
      />
    </div>
  );
}

/* =========================================================
   CHANGES TABLE
========================================================= */

function Changes({
  rows,
  add,
  edit,
  del,
}: {
  rows: WaterChange[];
  add: () => void;
  edit: (
    modal: Modal,
    row: any
  ) => void;
  del: (
    table: string,
    id: string
  ) => void;
}) {
  return (
    <div className="panel full">
      <PanelTitle
        title={`${rows.length} water changes`}
        button="Add water change"
        onClick={add}
      />

      <Table
        heads={[
          "Date",
          "Amount",
          "Temp",
          "pH",
          "GH",
          "KH",
          "TDS",
          "Notes",
          "",
        ]}
        rows={rows.map(
          (x) => [
            fmt(
              x.completed_at
            ),
            `${x.amount_changed_liters} L`,
            x.added_water_temperature ??
              "—",
            x.added_water_ph ??
              "—",
            x.added_water_gh ??
              "—",
            x.added_water_kh ??
              "—",
            x.added_water_tds ??
              "—",
            x.added_water_notes ||
              "—",
            <Actions
              key={x.id}
              onEdit={() =>
                edit(
                  "change",
                  x
                )
              }
              onDelete={() =>
                del(
                  "water_changes",
                  x.id
                )
              }
            />,
          ]
        )}
      />
    </div>
  );
}

/* =========================================================
   PANEL TITLE
========================================================= */

function PanelTitle({
  title,
  button,
  onClick,
}: {
  title: string;
  button: string;
  onClick: () => void;
}) {
  return (
    <div className="panelhead">
      <h3>{title}</h3>

      <button
        className="primary"
        onClick={onClick}
      >
        <Plus size={15} />
        {button}
      </button>
    </div>
  );
}

/* =========================================================
   ACTIONS
========================================================= */

function Actions({
  onEdit,
  onDelete,
}: {
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <span className="rowactions">
      <button
        onClick={onEdit}
        aria-label="Edit"
      >
        <Pencil size={14} />
      </button>

      <button
        onClick={onDelete}
        aria-label="Delete"
      >
        <Trash2 size={14} />
      </button>
    </span>
  );
}

/* =========================================================
   TABLE
========================================================= */

function Table({
  heads,
  rows,
}: {
  heads: string[];
  rows: any[][];
}) {
  return (
    <div className="tablewrap">
      <table>
        <thead>
          <tr>
            {heads.map(
              (h, i) => (
                <th
                  key={`${h}-${i}`}
                >
                  {h}
                </th>
              )
            )}
          </tr>
        </thead>

        <tbody>
          {rows.map(
            (r, i) => (
              <tr key={i}>
                {r.map(
                  (x, j) => (
                    <td key={j}>
                      {x}
                    </td>
                  )
                )}
              </tr>
            )
          )}
        </tbody>
      </table>

      {!rows.length && (
        <div className="muted center">
          No records yet.
        </div>
      )}
    </div>
  );
}

/* =========================================================
   MODAL
========================================================= */

function Modal({
  title,
  close,
  children,
}: {
  title: string;
  close: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="backdrop">
      <div className="modal">
        <button
          className="x"
          onClick={close}
        >
          <X size={18} />
        </button>

        <small>
          TANK TRACKER
        </small>

        <h2>{title}</h2>

        {children}
      </div>
    </div>
  );
}

/* =========================================================
   FIELD
========================================================= */

function Field({
  label,
  value,
  set,
  type = "text",
}: {
  label: string;
  value: any;
  set: (value: any) => void;
  type?: string;
}) {
  return (
    <label>
      {label}

      <input
        type={type}
        value={value ?? ""}
        onChange={(e) =>
          set(
            type ===
              "number"
              ? num(
                  e.target.value
                )
              : e.target.value
          )
        }
      />
    </label>
  );
}

/* =========================================================
   TANK MODAL
========================================================= */

function TankModal({
  row,
  close,
  done,
}: {
  row: Tank | null;
  close: () => void;
  done: () => Promise<void>;
}) {
  const [f, setF] =
    useState<any>(
      row
        ? {
            name: row.name,
            volume: row.volume,
            height: row.height,
            width: row.width,
            depth: row.depth,
            notes: row.notes,
          }
        : {
            name: "",
            volume: null,
            height: null,
            width: null,
            depth: null,
            notes: "",
          }
    );

  const save = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    const q = row
      ? supabase
          .from("tanks")
          .update(f)
          .eq(
            "id",
            row.id
          )
      : supabase
          .from("tanks")
          .insert(f);

    const { error } =
      await q;

    if (error) {
      alert(error.message);
    } else {
      close();
      await done();
    }
  };

  return (
    <Modal
      title={
        row
          ? "Edit tank"
          : "Add tank"
      }
      close={close}
    >
      <form onSubmit={save}>
        <Field
          label="Tank name"
          value={f.name}
          set={(v) =>
            setF({
              ...f,
              name: v,
            })
          }
        />

        <div className="formgrid">
          {[
            [
              "Volume (L)",
              "volume",
            ],
            [
              "Height",
              "height",
            ],
            [
              "Width",
              "width",
            ],
            [
              "Depth",
              "depth",
            ],
          ].map(
            ([label, key]) => (
              <Field
                key={key}
                label={label}
                value={f[key]}
                type="number"
                set={(v) =>
                  setF({
                    ...f,
                    [key]: v,
                  })
                }
              />
            )
          )}
        </div>

        <Field
          label="Notes"
          value={f.notes}
          set={(v) =>
            setF({
              ...f,
              notes: v,
            })
          }
        />

        <Save close={close} />
      </form>
    </Modal>
  );
}

/* =========================================================
   PARAMETER MODAL
========================================================= */

function ParameterModal({
  tank,
  row,
  close,
  done,
}: {
  tank: string;
  row: TankParameter | null;
  close: () => void;
  done: () => Promise<void>;
}) {
  const defaults =
    row
      ? {
          measured_at:
            row.measured_at,
          temperature:
            row.temperature,
          ph: row.ph,
          ammonia:
            row.ammonia,
          nitrite:
            row.nitrite,
          nitrate:
            row.nitrate,
          gh: row.gh,
          kh: row.kh,
          tds: row.tds,
          salinity:
            row.salinity,
          notes: row.notes,
        }
      : {
          measured_at:
            new Date().toISOString(),
          temperature: null,
          ph: null,
          ammonia: null,
          nitrite: null,
          nitrate: null,
          gh: null,
          kh: null,
          tds: null,
          salinity: null,
          notes: "",
        };

  const [f, setF] =
    useState<any>(
      defaults
    );

  const save = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    const q = row
      ? supabase
          .from(
            "tank_parameters"
          )
          .update(f)
          .eq(
            "id",
            row.id
          )
      : supabase
          .from(
            "tank_parameters"
          )
          .insert({
            ...f,
            tank_id:
              tank,
          });

    const { error } =
      await q;

    if (error) {
      alert(error.message);
    } else {
      close();
      await done();
    }
  };

  return (
    <Modal
      title={
        row
          ? "Edit water test"
          : "Add water test"
      }
      close={close}
    >
      <form onSubmit={save}>
        <Field
          label="Measured at"
          value={new Date(
            f.measured_at
          )
            .toISOString()
            .slice(0, 16)}
          type="datetime-local"
          set={(v) =>
            setF({
              ...f,
              measured_at:
                iso(v),
            })
          }
        />

        <div className="formgrid three">
          {[
            [
              "Temperature °C",
              "temperature",
            ],
            [
              "pH",
              "ph",
            ],
            [
              "Ammonia",
              "ammonia",
            ],
            [
              "Nitrite",
              "nitrite",
            ],
            [
              "Nitrate",
              "nitrate",
            ],
            [
              "GH",
              "gh",
            ],
            [
              "KH",
              "kh",
            ],
            [
              "TDS",
              "tds",
            ],
            [
              "Salinity",
              "salinity",
            ],
          ].map(
            ([label, key]) => (
              <Field
                key={key}
                label={label}
                value={f[key]}
                type="number"
                set={(v) =>
                  setF({
                    ...f,
                    [key]: v,
                  })
                }
              />
            )
          )}
        </div>

        <Field
          label="Notes"
          value={f.notes}
          set={(v) =>
            setF({
              ...f,
              notes: v,
            })
          }
        />

        <Save close={close} />
      </form>
    </Modal>
  );
}

/* =========================================================
   WATER CHANGE MODAL
========================================================= */

function ChangeModal({
  tank,
  row,
  close,
  done,
}: {
  tank: string;
  row: WaterChange | null;
  close: () => void;
  done: () => Promise<void>;
}) {
  const base: any = {
    completed_at:
      new Date().toISOString(),

    amount_changed_liters: 0,

    added_water_temperature:
      null,

    added_water_ph:
      null,

    added_water_ammonia:
      null,

    added_water_nitrite:
      null,

    added_water_nitrate:
      null,

    added_water_gh:
      null,

    added_water_kh:
      null,

    added_water_tds:
      null,

    added_water_salinity:
      null,

    added_water_notes:
      "",
  };

  const [f, setF] =
    useState<any>(
      row
        ? {
            ...row,
          }
        : base
    );

  const save = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    const payload = {
      ...f,
    };

    delete payload.id;
    delete payload.created_at;
    delete payload.tank_id;

    const q = row
      ? supabase
          .from(
            "water_changes"
          )
          .update(
            payload
          )
          .eq(
            "id",
            row.id
          )
      : supabase
          .from(
            "water_changes"
          )
          .insert({
            ...payload,
            tank_id:
              tank,
          });

    const { error } =
      await q;

    if (error) {
      alert(error.message);
    } else {
      close();
      await done();
    }
  };

  return (
    <Modal
      title={
        row
          ? "Edit water change"
          : "Add water change"
      }
      close={close}
    >
      <form onSubmit={save}>
        <div className="formgrid">
          <Field
            label="Completed at"
            value={new Date(
              f.completed_at
            )
              .toISOString()
              .slice(0, 16)}
            type="datetime-local"
            set={(v) =>
              setF({
                ...f,
                completed_at:
                  iso(v),
              })
            }
          />

          <Field
            label="Amount changed (L)"
            value={
              f.amount_changed_liters
            }
            type="number"
            set={(v) =>
              setF({
                ...f,
                amount_changed_liters:
                  v,
              })
            }
          />
        </div>

        <small className="section">
          ADDED WATER PARAMETERS
        </small>

        <div className="formgrid three">
          {[
            [
              "Temperature °C",
              "added_water_temperature",
            ],
            [
              "pH",
              "added_water_ph",
            ],
            [
              "Ammonia",
              "added_water_ammonia",
            ],
            [
              "Nitrite",
              "added_water_nitrite",
            ],
            [
              "Nitrate",
              "added_water_nitrate",
            ],
            [
              "GH",
              "added_water_gh",
            ],
            [
              "KH",
              "added_water_kh",
            ],
            [
              "TDS",
              "added_water_tds",
            ],
            [
              "Salinity",
              "added_water_salinity",
            ],
          ].map(
            ([label, key]) => (
              <Field
                key={key}
                label={label}
                value={f[key]}
                type="number"
                set={(v) =>
                  setF({
                    ...f,
                    [key]: v,
                  })
                }
              />
            )
          )}
        </div>

        <Field
          label="Notes"
          value={
            f.added_water_notes
          }
          set={(v) =>
            setF({
              ...f,
              added_water_notes:
                v,
            })
          }
        />

        <Save close={close} />
      </form>
    </Modal>
  );
}

/* =========================================================
   SAVE
========================================================= */

function Save({
  close,
}: {
  close: () => void;
}) {
  return (
    <div className="modalbuttons">
      <button
        type="button"
        className="secondary"
        onClick={close}
      >
        Cancel
      </button>

      <button
        type="submit"
        className="primary"
      >
        Save
      </button>
    </div>
  );
}

/* =========================================================
   SETTINGS
========================================================= */

function SettingsPanel({
  theme,
  setTheme,
  cardStyle,
  setCardStyle,
  density,
  setDensity,
  textSize,
  setTextSize,
  close,
}: {
  theme: Theme;
  setTheme: (
    value: Theme
  ) => void;
  cardStyle: CardStyle;
  setCardStyle: (
    value: CardStyle
  ) => void;
  density: Density;
  setDensity: (
    value: Density
  ) => void;
  textSize: TextSize;
  setTextSize: (
    value: TextSize
  ) => void;
  close: () => void;
}) {
  const themes: {
    id: Theme;
    name: string;
    emoji: string;
    description: string;
  }[] = [
    {
      id: "ocean",
      name: "Deep Ocean",
      emoji: "🌊",
      description:
        "Classic aquarium blue",
    },
    {
      id: "coral",
      name: "Coral Reef",
      emoji: "🪸",
      description:
        "Warm coral reef colours",
    },
    {
      id: "tropical",
      name: "Tropical",
      emoji: "🐠",
      description:
        "Bright tropical water",
    },
    {
      id: "space",
      name: "Deep Space",
      emoji: "🌌",
      description:
        "Neon cosmic aquarium",
    },
    {
      id: "sunset",
      name: "Sunset Reef",
      emoji: "🌅",
      description:
        "Purple, pink and orange",
    },
    {
      id: "planted",
      name: "Planted Tank",
      emoji: "🌿",
      description:
        "Natural green aquarium",
    },
  ];

  return (
    <div
      className="settings-backdrop"
      onClick={close}
    >
      <aside
        className="settings-panel"
        onClick={(e) =>
          e.stopPropagation()
        }
      >
        <div className="settings-header">
          <div>
            <small>
              PERSONALISE
            </small>

            <h2>
              Settings
            </h2>
          </div>

          <button
            className="icon"
            onClick={close}
          >
            <X size={18} />
          </button>
        </div>

        <div className="settings-section">
          <div className="settings-section-title">
            <Palette size={16} />
            <span>
              Theme
            </span>
          </div>

          <div className="theme-grid">
            {themes.map(
              (x) => (
                <button
                  key={x.id}
                  className={`theme-option ${
                    theme ===
                    x.id
                      ? "selected"
                      : ""
                  }`}
                  onClick={() =>
                    setTheme(
                      x.id
                    )
                  }
                >
                  <span
                    className={`theme-preview preview-${x.id}`}
                  >
                    {
                      x.emoji
                    }
                  </span>

                  <span className="theme-info">
                    <b>
                      {x.name}
                    </b>

                    <small>
                      {
                        x.description
                      }
                    </small>
                  </span>

                  {theme ===
                    x.id && (
                    <span className="theme-check">
                      <Check
                        size={
                          14
                        }
                      />
                    </span>
                  )}
                </button>
              )
            )}
          </div>
        </div>

        <div className="settings-section">
          <div className="settings-section-title">
            <span>▦</span>

            <span>
              Card style
            </span>
          </div>

          <div className="choice-row">
            <button
              className={
                cardStyle ===
                "rounded"
                  ? "choice active"
                  : "choice"
              }
              onClick={() =>
                setCardStyle(
                  "rounded"
                )
              }
            >
              <span className="choice-icon rounded-demo" />

              <span>
                <b>
                  Rounded
                </b>

                <small>
                  Soft aquarium
                  style
                </small>
              </span>
            </button>

            <button
              className={
                cardStyle ===
                "sharp"
                  ? "choice active"
                  : "choice"
              }
              onClick={() =>
                setCardStyle(
                  "sharp"
                )
              }
            >
              <span className="choice-icon sharp-demo" />

              <span>
                <b>
                  Sharp
                </b>

                <small>
                  Technical
                  style
                </small>
              </span>
            </button>
          </div>
        </div>

        <div className="settings-section">
          <div className="settings-section-title">
            <span>↕</span>

            <span>
              Layout density
            </span>
          </div>

          <div className="segmented">
            <button
              className={
                density ===
                "comfortable"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setDensity(
                  "comfortable"
                )
              }
            >
              Comfortable
            </button>

            <button
              className={
                density ===
                "compact"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setDensity(
                  "compact"
                )
              }
            >
              Compact
            </button>
          </div>
        </div>

        <div className="settings-section">
          <div className="settings-section-title">
            <span>A</span>

            <span>
              Text size
            </span>
          </div>

          <div className="segmented">
            <button
              className={
                textSize ===
                "normal"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setTextSize(
                  "normal"
                )
              }
            >
              Normal
            </button>

            <button
              className={
                textSize ===
                "large"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setTextSize(
                  "large"
                )
              }
            >
              Large
            </button>
          </div>
        </div>

        <div className="settings-footer">
          <span>🐟</span>

          <div>
            <b>
              Tank Tracker
            </b>

            <small>
              Your aquarium,
              your style.
            </small>
          </div>
        </div>
      </aside>
    </div>
  );
}

export default App;
