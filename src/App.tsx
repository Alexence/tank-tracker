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
  BarChart3,
  ChevronDown,
  AlertTriangle,
  Activity,
  Menu,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";

import { supabase } from "./lib/supabase";
import type { Tank, TankParameter, WaterChange } from "./types";

/* =========================================================
   TYPES
========================================================= */

type Modal = "tank" | "parameter" | "change" | null;

type Page = "dashboard" | "tank";

type Tab = "overview" | "parameters" | "changes";

type Theme =
  | "ocean"
  | "coral"
  | "tropical"
  | "space"
  | "sunset"
  | "planted";

type CardStyle = "rounded" | "sharp";

type Density = "comfortable" | "compact";

type TextSize = "normal" | "large";

type Range = "7d" | "30d" | "90d" | "180d" | "all";

type ParameterKey =
  | "temperature"
  | "ph"
  | "ammonia"
  | "nitrite"
  | "nitrate"
  | "gh"
  | "kh"
  | "tds"
  | "salinity";

type ParameterDefinition = {
  key: ParameterKey;
  label: string;
  short: string;
  unit: string;
  decimals?: number;
};

/* =========================================================
   CONSTANTS
========================================================= */

const PARAMETER_DEFINITIONS: ParameterDefinition[] = [
  {
    key: "temperature",
    label: "Temperature",
    short: "Temp",
    unit: "°C",
    decimals: 1,
  },
  {
    key: "ph",
    label: "pH",
    short: "pH",
    unit: "",
    decimals: 2,
  },
  {
    key: "ammonia",
    label: "Ammonia",
    short: "NH₃",
    unit: " ppm",
    decimals: 2,
  },
  {
    key: "nitrite",
    label: "Nitrite",
    short: "NO₂",
    unit: " ppm",
    decimals: 2,
  },
  {
    key: "nitrate",
    label: "Nitrate",
    short: "NO₃",
    unit: " ppm",
    decimals: 1,
  },
  {
    key: "gh",
    label: "GH",
    short: "GH",
    unit: " dGH",
    decimals: 1,
  },
  {
    key: "kh",
    label: "KH",
    short: "KH",
    unit: " dKH",
    decimals: 1,
  },
  {
    key: "tds",
    label: "TDS",
    short: "TDS",
    unit: " ppm",
    decimals: 0,
  },
  {
    key: "salinity",
    label: "Salinity",
    short: "Salt",
    unit: "",
    decimals: 2,
  },
];

const PARAMETER_COLOURS = [
  "#2fe0d1",
  "#ff796c",
  "#55e8b2",
  "#9c7cff",
  "#ff8b62",
  "#65d98a",
  "#72b7ff",
  "#f3c969",
  "#e58cff",
];

const RANGE_LABELS: Record<Range, string> = {
  "7d": "7 days",
  "30d": "30 days",
  "90d": "3 months",
  "180d": "6 months",
  all: "All time",
};

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

const rangeStart = (range: Range) => {
  if (range === "all") return null;

  const date = new Date();

  const days =
    range === "7d"
      ? 7
      : range === "30d"
      ? 30
      : range === "90d"
      ? 90
      : 180;

  date.setDate(date.getDate() - days);

  return date;
};

const getParameterDefinition = (
  key: ParameterKey
) =>
  PARAMETER_DEFINITIONS.find(
    (x) => x.key === key
  )!;

const getParameterValue = (
  row: TankParameter,
  key: ParameterKey
) => {
  const value = row[key];

  return value == null
    ? null
    : Number(value);
};

const formatParameterValue = (
  value: number | null,
  key: ParameterKey
) => {
  if (value == null) return "—";

  const definition =
    getParameterDefinition(key);

  const decimals =
    definition.decimals ?? 1;

  return (
    Number(value).toFixed(decimals) +
    definition.unit
  );
};

/* =========================================================
   APP
========================================================= */

function App() {
  const [tanks, setTanks] =
    useState<Tank[]>([]);

  const [params, setParams] =
    useState<TankParameter[]>([]);

  const [changes, setChanges] =
    useState<WaterChange[]>([]);

  const [selected, setSelected] =
    useState<string | null>(null);

  const [page, setPage] =
    useState<Page>("dashboard");

  const [tab, setTab] =
    useState<Tab>("overview");

  const [menuOpen, setMenuOpen] =
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

  const [settingsOpen, setSettingsOpen] =
    useState(false);

  const [theme, setTheme] =
    useState<Theme>(
      () =>
        (localStorage.getItem(
          "tank-theme"
        ) as Theme) || "ocean"
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
     LOAD
  ======================================================= */

  const load = async () => {
    setLoading(true);

    const [t, p, c] =
      await Promise.all([
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
        (t.error ||
          p.error ||
          c.error)?.message
      );
    }

    const loadedTanks =
      (t.data || []) as Tank[];

    setTanks(loadedTanks);
    setParams(
      (p.data ||
        []) as TankParameter[]
    );
    setChanges(
      (c.data ||
        []) as WaterChange[]
    );

    setSelected((current) =>
      loadedTanks.some(
        (x) => x.id === current
      )
        ? current
        : loadedTanks[0]?.id || null
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

  /* =======================================================
     TANK REORDER
  ======================================================= */

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

  const openTank = (
    id: string
  ) => {
    setSelected(id);
    setPage("tank");
    setTab("overview");
    setMenuOpen(false);
  };

  return (
    <div
      className={`app theme-${theme} cards-${cardStyle} density-${density} text-${textSize}`}
    >
      {/* ===================================================
          HEADER
      =================================================== */}

      <header>
        <button
          className="menu-button"
          onClick={() =>
            setMenuOpen(true)
          }
          aria-label="Open tank menu"
        >
          <Menu size={19} />
        </button>

        <button
          className="brand"
          onClick={() =>
            setPage("dashboard")
          }
        >
          <span>🐟</span>

          <div>
            <b>Tank Tracker</b>
            <small>
              Aquarium control centre
            </small>
          </div>
        </button>

        <div className="actions">
          {/* IMPORTANT:
              Settings is deliberately
              separate from the generic
              mobile icon hiding rule.
          */}

          <button
            className="icon settings-button"
            onClick={() =>
              setSettingsOpen(true)
            }
            aria-label="Open settings"
            title="Settings"
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

      {/* ===================================================
          MAIN
      =================================================== */}

      <main>
        {/* =================================================
            TANK DRAWER
        ================================================= */}

        <aside
          className={
            menuOpen ? "open" : ""
          }
        >
          <div className="mobile-menu-head">
            <b>Your tanks</b>

            <button
              className="icon"
              onClick={() =>
                setMenuOpen(false)
              }
              aria-label="Close tank menu"
            >
              <X size={18} />
            </button>
          </div>

          <button
            className={`dashboard-nav ${
              page === "dashboard"
                ? "active"
                : ""
            }`}
            onClick={() => {
              setPage("dashboard");
              setMenuOpen(false);
            }}
          >
            <LayoutDashboard
              size={17}
            />

            <span>
              Dashboard
            </span>
          </button>

          <div className="side-head">
            <div>
              <small>
                TANKS
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
                    (x.id === selected
                      ? "sel "
                      : "") +
                    (draggedTankId ===
                    x.id
                      ? "dragging"
                      : "")
                  }
                  draggable
                  onClick={() =>
                    openTank(x.id)
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
                          tank.id === x.id
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
                    <b>{x.name}</b>

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
              setMenuOpen(false)
            }
          />
        )}

        {/* =================================================
            CONTENT
        ================================================= */}

        <section className="content">
          {page === "dashboard" ? (
            <Dashboard
              tanks={tanks}
              params={params}
              changes={changes}
              openTank={openTank}
              addTank={() =>
                open("tank")
              }
              loading={loading}
            />
          ) : !tank ? (
            <div className="empty">
              <div>🐠</div>

              <h1>
                Your aquarium dashboard
                starts here.
              </h1>

              <p>
                Create your first tank,
                then record water tests
                and water changes.
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
                    <Pencil size={15} />
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
                    <Trash2 size={15} />
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
                  parameters={tp}
                  changes={tc}
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
                    open("change")
                  }
                  edit={open}
                  del={del}
                />
              )}
            </>
          )}
        </section>
      </main>

      {/* ===================================================
          MODALS
      =================================================== */}

      {modal === "tank" && (
        <TankModal
          row={edit}
          close={() =>
            setModal(null)
          }
          done={load}
        />
      )}

      {modal === "parameter" &&
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
          setTextSize={setTextSize}
          close={() =>
            setSettingsOpen(false)
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
  openTank,
  addTank,
  loading,
}: {
  tanks: Tank[];
  params: TankParameter[];
  changes: WaterChange[];
  openTank: (id: string) => void;
  addTank: () => void;
  loading: boolean;
}) {
  const [
    comparisonRange,
    setComparisonRange,
  ] = useState<Range>("30d");

  const [
    selectedParameters,
    setSelectedParameters,
  ] = useState<
    ParameterKey[]
  >(["ph"]);

  const [
    selectedTanks,
    setSelectedTanks,
  ] = useState<string[]>(
    []
  );

  const [
    tankFilterOpen,
    setTankFilterOpen,
  ] = useState(false);

  const [
    parameterFilterOpen,
    setParameterFilterOpen,
  ] = useState(false);

  useEffect(() => {
    if (
      selectedTanks.length === 0 &&
      tanks.length
    ) {
      setSelectedTanks(
        tanks.map(
          (x) => x.id
        )
      );
    }

    setSelectedTanks(
      (current) =>
        current.filter(
          (id) =>
            tanks.some(
              (x) =>
                x.id === id
            )
        )
    );
  }, [tanks]);

  const healthyCount =
    tanks.filter((tank) => {
      const latest =
        params
          .filter(
            (p) =>
              p.tank_id ===
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

      if (!latest) return true;

      return (
        latest.ammonia == null ||
        latest.ammonia <= 0
      );
    }).length;

  const recentChanges =
    changes
      .slice()
      .sort(
        (a, b) =>
          +new Date(
            b.completed_at
          ) -
          +new Date(
            a.completed_at
          )
      )
      .slice(0, 5);

  const alerts =
    tanks.flatMap(
      (tank) => {
        const latest =
          params
            .filter(
              (p) =>
                p.tank_id ===
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

        if (!latest)
          return [];

        const result: {
          tank: Tank;
          message: string;
          type: string;
        }[] = [];

        if (
          latest.ammonia != null &&
          latest.ammonia > 0
        ) {
          result.push({
            tank,
            message: `Ammonia detected: ${latest.ammonia} ppm`,
            type: "warning",
          });
        }

        if (
          latest.nitrite != null &&
          latest.nitrite > 0
        ) {
          result.push({
            tank,
            message: `Nitrite detected: ${latest.nitrite} ppm`,
            type: "warning",
          });
        }

        return result;
      }
    );

  const comparisonData =
    buildComparisonData(
      params,
      tanks,
      selectedTanks.length
        ? selectedTanks
        : tanks.map(
            (x) => x.id
          ),
      selectedParameters,
      comparisonRange
    );

  const toggleParameter = (
    key: ParameterKey
  ) => {
    setSelectedParameters(
      (current) =>
        current.includes(key)
          ? current.filter(
              (x) => x !== key
            )
          : [
              ...current,
              key,
            ]
    );
  };

  const toggleTank = (
    id: string
  ) => {
    setSelectedTanks(
      (current) =>
        current.includes(id)
          ? current.filter(
              (x) => x !== id
            )
          : [
              ...current,
              id,
            ]
    );
  };

  const allTanksSelected =
    selectedTanks.length ===
      tanks.length &&
    tanks.length > 0;

  return (
    <>
      <div className="dashboard-heading">
        <div>
          <small>
            AQUARIUM COLLECTION
          </small>

          <h1>
            Dashboard
          </h1>

          <p>
            A complete overview of
            your aquariums.
          </p>
        </div>

        {!tanks.length &&
          !loading && (
            <button
              className="primary"
              onClick={addTank}
            >
              <Plus size={17} />
              Add tank
            </button>
          )}
      </div>

      {/* ===================================================
          SUMMARY METRICS
      =================================================== */}

      <div className="dashboard-metrics">
        <div className="metric">
          <small>
            TOTAL TANKS
          </small>

          <b>{tanks.length}</b>

          <span>
            Aquariums tracked
          </span>
        </div>

        <div className="metric">
          <small>
            HEALTHY
          </small>

          <b>
            {healthyCount}
          </b>

          <span>
            No immediate alerts
          </span>
        </div>

        <div className="metric">
          <small>
            WATER CHANGES
          </small>

          <b>
            {changes.length}
          </b>

          <span>
            Total recorded
          </span>
        </div>

        <div className="metric">
          <small>
            TESTS
          </small>

          <b>
            {params.length}
          </b>

          <span>
            Parameter records
          </span>
        </div>
      </div>

      {/* ===================================================
          ALERTS
      =================================================== */}

      {alerts.length > 0 && (
        <div className="panel dashboard-alerts">
          <div className="panelhead">
            <div>
              <small>
                ATTENTION
              </small>

              <h3>
                Aquarium alerts
              </h3>
            </div>

            <AlertTriangle
              size={18}
            />
          </div>

          {alerts.map(
            (alert, index) => (
              <button
                className="alert-row"
                key={`${alert.tank.id}-${index}`}
                onClick={() =>
                  openTank(
                    alert.tank.id
                  )
                }
              >
                <AlertTriangle
                  size={16}
                />

                <span>
                  <b>
                    {alert.tank.name}
                  </b>

                  <small>
                    {alert.message}
                  </small>
                </span>

                <ChevronRight
                  size={16}
                />
              </button>
            )
          )}
        </div>
      )}

      {/* ===================================================
          COMPARISON GRAPH
      =================================================== */}

      <div className="panel comparison-panel">
        <div className="panelhead comparison-heading">
          <div>
            <small>
              ANALYTICS
            </small>

            <h3>
              Parameter comparison
            </h3>

            <p className="muted">
              Compare water conditions
              across your tanks.
            </p>
          </div>

          <BarChart3
            size={20}
          />
        </div>

        <div className="graph-controls">
          {/* PARAMETERS */}

          <div className="control-group">
            <span>
              Parameters
            </span>

            <button
              className="select-control"
              onClick={() =>
                setParameterFilterOpen(
                  (x) => !x
                )
              }
            >
              <span>
                {selectedParameters.length ===
                0
                  ? "None selected"
                  : selectedParameters.length ===
                    PARAMETER_DEFINITIONS.length
                  ? "All parameters"
                  : selectedParameters
                      .map(
                        (key) =>
                          getParameterDefinition(
                            key
                          ).short
                      )
                      .join(
                        ", "
                      )}
              </span>

              <ChevronDown
                size={15}
              />
            </button>

            {parameterFilterOpen && (
              <div className="filter-popover">
                <button
                  className="filter-all"
                  onClick={() =>
                    setSelectedParameters(
                      selectedParameters.length ===
                        PARAMETER_DEFINITIONS.length
                        ? []
                        : PARAMETER_DEFINITIONS.map(
                            (x) =>
                              x.key
                          )
                    )
                  }
                >
                  {selectedParameters.length ===
                  PARAMETER_DEFINITIONS.length
                    ? "Clear all"
                    : "Select all"}
                </button>

                {PARAMETER_DEFINITIONS.map(
                  (definition) => (
                    <label
                      className="filter-check"
                      key={
                        definition.key
                      }
                    >
                      <input
                        type="checkbox"
                        checked={selectedParameters.includes(
                          definition.key
                        )}
                        onChange={() =>
                          toggleParameter(
                            definition.key
                          )
                        }
                      />

                      <span>
                        {definition.label}
                      </span>
                    </label>
                  )
                )}
              </div>
            )}
          </div>

          {/* TANKS */}

          <div className="control-group">
            <span>
              Tanks
            </span>

            <button
              className="select-control"
              onClick={() =>
                setTankFilterOpen(
                  (x) => !x
                )
              }
            >
              <span>
                {allTanksSelected
                  ? "All tanks"
                  : selectedTanks.length ===
                    0
                  ? "No tanks"
                  : `${selectedTanks.length} selected`}
              </span>

              <ChevronDown
                size={15}
              />
            </button>

            {tankFilterOpen && (
              <div className="filter-popover">
                <button
                  className="filter-all"
                  onClick={() =>
                    setSelectedTanks(
                      allTanksSelected
                        ? []
                        : tanks.map(
                            (x) =>
                              x.id
                          )
                    )
                  }
                >
                  {allTanksSelected
                    ? "Clear all"
                    : "Select all"}
                </button>

                {tanks.map(
                  (tank) => (
                    <label
                      className="filter-check"
                      key={tank.id}
                    >
                      <input
                        type="checkbox"
                        checked={selectedTanks.includes(
                          tank.id
                        )}
                        onChange={() =>
                          toggleTank(
                            tank.id
                          )
                        }
                      />

                      <span>
                        {tank.name}
                      </span>
                    </label>
                  )
                )}
              </div>
            )}
          </div>

          {/* RANGE */}

          <div className="control-group">
            <span>
              Period
            </span>

            <select
              className="select-control"
              value={
                comparisonRange
              }
              onChange={(e) =>
                setComparisonRange(
                  e.target
                    .value as Range
                )
              }
            >
              {Object.entries(
                RANGE_LABELS
              ).map(
                ([key, label]) => (
                  <option
                    key={key}
                    value={key}
                  >
                    {label}
                  </option>
                )
              )}
            </select>
          </div>
        </div>

        {selectedParameters.length ===
        0 ? (
          <GraphEmpty
            message="Select at least one parameter."
          />
        ) : selectedTanks.length ===
          0 ? (
          <GraphEmpty
            message="Select at least one tank."
          />
        ) : comparisonData.length ===
          0 ? (
          <GraphEmpty
            message="There is not enough data for this selection."
          />
        ) : (
          <ComparisonGraph
            data={
              comparisonData
            }
            selectedParameters={
              selectedParameters
            }
          />
        )}
      </div>

      {/* ===================================================
          TANK CARDS
      =================================================== */}

      {tanks.length > 0 && (
        <div className="dashboard-section">
          <div className="section-heading">
            <div>
              <small>
                AQUARIUMS
              </small>

              <h2>
                Your aquariums
              </h2>
            </div>
          </div>

          <div className="tank-dashboard-grid">
            {tanks.map(
              (tank) => {
                const latest =
                  params
                    .filter(
                      (p) =>
                        p.tank_id ===
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

                return (
                  <button
                    className="tank-dashboard-card"
                    key={tank.id}
                    onClick={() =>
                      openTank(
                        tank.id
                      )
                    }
                  >
                    <div className="tank-dashboard-top">
                      <span className="tankicon">
                        <Fish size={18} />
                      </span>

                      <ChevronRight
                        size={16}
                      />
                    </div>

                    <h3>
                      {tank.name}
                    </h3>

                    <p>
                      {tank.volume
                        ? `${tank.volume} L`
                        : "Volume not set"}
                    </p>

                    <div className="tank-mini-values">
                      <span>
                        <small>
                          pH
                        </small>

                        <b>
                          {latest?.ph ??
                            "—"}
                        </b>
                      </span>

                      <span>
                        <small>
                          Temp
                        </small>

                        <b>
                          {latest?.temperature !=
                          null
                            ? `${latest.temperature}°`
                            : "—"}
                        </b>
                      </span>

                      <span>
                        <small>
                          TDS
                        </small>

                        <b>
                          {latest?.tds ??
                            "—"}
                        </b>
                      </span>
                    </div>
                  </button>
                );
              }
            )}
          </div>
        </div>
      )}

      {/* ===================================================
          RECENT ACTIVITY
      =================================================== */}

      <div className="panel dashboard-activity">
        <div className="panelhead">
          <div>
            <small>
              RECENT
            </small>

            <h3>
              Recent activity
            </h3>
          </div>

          <Activity size={18} />
        </div>

        {recentChanges.length ===
        0 ? (
          <p className="muted">
            No water changes have
            been recorded yet.
          </p>
        ) : (
          recentChanges.map(
            (change) => {
              const changeTank =
                tanks.find(
                  (x) =>
                    x.id ===
                    change.tank_id
                );

              return (
                <button
                  className="activity"
                  key={
                    change.id
                  }
                  onClick={() =>
                    changeTank &&
                    openTank(
                      changeTank.id
                    )
                  }
                >
                  <Droplets
                    size={16}
                  />

                  <span>
                    <b>
                      {change.amount_changed_liters}{" "}
                      L water change
                    </b>

                    <small>
                      {changeTank?.name ||
                        "Unknown tank"}{" "}
                      ·{" "}
                      {fmt(
                        change.completed_at
                      )}
                    </small>
                  </span>
                </button>
              );
            }
          )
        )}
      </div>
    </>
  );
}

/* =========================================================
   COMPARISON DATA
========================================================= */

function buildComparisonData(
  params: TankParameter[],
  tanks: Tank[],
  selectedTankIds: string[],
  selectedParameters: ParameterKey[],
  range: Range
) {
  const start =
    rangeStart(range);

  const filtered = params.filter(
    (row) => {
      if (
        !selectedTankIds.includes(
          row.tank_id
        )
      )
        return false;

      if (start) {
        return (
          new Date(
            row.measured_at
          ) >= start
        );
      }

      return true;
    }
  );

  /*
    Each measurement becomes one
    timeline row.

    We create separate series for
    each tank + parameter combination.

    Example:
    "Shrimp Tank — pH"
    "Community Tank — pH"
  */

  const timestamps =
    Array.from(
      new Set(
        filtered.map(
          (row) =>
            row.measured_at
        )
      )
    ).sort(
      (a, b) =>
        +new Date(a) -
        +new Date(b)
    );

  return timestamps.map(
    (timestamp) => {
      const row: Record<
        string,
        any
      > = {
        date: shortDate(
          timestamp
        ),
        timestamp,
      };

      selectedTankIds.forEach(
        (tankId) => {
          const tank =
            tanks.find(
              (x) =>
                x.id ===
                tankId
            );

          if (!tank) return;

          selectedParameters.forEach(
            (parameter) => {
              const match =
                filtered.find(
                  (x) =>
                    x.tank_id ===
                      tankId &&
                    x.measured_at ===
                      timestamp
                );

              if (!match)
                return;

              const value =
                getParameterValue(
                  match,
                  parameter
                );

              if (
                value != null
              ) {
                row[
                  `${tankId}_${parameter}`
                ] = value;
              }
            }
          );
        }
      );

      return row;
    }
  );
}

/* =========================================================
   COMPARISON GRAPH
========================================================= */

function ComparisonGraph({
  data,
  selectedParameters,
}: {
  data: any[];
  selectedParameters: ParameterKey[];
}) {
  const series = useMemo(
    () => {
      const keys =
        new Set<string>();

      data.forEach(
        (row) => {
          Object.keys(
            row
          ).forEach((key) => {
            if (
              key !==
                "date" &&
              key !==
                "timestamp"
            ) {
              keys.add(key);
            }
          });
        }
      );

      return Array.from(
        keys
      );
    },
    [data]
  );

  /*
    Recharts is deliberately given
    multiple Y axes where parameters
    use different units.

    This prevents pH and TDS from
    being treated as the same scale.
  */

  return (
    <div className="chart-container">
      <ResponsiveContainer
        width="100%"
        height={390}
      >
        <LineChart
          data={data}
          margin={{
            top: 15,
            right: 25,
            left: 0,
            bottom: 5,
          }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#24394a"
            vertical={false}
          />

          <XAxis
            dataKey="date"
            stroke="#71899d"
            tick={{
              fill: "#71899d",
              fontSize: 10,
            }}
            minTickGap={30}
          />

          <YAxis
            yAxisId="left"
            stroke="#71899d"
            tick={{
              fill: "#71899d",
              fontSize: 10,
            }}
          />

          <YAxis
            yAxisId="right"
            orientation="right"
            stroke="#71899d"
            tick={{
              fill: "#71899d",
              fontSize: 10,
            }}
          />

          <Tooltip
            contentStyle={{
              background:
                "#0a1726",
              border:
                "1px solid #29435a",
              borderRadius:
                "10px",
              color: "#edf7ff",
            }}
            labelStyle={{
              color: "#71899d",
            }}
          />

          <Legend />

          {series.map(
            (key, index) => {
              const parameter =
                selectedParameters.find(
                  (p) =>
                    key.endsWith(
                      `_${p}`
                    )
                );

              return (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  name={formatSeriesName(
                    key,
                    parameter
                  )}
                  stroke={
                    PARAMETER_COLOURS[
                      index %
                        PARAMETER_COLOURS.length
                    ]
                  }
                  strokeWidth={2}
                  dot={{
                    r: 2,
                  }}
                  activeDot={{
                    r: 5,
                  }}
                  connectNulls
                  yAxisId={
                    parameter ===
                      "temperature" ||
                    parameter ===
                      "ph"
                      ? "left"
                      : "right"
                  }
                />
              );
            }
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function formatSeriesName(
  key: string,
  parameter?: ParameterKey
) {
  const tankId =
    parameter
      ? key.slice(
          0,
          -(
            parameter.length +
            1
          )
        )
      : key;

  const tankName =
    tankId.slice(0, 12);

  return `${tankName} · ${
    parameter
      ? getParameterDefinition(
          parameter
        ).short
      : ""
  }`;
}

/* =========================================================
   TANK OVERVIEW
========================================================= */

function TankOverview({
  p,
  c,
  goP,
  goC,
  parameters,
  changes,
}: {
  p?: TankParameter;
  c: WaterChange[];
  goP: () => void;
  goC: () => void;
  parameters: TankParameter[];
  changes: WaterChange[];
}) {
  return (
    <>
      <div className="metrics">
        {PARAMETER_DEFINITIONS.map(
          (definition) => (
            <div
              className="metric"
              key={
                definition.key
              }
            >
              <small>
                {definition.label}
              </small>

              <b>
                {formatParameterValue(
                  p
                    ? getParameterValue(
                        p,
                        definition.key
                      )
                    : null,
                  definition.key
                )}
              </b>
            </div>
          )
        )}
      </div>

      <div className="panel tank-history-panel">
        <HistoryGraph
          parameters={
            parameters
          }
          changes={changes}
        />
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
              ? `Last tested ${fmt(
                  p.measured_at
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
              onClick={goC}
            >
              View all
            </button>
          </div>

          {c
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

          {!c.length && (
            <p className="muted">
              No water changes yet.
            </p>
          )}
        </div>
      </div>
    </>
  );
}

/* =========================================================
   HISTORY GRAPH
========================================================= */

function HistoryGraph({
  parameters,
  changes,
}: {
  parameters: TankParameter[];
  changes: WaterChange[];
}) {
  const [
    selectedParameters,
    setSelectedParameters,
  ] = useState<
    ParameterKey[]
  >(["ph"]);

  const [range, setRange] =
    useState<Range>("30d");

  const [
    parameterMenuOpen,
    setParameterMenuOpen,
  ] = useState(false);

  const filteredParameters =
    useMemo(() => {
      const start =
        rangeStart(range);

      return parameters.filter(
        (row) =>
          !start ||
          new Date(
            row.measured_at
          ) >= start
      );
    }, [parameters, range]);

  const graphData =
    filteredParameters
      .slice()
      .sort(
        (a, b) =>
          +new Date(
            a.measured_at
          ) -
          +new Date(
            b.measured_at
          )
      )
      .map((row) => {
        const result: Record<
          string,
          any
        > = {
          date: shortDate(
            row.measured_at
          ),
          timestamp:
            row.measured_at,
        };

        selectedParameters.forEach(
          (parameter) => {
            result[
              parameter
            ] =
              getParameterValue(
                row,
                parameter
              );
          }
        );

        return result;
      });

  const visibleChanges =
    changes.filter((change) => {
      const start =
        rangeStart(range);

      return (
        !start ||
        new Date(
          change.completed_at
        ) >= start
      );
    });

  const toggle = (
    key: ParameterKey
  ) => {
    setSelectedParameters(
      (current) =>
        current.includes(key)
          ? current.filter(
              (x) => x !== key
            )
          : [
              ...current,
              key,
            ]
    );
  };

  return (
    <>
      <div className="panelhead">
        <div>
          <small>
            HISTORY
          </small>

          <h3>
            Water history
          </h3>

          <p className="muted">
            Track parameter changes
            and see water changes as
            timeline events.
          </p>
        </div>
      </div>

      <div className="history-controls">
        <div className="history-parameter-control">
          <button
            className="select-control"
            onClick={() =>
              setParameterMenuOpen(
                (x) => !x
              )
            }
          >
            <span>
              {selectedParameters.length ===
              0
                ? "Select parameters"
                : selectedParameters
                    .map(
                      (x) =>
                        getParameterDefinition(
                          x
                        ).short
                    )
                    .join(
                      ", "
                    )}
            </span>

            <ChevronDown
              size={15}
            />
          </button>

          {parameterMenuOpen && (
            <div className="filter-popover history-filter">
              <button
                className="filter-all"
                onClick={() =>
                  setSelectedParameters(
                    selectedParameters.length ===
                      PARAMETER_DEFINITIONS.length
                      ? []
                      : PARAMETER_DEFINITIONS.map(
                          (x) =>
                            x.key
                        )
                  )
                }
              >
                {selectedParameters.length ===
                PARAMETER_DEFINITIONS.length
                  ? "Clear all"
                  : "Select all"}
              </button>

              {PARAMETER_DEFINITIONS.map(
                (definition) => (
                  <label
                    className="filter-check"
                    key={
                      definition.key
                    }
                  >
                    <input
                      type="checkbox"
                      checked={selectedParameters.includes(
                        definition.key
                      )}
                      onChange={() =>
                        toggle(
                          definition.key
                        )
                      }
                    />

                    <span>
                      {
                        definition.label
                      }
                    </span>
                  </label>
                )
              )}
            </div>
          )}
        </div>

        <div className="range-buttons">
          {(
            Object.keys(
              RANGE_LABELS
            ) as Range[]
          ).map((x) => (
            <button
              key={x}
              className={
                range === x
                  ? "active"
                  : ""
              }
              onClick={() =>
                setRange(x)
              }
            >
              {x === "7d"
                ? "1W"
                : x === "30d"
                ? "1M"
                : x === "90d"
                ? "3M"
                : x === "180d"
                ? "6M"
                : "All"}
            </button>
          ))}
        </div>
      </div>

      {selectedParameters.length ===
      0 ? (
        <GraphEmpty
          message="Select at least one parameter."
        />
      ) : graphData.length ===
        0 ? (
        <GraphEmpty
          message="There is not enough data for this period."
        />
      ) : (
        <div className="chart-container history-chart">
          <ResponsiveContainer
            width="100%"
            height={400}
          >
            <LineChart
              data={graphData}
              margin={{
                top: 25,
                right: 20,
                left: 0,
                bottom: 5,
              }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#24394a"
                vertical={false}
              />

              <XAxis
                dataKey="date"
                stroke="#71899d"
                tick={{
                  fill: "#71899d",
                  fontSize: 10,
                }}
                minTickGap={30}
              />

              <YAxis
                yAxisId="left"
                stroke="#71899d"
                tick={{
                  fill: "#71899d",
                  fontSize: 10,
                }}
              />

              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#71899d"
                tick={{
                  fill: "#71899d",
                  fontSize: 10,
                }}
              />

              <Tooltip
                contentStyle={{
                  background:
                    "#0a1726",
                  border:
                    "1px solid #29435a",
                  borderRadius:
                    "10px",
                  color: "#edf7ff",
                }}
              />

              <Legend />

              {selectedParameters.map(
                (
                  parameter,
                  index
                ) => (
                  <Line
                    key={
                      parameter
                    }
                    type="monotone"
                    dataKey={
                      parameter
                    }
                    name={
                      getParameterDefinition(
                        parameter
                      ).label
                    }
                    stroke={
                      PARAMETER_COLOURS[
                        index %
                          PARAMETER_COLOURS.length
                      ]
                    }
                    strokeWidth={2.5}
                    dot={{
                      r: 3,
                    }}
                    activeDot={{
                      r: 6,
                    }}
                    connectNulls
                    yAxisId={
                      parameter ===
                        "temperature" ||
                      parameter ===
                        "ph"
                        ? "left"
                        : "right"
                    }
                  />
                )
              )}

              {/* Water changes are event
                  markers, not graph values. */}

              {visibleChanges.map(
                (change) => (
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
                      0.55
                    }
                    label={{
                      value: `💧 ${change.amount_changed_liters}L`,
                      position:
                        "top",
                      fill: "#9bb2c2",
                      fontSize: 10,
                    }}
                  />
                )
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {visibleChanges.length >
        0 && (
        <div className="water-change-events">
          <div className="event-heading">
            <Droplets size={15} />

            <span>
              Water change events
            </span>
          </div>

          <div className="event-list">
            {visibleChanges
              .slice()
              .sort(
                (a, b) =>
                  +new Date(
                    a.completed_at
                  ) -
                  +new Date(
                    b.completed_at
                  )
              )
              .map(
                (change) => (
                  <div
                    className="event-item"
                    key={
                      change.id
                    }
                  >
                    <span className="event-dot" />

                    <div>
                      <b>
                        {
                          change.amount_changed_liters
                        }{" "}
                        L water change
                      </b>

                      <small>
                        {fmt(
                          change.completed_at
                        )}

                        {change.added_water_notes
                          ? ` · ${change.added_water_notes}`
                          : ""}
                      </small>
                    </div>
                  </div>
                )
              )}
          </div>
        </div>
      )}
    </>
  );
}

/* =========================================================
   GRAPH EMPTY
========================================================= */

function GraphEmpty({
  message,
}: {
  message: string;
}) {
  return (
    <div className="graph-empty">
      <BarChart3 size={28} />

      <b>
        No graph data
      </b>

      <span>
        {message}
      </span>
    </div>
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
          "Salinity",
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
            x.salinity ??
              "—",
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
          "Salinity",
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
            x.added_water_salinity ??
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
      <button onClick={onEdit}>
        <Pencil size={14} />
      </button>

      <button onClick={onDelete}>
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
                    <td
                      key={j}
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
            aria-label="Close settings"
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
                        size={14}
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
                  Soft aquarium style
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
                  Clean technical style
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
  children: any;
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
            name: row.name,
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
            volume: null,
            height: null,
            width: null,
            depth: null,
            notes: "",
          }
    );

  const save = async (
    e: any
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
            tank_id: tank,
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
          {PARAMETER_DEFINITIONS.map(
            (definition) => (
              <Field
                key={
                  definition.key
                }
                label={`${definition.label}${
                  definition.unit
                    ? ` (${definition.unit.trim()})`
                    : ""
                }`}
                value={
                  f[
                    definition
                      .key
                  ]
                }
                type="number"
                set={(v) =>
                  setF({
                    ...f,
                    [definition.key]:
                      v,
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
        ? { ...row }
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
          .update(payload)
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
            tank_id: tank,
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
   EXPORT
========================================================= */

export default App;
