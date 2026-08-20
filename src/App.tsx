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
  Home,
  BarChart3,
  AlertTriangle,
  Users,
  Thermometer,
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
  | "species"
  | null;

type Tab =
  | "overview"
  | "parameters"
  | "changes"
  | "livestock";

type Page = "dashboard" | "tank";

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
  common_name?: string | null;
  scientific_name?: string | null;
  name?: string | null;

  min_temperature?: number | null;
  max_temperature?: number | null;

  min_ph?: number | null;
  max_ph?: number | null;

  min_ammonia?: number | null;
  max_ammonia?: number | null;

  min_nitrite?: number | null;
  max_nitrite?: number | null;

  min_nitrate?: number | null;
  max_nitrate?: number | null;

  min_gh?: number | null;
  max_gh?: number | null;

  min_kh?: number | null;
  max_kh?: number | null;

  min_tds?: number | null;
  max_tds?: number | null;

  min_salinity?: number | null;
  max_salinity?: number | null;

  notes?: string | null;
  description?: string | null;
};

type TankSpecies = {
  id: string;
  tank_id: string;
  species_id: string;
  quantity: number;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
  species?: Species | null;
};

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

type ChartPoint = {
  date: string;
  timestamp: number;
  waterChange?: boolean;
  amount?: number;
  [key: string]: string | number | boolean | undefined;
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

const safeDateInput = (value: string) => {
  try {
    return new Date(value)
      .toISOString()
      .slice(0, 16);
  } catch {
    return new Date()
      .toISOString()
      .slice(0, 16);
  }
};

const speciesName = (species?: Species | null) =>
  species?.common_name ||
  species?.name ||
  "Unnamed species";

const speciesScientificName = (
  species?: Species | null
) => species?.scientific_name || "";

const parameterLabels: Record<
  ParameterKey,
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

const parameterUnits: Record<
  ParameterKey,
  string
> = {
  temperature: "°C",
  ph: "",
  ammonia: " ppm",
  nitrite: " ppm",
  nitrate: " ppm",
  gh: " dGH",
  kh: " dKH",
  tds: " ppm",
  salinity: "",
};

const speciesRangeKeys: Record<
  ParameterKey,
  [keyof Species, keyof Species]
> = {
  temperature: [
    "min_temperature",
    "max_temperature",
  ],
  ph: ["min_ph", "max_ph"],
  ammonia: [
    "min_ammonia",
    "max_ammonia",
  ],
  nitrite: [
    "min_nitrite",
    "max_nitrite",
  ],
  nitrate: [
    "min_nitrate",
    "max_nitrate",
  ],
  gh: ["min_gh", "max_gh"],
  kh: ["min_kh", "max_kh"],
  tds: ["min_tds", "max_tds"],
  salinity: [
    "min_salinity",
    "max_salinity",
  ],
};

const parameterValue = (
  row: TankParameter,
  key: ParameterKey
) => {
  return row[key] as number | null | undefined;
};

function getSpeciesRange(
  species: Species,
  parameter: ParameterKey
) {
  const [minKey, maxKey] =
    speciesRangeKeys[parameter];

  return {
    min:
      typeof species[minKey] === "number"
        ? (species[minKey] as number)
        : null,
    max:
      typeof species[maxKey] === "number"
        ? (species[maxKey] as number)
        : null,
  };
}

function calculateTankRange(
  livestock: TankSpecies[],
  parameter: ParameterKey
) {
  const ranges = livestock
    .map((entry) => {
      if (!entry.species) return null;

      const range = getSpeciesRange(
        entry.species,
        parameter
      );

      if (
        range.min === null &&
        range.max === null
      ) {
        return null;
      }

      return range;
    })
    .filter(Boolean) as {
    min: number | null;
    max: number | null;
  }[];

  if (!ranges.length) {
    return {
      min: null,
      max: null,
      compatible: true,
    };
  }

  const minimums = ranges
    .map((x) => x.min)
    .filter(
      (x): x is number => x !== null
    );

  const maximums = ranges
    .map((x) => x.max)
    .filter(
      (x): x is number => x !== null
    );

  const min =
    minimums.length > 0
      ? Math.max(...minimums)
      : null;

  const max =
    maximums.length > 0
      ? Math.min(...maximums)
      : null;

  return {
    min,
    max,
    compatible:
      min === null ||
      max === null ||
      min <= max,
  };
}

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
        ) as Theme | null;

      return saved || "ocean";
    });

  const [cardStyle, setCardStyle] =
    useState<CardStyle>(() => {
      const saved =
        localStorage.getItem(
          "tank-card-style"
        ) as CardStyle | null;

      return saved || "rounded";
    });

  const [density, setDensity] =
    useState<Density>(() => {
      const saved =
        localStorage.getItem(
          "tank-density"
        ) as Density | null;

      return saved || "comfortable";
    });

  const [textSize, setTextSize] =
    useState<TextSize>(() => {
      const saved =
        localStorage.getItem(
          "tank-text-size"
        ) as TextSize | null;

      return saved || "normal";
    });

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

  /* =========================================================
     LOAD
  ========================================================= */

  const load = async () => {
    setLoading(true);

    const [
      t,
      p,
      c,
      s,
      ts,
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
        .order("common_name", {
          ascending: true,
        }),

      supabase
        .from("tank_species")
        .select(`
          *,
          species (*)
        `)
        .order("created_at", {
          ascending: true,
        }),
    ]);

    const firstError =
      t.error ||
      p.error ||
      c.error ||
      s.error ||
      ts.error;

    if (firstError) {
      alert(firstError.message);
    }

    setTanks(
      (t.data || []) as Tank[]
    );

    setParams(
      (p.data || []) as TankParameter[]
    );

    setChanges(
      (c.data || []) as WaterChange[]
    );

    setSpecies(
      (s.data || []) as Species[]
    );

    setTankSpecies(
      (ts.data || []) as TankSpecies[]
    );

    setSelected((current) =>
      (t.data || []).some(
        (x) => x.id === current
      )
        ? current
        : (t.data || [])[0]?.id ||
          null
    );

    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  /* =========================================================
     SELECTED TANK
  ========================================================= */

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

  const livestock = useMemo(
    () =>
      tankSpecies.filter(
        (x) =>
          x.tank_id === selected
      ),
    [tankSpecies, selected]
  );

  /* =========================================================
     OPEN MODAL
  ========================================================= */

  const open = (
    m: Modal,
    x: any = null
  ) => {
    setEdit(x);
    setModal(m);
  };

  /* =========================================================
     DELETE
  ========================================================= */

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

  /* =========================================================
     TANK REORDER
  ========================================================= */

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

  /* =========================================================
     NAVIGATE TANK
  ========================================================= */

  const openTank = (
    id: string
  ) => {
    setSelected(id);
    setPage("tank");
    setTab("overview");
    setMenuOpen(false);
  };

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <div
      className={[
        "app",
        `theme-${theme}`,
        `cards-${cardStyle}`,
        `density-${density}`,
        `text-${textSize}`,
      ].join(" ")}
    >
      {/* =====================================================
          HEADER
      ===================================================== */}

      <header>
        <button
          className="menu-button"
          onClick={() =>
            setMenuOpen(true)
          }
          aria-label="Open tank menu"
        >
          ☰
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

      {/* =====================================================
          MAIN
      ===================================================== */}

      <main>
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
            <Home size={16} />
            <span>Dashboard</span>
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
              aria-label="Add tank"
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
                  className={[
                    "tank",
                    x.id === selected
                      ? "sel"
                      : "",
                    draggedTankId ===
                    x.id
                      ? "dragging"
                      : "",
                  ].join(" ")}
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
              openTank={openTank}
            />
          )}

          {page === "tank" &&
            tank && (
              <TankPage
                tank={tank}
                params={tp}
                changes={tc}
                livestock={
                  livestock
                }
                tab={tab}
                setTab={setTab}
                open={open}
                del={del}
              />
            )}

          {page === "tank" &&
            !tank && (
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
                  water tests, water
                  changes and
                  livestock.
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

      {modal === "species" &&
        tank && (
          <TankSpeciesModal
            tank={tank}
            species={species}
            row={edit}
            existing={
              livestock
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
          cardStyle={cardStyle}
          setCardStyle={
            setCardStyle
          }
          density={density}
          setDensity={setDensity}
          textSize={textSize}
          setTextSize={setTextSize}
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
  openTank,
}: {
  tanks: Tank[];
  params: TankParameter[];
  changes: WaterChange[];
  tankSpecies: TankSpecies[];
  openTank: (
    id: string
  ) => void;
}) {
  const recentActivity =
    useMemo(() => {
      const items: {
        id: string;
        type: "test" | "change";
        tank: string;
        date: string;
        text: string;
      }[] = [];

      params.forEach((p) => {
        const t = tanks.find(
          (x) =>
            x.id === p.tank_id
        );

        if (t) {
          items.push({
            id: `p-${p.id}`,
            type: "test",
            tank: t.name,
            date:
              p.measured_at,
            text: "Water test recorded",
          });
        }
      });

      changes.forEach((c) => {
        const t = tanks.find(
          (x) =>
            x.id === c.tank_id
        );

        if (t) {
          items.push({
            id: `c-${c.id}`,
            type: "change",
            tank: t.name,
            date:
              c.completed_at,
            text: `${c.amount_changed_liters} L water change`,
          });
        }
      });

      return items
        .sort(
          (a, b) =>
            +new Date(b.date) -
            +new Date(a.date)
        )
        .slice(0, 8);
    }, [
      params,
      changes,
      tanks,
    ]);

  const totalLivestock =
    tankSpecies.reduce(
      (sum, x) =>
        sum +
        (x.quantity || 0),
      0
    );

  return (
    <div className="dashboard-page">
      <div className="dashboard-title">
        <div>
          <small className="eyebrow">
            AQUARIUM CONTROL CENTRE
          </small>

          <h1>
            Dashboard
          </h1>

          <p>
            Overview of your
            aquariums, water
            quality and livestock.
          </p>
        </div>
      </div>

      <div className="dashboard-stats">
        <div className="dashboard-stat">
          <span className="dashboard-stat-icon">
            <Fish size={18} />
          </span>

          <div>
            <small>
              AQUARIUMS
            </small>
            <b>{tanks.length}</b>
          </div>
        </div>

        <div className="dashboard-stat">
          <span className="dashboard-stat-icon">
            <Users size={18} />
          </span>

          <div>
            <small>
              LIVESTOCK
            </small>
            <b>
              {totalLivestock}
            </b>
          </div>
        </div>

        <div className="dashboard-stat">
          <span className="dashboard-stat-icon">
            <BeakerIcon />
          </span>

          <div>
            <small>
              WATER TESTS
            </small>
            <b>
              {params.length}
            </b>
          </div>
        </div>

        <div className="dashboard-stat">
          <span className="dashboard-stat-icon">
            <Droplets size={18} />
          </span>

          <div>
            <small>
              WATER CHANGES
            </small>
            <b>
              {changes.length}
            </b>
          </div>
        </div>
      </div>

      <div className="dashboard-tank-grid">
        {tanks.map((tank) => (
          <TankOverviewCard
            key={tank.id}
            tank={tank}
            params={params.filter(
              (x) =>
                x.tank_id ===
                tank.id
            )}
            livestock={tankSpecies.filter(
              (x) =>
                x.tank_id ===
                tank.id
            )}
            open={() =>
              openTank(tank.id)
            }
          />
        ))}

        {!tanks.length && (
          <div className="panel dashboard-empty">
            <div>🐠</div>
            <h2>
              No aquariums yet
            </h2>
            <p className="muted">
              Add your first tank
              to start tracking
              your aquarium.
            </p>
          </div>
        )}
      </div>

      <div className="dashboard-bottom">
        <div className="panel">
          <div className="panelhead">
            <div>
              <small>
                ACTIVITY
              </small>
              <h3>
                Recent activity
              </h3>
            </div>
          </div>

          {recentActivity.map(
            (item) => (
              <div
                className="dashboard-activity"
                key={item.id}
              >
                <span
                  className={`activity-icon ${item.type}`}
                >
                  {item.type ===
                  "test" ? (
                    <BeakerIcon />
                  ) : (
                    <Droplets
                      size={15}
                    />
                  )}
                </span>

                <div>
                  <b>
                    {item.text}
                  </b>

                  <small>
                    {item.tank} ·{" "}
                    {fmt(
                      item.date
                    )}
                  </small>
                </div>
              </div>
            )
          )}

          {!recentActivity.length && (
            <p className="muted">
              No activity yet.
            </p>
          )}
        </div>

        <div className="panel">
          <div className="panelhead">
            <div>
              <small>
                LIVESTOCK
              </small>
              <h3>
                Species across tanks
              </h3>
            </div>
          </div>

          {tankSpecies.length ===
          0 ? (
            <p className="muted">
              No livestock has
              been added yet.
            </p>
          ) : (
            <div className="dashboard-species-list">
              {tankSpecies
                .slice(0, 8)
                .map((entry) => {
                  const tank =
                    tanks.find(
                      (x) =>
                        x.id ===
                        entry.tank_id
                    );

                  return (
                    <div
                      className="dashboard-species"
                      key={
                        entry.id
                      }
                    >
                      <span className="tankicon">
                        <Fish
                          size={15}
                        />
                      </span>

                      <div>
                        <b>
                          {speciesName(
                            entry.species
                          )}
                        </b>

                        <small>
                          {entry.quantity}{" "}
                          ·{" "}
                          {tank?.name ||
                            "Unknown tank"}
                        </small>
                      </div>
                    </div>
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
   DASHBOARD TANK CARD
========================================================= */

function TankOverviewCard({
  tank,
  params,
  livestock,
  open,
}: {
  tank: Tank;
  params: TankParameter[];
  livestock: TankSpecies[];
  open: () => void;
}) {
  const latest =
    [...params].sort(
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
      className="tank-overview-card"
      onClick={open}
    >
      <div className="tank-overview-head">
        <span className="tankicon">
          <Fish size={17} />
        </span>

        <div>
          <b>{tank.name}</b>

          <small>
            {tank.volume
              ? `${tank.volume} L`
              : "Volume not set"}
          </small>
        </div>

        <ChevronRight
          size={17}
        />
      </div>

      <div className="tank-overview-metrics">
        <div>
          <small>pH</small>
          <b>
            {latest?.ph ??
              "—"}
          </b>
        </div>

        <div>
          <small>TEMP</small>
          <b>
            {latest?.temperature !=
            null
              ? `${latest.temperature}°`
              : "—"}
          </b>
        </div>

        <div>
          <small>NO₃</small>
          <b>
            {latest?.nitrate ??
              "—"}
          </b>
        </div>

        <div>
          <small>STOCK</small>
          <b>
            {livestock.reduce(
              (sum, x) =>
                sum +
                (x.quantity ||
                  0),
              0
            )}
          </b>
        </div>
      </div>
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
  livestock,
  tab,
  setTab,
  open,
  del,
}: {
  tank: Tank;
  params: TankParameter[];
  changes: WaterChange[];
  livestock: TankSpecies[];
  tab: Tab;
  setTab: (
    value: Tab
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
              : x ===
                "changes"
              ? "💧"
              : "🐟"}{" "}
            {x}
          </button>
        ))}
      </div>

      {tab ===
        "overview" && (
        <TankOverview
          tank={tank}
          params={params}
          changes={changes}
          livestock={livestock}
          goParameters={() =>
            setTab(
              "parameters"
            )
          }
          goChanges={() =>
            setTab("changes")
          }
          goLivestock={() =>
            setTab(
              "livestock"
            )
          }
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

      {tab ===
        "livestock" && (
        <Livestock
          rows={livestock}
          add={() =>
            open("species")
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
  params,
  changes,
  livestock,
  goParameters,
  goChanges,
  goLivestock,
}: {
  tank: Tank;
  params: TankParameter[];
  changes: WaterChange[];
  livestock: TankSpecies[];
  goParameters: () => void;
  goChanges: () => void;
  goLivestock: () => void;
}) {
  const p = params[0];

  const metrics: [
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
        {metrics.map(
          (x) => (
            <div
              className="metric"
              key={x[0]}
            >
              <small>
                {x[0]}
              </small>

              <b>
                {x[1] ==
                null
                  ? "—"
                  : x[1] +
                    x[2]}
              </b>
            </div>
          )
        )}
      </div>

      <TankHistoryGraph
        params={params}
        changes={changes}
      />

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
                LIVESTOCK
              </small>

              <h3>
                Tank species
              </h3>
            </div>

            <button
              onClick={
                goLivestock
              }
            >
              View all
            </button>
          </div>

          {livestock
            .slice(0, 4)
            .map((entry) => (
              <div
                className="activity"
                key={entry.id}
              >
                <Fish
                  size={16}
                />

                <span>
                  <b>
                    {speciesName(
                      entry.species
                    )}{" "}
                    ×{" "}
                    {
                      entry.quantity
                    }
                  </b>

                  <small>
                    {speciesScientificName(
                      entry.species
                    )}
                  </small>
                </span>
              </div>
            ))}

          {!livestock.length && (
            <p className="muted">
              No livestock added
              yet.
            </p>
          )}
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
    </>
  );
}

/* =========================================================
   HISTORY GRAPH
========================================================= */

function TankHistoryGraph({
  params,
  changes,
}: {
  params: TankParameter[];
  changes: WaterChange[];
}) {
  const available =
    useMemo(() => {
      const set =
        new Set<ParameterKey>();

      params.forEach((p) => {
        (
          Object.keys(
            parameterLabels
          ) as ParameterKey[]
        ).forEach((key) => {
          if (
            parameterValue(
              p,
              key
            ) != null
          ) {
            set.add(key);
          }
        });
      });

      return Array.from(
        set
      );
    }, [params]);

  const [selected, setSelected] =
    useState<ParameterKey[]>(
      []
    );

  useEffect(() => {
    if (
      !selected.length &&
      available.length
    ) {
      setSelected([
        available[0],
      ]);
    }
  }, [
    available,
    selected.length,
  ]);

  const data =
    useMemo<ChartPoint[]>(
      () => {
        const events: ChartPoint[] =
          [];

        params.forEach(
          (p) => {
            const point: ChartPoint =
              {
                date: new Date(
                  p.measured_at
                ).toLocaleDateString(),
                timestamp:
                  +new Date(
                    p.measured_at
                  ),
              };

            (
              Object.keys(
                parameterLabels
              ) as ParameterKey[]
            ).forEach(
              (key) => {
                const value =
                  parameterValue(
                    p,
                    key
                  );

                if (
                  value != null
                ) {
                  point[key] =
                    value;
                }
              }
            );

            events.push(point);
          }
        );

        changes.forEach(
          (change) => {
            events.push({
              date: new Date(
                change.completed_at
              ).toLocaleDateString(),
              timestamp:
                +new Date(
                  change.completed_at
                ),
              waterChange:
                true,
              amount:
                change.amount_changed_liters,
            });
          }
        );

        return events.sort(
          (a, b) =>
            a.timestamp -
            b.timestamp
        );
      },
      [params, changes]
    );

  const toggle = (
    key: ParameterKey
  ) => {
    setSelected((current) =>
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

  const colors = [
    "#2fe0d1",
    "#ff796c",
    "#55e8b2",
    "#9c7cff",
    "#ff8b62",
    "#65d98a",
    "#6db7ff",
    "#f6cf65",
    "#ef75bd",
  ];

  return (
    <div className="panel history-panel">
      <div className="panelhead history-head">
        <div>
          <small>
            HISTORY
          </small>

          <h3>
            Water parameters
          </h3>
        </div>
      </div>

      {available.length > 0 && (
        <div className="graph-options">
          {available.map(
            (key) => (
              <button
                key={key}
                className={
                  selected.includes(
                    key
                  )
                    ? "active"
                    : ""
                }
                onClick={() =>
                  toggle(key)
                }
              >
                <span
                  className="graph-dot"
                  style={{
                    background:
                      colors[
                        available.indexOf(
                          key
                        ) %
                          colors.length
                      ],
                  }}
                />

                {
                  parameterLabels[
                    key
                  ]
                }
              </button>
            )
          )}
        </div>
      )}

      {!available.length ? (
        <div className="graph-empty">
          <BarChart3
            size={28}
          />

          <p>
            Record water tests
            to see parameter
            history.
          </p>
        </div>
      ) : (
        <div className="graph-wrap">
          <ResponsiveContainer
            width="100%"
            height={310}
          >
            <LineChart
              data={data}
              margin={{
                top: 10,
                right: 10,
                left: -20,
                bottom: 5,
              }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#213548"
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
                  borderRadius: 10,
                  color:
                    "#edf7ff",
                }}
              />

              <Legend />

              {data
                .filter(
                  (x) =>
                    x.waterChange
                )
                .map(
                  (
                    x,
                    index
                  ) => (
                    <ReferenceLine
                      key={`wc-${index}`}
                      x={x.date}
                      stroke="#4e6a7d"
                      strokeDasharray="5 5"
                      label={{
                        value: `WC ${x.amount}L`,
                        position:
                          "top",
                        fill:
                          "#71899d",
                        fontSize: 9,
                      }}
                    />
                  )
                )}

              {selected.map(
                (
                  key,
                  index
                ) => (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    name={
                      parameterLabels[
                        key
                      ]
                    }
                    stroke={
                      colors[
                        index %
                          colors.length
                      ]
                    }
                    strokeWidth={
                      2
                    }
                    dot={{
                      r: 3,
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
   LIVESTOCK
========================================================= */

function Livestock({
  rows,
  add,
  edit,
  del,
}: {
  rows: TankSpecies[];
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
        title={`${rows.length} species`}
        button="Add species"
        onClick={add}
      />

      {!rows.length ? (
        <div className="livestock-empty">
          <div className="livestock-empty-icon">
            <Fish size={30} />
          </div>

          <h3>
            No livestock yet
          </h3>

          <p className="muted">
            Add fish, shrimp,
            snails or other
            livestock to this
            aquarium.
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
            (entry) => (
              <LivestockCard
                key={entry.id}
                entry={entry}
                edit={() =>
                  edit(
                    "species",
                    entry
                  )
                }
                remove={() =>
                  del(
                    "tank_species",
                    entry.id
                  )
                }
              />
            )
          )}
        </div>
      )}
    </div>
  );
}

function LivestockCard({
  entry,
  edit,
  remove,
}: {
  entry: TankSpecies;
  edit: () => void;
  remove: () => void;
}) {
  const species =
    entry.species;

  const temperature =
    getSpeciesRange(
      species || {},
      "temperature"
    );

  const ph =
    getSpeciesRange(
      species || {},
      "ph"
    );

  return (
    <div className="livestock-card">
      <div className="livestock-card-head">
        <span className="livestock-icon">
          <Fish size={20} />
        </span>

        <div>
          <b>
            {speciesName(
              species
            )}
          </b>

          <small>
            {speciesScientificName(
              species
            )}
          </small>
        </div>
      </div>

      <div className="livestock-quantity">
        <span>
          Quantity
        </span>

        <strong>
          {entry.quantity}
        </strong>
      </div>

      <div className="livestock-ranges">
        {temperature.min !==
          null ||
        temperature.max !==
          null ? (
          <div>
            <Thermometer
              size={14}
            />

            <span>
              Temp
            </span>

            <b>
              {formatRange(
                temperature,
                "°C"
              )}
            </b>
          </div>
        ) : null}

        {ph.min !== null ||
        ph.max !== null ? (
          <div>
            <span className="range-symbol">
              pH
            </span>

            <b>
              {formatRange(
                ph,
                ""
              )}
            </b>
          </div>
        ) : null}
      </div>

      {entry.notes && (
        <p className="livestock-notes">
          {entry.notes}
        </p>
      )}

      <div className="livestock-actions">
        <button
          className="secondary"
          onClick={edit}
        >
          <Pencil size={14} />
          Edit
        </button>

        <button
          className="danger"
          onClick={remove}
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

function formatRange(
  range: {
    min: number | null;
    max: number | null;
  },
  suffix: string
) {
  if (
    range.min !== null &&
    range.max !== null
  ) {
    return `${range.min}–${range.max}${suffix}`;
  }

  if (range.min !== null) {
    return `${range.min}+${suffix}`;
  }

  if (range.max !== null) {
    return `≤${range.max}${suffix}`;
  }

  return "—";
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
            (row, i) => (
              <tr key={i}>
                {row.map(
                  (value, j) => (
                    <td key={j}>
                      {value}
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
    <div
      className="backdrop"
      onMouseDown={(e) => {
        if (
          e.target ===
          e.currentTarget
        ) {
          close();
        }
      }}
    >
      <div className="modal">
        <button
          className="x"
          onClick={close}
          aria-label="Close"
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
                  e.target
                    .value
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
    e: any
  ) => {
    e.preventDefault();

    if (
      !f.name?.trim()
    ) {
      alert(
        "Please enter a tank name."
      );
      return;
    }

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
          set={(value) =>
            setF({
              ...f,
              name: value,
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
                set={(value) =>
                  setF({
                    ...f,
                    [key]: value,
                  })
                }
              />
            )
          )}
        </div>

        <Field
          label="Notes"
          value={f.notes}
          set={(value) =>
            setF({
              ...f,
              notes: value,
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
      initial
    );

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
          value={safeDateInput(
            f.measured_at
          )}
          type="datetime-local"
          set={(value) =>
            setF({
              ...f,
              measured_at:
                iso(value),
            })
          }
        />

        <div className="formgrid three">
          {[
            [
              "Temperature °C",
              "temperature",
            ],
            ["pH", "ph"],
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
            ["GH", "gh"],
            ["KH", "kh"],
            ["TDS", "tds"],
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
                set={(value) =>
                  setF({
                    ...f,
                    [key]: value,
                  })
                }
              />
            )
          )}
        </div>

        <Field
          label="Notes"
          value={f.notes}
          set={(value) =>
            setF({
              ...f,
              notes: value,
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
    added_water_ph: null,
    added_water_ammonia:
      null,
    added_water_nitrite:
      null,
    added_water_nitrate:
      null,
    added_water_gh: null,
    added_water_kh: null,
    added_water_tds: null,
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

    if (
      Number(
        f.amount_changed_liters
      ) <= 0
    ) {
      alert(
        "Please enter the amount of water changed."
      );
      return;
    }

    const payload = {
      ...f,
    };

    delete payload.id;
    delete payload.created_at;
    delete payload.updated_at;
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
            value={safeDateInput(
              f.completed_at
            )}
            type="datetime-local"
            set={(value) =>
              setF({
                ...f,
                completed_at:
                  iso(value),
              })
            }
          />

          <Field
            label="Amount changed (L)"
            value={
              f.amount_changed_liters
            }
            type="number"
            set={(value) =>
              setF({
                ...f,
                amount_changed_liters:
                  value,
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
                set={(value) =>
                  setF({
                    ...f,
                    [key]: value,
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
          set={(value) =>
            setF({
              ...f,
              added_water_notes:
                value,
            })
          }
        />

        <Save close={close} />
      </form>
    </Modal>
  );
}

/* =========================================================
   TANK SPECIES MODAL
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
    useState<string>(
      row?.species_id ||
        ""
    );

  const [quantity, setQuantity] =
    useState<number>(
      row?.quantity || 1
    );

  const [notes, setNotes] =
    useState<string>(
      row?.notes || ""
    );

  const selectedSpecies =
    species.find(
      (x) =>
        x.id === speciesId
    ) || null;

  const duplicate =
    !row &&
    existing.some(
      (x) =>
        x.species_id ===
        speciesId
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
      quantity < 1 ||
      !Number.isFinite(
        quantity
      )
    ) {
      alert(
        "Quantity must be at least 1."
      );
      return;
    }

    if (duplicate) {
      alert(
        "This species is already in this tank. Edit the existing entry instead."
      );
      return;
    }

    if (row) {
      const { error } =
        await supabase
          .from(
            "tank_species"
          )
          .update({
            species_id:
              speciesId,
            quantity,
            notes:
              notes ||
              null,
            updated_at:
              new Date().toISOString(),
          })
          .eq(
            "id",
            row.id
          );

      if (error) {
        alert(
          error.message
        );
        return;
      }
    } else {
      const { error } =
        await supabase
          .from(
            "tank_species"
          )
          .insert({
            tank_id: tank.id,
            species_id:
              speciesId,
            quantity,
            notes:
              notes ||
              null,
          });

      if (error) {
        alert(
          error.message
        );
        return;
      }
    }

    close();
    await done();
  };

  return (
    <Modal
      title={
        row
          ? "Edit tank species"
          : "Add species to tank"
      }
      close={close}
    >
      <form onSubmit={save}>
        <label>
          Species

          <select
            value={speciesId}
            onChange={(e) =>
              setSpeciesId(
                e.target.value
              )
            }
          >
            <option value="">
              Select a species...
            </option>

            {species.map(
              (item) => (
                <option
                  key={
                    item.id
                  }
                  value={
                    item.id
                  }
                >
                  {speciesName(
                    item
                  )}
                  {item.scientific_name
                    ? ` — ${item.scientific_name}`
                    : ""}
                </option>
              )
            )}
          </select>
        </label>

        {selectedSpecies && (
          <SpeciesPreview
            species={
              selectedSpecies
            }
          />
        )}

        <Field
          label="Quantity"
          value={quantity}
          type="number"
          set={(value) =>
            setQuantity(
              value || 0
            )
          }
        />

        <Field
          label="Notes"
          value={notes}
          set={(value) =>
            setNotes(value)
          }
        />

        <Save close={close} />
      </form>
    </Modal>
  );
}

/* =========================================================
   SPECIES PREVIEW
========================================================= */

function SpeciesPreview({
  species,
}: {
  species: Species;
}) {
  const parameters: ParameterKey[] =
    [
      "temperature",
      "ph",
      "ammonia",
      "nitrite",
      "nitrate",
      "gh",
      "kh",
      "tds",
      "salinity",
    ];

  const available =
    parameters.filter(
      (parameter) => {
        const range =
          getSpeciesRange(
            species,
            parameter
          );

        return (
          range.min !== null ||
          range.max !== null
        );
      }
    );

  if (!available.length) {
    return (
      <div className="species-preview">
        <div className="species-preview-title">
          <Fish size={15} />
          Species preferences
        </div>

        <p className="muted">
          No parameter preferences
          have been entered for
          this species yet.
        </p>
      </div>
    );
  }

  return (
    <div className="species-preview">
      <div className="species-preview-title">
        <Fish size={15} />
        Species preferences
      </div>

      <div className="species-preview-grid">
        {available.map(
          (parameter) => {
            const range =
              getSpeciesRange(
                species,
                parameter
              );

            return (
              <div
                key={
                  parameter
                }
              >
                <small>
                  {
                    parameterLabels[
                      parameter
                    ]
                  }
                </small>

                <b>
                  {formatRange(
                    range,
                    parameterUnits[
                      parameter
                    ]
                  )}
                </b>
              </div>
            );
          }
        )}
      </div>
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
    {
      id: "arctic",
      name: "Arctic",
      emoji: "🧊",
      description:
        "Cool icy blue",
    },
    {
      id: "volcanic",
      name: "Volcanic",
      emoji: "🌋",
      description:
        "Dark volcanic glow",
    },
    {
      id: "bubblegum",
      name: "Bubblegum",
      emoji: "🍬",
      description:
        "Fun pink aquarium",
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
              (item) => (
                <button
                  key={
                    item.id
                  }
                  className={`theme-option ${
                    theme ===
                    item.id
                      ? "selected"
                      : ""
                  }`}
                  onClick={() =>
                    setTheme(
                      item.id
                    )
                  }
                >
                  <span
                    className={`theme-preview preview-${item.id}`}
                  >
                    {
                      item.emoji
                    }
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
                  Clean
                  technical
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
   ICON HELPER
========================================================= */

function BeakerIcon() {
  return (
    <span className="beaker-icon">
      🧪
    </span>
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

export default App;
