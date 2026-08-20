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
  AlertTriangle,
  Activity,
  BarChart3,
  LayoutDashboard,
  Waves,
  Sparkles,
  Leaf,
  Moon,
  CircleDot,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { supabase } from "./lib/supabase";
import type { Tank, TankParameter, WaterChange } from "./types";

type Modal = "tank" | "parameter" | "change" | null;
type Tab = "dashboard" | "overview" | "parameters" | "changes";

type Theme =
  | "ocean"
  | "coral"
  | "tropical"
  | "space"
  | "sunset"
  | "planted"
  | "midnight"
  | "arctic"
  | "volcanic";

type CardStyle = "rounded" | "sharp";
type Density = "comfortable" | "compact";
type TextSize = "normal" | "large";

type BackgroundStyle =
  | "none"
  | "waves"
  | "bubbles"
  | "bioluminescent"
  | "stars"
  | "plants"
  | "current"
  | "rain"
  | "neon";

type GraphParameter =
  | "ph"
  | "temperature"
  | "ammonia"
  | "nitrite"
  | "nitrate"
  | "gh"
  | "kh"
  | "tds"
  | "salinity";

const num = (v: string) => (v === "" ? null : Number(v));

const iso = (v: string) => new Date(v).toISOString();

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

const PARAMETER_LABELS: Record<GraphParameter, string> = {
  ph: "pH",
  temperature: "Temperature",
  ammonia: "Ammonia",
  nitrite: "Nitrite",
  nitrate: "Nitrate",
  gh: "GH",
  kh: "KH",
  tds: "TDS",
  salinity: "Salinity",
};

const PARAMETER_UNITS: Record<GraphParameter, string> = {
  ph: "",
  temperature: "°C",
  ammonia: " ppm",
  nitrite: " ppm",
  nitrate: " ppm",
  gh: " dGH",
  kh: " dKH",
  tds: " ppm",
  salinity: "",
};

const PARAMETER_COLOURS = [
  "#2fe0d1",
  "#ff8b62",
  "#9c7cff",
  "#65d98a",
  "#55b8ff",
  "#ffd166",
  "#ff6f91",
  "#c084fc",
  "#f5f5f5",
];

function App() {
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [params, setParams] = useState<TankParameter[]>([]);
  const [changes, setChanges] = useState<WaterChange[]>([]);

  const [selected, setSelected] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("dashboard");

  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [modal, setModal] = useState<Modal>(null);
  const [edit, setEdit] = useState<any>(null);

  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const [draggedTankId, setDraggedTankId] =
    useState<string | null>(null);

  const [theme, setTheme] = useState<Theme>(
    () =>
      (localStorage.getItem("tank-theme") as Theme) ||
      "ocean"
  );

  const [cardStyle, setCardStyle] =
    useState<CardStyle>(
      () =>
        (localStorage.getItem(
          "tank-card-style"
        ) as CardStyle) || "rounded"
    );

  const [density, setDensity] =
    useState<Density>(
      () =>
        (localStorage.getItem(
          "tank-density"
        ) as Density) || "comfortable"
    );

  const [textSize, setTextSize] =
    useState<TextSize>(
      () =>
        (localStorage.getItem(
          "tank-text-size"
        ) as TextSize) || "normal"
    );

  const [backgroundStyle, setBackgroundStyle] =
    useState<BackgroundStyle>(
      () =>
        (localStorage.getItem(
          "tank-background"
        ) as BackgroundStyle) || "none"
    );

  const [dashboardTanks, setDashboardTanks] =
    useState<string[]>([]);

  const [dashboardParameters, setDashboardParameters] =
    useState<GraphParameter[]>(["ph"]);

  const [graphRange, setGraphRange] =
    useState<"7" | "30" | "90" | "all">("30");

  useEffect(() => {
    localStorage.setItem("tank-theme", theme);
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

  useEffect(() => {
    localStorage.setItem(
      "tank-background",
      backgroundStyle
    );
  }, [backgroundStyle]);

  const load = async () => {
    setLoading(true);

    const [t, p, c] = await Promise.all([
      supabase
        .from("tanks")
        .select("*")
        .order("sort_order", {
          ascending: true,
        }),

      supabase
        .from("tank_parameters")
        .select("*")
        .order("measured_at", {
          ascending: false,
        }),

      supabase
        .from("water_changes")
        .select("*")
        .order("completed_at", {
          ascending: false,
        }),
    ]);

    if (t.error || p.error || c.error) {
      alert(
        (t.error || p.error || c.error)?.message
      );
    }

    const loadedTanks = (t.data ||
      []) as Tank[];

    setTanks(loadedTanks);
    setParams(
      (p.data || []) as TankParameter[]
    );
    setChanges(
      (c.data || []) as WaterChange[]
    );

    setSelected((s) =>
      loadedTanks.some(
        (x) => x.id === s
      )
        ? s
        : loadedTanks[0]?.id || null
    );

    setDashboardTanks((current) => {
      const valid = current.filter((id) =>
        loadedTanks.some(
          (tank) => tank.id === id
        )
      );

      return valid.length
        ? valid
        : loadedTanks.map(
            (tank) => tank.id
          );
    });

    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const tank =
    tanks.find(
      (x) => x.id === selected
    ) || null;

  const tp = useMemo(
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

  const tc = useMemo(
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

  const reorderTanks = async (
    fromIndex: number,
    toIndex: number
  ) => {
    if (fromIndex === toIndex)
      return;

    const reordered = [...tanks];

    const [movedTank] =
      reordered.splice(
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
        (tank, index) => ({
          id: tank.id,
          sort_order: index,
        })
      );

    const results =
      await Promise.all(
        updates.map((tank) =>
          supabase
            .from("tanks")
            .update({
              sort_order:
                tank.sort_order,
            })
            .eq(
              "id",
              tank.id
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

  const del = async (
    table: string,
    id: string
  ) => {
    if (
      !confirm(
        "Delete this record?"
      )
    )
      return;

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

  const open = (
    m: Modal,
    x: any = null
  ) => {
    setEdit(x);
    setModal(m);
  };

  const selectTank = (
    id: string
  ) => {
    setSelected(id);
    setTab("overview");
    setMenuOpen(false);
  };

  const openDashboard = () => {
    setTab("dashboard");
    setMenuOpen(false);
  };

  return (
    <div
      className={`
        app
        theme-${theme}
        cards-${cardStyle}
        density-${density}
        text-${textSize}
        background-${backgroundStyle}
      `}
    >
      <BackgroundEffect
        style={backgroundStyle}
      />

      <header>
        <button
          className="menu-button"
          onClick={() =>
            setMenuOpen(true)
          }
          aria-label="Open navigation"
        >
          ☰
        </button>

        <div className="brand">
          <span>🐟</span>

          <div>
            <b>Tank Tracker</b>
            <small>
              Aquarium control centre
            </small>
          </div>
        </div>

        <div className="actions">
          <button
            className="icon settings-button"
            onClick={() =>
              setSettingsOpen(true)
            }
            aria-label="Open settings"
          >
            <Settings size={17} />
          </button>

          <button
            onClick={load}
            className="icon refresh-button"
            aria-label="Refresh"
          >
            <RefreshCw size={17} />
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
            menuOpen ? "open" : ""
          }
        >
          <div className="mobile-menu-head">
            <b>Navigation</b>

            <button
              className="icon"
              onClick={() =>
                setMenuOpen(false)
              }
              aria-label="Close menu"
            >
              <X size={18} />
            </button>
          </div>

          <button
            className={`dashboard-nav ${
              tab === "dashboard"
                ? "active"
                : ""
            }`}
            onClick={
              openDashboard
            }
          >
            <LayoutDashboard
              size={17}
            />
            <span>
              <b>Dashboard</b>
              <small>
                All tanks overview
              </small>
            </span>
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
            <Search size={15} />

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
                    (x.id ===
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
                    selectTank(
                      x.id
                    )
                  }
                  onDragStart={(e) => {
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
                      toIndex !== -1
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
                        ? x.volume +
                          " L"
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
              setMenuOpen(false)
            }
          />
        )}

        <section className="content">
          {tab === "dashboard" ? (
            <Dashboard
              tanks={tanks}
              params={params}
              changes={changes}
              dashboardTanks={
                dashboardTanks
              }
              setDashboardTanks={
                setDashboardTanks
              }
              dashboardParameters={
                dashboardParameters
              }
              setDashboardParameters={
                setDashboardParameters
              }
              graphRange={
                graphRange
              }
              setGraphRange={
                setGraphRange
              }
              selectTank={
                selectTank
              }
            />
          ) : !tank ? (
            <div className="empty">
              <div>🐠</div>

              <h1>
                Your aquarium
                dashboard starts
                here.
              </h1>

              <p>
                Create your first
                tank, then record
                water tests and
                water changes.
              </p>

              <button
                className="primary"
                onClick={() =>
                  open("tank")
                }
              >
                <Plus size={17} />
                Add your first tank
              </button>
            </div>
          ) : (
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
                      ? " · " +
                        tank.notes
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
                    "overview"
                      ? "◉"
                      : x ===
                        "parameters"
                      ? "🧪"
                      : "💧"}{" "}
                    {x}
                  </button>
                ))}
              </div>

              {tab ===
                "overview" && (
                <TankOverview
                  p={tp[0]}
                  c={tc}
                  goP={() =>
                    setTab(
                      "parameters"
                    )
                  }
                  goC={() =>
                    setTab(
                      "changes"
                    )
                  }
                />
              )}

              {tab ===
                "parameters" && (
                <Parameters
                  rows={tp}
                  add={() =>
                    open(
                      "parameter"
                    )
                  }
                  edit={open}
                  del={del}
                />
              )}

              {tab === "changes" && (
                <Changes
                  rows={tc}
                  add={() =>
                    open(
                      "change"
                    )
                  }
                  edit={open}
                  del={del}
                />
              )}
            </>
          )}
        </section>
      </main>

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

      {modal === "change" &&
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
          backgroundStyle={
            backgroundStyle
          }
          setBackgroundStyle={
            setBackgroundStyle
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
  dashboardTanks,
  setDashboardTanks,
  dashboardParameters,
  setDashboardParameters,
  graphRange,
  setGraphRange,
  selectTank,
}: {
  tanks: Tank[];
  params: TankParameter[];
  changes: WaterChange[];
  dashboardTanks: string[];
  setDashboardTanks: (
    value: string[]
  ) => void;
  dashboardParameters: GraphParameter[];
  setDashboardParameters: (
    value: GraphParameter[]
  ) => void;
  graphRange: "7" | "30" | "90" | "all";
  setGraphRange: (
    value:
      | "7"
      | "30"
      | "90"
      | "all"
  ) => void;
  selectTank: (
    id: string
  ) => void;
}) {
  const now = Date.now();

  const alerts = useMemo(
    () =>
      buildAlerts(
        tanks,
        params,
        changes
      ),
    [tanks, params, changes]
  );

  const latestParameters =
    params.length
      ? params[0]
      : null;

  const latestChange =
    changes.length
      ? changes[0]
      : null;

  const totalVolume =
    tanks.reduce(
      (sum, tank) =>
        sum +
        (Number(
          tank.volume
        ) || 0),
      0
    );

  const graphParams =
    params.filter((p) =>
      dashboardTanks.includes(
        p.tank_id
      )
    );

  const cutoff =
    graphRange === "all"
      ? null
      : now -
        Number(graphRange) *
          24 *
          60 *
          60 *
          1000;

  const filteredGraphParams =
    graphParams.filter((p) => {
      if (!cutoff)
        return true;

      return (
        new Date(
          p.measured_at
        ).getTime() >= cutoff
      );
    });

  const graphData =
    buildComparisonData(
      filteredGraphParams,
      dashboardTanks,
      dashboardParameters,
      tanks
    );

  const referenceChanges =
    changes
      .filter((change) =>
        dashboardTanks.includes(
          change.tank_id
        )
      )
      .filter((change) => {
        if (!cutoff)
          return true;

        return (
          new Date(
            change.completed_at
          ).getTime() >= cutoff
        );
      });

  const toggleTank = (
    id: string
  ) => {
    if (
      dashboardTanks.includes(
        id
      )
    ) {
      if (
        dashboardTanks.length ===
        1
      )
        return;

      setDashboardTanks(
        dashboardTanks.filter(
          (x) => x !== id
        )
      );
    } else {
      setDashboardTanks([
        ...dashboardTanks,
        id,
      ]);
    }
  };

  const toggleParameter = (
    parameter: GraphParameter
  ) => {
    if (
      dashboardParameters.includes(
        parameter
      )
    ) {
      if (
        dashboardParameters.length ===
        1
      )
        return;

      setDashboardParameters(
        dashboardParameters.filter(
          (x) =>
            x !== parameter
        )
      );
    } else {
      setDashboardParameters([
        ...dashboardParameters,
        parameter,
      ]);
    }
  };

  return (
    <div className="dashboard">
      <div className="dashboard-heading">
        <div>
          <small>
            CONTROL CENTRE
          </small>

          <h1>
            Aquarium Dashboard
          </h1>

          <p>
            A complete overview of
            your aquariums.
          </p>
        </div>

        <div className="dashboard-heading-icon">
          <Activity
            size={25}
          />
        </div>
      </div>

      {/* ALERTS */}

      <section className="dashboard-section">
        <div className="section-heading">
          <div>
            <small>
              ATTENTION
            </small>

            <h2>
              Alerts
            </h2>
          </div>

          <span
            className={
              alerts.length
                ? "alert-count warning"
                : "alert-count good"
            }
          >
            {alerts.length
              ? `${alerts.length} to review`
              : "All clear"}
          </span>
        </div>

        {!alerts.length ? (
          <div className="alert-clear">
            <Check size={20} />
            <div>
              <b>
                Everything looks good
              </b>

              <small>
                No obvious issues have
                been detected from your
                recorded data.
              </small>
            </div>
          </div>
        ) : (
          <div className="alerts-grid">
            {alerts
              .slice(0, 8)
              .map((alert) => (
                <button
                  className={`alert-card ${alert.severity}`}
                  key={
                    alert.id
                  }
                  onClick={() =>
                    selectTank(
                      alert.tankId
                    )
                  }
                >
                  <span className="alert-icon">
                    <AlertTriangle
                      size={17}
                    />
                  </span>

                  <span>
                    <b>
                      {alert.title}
                    </b>

                    <small>
                      {
                        alert.description
                      }
                    </small>
                  </span>

                  <ChevronRight
                    size={15}
                  />
                </button>
              ))}
          </div>
        )}
      </section>

      {/* COMPLETE OVERVIEW */}

      <section className="dashboard-section">
        <div className="section-heading">
          <div>
            <small>
              OVERVIEW
            </small>

            <h2>
              Aquarium overview
            </h2>
          </div>
        </div>

        <div className="dashboard-overview-grid">
          <OverviewStat
            icon={
              <Fish size={18} />
            }
            label="Aquariums"
            value={tanks.length}
            description="Tracked tanks"
          />

          <OverviewStat
            icon={
              <Droplets
                size={18}
              />
            }
            label="Total volume"
            value={
              totalVolume
                ? `${totalVolume} L`
                : "—"
            }
            description="Combined capacity"
          />

          <OverviewStat
            icon={
              <AlertTriangle
                size={18}
              />
            }
            label="Needs attention"
            value={
              alerts.length
            }
            description={
              alerts.length
                ? "Review alerts"
                : "No current alerts"
            }
            alert={
              alerts.length >
              0
            }
          />

          <OverviewStat
            icon={
              <BeakerIcon />
            }
            label="Latest test"
            value={
              latestParameters
                ? shortDate(
                    latestParameters.measured_at
                  )
                : "—"
            }
            description={
              latestParameters
                ? fmt(
                    latestParameters.measured_at
                  )
                : "No tests recorded"
            }
          />

          <OverviewStat
            icon={
              <Droplets
                size={18}
              />
            }
            label="Latest water change"
            value={
              latestChange
                ? shortDate(
                    latestChange.completed_at
                  )
                : "—"
            }
            description={
              latestChange
                ? `${latestChange.amount_changed_liters} L changed`
                : "No changes recorded"
            }
          />

          <OverviewStat
            icon={
              <Activity
                size={18}
              />
            }
            label="Parameter records"
            value={
              params.length
            }
            description="Tests recorded"
          />
        </div>
      </section>

      {/* GRAPH */}

      <section className="dashboard-section">
        <div className="section-heading graph-section-heading">
          <div>
            <small>
              HISTORY
            </small>

            <h2>
              Parameter comparison
            </h2>

            <p>
              Compare recorded water
              parameters across tanks.
            </p>
          </div>

          <div className="graph-range">
            {(
              [
                ["7", "7D"],
                ["30", "30D"],
                ["90", "90D"],
                ["all", "All"],
              ] as const
            ).map(
              ([value, label]) => (
                <button
                  key={value}
                  className={
                    graphRange ===
                    value
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    setGraphRange(
                      value
                    )
                  }
                >
                  {label}
                </button>
              )
            )}
          </div>
        </div>

        <div className="comparison-controls">
          <div className="comparison-control">
            <div className="control-label">
              <span>
                Tanks
              </span>

              <button
                onClick={() =>
                  setDashboardTanks(
                    tanks.map(
                      (tank) =>
                        tank.id
                    )
                  )
                }
              >
                All
              </button>
            </div>

            <div className="filter-pills">
              {tanks.map(
                (tank) => (
                  <button
                    key={tank.id}
                    className={
                      dashboardTanks.includes(
                        tank.id
                      )
                        ? "selected"
                        : ""
                    }
                    onClick={() =>
                      toggleTank(
                        tank.id
                      )
                    }
                  >
                    <Fish
                      size={13}
                    />
                    {tank.name}
                  </button>
                )
              )}
            </div>
          </div>

          <div className="comparison-control">
            <div className="control-label">
              <span>
                Parameters
              </span>

              <button
                onClick={() =>
                  setDashboardParameters(
                    Object.keys(
                      PARAMETER_LABELS
                    ) as GraphParameter[]
                  )
                }
              >
                All
              </button>
            </div>

            <div className="filter-pills">
              {(
                Object.keys(
                  PARAMETER_LABELS
                ) as GraphParameter[]
              ).map(
                (parameter) => (
                  <button
                    key={
                      parameter
                    }
                    className={
                      dashboardParameters.includes(
                        parameter
                      )
                        ? "selected"
                        : ""
                    }
                    onClick={() =>
                      toggleParameter(
                        parameter
                      )
                    }
                  >
                    <CircleDot
                      size={13}
                    />
                    {
                      PARAMETER_LABELS[
                        parameter
                      ]
                    }
                  </button>
                )
              )}
            </div>
          </div>
        </div>

        <div className="graph-card">
          {graphData.length ? (
            <div className="history-chart">
              <ResponsiveContainer
                width="100%"
                height={390}
              >
                <LineChart
                  data={graphData}
                  margin={{
                    top: 20,
                    right: 20,
                    left: 0,
                    bottom: 10,
                  }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#24394b"
                    vertical={false}
                  />

                  <XAxis
                    dataKey="date"
                    stroke="#71889d"
                    tick={{
                      fill: "#71889d",
                      fontSize: 11,
                    }}
                  />

                  <YAxis
                    stroke="#71889d"
                    tick={{
                      fill: "#71889d",
                      fontSize: 11,
                    }}
                  />

                  <Tooltip
                    contentStyle={{
                      background:
                        "#0b1827",
                      border:
                        "1px solid #29435a",
                      borderRadius:
                        10,
                      color:
                        "#edf7ff",
                    }}
                  />

                  <Legend />

                  {dashboardParameters.map(
                    (
                      parameter,
                      parameterIndex
                    ) =>
                      dashboardTanks.map(
                        (
                          tankId,
                          tankIndex
                        ) => {
                          const tank =
                            tanks.find(
                              (x) =>
                                x.id ===
                                tankId
                            );

                          if (
                            !tank
                          )
                            return null;

                          const colour =
                            PARAMETER_COLOURS[
                              (parameterIndex *
                                tanks.length +
                                tankIndex) %
                                PARAMETER_COLOURS.length
                            ];

                          const key = `${tankId}_${parameter}`;

                          return (
                            <Line
                              key={
                                key
                              }
                              type="monotone"
                              dataKey={
                                key
                              }
                              name={`${tank.name} · ${PARAMETER_LABELS[parameter]}`}
                              stroke={
                                colour
                              }
                              strokeWidth={
                                2.5
                              }
                              dot={{
                                r: 3,
                              }}
                              connectNulls
                            />
                          );
                        }
                      )
                  )}

                  {referenceChanges
                    .slice(
                      0,
                      30
                    )
                    .map(
                      (
                        change
                      ) => (
                        <ReferenceLine
                          key={
                            change.id
                          }
                          x={shortDate(
                            change.completed_at
                          )}
                          stroke="#ffffff"
                          strokeDasharray="4 4"
                          strokeOpacity={
                            0.35
                          }
                          label={{
                            value:
                              "WC",
                            fill:
                              "#71889d",
                            fontSize: 9,
                          }}
                        />
                      )
                    )}
                </LineChart>
              </ResponsiveContainer>

              <div className="graph-note">
                <span className="water-change-marker" />
                <span>
                  Water change reference
                  — vertical markers show
                  when a water change was
                  recorded.
                </span>
              </div>
            </div>
          ) : (
            <div className="graph-empty">
              <BarChart3
                size={34}
              />

              <h3>
                No graph data yet
              </h3>

              <p>
                Record water tests for
                the selected tanks and
                parameters to see
                trends here.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* RECENT ACTIVITY */}

      <section className="dashboard-section">
        <div className="section-heading">
          <div>
            <small>
              ACTIVITY
            </small>

            <h2>
              Recent activity
            </h2>
          </div>
        </div>

        <RecentActivity
          params={params}
          changes={changes}
          tanks={tanks}
          selectTank={selectTank}
        />
      </section>
    </div>
  );
}

/* =========================================================
   ALERTS
========================================================= */

type AlertItem = {
  id: string;
  tankId: string;
  title: string;
  description: string;
  severity:
    | "warning"
    | "danger"
    | "info";
};

function buildAlerts(
  tanks: Tank[],
  params: TankParameter[],
  changes: WaterChange[]
): AlertItem[] {
  const alerts: AlertItem[] = [];

  const now = Date.now();

  tanks.forEach((tank) => {
    const tankParams = params
      .filter(
        (p) =>
          p.tank_id === tank.id
      )
      .sort(
        (a, b) =>
          +new Date(
            b.measured_at
          ) -
          +new Date(
            a.measured_at
          )
      );

    const latest =
      tankParams[0];

    if (!latest) {
      alerts.push({
        id: `${tank.id}-no-test`,
        tankId: tank.id,
        title: "No water tests",
        description: `${tank.name} has no recorded water tests.`,
        severity: "warning",
      });
    } else {
      const age =
        now -
        new Date(
          latest.measured_at
        ).getTime();

      if (
        age >
        14 *
          24 *
          60 *
          60 *
          1000
      ) {
        alerts.push({
          id: `${tank.id}-old-test`,
          tankId: tank.id,
          title: "Water test overdue",
          description: `Last tested ${shortDate(
            latest.measured_at
          )}.`,
          severity: "warning",
        });
      }

      if (
        latest.ammonia != null &&
        latest.ammonia > 0
      ) {
        alerts.push({
          id: `${tank.id}-ammonia`,
          tankId: tank.id,
          title: "Ammonia detected",
          description: `${tank.name}: ammonia is ${latest.ammonia} ppm.`,
          severity:
            latest.ammonia >
            0.25
              ? "danger"
              : "warning",
        });
      }

      if (
        latest.nitrite != null &&
        latest.nitrite > 0
      ) {
        alerts.push({
          id: `${tank.id}-nitrite`,
          tankId: tank.id,
          title: "Nitrite detected",
          description: `${tank.name}: nitrite is ${latest.nitrite} ppm.`,
          severity:
            latest.nitrite >
            0.25
              ? "danger"
              : "warning",
        });
      }

      if (
        latest.nitrate != null &&
        latest.nitrate > 40
      ) {
        alerts.push({
          id: `${tank.id}-nitrate`,
          tankId: tank.id,
          title: "High nitrate",
          description: `${tank.name}: nitrate is ${latest.nitrate} ppm.`,
          severity:
            latest.nitrate >
            80
              ? "danger"
              : "warning",
        });
      }
    }

    const tankChanges =
      changes
        .filter(
          (c) =>
            c.tank_id ===
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
        );

    if (
      tankChanges.length
    ) {
      const lastChange =
        new Date(
          tankChanges[0].completed_at
        ).getTime();

      if (
        now -
          lastChange >
        30 *
          24 *
          60 *
          60 *
          1000
      ) {
        alerts.push({
          id: `${tank.id}-change`,
          tankId: tank.id,
          title:
            "No recent water change",
          description: `${tank.name} has not recorded a water change in 30+ days.`,
          severity: "info",
        });
      }
    }
  });

  return alerts;
}

/* =========================================================
   DASHBOARD STAT
========================================================= */

function OverviewStat({
  icon,
  label,
  value,
  description,
  alert,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  description: string;
  alert?: boolean;
}) {
  return (
    <div
      className={`overview-stat ${
        alert
          ? "has-alert"
          : ""
      }`}
    >
      <div className="overview-stat-icon">
        {icon}
      </div>

      <small>
        {label}
      </small>

      <b>{value}</b>

      <span>
        {description}
      </span>
    </div>
  );
}

function BeakerIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 3h6" />
      <path d="M10 3v6.5l-5.5 8.2A2 2 0 0 0 6.2 21h11.6a2 2 0 0 0 1.7-3.3L14 9.5V3" />
      <path d="M8 15h8" />
    </svg>
  );
}

/* =========================================================
   GRAPH DATA
========================================================= */

function buildComparisonData(
  params: TankParameter[],
  tankIds: string[],
  selectedParameters: GraphParameter[],
  tanks: Tank[]
) {
  const dateMap =
    new Map<string, any>();

  params.forEach((parameter) => {
    const date =
      shortDate(
        parameter.measured_at
      );

    if (
      !dateMap.has(date)
    ) {
      dateMap.set(date, {
        date,
        timestamp:
          new Date(
            parameter.measured_at
          ).getTime(),
      });
    }

    const row =
      dateMap.get(date);

    const tank =
      tanks.find(
        (x) =>
          x.id ===
          parameter.tank_id
      );

    if (!tank)
      return;

    selectedParameters.forEach(
      (parameterName) => {
        const value =
          (parameter as any)[
            parameterName
          ];

        if (
          value != null
        ) {
          row[
            `${tank.id}_${parameterName}`
          ] = Number(value);
        }
      }
    );
  });

  return Array.from(
    dateMap.values()
  ).sort(
    (a, b) =>
      a.timestamp -
      b.timestamp
  );
}

/* =========================================================
   RECENT ACTIVITY
========================================================= */

function RecentActivity({
  params,
  changes,
  tanks,
  selectTank,
}: {
  params: TankParameter[];
  changes: WaterChange[];
  tanks: Tank[];
  selectTank: (
    id: string
  ) => void;
}) {
  const activity = [
    ...params.map(
      (p) => ({
        id: `p-${p.id}`,
        date:
          p.measured_at,
        tankId:
          p.tank_id,
        type: "test" as const,
        title:
          "Water test recorded",
        description:
          "New water parameters were recorded.",
      })
    ),

    ...changes.map(
      (c) => ({
        id: `c-${c.id}`,
        date:
          c.completed_at,
        tankId:
          c.tank_id,
        type: "change" as const,
        title:
          "Water change completed",
        description:
          `${c.amount_changed_liters} L changed.`,
      })
    ),
  ]
    .sort(
      (a, b) =>
        +new Date(
          b.date
        ) -
        +new Date(
          a.date
        )
    )
    .slice(0, 8);

  if (!activity.length) {
    return (
      <div className="activity-empty">
        <Activity size={28} />

        <b>
          No recent activity
        </b>

        <span>
          Your aquarium activity
          will appear here.
        </span>
      </div>
    );
  }

  return (
    <div className="recent-activity">
      {activity.map(
        (item) => {
          const tank =
            tanks.find(
              (x) =>
                x.id ===
                item.tankId
            );

          return (
            <button
              className="recent-activity-row"
              key={item.id}
              onClick={() =>
                selectTank(
                  item.tankId
                )
              }
            >
              <span
                className={`recent-activity-icon ${item.type}`}
              >
                {item.type ===
                "test" ? (
                  <BeakerIcon />
                ) : (
                  <Droplets
                    size={16}
                  />
                )}
              </span>

              <span className="recent-activity-main">
                <b>
                  {item.title}
                </b>

                <small>
                  {tank?.name ||
                    "Unknown tank"}{" "}
                  ·{" "}
                  {
                    item.description
                  }
                </small>
              </span>

              <span className="recent-activity-date">
                {fmt(
                  item.date
                )}
              </span>

              <ChevronRight
                size={15}
              />
            </button>
          );
        }
      )}
    </div>
  );
}

/* =========================================================
   BACKGROUND EFFECTS
========================================================= */

function BackgroundEffect({
  style,
}: {
  style: BackgroundStyle;
}) {
  if (
    style === "none"
  )
    return null;

  if (
    style === "bubbles"
  ) {
    return (
      <div className="background-effect bubbles-effect">
        {Array.from({
          length: 18,
        }).map((_, i) => (
          <span
            key={i}
            style={{
              left: `${
                (i * 17) % 100
              }%`,
              animationDelay: `${
                (i * 0.7) % 8
              }s`,
              animationDuration: `${
                7 + (i % 5)
              }s`,
            }}
          />
        ))}
      </div>
    );
  }

  if (
    style === "stars"
  ) {
    return (
      <div className="background-effect stars-effect">
        {Array.from({
          length: 45,
        }).map((_, i) => (
          <span
            key={i}
            style={{
              left: `${
                (i * 29) % 100
              }%`,
              top: `${
                (i * 47) % 100
              }%`,
              animationDelay: `${
                (i * 0.2) % 4
              }s`,
            }}
          />
        ))}
      </div>
    );
  }

  if (
    style === "bioluminescent"
  ) {
    return (
      <div className="background-effect bio-effect">
        {Array.from({
          length: 12,
        }).map((_, i) => (
          <span
            key={i}
            style={{
              left: `${
                (i * 31) % 100
              }%`,
              top: `${
                (i * 43) % 100
              }%`,
              animationDelay: `${
                i * 0.45
              }s`,
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={`background-effect ${style}-effect`}
    />
  );
}

/* =========================================================
   TANK OVERVIEW
========================================================= */

function TankOverview({
  p,
  c,
  goP,
  goC,
}: {
  p?: TankParameter;
  c: WaterChange[];
  goP: () => void;
  goC: () => void;
}) {
  const a: [
    string,
    any,
    string
  ][] = [
    [
      "pH",
      p?.ph ?? null,
      "",
    ],
    [
      "Temperature",
      p?.temperature ??
        null,
      "°C",
    ],
    [
      "Ammonia",
      p?.ammonia ??
        null,
      " ppm",
    ],
    [
      "Nitrite",
      p?.nitrite ??
        null,
      " ppm",
    ],
    [
      "Nitrate",
      p?.nitrate ??
        null,
      " ppm",
    ],
    [
      "GH",
      p?.gh ?? null,
      " dGH",
    ],
    [
      "KH",
      p?.kh ?? null,
      " dKH",
    ],
    [
      "TDS",
      p?.tds ?? null,
      " ppm",
    ],
    [
      "Salinity",
      p?.salinity ??
        null,
      "",
    ],
  ];

  return (
    <>
      <div className="metrics">
        {a.map((x) => (
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
                : x[1] + x[2]}
            </b>
          </div>
        ))}
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
              onClick={goP}
            >
              View all
            </button>
          </div>

          <p className="muted">
            {p
              ? "Last tested " +
                fmt(
                  p.measured_at
                )
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
              onClick={goC}
            >
              View all
            </button>
          </div>

          {c
            .slice(0, 3)
            .map(
              (x) => (
                <div
                  className="activity"
                  key={
                    x.id
                  }
                >
                  <Droplets
                    size={
                      16
                    }
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
              )
            )}

          {!c.length && (
            <p className="muted">
              No water changes
              yet.
            </p>
          )}
        </div>
      </div>
    </>
  );
}

/* =========================================================
   PARAMETERS
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
    m: Modal,
    x: any
  ) => void;
  del: (
    t: string,
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
              key={
                x.id
              }
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
   CHANGES
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
    m: Modal,
    x: any
  ) => void;
  del: (
    t: string,
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
            x.amount_changed_liters +
              " L",
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
              key={
                x.id
              }
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
              <tr
                key={i}
              >
                {r.map(
                  (
                    x,
                    j
                  ) => (
                    <td
                      key={
                        j
                      }
                    >
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
  backgroundStyle,
  setBackgroundStyle,
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
  backgroundStyle: BackgroundStyle;
  setBackgroundStyle: (
    value: BackgroundStyle
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
        "Warm coral colours",
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
    {
      id: "midnight",
      name: "Midnight",
      emoji: "🌑",
      description:
        "Ultra-dark minimalist",
    },
    {
      id: "arctic",
      name: "Arctic",
      emoji: "❄️",
      description:
        "Cool icy blue",
    },
    {
      id: "volcanic",
      name: "Volcanic",
      emoji: "🌋",
      description:
        "Dark lava glow",
    },
  ];

  const backgrounds: {
    id: BackgroundStyle;
    name: string;
    icon: React.ReactNode;
    description: string;
  }[] = [
    {
      id: "none",
      name: "Static",
      icon: <Moon size={16} />,
      description:
        "No animated background",
    },
    {
      id: "waves",
      name: "Ocean Waves",
      icon: <Waves size={16} />,
      description:
        "Slow flowing waves",
    },
    {
      id: "bubbles",
      name: "Bubble Drift",
      icon: <CircleDot size={16} />,
      description:
        "Floating aquarium bubbles",
    },
    {
      id: "bioluminescent",
      name: "Bioluminescent",
      icon: <Sparkles size={16} />,
      description:
        "Soft glowing particles",
    },
    {
      id: "stars",
      name: "Cosmic Stars",
      icon: <Sparkles size={16} />,
      description:
        "Slow moving stars",
    },
    {
      id: "plants",
      name: "Aquatic Plants",
      icon: <Leaf size={16} />,
      description:
        "Subtle plant movement",
    },
    {
      id: "current",
      name: "Water Current",
      icon: <Waves size={16} />,
      description:
        "Animated water gradient",
    },
    {
      id: "rain",
      name: "Rainfall",
      icon: <Droplets size={16} />,
      description:
        "Subtle falling droplets",
    },
    {
      id: "neon",
      name: "Neon Glow",
      icon: <Sparkles size={16} />,
      description:
        "Animated glowing atmosphere",
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
            aria-label="Close settings"
          >
            <X size={18} />
          </button>
        </div>

        <div className="settings-section">
          <div className="settings-section-title">
            <Palette size={16} />
            <span>
              Colour theme
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
                    {x.emoji}
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
            <Sparkles
              size={16}
            />

            <span>
              Background
            </span>
          </div>

          <div className="background-grid">
            {backgrounds.map(
              (x) => (
                <button
                  key={x.id}
                  className={`background-option ${
                    backgroundStyle ===
                    x.id
                      ? "selected"
                      : ""
                  }`}
                  onClick={() =>
                    setBackgroundStyle(
                      x.id
                    )
                  }
                >
                  <span className="background-option-icon">
                    {x.icon}
                  </span>

                  <span>
                    <b>
                      {x.name}
                    </b>

                    <small>
                      {
                        x.description
                      }
                    </small>
                  </span>

                  {backgroundStyle ===
                    x.id && (
                    <Check
                      size={
                        15
                      }
                    />
                  )}
                </button>
              )
            )}
          </div>
        </div>

        <div className="settings-section">
          <div className="settings-section-title">
            <span>
              ▦
            </span>

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
            <span>
              ↕
            </span>

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
            <span>
              A
            </span>

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

        <h2>
          {title}
        </h2>

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
  set: (v: any) => void;
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
                  e.target
                    .value
                )
              : e.target
                  .value
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
            name:
              row.name,
            volume:
              row.volume,
            height:
              row.height,
            width:
              row.width,
            depth:
              row.depth,
            notes:
              row.notes,
          }
        : {
            name: "",
            volume:
              null,
            height:
              null,
            width:
              null,
            depth:
              null,
            notes: "",
          }
    );

  const save = async (
    e: any
  ) => {
    e.preventDefault();

    const q = row
      ? supabase
          .from(
            "tanks"
          )
          .update(f)
          .eq(
            "id",
            row.id
          )
      : supabase
          .from(
            "tanks"
          )
          .insert(f);

    const { error } =
      await q;

    if (error) {
      alert(
        error.message
      );
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
      <form
        onSubmit={save}
      >
        <Field
          label="Tank name"
          value={
            f.name
          }
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
            ([l, k]) => (
              <Field
                key={k}
                label={l}
                value={
                  f[k]
                }
                type="number"
                set={(v) =>
                  setF({
                    ...f,
                    [k]: v,
                  })
                }
              />
            )
          )}
        </div>

        <Field
          label="Notes"
          value={
            f.notes
          }
          set={(v) =>
            setF({
              ...f,
              notes: v,
            })
          }
        />

        <Save
          close={close}
        />
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
  const d = row
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
        notes:
          row.notes,
      }
    : {
        measured_at:
          new Date().toISOString(),
        temperature:
          null,
        ph: null,
        ammonia:
          null,
        nitrite:
          null,
        nitrate:
          null,
        gh: null,
        kh: null,
        tds: null,
        salinity:
          null,
        notes: "",
      };

  const [f, setF] =
    useState<any>(d);

  const save = async (
    e: any
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
      alert(
        error.message
      );
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
      <form
        onSubmit={save}
      >
        <Field
          label="Measured at"
          value={new Date(
            f.measured_at
          )
            .toISOString()
            .slice(
              0,
              16
            )}
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
            ([l, k]) => (
              <Field
                key={k}
                label={l}
                value={
                  f[k]
                }
                type="number"
                set={(v) =>
                  setF({
                    ...f,
                    [k]: v,
                  })
                }
              />
            )
          )}
        </div>

        <Field
          label="Notes"
          value={
            f.notes
          }
          set={(v) =>
            setF({
              ...f,
              notes: v,
            })
          }
        />

        <Save
          close={close}
        />
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
    e: any
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
      alert(
        error.message
      );
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
      <form
        onSubmit={save}
      >
        <div className="formgrid">
          <Field
            label="Completed at"
            value={new Date(
              f.completed_at
            )
              .toISOString()
              .slice(
                0,
                16
              )}
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
          ADDED WATER
          PARAMETERS
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
            ([l, k]) => (
              <Field
                key={k}
                label={l}
                value={
                  f[k]
                }
                type="number"
                set={(v) =>
                  setF({
                    ...f,
                    [k]: v,
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

        <Save
          close={close}
        />
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
        className="primary"
        type="submit"
      >
        Save
      </button>
    </div>
  );
}

export default App;
