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
  AlertTriangle,
  Activity,
  Users,
  Beaker,
  Waves,
  BarChart3,
  Minus,
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
import type {
  Tank,
  TankParameter,
  WaterChange,
} from "./types";

/* =========================================================
   TYPES
========================================================= */

type Page = "dashboard" | "tank";

type Modal =
  | "tank"
  | "parameter"
  | "change"
  | "species"
  | "tankSpecies"
  | null;

type Tab =
  | "overview"
  | "parameters"
  | "changes"
  | "livestock";

type Theme =
  | "ocean"
  | "coral"
  | "tropical"
  | "space"
  | "sunset"
  | "planted"
  | "arctic"
  | "volcanic"
  | "bubblegum";

type CardStyle = "rounded" | "sharp";
type Density = "comfortable" | "compact";
type TextSize = "normal" | "large";

type Species = {
  id: string;
  name: string;
  scientific_name?: string | null;
  description?: string | null;

  min_ph?: number | null;
  max_ph?: number | null;

  min_temperature?: number | null;
  max_temperature?: number | null;

  min_gh?: number | null;
  max_gh?: number | null;

  min_kh?: number | null;
  max_kh?: number | null;

  min_tds?: number | null;
  max_tds?: number | null;

  min_salinity?: number | null;
  max_salinity?: number | null;

  min_tank_volume?: number | null;

  freshwater?: boolean | null;
  peaceful?: boolean | null;

  notes?: string | null;
};

type TankSpecies = {
  id: string;
  tank_id: string;
  species_id: string;
  quantity: number;
  notes?: string | null;

  species?: Species;
};

type GraphParameter =
  | "temperature"
  | "ph"
  | "ammonia"
  | "nitrite"
  | "nitrate"
  | "gh"
  | "kh"
  | "tds"
  | "salinity";

type GraphSeries = {
  key: string;
  label: string;
  tankId: string;
  parameter: GraphParameter;
};

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

/* =========================================================
   GRAPH HELPERS
========================================================= */

const graphLabels: Record<
  GraphParameter,
  string
> = {
  temperature: "Temperature",
  ph: "pH",
  ammonia: "Ammonia",
  nitrite: "Nitrite",
  nitrate: "Nitrate",
  gh: "GH",
  kh: "KH",
  tds: "TDS",
  salinity: "Salinity",
};

const graphColours = [
  "#2fe0d1",
  "#ff796c",
  "#55e8b2",
  "#9c7cff",
  "#ff8b62",
  "#65d98a",
  "#8de4ff",
  "#ff72ba",
  "#ffd166",
];

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

  const [species, setSpecies] =
    useState<Species[]>([]);

  const [tankSpecies, setTankSpecies] =
    useState<TankSpecies[]>([]);

  const [page, setPage] =
    useState<Page>("dashboard");

  const [selected, setSelected] =
    useState<string | null>(null);

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

  /* =======================================================
     PERSIST SETTINGS
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
     LOAD
  ======================================================= */

  const load = async () => {
    setLoading(true);

    const [
      tanksResult,
      paramsResult,
      changesResult,
      speciesResult,
      tankSpeciesResult,
    ] = await Promise.all([
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

      supabase
        .from("species")
        .select("*")
        .order("name", {
          ascending: true,
        }),

      supabase
        .from("tank_species")
        .select(
          `
            *,
            species (*)
          `
        ),
    ]);

    const errors = [
      tanksResult.error,
      paramsResult.error,
      changesResult.error,
      speciesResult.error,
      tankSpeciesResult.error,
    ].filter(Boolean);

    if (errors.length) {
      console.error(errors);

      alert(
        errors[0]?.message ||
          "Could not load aquarium data."
      );
    }

    setTanks(
      (tanksResult.data ||
        []) as Tank[]
    );

    setParams(
      (paramsResult.data ||
        []) as TankParameter[]
    );

    setChanges(
      (changesResult.data ||
        []) as WaterChange[]
    );

    setSpecies(
      (speciesResult.data ||
        []) as Species[]
    );

    setTankSpecies(
      (tankSpeciesResult.data ||
        []) as TankSpecies[]
    );

    setSelected((current) =>
      (tanksResult.data || []).some(
        (x) => x.id === current
      )
        ? current
        : (tanksResult.data || [])[0]
            ?.id || null
    );

    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  /* =======================================================
     CURRENT TANK
  ======================================================= */

  const tank =
    tanks.find(
      (x) => x.id === selected
    ) || null;

  const tankParameters = useMemo(
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

  const tankLivestock =
    useMemo(
      () =>
        tankSpecies.filter(
          (x) =>
            x.tank_id === selected
        ),
      [tankSpecies, selected]
    );

  /* =======================================================
     OPEN MODAL
  ======================================================= */

  const open = (
    modalName: Modal,
    row: any = null
  ) => {
    setEdit(row);
    setModal(modalName);
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
     TANK ORDER
  ======================================================= */

  const reorderTanks = async (
    fromIndex: number,
    toIndex: number
  ) => {
    if (
      fromIndex === toIndex
    )
      return;

    const reordered = [
      ...tanks,
    ];

    const [moved] =
      reordered.splice(
        fromIndex,
        1
      );

    reordered.splice(
      toIndex,
      0,
      moved
    );

    setTanks(reordered);

    const results =
      await Promise.all(
        reordered.map(
          (item, index) =>
            supabase
              .from("tanks")
              .update({
                sort_order:
                  index,
              })
              .eq(
                "id",
                item.id
              )
        )
      );

    const error =
      results.find(
        (x) => x.error
      )?.error;

    if (error) {
      alert(
        `Could not save tank order: ${error.message}`
      );

      await load();
    }
  };

  /* =======================================================
     NAVIGATE TANK
  ======================================================= */

  const openTank = (
    id: string
  ) => {
    setSelected(id);
    setPage("tank");
    setTab("overview");
    setMenuOpen(false);
  };

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div
      className={`
        app
        theme-${theme}
        cards-${cardStyle}
        density-${density}
        text-${textSize}
      `}
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
          aria-label="Open menu"
        >
          ☰
        </button>

        <button
          className="brand brand-button"
          onClick={() => {
            setPage("dashboard");
            setSelectedSpecies(
              null
            );
          }}
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
            onClick={
              page === "species"
                ? loadSpecies
                : load
            }
            className="icon"
            aria-label="Refresh"
          >
            <RefreshCw size={17} />
          </button>

          {page ===
            "dashboard" && (
            <button
              className="primary"
              onClick={() =>
                open("tank")
              }
            >
              <Plus size={17} />
              Add tank
            </button>
          )}

          {page ===
            "species" && (
            <button
              className="primary"
              onClick={() =>
                open("species")
              }
            >
              <Plus size={17} />
              Add species
            </button>
          )}
        </div>
      </header>

      {/* ===================================================
          MAIN
      =================================================== */}

      <main>
        {/* =================================================
            SIDEBAR
        ================================================= */}

        <aside
          className={
            menuOpen
              ? "open"
              : ""
          }
        >
          <div className="mobile-menu-head">
            <b>Menu</b>

            <button
              className="icon"
              onClick={() =>
                setMenuOpen(false)
              }
            >
              <X size={18} />
            </button>
          </div>

          {/* NAVIGATION */}

          <div className="sidebar-nav">
            <button
              className={
                page === "dashboard"
                  ? "nav-item active"
                  : "nav-item"
              }
              onClick={() => {
                setPage(
                  "dashboard"
                );
                setMenuOpen(
                  false
                );
              }}
            >
              <span>🏠</span>
              <span>Dashboard</span>
            </button>

            <button
              className={
                page === "species"
                  ? "nav-item active"
                  : "nav-item"
              }
              onClick={() => {
                setPage("species");
                setMenuOpen(
                  false
                );
                setSelectedSpecies(
                  null
                );
              }}
            >
              <BookOpen size={17} />
              <span>
                Species Library
              </span>
            </button>
          </div>

          {/* Tanks */}

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
                    openTank(x.id)
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

                    const from =
                      tanks.findIndex(
                        (tank) =>
                          tank.id ===
                          draggedId
                      );

                    const to =
                      tanks.findIndex(
                        (tank) =>
                          tank.id ===
                          x.id
                      );

                    if (
                      from !== -1 &&
                      to !== -1
                    ) {
                      reorderTanks(
                        from,
                        to
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

        {/* =================================================
            CONTENT
        ================================================= */}

        <section className="content">
          {page ===
            "dashboard" && (
            <Dashboard
              tanks={tanks}
              params={params}
              changes={changes}
              tankSpecies={
                tankSpecies
              }
              species={species}
              openTank={openTank}
            />
          )}

          {page === "tank" &&
            tank && (
              <TankPage
                tank={tank}
                params={
                  tankParameters
                }
                changes={
                  tankChanges
                }
                livestock={
                  tankLivestock
                }
                species={
                  species
                }
                open={open}
                del={del}
                setTab={setTab}
                tab={tab}
              />
            )}

          {page === "tank" &&
            !tank && (
              <div className="empty">
                <div>🐠</div>

                <h1>
                  Your aquarium
                  dashboard
                  starts here.
                </h1>

                <p>
                  Create your first
                  tank, then record
                  water tests,
                  water changes and
                  livestock.
                </p>

                <button
                  className="primary"
                  onClick={() =>
                    open("tank")
                  }
                >
                  <Plus size={17} />
                  Add your first
                  tank
                </button>
              </div>
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

      {modal ===
        "tankSpecies" &&
        tank && (
          <TankSpeciesModal
            tank={tank}
            species={species}
            row={edit}
            existing={
              tankLivestock
            }
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
          cardStyle={
            cardStyle
          }
          setCardStyle={
            setCardStyle
          }
          density={density}
          setDensity={setDensity}
          textSize={
            textSize
          }
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
  tankSpecies,
  species,
  openTank,
}: {
  tanks: Tank[];
  params: TankParameter[];
  changes: WaterChange[];
  tankSpecies: TankSpecies[];
  species: Species[];
  openTank: (
    id: string
  ) => void;
}) {
  const latestByTank =
    useMemo(() => {
      const result: Record<
        string,
        TankParameter
      > = {};

      params.forEach(
        (p) => {
          if (
            !result[p.tank_id]
          ) {
            result[
              p.tank_id
            ] = p;
          }
        }
      );

      return result;
    }, [params]);

  const alerts =
    useMemo(() => {
      const output: {
        tank: Tank;
        message: string;
      }[] = [];

      tanks.forEach(
        (tank) => {
          const p =
            latestByTank[
              tank.id
            ];

          const livestock =
            tankSpecies.filter(
              (x) =>
                x.tank_id ===
                tank.id
            );

          if (!p) {
            output.push({
              tank,
              message:
                "No water test has been recorded.",
            });

            return;
          }

          livestock.forEach(
            (item) => {
              const s =
                species.find(
                  (x) =>
                    x.id ===
                    item.species_id
                );

              if (!s)
                return;

              const checks: [
                number | null | undefined,
                number | null | undefined,
                string
              ][] = [
                [
                  p.ph,
                  s.min_ph,
                  "pH is below the species minimum",
                ],
                [
                  p.ph,
                  s.max_ph,
                  "pH is above the species maximum",
                ],
                [
                  p.temperature,
                  s.min_temperature,
                  "Temperature is below the species minimum",
                ],
                [
                  p.temperature,
                  s.max_temperature,
                  "Temperature is above the species maximum",
                ],
                [
                  p.gh,
                  s.min_gh,
                  "GH is below the species minimum",
                ],
                [
                  p.gh,
                  s.max_gh,
                  "GH is above the species maximum",
                ],
                [
                  p.kh,
                  s.min_kh,
                  "KH is below the species minimum",
                ],
                [
                  p.kh,
                  s.max_kh,
                  "KH is above the species maximum",
                ],
                [
                  p.tds,
                  s.min_tds,
                  "TDS is below the species minimum",
                ],
                [
                  p.tds,
                  s.max_tds,
                  "TDS is above the species maximum",
                ],
              ];

              checks.forEach(
                ([
                  value,
                  limit,
                  message,
                ]) => {
                  if (
                    value ==
                      null ||
                    limit == null
                  )
                    return;

                  const lower =
                    message.includes(
                      "below"
                    );

                  const invalid =
                    lower
                      ? value <
                        limit
                      : value >
                        limit;

                  if (invalid) {
                    output.push({
                      tank,
                      message: `${s.name}: ${message}.`,
                    });
                  }
                }
              );
            }
          );
        }
      );

      return output;
    }, [
      tanks,
      latestByTank,
      tankSpecies,
      species,
    ]);

  const recent =
    [...changes]
      .sort(
        (a, b) =>
          +new Date(
            b.completed_at
          ) -
          +new Date(
            a.completed_at
          )
      )
      .slice(0, 6);

  return (
    <div className="dashboard-page">
      <div className="dashboard-title">
        <div>
          <small>
            AQUARIUM CONTROL CENTRE
          </small>

          <h1>
            Dashboard
          </h1>

          <p>
            Overview of all your
            aquariums.
          </p>
        </div>
      </div>

      {/* Stats */}

      <div className="dashboard-stats">
        <div className="dashboard-stat">
          <span className="dashboard-stat-icon">
            <Fish size={18} />
          </span>

          <div>
            <small>
              AQUARIUMS
            </small>
            <b>
              {tanks.length}
            </b>
          </div>
        </div>

        <div className="dashboard-stat">
          <span className="dashboard-stat-icon">
            <Beaker size={18} />
          </span>

          <div>
            <small>
              TEST RECORDS
            </small>
            <b>
              {params.length}
            </b>
          </div>
        </div>

        <div className="dashboard-stat">
          <span className="dashboard-stat-icon">
            <Users size={18} />
          </span>

          <div>
            <small>
              SPECIES
            </small>
            <b>
              {tankSpecies.length}
            </b>
          </div>
        </div>

        <div className="dashboard-stat">
          <span className="dashboard-stat-icon">
            <AlertTriangle
              size={18}
            />
          </span>

          <div>
            <small>
              ALERTS
            </small>
            <b>
              {alerts.length}
            </b>
          </div>
        </div>
      </div>

      {/* Alerts */}

      <div className="panel">
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
            color={
              alerts.length
                ? "#ff9baa"
                : "var(--accent)"
            }
          />
        </div>

        {!alerts.length ? (
          <p className="muted">
            No current parameter
            alerts.
          </p>
        ) : (
          alerts
            .slice(0, 6)
            .map(
              (
                alert,
                index
              ) => (
                <button
                  className="dashboard-activity"
                  key={`${alert.tank.id}-${index}`}
                  onClick={() =>
                    openTank(
                      alert.tank.id
                    )
                  }
                >
                  <span className="activity-icon">
                    <AlertTriangle
                      size={15}
                    />
                  </span>

                  <span>
                    <b>
                      {
                        alert
                          .tank
                          .name
                      }
                    </b>

                    <small>
                      {
                        alert.message
                      }
                    </small>
                  </span>

                  <ChevronRight
                    size={14}
                  />
                </button>
              )
            )
        )}
      </div>

      <div style={{ height: 12 }} />

      {/* Dashboard graph */}

      <DashboardComparisonGraph
        tanks={tanks}
        params={params}
      />

      <div style={{ height: 12 }} />

      {/* Recent activity */}

      <div className="dashboard-bottom">
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

            <Droplets
              size={18}
            />
          </div>

          {!recent.length ? (
            <p className="muted">
              No water changes yet.
            </p>
          ) : (
            recent.map(
              (change) => {
                const tank =
                  tanks.find(
                    (x) =>
                      x.id ===
                      change.tank_id
                  );

                return (
                  <div
                    className="dashboard-activity"
                    key={
                      change.id
                    }
                  >
                    <span className="activity-icon change">
                      <Droplets
                        size={15}
                      />
                    </span>

                    <span>
                      <b>
                        {tank?.name ||
                          "Tank"}{" "}
                        ·{" "}
                        {
                          change.amount_changed_liters
                        }{" "}
                        L
                      </b>

                      <small>
                        {fmt(
                          change.completed_at
                        )}
                      </small>
                    </span>
                  </div>
                );
              }
            )
          )}
        </div>

        <div className="panel">
          <div className="panelhead">
            <div>
              <small>
                LIVESTOCK
              </small>

              <h3>
                Species overview
              </h3>
            </div>

            <Fish size={18} />
          </div>

          {!tankSpecies.length ? (
            <p className="muted">
              No fish have been added
              to your aquariums yet.
            </p>
          ) : (
            <div className="dashboard-species-list">
              {tankSpecies
                .slice(0, 6)
                .map((item) => {
                  const tank =
                    tanks.find(
                      (x) =>
                        x.id ===
                        item.tank_id
                    );

                  const s =
                    species.find(
                      (x) =>
                        x.id ===
                        item.species_id
                    );

                  return (
                    <button
                      className="dashboard-species"
                      key={
                        item.id
                      }
                      onClick={() =>
                        openTank(
                          item.tank_id
                        )
                      }
                    >
                      <span className="tankicon">
                        <Fish
                          size={15}
                        />
                      </span>

                      <span>
                        <b>
                          {s?.name ||
                            "Species"}
                        </b>

                        <small>
                          {
                            item.quantity
                          }{" "}
                          ·{" "}
                          {tank?.name}
                        </small>
                      </span>
                    </button>
                  );
                })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   DASHBOARD COMPARISON GRAPH
========================================================= */

function DashboardComparisonGraph({
  tanks,
  params,
}: {
  tanks: Tank[];
  params: TankParameter[];
}) {
  const [selectedTanks, setSelectedTanks] =
    useState<string[]>(
      []
    );

  const [selectedParameters, setSelectedParameters] =
    useState<GraphParameter[]>(
      ["ph"]
    );

  useEffect(() => {
    if (
      !selectedTanks.length &&
      tanks.length
    ) {
      setSelectedTanks(
        tanks.map(
          (x) => x.id
        )
      );
    }
  }, [
    tanks,
    selectedTanks.length,
  ]);

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

  const toggleParameter = (
    parameter: GraphParameter
  ) => {
    setSelectedParameters(
      (current) =>
        current.includes(
          parameter
        )
          ? current.filter(
              (x) =>
                x !== parameter
            )
          : [
              ...current,
              parameter,
            ]
    );
  };

  const data = useMemo(() => {
    const grouped: Record<
      string,
      any
    > = {};

    params
      .filter((p) =>
        selectedTanks.includes(
          p.tank_id
        )
      )
      .forEach((p) => {
        const date =
          shortDate(
            p.measured_at
          );

        if (!grouped[date]) {
          grouped[date] = {
            date,
            timestamp:
              +new Date(
                p.measured_at
              ),
          };
        }

        selectedParameters.forEach(
          (parameter) => {
            const value =
              (p as any)[
                parameter
              ];

            if (
              value != null
            ) {
              const key = `${p.tank_id}_${parameter}`;

              grouped[
                date
              ][key] = value;
            }
          }
        );
      });

    return Object.values(
      grouped
    ).sort(
      (a: any, b: any) =>
        a.timestamp -
        b.timestamp
    );
  }, [
    params,
    selectedTanks,
    selectedParameters,
  ]);

  return (
    <div className="panel history-panel">
      <div className="panelhead">
        <div>
          <small>
            COMPARISON
          </small>

          <h3>
            Aquarium parameters
          </h3>
        </div>

        <BarChart3 size={18} />
      </div>

      <div className="graph-options">
        {tanks.map(
          (tank) => (
            <button
              key={tank.id}
              className={
                selectedTanks.includes(
                  tank.id
                )
                  ? "active"
                  : ""
              }
              onClick={() =>
                toggleTank(
                  tank.id
                )
              }
            >
              <Fish
                size={11}
              />

              {tank.name}
            </button>
          )
        )}
      </div>

      <div className="graph-options">
        {(
          Object.keys(
            graphLabels
          ) as GraphParameter[]
        ).map(
          (parameter) => (
            <button
              key={parameter}
              className={
                selectedParameters.includes(
                  parameter
                )
                  ? "active"
                  : ""
              }
              onClick={() =>
                toggleParameter(
                  parameter
                )
              }
            >
              {graphLabels[
                parameter
              ]}
            </button>
          )
        )}
      </div>

      {!data.length ||
      !selectedParameters.length ? (
        <div className="graph-empty">
          <Activity
            size={25}
          />

          <p>
            Select tanks and
            parameters to compare
            their history.
          </p>
        </div>
      ) : (
        <div className="graph-wrap">
          <ResponsiveContainer
            width="100%"
            height={330}
          >
            <LineChart
              data={data}
              margin={{
                top: 10,
                right: 20,
                left: 0,
                bottom: 5,
              }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#294052"
              />

              <XAxis
                dataKey="date"
                stroke="#71899d"
                fontSize={10}
              />

              <YAxis
                stroke="#71899d"
                fontSize={10}
              />

              <Tooltip
                contentStyle={{
                  background:
                    "#0a1726",
                  border:
                    "1px solid #29435a",
                  borderRadius:
                    "10px",
                  color:
                    "#edf7ff",
                }}
              />

              <Legend />

              {tanks
                .filter(
                  (tank) =>
                    selectedTanks.includes(
                      tank.id
                    )
                )
                .flatMap(
                  (tank) =>
                    selectedParameters.map(
                      (
                        parameter
                      ) => ({
                        tank,
                        parameter,
                      })
                    )
                )
                .map(
                  (
                    series,
                    index
                  ) => (
                    <Line
                      key={`${series.tank.id}_${series.parameter}`}
                      type="monotone"
                      dataKey={`${series.tank.id}_${series.parameter}`}
                      name={`${series.tank.name} · ${graphLabels[series.parameter]}`}
                      stroke={
                        graphColours[
                          index %
                            graphColours.length
                        ]
                      }
                      strokeWidth={2}
                      dot={{
                        r: 2,
                      }}
                      connectNulls
                    />
                  )
                )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

/* =========================================================
   TANK PAGE
========================================================= */

function TankPage({
  tank,
  params,
  changes,
  livestock,
  species,
  open,
  del,
  tab,
  setTab,
}: {
  tank: Tank;
  params: TankParameter[];
  changes: WaterChange[];
  livestock: TankSpecies[];
  species: Species[];
  open: (
    modal: Modal,
    row?: any
  ) => void;
  del: (
    table: string,
    id: string
  ) => void;
  tab: Tab;
  setTab: (
    tab: Tab
  ) => void;
}) {
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
            "livestock",
          ] as Tab[]
        ).map(
          (item) => (
            <button
              key={item}
              className={
                tab === item
                  ? "active"
                  : ""
              }
              onClick={() =>
                setTab(item)
              }
            >
              {item ===
              "overview"
                ? "◉"
                : item ===
                  "parameters"
                ? "🧪"
                : item ===
                  "changes"
                ? "💧"
                : "🐟"}{" "}
              {item}
            </button>
          )
        )}
      </div>

      {tab ===
        "overview" && (
        <TankOverview
          tank={tank}
          p={params[0]}
          changes={changes}
          livestock={
            livestock
          }
          species={species}
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
          goL={() =>
            setTab(
              "livestock"
            )
          }
        />
      )}

      {tab ===
        "parameters" && (
        <>
          <TankHistoryGraph
            tank={tank}
            params={params}
            changes={changes}
          />

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
        </>
      )}

      {tab === "changes" && (
        <Changes
          rows={changes}
          add={() =>
            open("change")
          }
          edit={open}
          del={del}
        />
      )}

      {tab ===
        "livestock" && (
        <Livestock
          tank={tank}
          rows={livestock}
          species={species}
          add={() =>
            open(
              "tankSpecies"
            )
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
  tank,
  p,
  changes,
  livestock,
  species,
  goP,
  goC,
  goL,
}: {
  tank: Tank;
  p?: TankParameter;
  changes: WaterChange[];
  livestock: TankSpecies[];
  species: Species[];
  goP: () => void;
  goC: () => void;
  goL: () => void;
}) {
  const metrics: [
    string,
    any,
    string
  ][] = [
    [
      "pH",
      p?.ph,
      "",
    ],
    [
      "Temperature",
      p?.temperature,
      "°C",
    ],
    [
      "Ammonia",
      p?.ammonia,
      " ppm",
    ],
    [
      "Nitrite",
      p?.nitrite,
      " ppm",
    ],
    [
      "Nitrate",
      p?.nitrate,
      " ppm",
    ],
    [
      "GH",
      p?.gh,
      " dGH",
    ],
    [
      "KH",
      p?.kh,
      " dKH",
    ],
    [
      "TDS",
      p?.tds,
      " ppm",
    ],
    [
      "Salinity",
      p?.salinity,
      "",
    ],
  ];

  return (
    <>
      <div className="metrics">
        {metrics.map(
          (item) => (
            <div
              className="metric"
              key={item[0]}
            >
              <small>
                {item[0]}
              </small>

              <b>
                {item[1] ==
                null
                  ? "—"
                  : item[1] +
                    item[2]}
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
              onClick={goP}
            >
              View history
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

          {changes
            .slice(0, 3)
            .map(
              (x) => (
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
              )
            )}

          {!changes.length && (
            <p className="muted">
              No water changes
              yet.
            </p>
          )}
        </div>
      </div>

      <div style={{ height: 12 }} />

      <div className="panel">
        <div className="panelhead">
          <div>
            <small>
              LIVESTOCK
            </small>

            <h3>
              Fish & species
            </h3>
          </div>

          <button
            onClick={goL}
          >
            View all
          </button>
        </div>

        {!livestock.length ? (
          <div className="livestock-empty">
            <div className="livestock-empty-icon">
              <Fish size={27} />
            </div>

            <h3>
              No species added
            </h3>

            <p className="muted">
              Add fish or
              invertebrates to
              this tank to start
              monitoring their
              requirements.
            </p>

            <button
              className="primary"
              onClick={goL}
            >
              <Plus size={15} />
              Add species
            </button>
          </div>
        ) : (
          <div className="livestock-grid">
            {livestock.map(
              (item) => {
                const s =
                  species.find(
                    (x) =>
                      x.id ===
                      item.species_id
                  );

                return (
                  <div
                    className="livestock-card"
                    key={
                      item.id
                    }
                  >
                    <div className="livestock-card-head">
                      <span className="livestock-icon">
                        <Fish
                          size={18}
                        />
                      </span>

                      <div>
                        <b>
                          {s?.name ||
                            "Species"}
                        </b>

                        {s?.scientific_name && (
                          <small>
                            {
                              s.scientific_name
                            }
                          </small>
                        )}
                      </div>
                    </div>

                    <div className="livestock-quantity">
                      <span>
                        Quantity
                      </span>

                      <strong>
                        {
                          item.quantity
                        }
                      </strong>
                    </div>
                  </div>
                );
              }
            )}
          </div>
        )}
      </div>
    </>
  );
}

/* =========================================================
   HISTORY GRAPH
========================================================= */

function TankHistoryGraph({
  tank,
  params,
  changes,
}: {
  tank: Tank;
  params: TankParameter[];
  changes: WaterChange[];
}) {
  const [selectedParameters, setSelectedParameters] =
    useState<GraphParameter[]>(
      ["ph"]
    );

  const toggle = (
    parameter: GraphParameter
  ) => {
    setSelectedParameters(
      (current) =>
        current.includes(
          parameter
        )
          ? current.filter(
              (x) =>
                x !== parameter
            )
          : [
              ...current,
              parameter,
            ]
    );
  };

  const data =
    useMemo(() => {
      return [
        ...params,
      ]
        .filter(
          (p) =>
            selectedParameters.some(
              (parameter) =>
                (p as any)[
                  parameter
                ] != null
            )
        )
        .map((p) => ({
          date: shortDate(
            p.measured_at
          ),
          timestamp:
            +new Date(
              p.measured_at
            ),
          ...Object.fromEntries(
            selectedParameters.map(
              (parameter) => [
                parameter,
                (p as any)[
                  parameter
                ],
              ]
            )
          ),
        }))
        .sort(
          (a, b) =>
            a.timestamp -
            b.timestamp
        );
    }, [
      params,
      selectedParameters,
    ]);

  return (
    <div className="panel history-panel">
      <div className="panelhead">
        <div>
          <small>
            HISTORY
          </small>

          <h3>
            {tank.name}
          </h3>
        </div>

        <Activity size={18} />
      </div>

      <div className="graph-options">
        {(
          Object.keys(
            graphLabels
          ) as GraphParameter[]
        ).map(
          (parameter) => (
            <button
              key={parameter}
              className={
                selectedParameters.includes(
                  parameter
                )
                  ? "active"
                  : ""
              }
              onClick={() =>
                toggle(
                  parameter
                )
              }
            >
              {graphLabels[
                parameter
              ]}
            </button>
          )
        )}
      </div>

      {!data.length ? (
        <div className="graph-empty">
          <Activity size={25} />

          <p>
            Record water tests to
            build a history graph.
          </p>
        </div>
      ) : (
        <>
          <div className="graph-wrap">
            <ResponsiveContainer
              width="100%"
              height={330}
            >
              <LineChart
                data={data}
                margin={{
                  top: 10,
                  right: 20,
                  left: 0,
                  bottom: 5,
                }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#294052"
                />

                <XAxis
                  dataKey="date"
                  stroke="#71899d"
                  fontSize={10}
                />

                <YAxis
                  stroke="#71899d"
                  fontSize={10}
                />

                <Tooltip
                  contentStyle={{
                    background:
                      "#0a1726",
                    border:
                      "1px solid #29435a",
                    borderRadius:
                      "10px",
                    color:
                      "#edf7ff",
                  }}
                />

                <Legend />

                {changes.map(
                  (change) => (
                    <ReferenceLine
                      key={
                        change.id
                      }
                      x={shortDate(
                        change.completed_at
                      )}
                      stroke="#6dc7ff"
                      strokeDasharray="4 4"
                      label={{
                        value: `${change.amount_changed_liters}L`,
                        position:
                          "insideTop",
                        fill: "#6dc7ff",
                        fontSize: 9,
                      }}
                    />
                  )
                )}

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
                        graphLabels[
                          parameter
                        ]
                      }
                      stroke={
                        graphColours[
                          index %
                            graphColours.length
                        ]
                      }
                      strokeWidth={2}
                      dot={{
                        r: 2,
                      }}
                      connectNulls
                    />
                  )
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>

          <p className="muted">
            💧 Vertical markers show
            water-change dates. They
            are used as time-reference
            indicators rather than
            being plotted as parameter
            values.
          </p>
        </>
      )}
    </div>
  );
}

/* =========================================================
   LIVESTOCK
========================================================= */

function Livestock({
  tank,
  rows,
  species,
  add,
  edit,
  del,
}: {
  tank: Tank;
  rows: TankSpecies[];
  species: Species[];
  add: () => void;
  edit: (
    modal: Modal,
    row?: any
  ) => void;
  del: (
    table: string,
    id: string
  ) => void;
}) {
  return (
    <div className="panel full">
      <div className="panelhead">
        <div>
          <small>
            LIVESTOCK
          </small>

          <h3>
            Species in {tank.name}
          </h3>
        </div>

        <button
          className="primary"
          onClick={add}
        >
          <Plus size={15} />
          Add species
        </button>
      </div>

      {!rows.length ? (
        <div className="livestock-empty">
          <div className="livestock-empty-icon">
            <Fish size={27} />
          </div>

          <h3>
            This tank has no
            recorded livestock
          </h3>

          <p className="muted">
            Add a species from your
            species database.
          </p>

          <button
            className="primary"
            onClick={add}
          >
            <Plus size={15} />
            Add species
          </button>
        </div>
      ) : (
        <div className="livestock-grid">
          {rows.map(
            (row) => {
              const s =
                species.find(
                  (x) =>
                    x.id ===
                    row.species_id
                );

              return (
                <SpeciesCard
                  key={row.id}
                  row={row}
                  species={s}
                  edit={edit}
                  del={del}
                />
              );
            }
          )}
        </div>
      )}
    </div>
  );
}

/* =========================================================
   SPECIES CARD
========================================================= */

function SpeciesCard({
  row,
  species,
  edit,
  del,
}: {
  row: TankSpecies;
  species?: Species;
  edit: (
    modal: Modal,
    row?: any
  ) => void;
  del: (
    table: string,
    id: string
  ) => void;
}) {
  return (
    <div className="livestock-card">
      <div className="livestock-card-head">
        <span className="livestock-icon">
          <Fish size={18} />
        </span>

        <div>
          <b>
            {species?.name ||
              "Unknown species"}
          </b>

          {species?.scientific_name && (
            <small>
              {
                species.scientific_name
              }
            </small>
          )}
        </div>
      </div>

      <div className="livestock-quantity">
        <span>
          Quantity
        </span>

        <strong>
          {row.quantity}
        </strong>
      </div>

      {species && (
        <div className="livestock-ranges">
          {species.min_ph !=
            null ||
          species.max_ph !=
            null ? (
            <div>
              <span>
                pH
              </span>

              <b>
                {species.min_ph ??
                  "—"}
                {" – "}
                {species.max_ph ??
                  "—"}
              </b>
            </div>
          ) : null}

          {species.min_temperature !=
            null ||
          species.max_temperature !=
            null ? (
            <div>
              <span>
                Temp
              </span>

              <b>
                {species.min_temperature ??
                  "—"}
                {" – "}
                {species.max_temperature ??
                  "—"}
                °
              </b>
            </div>
          ) : null}

          {species.min_gh !=
            null ||
          species.max_gh !=
            null ? (
            <div>
              <span>
                GH
              </span>

              <b>
                {species.min_gh ??
                  "—"}
                {" – "}
                {species.max_gh ??
                  "—"}
              </b>
            </div>
          ) : null}

          {species.min_kh !=
            null ||
          species.max_kh !=
            null ? (
            <div>
              <span>
                KH
              </span>

              <b>
                {species.min_kh ??
                  "—"}
                {" – "}
                {species.max_kh ??
                  "—"}
              </b>
            </div>
          ) : null}

          {species.min_tds !=
            null ||
          species.max_tds !=
            null ? (
            <div>
              <span>
                TDS
              </span>

              <b>
                {species.min_tds ??
                  "—"}
                {" – "}
                {species.max_tds ??
                  "—"}
              </b>
            </div>
          ) : null}
        </div>
      )}

      {species?.notes && (
        <p className="livestock-notes">
          {species.notes}
        </p>
      )}

      <div className="livestock-actions">
        <button
          className="secondary"
          onClick={() =>
            edit(
              "tankSpecies",
              row
            )
          }
        >
          <Pencil size={13} />
          Edit quantity
        </button>

        <button
          className="danger"
          onClick={() =>
            del(
              "tank_species",
              row.id
            )
          }
        >
          <Trash2 size={14} />
        </button>
      </div>
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
      <h3>
        {title}
      </h3>

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
              (head, index) => (
                <th
                  key={`${head}-${index}`}
                >
                  {head}
                </th>
              )
            )}
          </tr>
        </thead>

        <tbody>
          {rows.map(
            (row, index) => (
              <tr key={index}>
                {row.map(
                  (
                    cell,
                    cellIndex
                  ) => (
                    <td
                      key={
                        cellIndex
                      }
                    >
                      {cell}
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
  set: (
    value: any
  ) => void;
  type?: string;
}) {
  return (
    <label>
      {label}

      <input
        type={type}
        value={
          value ?? ""
        }
        onChange={(e) =>
          set(
            type ===
              "number"
              ? num(
                  e.target.value
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
  const [form, setForm] =
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

    const query = row
      ? supabase
          .from("tanks")
          .update(form)
          .eq(
            "id",
            row.id
          )
      : supabase
          .from("tanks")
          .insert(
            form
          );

    const {
      error,
    } = await query;

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
            form.name
          }
          set={(v) =>
            setForm({
              ...form,
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
                value={
                  form[key]
                }
                type="number"
                set={(v) =>
                  setForm({
                    ...form,
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
            form.notes
          }
          set={(v) =>
            setForm({
              ...form,
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
  const initial =
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

  const [form, setForm] =
    useState<any>(
      initial
    );

  const save = async (
    e: any
  ) => {
    e.preventDefault();

    const query = row
      ? supabase
          .from(
            "tank_parameters"
          )
          .update(form)
          .eq(
            "id",
            row.id
          )
      : supabase
          .from(
            "tank_parameters"
          )
          .insert({
            ...form,
            tank_id:
              tank,
          });

    const {
      error,
    } = await query;

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
            form.measured_at
          )
            .toISOString()
            .slice(
              0,
              16
            )}
          type="datetime-local"
          set={(v) =>
            setForm({
              ...form,
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
                value={
                  form[key]
                }
                type="number"
                set={(v) =>
                  setForm({
                    ...form,
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
            form.notes
          }
          set={(v) =>
            setForm({
              ...form,
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
  const base = {
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

  const [form, setForm] =
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
      ...form,
    };

    delete payload.id;
    delete payload.created_at;
    delete payload.tank_id;

    const query = row
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

    const {
      error,
    } = await query;

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
              form.completed_at
            )
              .toISOString()
              .slice(
                0,
                16
              )}
            type="datetime-local"
            set={(v) =>
              setForm({
                ...form,
                completed_at:
                  iso(v),
              })
            }
          />

          <Field
            label="Amount changed (L)"
            value={
              form.amount_changed_liters
            }
            type="number"
            set={(v) =>
              setForm({
                ...form,
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
                value={
                  form[key]
                }
                type="number"
                set={(v) =>
                  setForm({
                    ...form,
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
            form.added_water_notes
          }
          set={(v) =>
            setForm({
              ...form,
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
   ADD SPECIES TO TANK
========================================================= */

function TankSpeciesModal({
  tank,
  species,
  row,
  existing,
  close,
  done,
}: {
  tank: Tank;
  species: Species[];
  row: TankSpecies | null;
  existing: TankSpecies[];
  close: () => void;
  done: () => Promise<void>;
}) {
  const [speciesId, setSpeciesId] =
    useState(
      row?.species_id ||
        ""
    );

  const [quantity, setQuantity] =
    useState<number>(
      row?.quantity || 1
    );

  const selectedSpecies =
    species.find(
      (x) =>
        x.id === speciesId
    );

  const save = async (
    e: any
  ) => {
    e.preventDefault();

    if (!speciesId) {
      alert(
        "Please select a species."
      );

      return;
    }

    if (
      !quantity ||
      quantity < 1
    ) {
      alert(
        "Quantity must be at least 1."
      );

      return;
    }

    const duplicate =
      existing.find(
        (x) =>
          x.species_id ===
            speciesId &&
          x.id !== row?.id
      );

    if (duplicate) {
      alert(
        "This species is already recorded in this tank. Edit the existing entry instead."
      );

      return;
    }

    const payload = {
      tank_id:
        tank.id,
      species_id:
        speciesId,
      quantity,
    };

    const query = row
      ? supabase
          .from(
            "tank_species"
          )
          .update({
            quantity,
          })
          .eq(
            "id",
            row.id
          )
      : supabase
          .from(
            "tank_species"
          )
          .insert(
            payload
          );

    const {
      error,
    } = await query;

    if (error) {
      alert(
        error.message
      );

      return;
    }

    close();

    await done();
  };

  return (
    <Modal
      title={
        row
          ? "Edit species"
          : `Add species to ${tank.name}`
      }
      close={close}
    >
      <form
        onSubmit={save}
      >
        {!row && (
          <label>
            Species

            <select
              value={
                speciesId
              }
              onChange={(e) =>
                setSpeciesId(
                  e.target
                    .value
                )
              }
            >
              <option value="">
                Select a species
              </option>

              {species.map(
                (item) => (
                  <option
                    value={
                      item.id
                    }
                    key={
                      item.id
                    }
                  >
                    {item.name}
                    {item.scientific_name
                      ? ` — ${item.scientific_name}`
                      : ""}
                  </option>
                )
              )}
            </select>
          </label>
        )}

        <Field
          label="Quantity"
          value={
            quantity
          }
          type="number"
          set={(value) =>
            setQuantity(
              value || 0
            )
          }
        />

        {selectedSpecies && (
          <div className="species-preview">
            <div className="species-preview-title">
              <Fish
                size={14}
              />

              Species
              requirements
            </div>

            <div className="species-preview-grid">
              <div>
                <small>
                  pH
                </small>

                <b>
                  {selectedSpecies.min_ph ??
                    "—"}
                  {" – "}
                  {selectedSpecies.max_ph ??
                    "—"}
                </b>
              </div>

              <div>
                <small>
                  Temperature
                </small>

                <b>
                  {selectedSpecies.min_temperature ??
                    "—"}
                  {" – "}
                  {selectedSpecies.max_temperature ??
                    "—"}
                  °C
                </b>
              </div>

              <div>
                <small>
                  GH
                </small>

                <b>
                  {selectedSpecies.min_gh ??
                    "—"}
                  {" – "}
                  {selectedSpecies.max_gh ??
                    "—"}
                </b>
              </div>

              <div>
                <small>
                  KH
                </small>

                <b>
                  {selectedSpecies.min_kh ??
                    "—"}
                  {" – "}
                  {selectedSpecies.max_kh ??
                    "—"}
                </b>
              </div>

              <div>
                <small>
                  TDS
                </small>

                <b>
                  {selectedSpecies.min_tds ??
                    "—"}
                  {" – "}
                  {selectedSpecies.max_tds ??
                    "—"}
                </b>
              </div>

              <div>
                <small>
                  Min tank
                </small>

                <b>
                  {selectedSpecies.min_tank_volume ??
                    "—"}
                  L
                </b>
              </div>
            </div>
          </div>
        )}

        <Save close={close} />
      </form>
    </Modal>
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
        "Animated deep-water aquarium",
    },
    {
      id: "coral",
      name: "Coral Reef",
      emoji: "🪸",
      description:
        "Warm animated reef",
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
        "Animated cosmic aquarium",
    },
    {
      id: "sunset",
      name: "Sunset Reef",
      emoji: "🌅",
      description:
        "Moving purple sunset glow",
    },
    {
      id: "planted",
      name: "Planted Tank",
      emoji: "🌿",
      description:
        "Natural green water",
    },
    {
      id: "arctic",
      name: "Arctic",
      emoji: "❄️",
      description:
        "Cool icy environment",
    },
    {
      id: "volcanic",
      name: "Volcanic",
      emoji: "🌋",
      description:
        "Dark volcanic reef",
    },
    {
      id: "bubblegum",
      name: "Bubblegum",
      emoji: "🫧",
      description:
        "Bright playful aquarium",
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
              (item) => (
                <button
                  key={
                    item.id
                  }
                  className={
                    "theme-option " +
                    (theme ===
                    item.id
                      ? "selected"
                      : "")
                  }
                  onClick={() =>
                    setTheme(
                      item.id
                    )
                  }
                >
                  <span
                    className={
                      `theme-preview preview-${item.id}`
                    }
                  >
                    {item.emoji}
                  </span>

                  <span className="theme-info">
                    <b>
                      {
                        item.name
                      }
                    </b>

                    <small>
                      {
                        item.description
                      }
                    </small>
                  </span>

                  {theme ===
                    item.id && (
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
          <span>
            🐟
          </span>

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
   SAVE BUTTONS
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

export default App;
