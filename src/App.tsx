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
  ChevronDown,
  TrendingUp,
} from "lucide-react";
import { supabase } from "./lib/supabase";
import type { Tank, TankParameter, WaterChange } from "./types";

type Modal = "tank" | "parameter" | "change" | null;

type Tab =
  | "overview"
  | "parameters"
  | "changes";

type Page =
  | "dashboard"
  | "tank";

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

type GraphType =
  | "parameter"
  | "changes";

type ParameterKey =
  | "ph"
  | "temperature"
  | "ammonia"
  | "nitrite"
  | "nitrate"
  | "gh"
  | "kh"
  | "tds"
  | "salinity";

const num = (
  value: string
): number | null => {
  return value === ""
    ? null
    : Number(value);
};

const iso = (
  value: string
): string => {
  return new Date(value).toISOString();
};

const fmt = (
  value: string
): string => {
  return new Intl.DateTimeFormat(
    undefined,
    {
      dateStyle: "medium",
      timeStyle: "short",
    }
  ).format(new Date(value));
};

const shortDate = (
  value: string
): string => {
  return new Intl.DateTimeFormat(
    undefined,
    {
      month: "short",
      day: "numeric",
    }
  ).format(new Date(value));
};

const parameterLabels: Record<
  ParameterKey,
  string
> = {
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

const parameterUnits: Record<
  ParameterKey,
  string
> = {
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

  /*
   * =========================================================
   * SETTINGS
   * =========================================================
   */

  const [theme, setTheme] =
    useState<Theme>(() => {
      const saved =
        localStorage.getItem(
          "tank-theme"
        );

      const valid: Theme[] = [
        "ocean",
        "coral",
        "tropical",
        "space",
        "sunset",
        "planted",
      ];

      return saved &&
        valid.includes(
          saved as Theme
        )
        ? (saved as Theme)
        : "ocean";
    });

  const [cardStyle, setCardStyle] =
    useState<CardStyle>(() => {
      return localStorage.getItem(
        "tank-card-style"
      ) === "sharp"
        ? "sharp"
        : "rounded";
    });

  const [density, setDensity] =
    useState<Density>(() => {
      return localStorage.getItem(
        "tank-density"
      ) === "compact"
        ? "compact"
        : "comfortable";
    });

  const [textSize, setTextSize] =
    useState<TextSize>(() => {
      return localStorage.getItem(
        "tank-text-size"
      ) === "large"
        ? "large"
        : "normal";
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

  /*
   * =========================================================
   * LOAD DATA
   * =========================================================
   */

  const load = async () => {
    setLoading(true);

    const [
      tankResult,
      parameterResult,
      changeResult,
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
    ]);

    if (
      tankResult.error ||
      parameterResult.error ||
      changeResult.error
    ) {
      const error =
        tankResult.error ||
        parameterResult.error ||
        changeResult.error;

      alert(error?.message);
    }

    const loadedTanks =
      (tankResult.data ||
        []) as Tank[];

    setTanks(loadedTanks);

    setParams(
      (parameterResult.data ||
        []) as TankParameter[]
    );

    setChanges(
      (changeResult.data ||
        []) as WaterChange[]
    );

    setSelected(
      (current) => {
        if (
          current &&
          loadedTanks.some(
            (tank) =>
              tank.id === current
          )
        ) {
          return current;
        }

        return (
          loadedTanks[0]?.id ||
          null
        );
      }
    );

    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  /*
   * =========================================================
   * SELECTED TANK
   * =========================================================
   */

  const tank = useMemo(() => {
    return (
      tanks.find(
        (item) =>
          item.id === selected
      ) || null
    );
  }, [tanks, selected]);

  const tankParameters =
    useMemo(() => {
      return params
        .filter(
          (item) =>
            item.tank_id === selected
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
    }, [params, selected]);

  const tankChanges =
    useMemo(() => {
      return changes
        .filter(
          (item) =>
            item.tank_id === selected
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
    }, [changes, selected]);

  /*
   * =========================================================
   * OPEN TANK
   * =========================================================
   */

  const openTank = (
    id: string
  ) => {
    setSelected(id);
    setPage("tank");
    setTab("overview");
    setMenuOpen(false);
  };

  const openDashboard = () => {
    setPage("dashboard");
    setMenuOpen(false);
  };

  /*
   * =========================================================
   * REORDER
   * =========================================================
   */

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

    if (!movedTank) {
      return;
    }

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
        updates.map((item) =>
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

  /*
   * =========================================================
   * DELETE
   * =========================================================
   */

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
      return;
    }

    if (
      table === "tanks" &&
      selected === id
    ) {
      setSelected(null);
      setPage("dashboard");
    }

    await load();
  };

  /*
   * =========================================================
   * MODALS
   * =========================================================
   */

  const open = (
    modalType: Modal,
    row: any = null
  ) => {
    setEdit(row);
    setModal(modalType);
  };

  const closeModal = () => {
    setModal(null);
    setEdit(null);
  };

  /*
   * =========================================================
   * RENDER
   * =========================================================
   */

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
          aria-label="Open menu"
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
          {/*
            IMPORTANT:
            settings-button deliberately remains
            visible on mobile.
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
            className="icon refresh-button"
            onClick={load}
            aria-label="Refresh"
            title="Refresh"
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
        {/* ===================================================
            SIDEBAR
        =================================================== */}

        <aside
          className={
            menuOpen
              ? "open"
              : ""
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

          {/* DASHBOARD BUTTON */}

          <button
            className={[
              "dashboard-nav",
              page ===
              "dashboard"
                ? "active"
                : "",
            ].join(" ")}
            onClick={
              openDashboard
            }
          >
            <Home size={16} />

            <span>
              Dashboard
            </span>
          </button>

          {/* TANK SECTION */}

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
              onChange={(event) =>
                setQuery(
                  event.target.value
                )
              }
              placeholder="Find a tank..."
              aria-label="Find a tank"
            />
          </div>

          {loading ? (
            <p className="muted">
              Loading…
            </p>
          ) : tanks.length === 0 ? (
            <p className="muted">
              No tanks yet.
            </p>
          ) : (
            tanks
              .filter((item) =>
                item.name
                  .toLowerCase()
                  .includes(
                    query.toLowerCase()
                  )
              )
              .map((item) => (
                <button
                  key={item.id}
                  className={[
                    "tank",
                    page === "tank" &&
                    item.id ===
                      selected
                      ? "sel"
                      : "",
                    draggedTankId ===
                    item.id
                      ? "dragging"
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  draggable
                  onClick={() =>
                    openTank(
                      item.id
                    )
                  }
                  onDragStart={(
                    event
                  ) => {
                    setDraggedTankId(
                      item.id
                    );

                    event.dataTransfer.effectAllowed =
                      "move";

                    event.dataTransfer.setData(
                      "text/plain",
                      item.id
                    );
                  }}
                  onDragOver={(
                    event
                  ) => {
                    event.preventDefault();

                    event.dataTransfer.dropEffect =
                      "move";
                  }}
                  onDrop={(
                    event
                  ) => {
                    event.preventDefault();

                    const draggedId =
                      event.dataTransfer.getData(
                        "text/plain"
                      );

                    const fromIndex =
                      tanks.findIndex(
                        (tankItem) =>
                          tankItem.id ===
                          draggedId
                      );

                    const toIndex =
                      tanks.findIndex(
                        (tankItem) =>
                          tankItem.id ===
                          item.id
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
                      {item.name}
                    </b>

                    <small>
                      {item.volume
                        ? `${item.volume} L`
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

        {/* MOBILE OVERLAY */}

        {menuOpen && (
          <div
            className="menu-overlay"
            onClick={() =>
              setMenuOpen(false)
            }
          />
        )}

        {/* ===================================================
            CONTENT
        =================================================== */}

        <section className="content">
          {page ===
            "dashboard" && (
            <Dashboard
              tanks={tanks}
              params={params}
              changes={changes}
              loading={loading}
              openTank={
                openTank
              }
              addTank={() =>
                open("tank")
              }
            />
          )}

          {page === "tank" &&
            tank && (
              <>
                <TankPage
                  tank={tank}
                  parameters={
                    tankParameters
                  }
                  changes={
                    tankChanges
                  }
                  tab={tab}
                  setTab={setTab}
                  open={open}
                  del={del}
                  goDashboard={
                    openDashboard
                  }
                />
              </>
            )}

          {page === "tank" &&
            !tank && (
              <div className="empty">
                <div>🐠</div>

                <h1>
                  Tank not found.
                </h1>

                <p>
                  The selected tank
                  no longer exists.
                </p>

                <button
                  className="primary"
                  onClick={
                    openDashboard
                  }
                >
                  <Home size={17} />
                  Back to dashboard
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
          close={closeModal}
          done={load}
        />
      )}

      {modal ===
        "parameter" &&
        tank && (
          <ParameterModal
            tank={tank.id}
            row={edit}
            close={closeModal}
            done={load}
          />
        )}

      {modal === "change" &&
        tank && (
          <ChangeModal
            tank={tank.id}
            row={edit}
            close={closeModal}
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
  const totalVolume =
    tanks.reduce(
      (total, tank) =>
        total +
        Number(
          tank.volume || 0
        ),
      0
    );

  const recentTests =
    params.filter((item) => {
      const date =
        new Date(
          item.measured_at
        ).getTime();

      return (
        Date.now() -
          date <
        1000 *
          60 *
          60 *
          24 *
          30
      );
    }).length;

  const recentChanges =
    changes.filter((item) => {
      const date =
        new Date(
          item.completed_at
        ).getTime();

      return (
        Date.now() -
          date <
        1000 *
          60 *
          60 *
          24 *
          30
      );
    }).length;

  return (
    <>
      <div className="dashboard-header">
        <div>
          <small>
            AQUARIUM CONTROL CENTRE
          </small>

          <h1>
            Dashboard
          </h1>

          <p>
            A quick overview of all
            your aquariums.
          </p>
        </div>

        <button
          className="primary"
          onClick={addTank}
        >
          <Plus size={17} />
          Add tank
        </button>
      </div>

      {/* SUMMARY */}

      <div className="dashboard-summary">
        <div className="summary-card">
          <div className="summary-icon">
            🐟
          </div>

          <div>
            <small>
              TANKS
            </small>

            <b>
              {tanks.length}
            </b>
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-icon">
            💧
          </div>

          <div>
            <small>
              TOTAL VOLUME
            </small>

            <b>
              {totalVolume || 0} L
            </b>
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-icon">
            🧪
          </div>

          <div>
            <small>
              TESTS / 30 DAYS
            </small>

            <b>
              {recentTests}
            </b>
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-icon">
            💦
          </div>

          <div>
            <small>
              CHANGES / 30 DAYS
            </small>

            <b>
              {recentChanges}
            </b>
          </div>
        </div>
      </div>

      {/* TANKS */}

      <div className="dashboard-section-head">
        <div>
          <small>
            YOUR AQUARIUMS
          </small>

          <h2>
            Tank overview
          </h2>
        </div>
      </div>

      {loading ? (
        <div className="panel center">
          <p className="muted">
            Loading tanks…
          </p>
        </div>
      ) : !tanks.length ? (
        <div className="dashboard-empty">
          <div>🐠</div>

          <h2>
            No tanks yet
          </h2>

          <p>
            Add your first aquarium
            to start tracking its
            water parameters and
            maintenance.
          </p>

          <button
            className="primary"
            onClick={addTank}
          >
            <Plus size={17} />
            Add first tank
          </button>
        </div>
      ) : (
        <div className="dashboard-tanks">
          {tanks.map((tank) => (
            <DashboardTankCard
              key={tank.id}
              tank={tank}
              params={params.filter(
                (item) =>
                  item.tank_id ===
                  tank.id
              )}
              changes={changes.filter(
                (item) =>
                  item.tank_id ===
                  tank.id
              )}
              open={() =>
                openTank(
                  tank.id
                )
              }
            />
          ))}
        </div>
      )}
    </>
  );
}

/* =========================================================
   DASHBOARD TANK CARD
========================================================= */

function DashboardTankCard({
  tank,
  params,
  changes,
  open,
}: {
  tank: Tank;
  params: TankParameter[];
  changes: WaterChange[];
  open: () => void;
}) {
  const [
    graphType,
    setGraphType,
  ] = useState<GraphType>(
    "parameter"
  );

  const [
    parameter,
    setParameter,
  ] = useState<ParameterKey>(
    "ph"
  );

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

  const latestChange =
    [...changes].sort(
      (a, b) =>
        +new Date(
          b.completed_at
        ) -
        +new Date(
          a.completed_at
        )
    )[0];

  return (
    <div className="dashboard-tank-card">
      {/* HEADER */}

      <div className="dashboard-tank-head">
        <button
          className="dashboard-tank-name"
          onClick={open}
        >
          <span className="tankicon">
            <Fish size={17} />
          </span>

          <span>
            <b>{tank.name}</b>

            <small>
              {tank.volume
                ? `${tank.volume} L`
                : "Volume not set"}
            </small>
          </span>
        </button>

        <button
          className="icon"
          onClick={open}
          aria-label={`Open ${tank.name}`}
        >
          <ChevronRight
            size={17}
          />
        </button>
      </div>

      {/* LATEST VALUES */}

      <div className="dashboard-latest">
        <div>
          <small>
            pH
          </small>

          <b>
            {latest?.ph ??
              "—"}
          </b>
        </div>

        <div>
          <small>
            Temp
          </small>

          <b>
            {latest?.temperature !=
            null
              ? `${latest.temperature}°`
              : "—"}
          </b>
        </div>

        <div>
          <small>
            NH₃
          </small>

          <b>
            {latest?.ammonia ??
              "—"}
          </b>
        </div>

        <div>
          <small>
            TDS
          </small>

          <b>
            {latest?.tds ??
              "—"}
          </b>
        </div>
      </div>

      {/* GRAPH HEADER */}

      <div className="dashboard-graph-head">
        <div>
          <small>
            TREND
          </small>

          <h3>
            {graphType ===
            "parameter"
              ? parameterLabels[
                  parameter
                ]
              : "Water changes"}
          </h3>
        </div>

        <div className="graph-controls">
          <select
            value={graphType}
            onChange={(event) =>
              setGraphType(
                event.target
                  .value as GraphType
              )
            }
          >
            <option value="parameter">
              Parameters
            </option>

            <option value="changes">
              Water changes
            </option>
          </select>

          {graphType ===
            "parameter" && (
            <select
              value={parameter}
              onChange={(event) =>
                setParameter(
                  event.target
                    .value as ParameterKey
                )
              }
            >
              {(
                Object.keys(
                  parameterLabels
                ) as ParameterKey[]
              ).map((key) => (
                <option
                  key={key}
                  value={key}
                >
                  {
                    parameterLabels[
                      key
                    ]
                  }
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* GRAPH */}

      <TankGraph
        params={params}
        changes={changes}
        type={graphType}
        parameter={parameter}
      />

      {/* FOOTER */}

      <div className="dashboard-tank-footer">
        <span>
          {latest
            ? `Tested ${shortDate(
                latest.measured_at
              )}`
            : "No tests yet"}
        </span>

        <span>
          {latestChange
            ? `Last change ${shortDate(
                latestChange.completed_at
              )}`
            : "No water changes"}
        </span>
      </div>
    </div>
  );
}

/* =========================================================
   TANK GRAPH
========================================================= */

function TankGraph({
  params,
  changes,
  type,
  parameter,
}: {
  params: TankParameter[];
  changes: WaterChange[];
  type: GraphType;
  parameter: ParameterKey;
}) {
  const width = 620;
  const height = 190;

  const paddingLeft = 42;
  const paddingRight = 15;
  const paddingTop = 18;
  const paddingBottom = 30;

  const graphWidth =
    width -
    paddingLeft -
    paddingRight;

  const graphHeight =
    height -
    paddingTop -
    paddingBottom;

  const points =
    type === "parameter"
      ? [...params]
          .filter(
            (item) =>
              item[parameter] !=
                null &&
              Number.isFinite(
                Number(
                  item[parameter]
                )
              )
          )
          .sort(
            (a, b) =>
              +new Date(
                a.measured_at
              ) -
              +new Date(
                b.measured_at
              )
          )
          .slice(-20)
          .map((item) => ({
            date:
              item.measured_at,
            value: Number(
              item[parameter]
            ),
          }))
      : [...changes]
          .filter(
            (item) =>
              item.amount_changed_liters !=
                null &&
              Number.isFinite(
                Number(
                  item.amount_changed_liters
                )
              )
          )
          .sort(
            (a, b) =>
              +new Date(
                a.completed_at
              ) -
              +new Date(
                b.completed_at
              )
          )
          .slice(-20)
          .map((item) => ({
            date:
              item.completed_at,
            value: Number(
              item.amount_changed_liters
            ),
          }));

  if (!points.length) {
    return (
      <div className="graph-empty">
        <TrendingUp
          size={22}
        />

        <span>
          No data available for
          this graph yet.
        </span>
      </div>
    );
  }

  const values =
    points.map(
      (point) =>
        point.value
    );

  let min =
    Math.min(...values);

  let max =
    Math.max(...values);

  if (min === max) {
    const padding =
      min === 0
        ? 1
        : Math.abs(min) *
          0.15;

    min -= padding;
    max += padding;
  } else {
    const range =
      max - min;

    min -= range * 0.12;
    max += range * 0.12;
  }

  const getX = (
    index: number
  ) => {
    if (
      points.length === 1
    ) {
      return (
        paddingLeft +
        graphWidth / 2
      );
    }

    return (
      paddingLeft +
      (index /
        (points.length - 1)) *
        graphWidth
    );
  };

  const getY = (
    value: number
  ) => {
    return (
      paddingTop +
      graphHeight -
      ((value - min) /
        (max - min)) *
        graphHeight
    );
  };

  const path = points
    .map(
      (point, index) => {
        const x =
          getX(index);

        const y =
          getY(
            point.value
          );

        return `${
          index === 0
            ? "M"
            : "L"
        } ${x} ${y}`;
      }
    )
    .join(" ");

  const gridLines = [
    0,
    0.25,
    0.5,
    0.75,
    1,
  ];

  const formatValue = (
    value: number
  ) => {
    if (
      type ===
      "changes"
    ) {
      return `${value} L`;
    }

    return `${value}${parameterUnits[parameter]}`;
  };

  return (
    <div className="tank-graph">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={
          type ===
          "parameter"
            ? `${parameterLabels[parameter]} trend`
            : "Water change trend"
        }
      >
        {/* GRID */}

        {gridLines.map(
          (position) => {
            const y =
              paddingTop +
              graphHeight *
                position;

            const value =
              max -
              (max - min) *
                position;

            return (
              <g
                key={position}
              >
                <line
                  x1={
                    paddingLeft
                  }
                  y1={y}
                  x2={
                    width -
                    paddingRight
                  }
                  y2={y}
                  className="graph-grid"
                />

                <text
                  x={
                    paddingLeft -
                    8
                  }
                  y={y + 3}
                  textAnchor="end"
                  className="graph-label"
                >
                  {formatValue(
                    value
                  )}
                </text>
              </g>
            );
          }
        )}

        {/* AREA */}

        <path
          d={`${path} L ${getX(
            points.length - 1
          )} ${
            paddingTop +
            graphHeight
          } L ${getX(
            0
          )} ${
            paddingTop +
            graphHeight
          } Z`}
          className="graph-area"
        />

        {/* LINE */}

        <path
          d={path}
          className="graph-line"
          fill="none"
        />

        {/* POINTS */}

        {points.map(
          (
            point,
            index
          ) => (
            <g
              key={`${point.date}-${index}`}
            >
              <circle
                cx={getX(index)}
                cy={getY(
                  point.value
                )}
                r="4"
                className="graph-point"
              />

              <title>
                {shortDate(
                  point.date
                )} —{" "}
                {formatValue(
                  point.value
                )}
              </title>
            </g>
          )
        )}

        {/* X LABELS */}

        {points.length >
          1 && (
          <>
            <text
              x={getX(0)}
              y={
                height -
                8
              }
              textAnchor="start"
              className="graph-label"
            >
              {shortDate(
                points[0]
                  .date
              )}
            </text>

            <text
              x={getX(
                Math.floor(
                  (points.length -
                    1) /
                    2
                )
              )}
              y={
                height -
                8
              }
              textAnchor="middle"
              className="graph-label"
            >
              {shortDate(
                points[
                  Math.floor(
                    (points.length -
                      1) /
                      2
                  )
                ].date
              )}
            </text>

            <text
              x={getX(
                points.length -
                  1
              )}
              y={
                height -
                8
              }
              textAnchor="end"
              className="graph-label"
            >
              {shortDate(
                points[
                  points.length -
                    1
                ].date
              )}
            </text>
          </>
        )}
      </svg>
    </div>
  );
}

/* =========================================================
   TANK PAGE
========================================================= */

function TankPage({
  tank,
  parameters,
  changes,
  tab,
  setTab,
  open,
  del,
  goDashboard,
}: {
  tank: Tank;
  parameters: TankParameter[];
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
  goDashboard: () => void;
}) {
  return (
    <>
      <button
        className="back-dashboard"
        onClick={
          goDashboard
        }
      >
        <Home size={14} />
        Dashboard
        <ChevronRight
          size={13}
        />
        {tank.name}
      </button>

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
            aria-label="Delete tank"
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
        ).map(
          (tabName) => (
            <button
              key={tabName}
              className={
                tab ===
                tabName
                  ? "active"
                  : ""
              }
              onClick={() =>
                setTab(
                  tabName
                )
              }
            >
              {tabName ===
              "overview"
                ? "◉"
                : tabName ===
                  "parameters"
                ? "🧪"
                : "💧"}{" "}
              {tabName}
            </button>
          )
        )}
      </div>

      {tab ===
        "overview" && (
        <TankOverview
          p={
            parameters[0]
          }
          c={changes}
          parameters={
            parameters
          }
          goP={() =>
            setTab(
              "parameters"
            )
          }
          goC={() =>
            setTab("changes")
          }
        />
      )}

      {tab ===
        "parameters" && (
        <Parameters
          rows={parameters}
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
  p,
  c,
  parameters,
  goP,
  goC,
}: {
  p?: TankParameter;
  c: WaterChange[];
  parameters: TankParameter[];
  goP: () => void;
  goC: () => void;
}) {
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
          (metric) => (
            <div
              className="metric"
              key={
                metric[0]
              }
            >
              <small>
                {
                  metric[0]
                }
              </small>

              <b>
                {metric[1] ==
                null
                  ? "—"
                  : `${metric[1]}${metric[2]}`}
              </b>
            </div>
          )
        )}
      </div>

      {/* FULL TANK GRAPH */}

      <div className="panel tank-history-panel">
        <div className="panelhead">
          <div>
            <small>
              HISTORY
            </small>

            <h3>
              Water history
            </h3>
          </div>
        </div>

        <TankGraphExplorer
          parameters={
            parameters
          }
          changes={c}
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
            .map(
              (item) => (
                <div
                  className="activity"
                  key={
                    item.id
                  }
                >
                  <Droplets
                    size={16}
                  />

                  <span>
                    <b>
                      {
                        item.amount_changed_liters
                      }{" "}
                      L
                    </b>

                    <small>
                      {fmt(
                        item.completed_at
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
   GRAPH EXPLORER
========================================================= */

function TankGraphExplorer({
  parameters,
  changes,
}: {
  parameters: TankParameter[];
  changes: WaterChange[];
}) {
  const [
    type,
    setType,
  ] = useState<GraphType>(
    "parameter"
  );

  const [
    parameter,
    setParameter,
  ] = useState<ParameterKey>(
    "ph"
  );

  return (
    <>
      <div className="history-controls">
        <div className="history-control">
          <label>
            View
          </label>

          <select
            value={type}
            onChange={(event) =>
              setType(
                event.target
                  .value as GraphType
              )
            }
          >
            <option value="parameter">
              Parameter
            </option>

            <option value="changes">
              Water changes
            </option>
          </select>
        </div>

        {type ===
          "parameter" && (
          <div className="history-control">
            <label>
              Parameter
            </label>

            <select
              value={parameter}
              onChange={(
                event
              ) =>
                setParameter(
                  event.target
                    .value as ParameterKey
                )
              }
            >
              {(
                Object.keys(
                  parameterLabels
                ) as ParameterKey[]
              ).map(
                (key) => (
                  <option
                    key={key}
                    value={key}
                  >
                    {
                      parameterLabels[
                        key
                      ]
                    }
                  </option>
                )
              )}
            </select>
          </div>
        )}
      </div>

      <div className="large-graph">
        <TankGraph
          params={
            parameters
          }
          changes={changes}
          type={type}
          parameter={
            parameter
          }
        />
      </div>
    </>
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
        onClick={(event) =>
          event.stopPropagation()
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
                  key={item.id}
                  className={[
                    "theme-option",
                    theme ===
                    item.id
                      ? "selected"
                      : "",
                  ].join(
                    " "
                  )}
                  onClick={() =>
                    setTheme(
                      item.id
                    )
                  }
                >
                  <span
                    className={[
                      "theme-preview",
                      `preview-${item.id}`,
                    ].join(
                      " "
                    )}
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
              className={[
                "choice",
                cardStyle ===
                "rounded"
                  ? "active"
                  : "",
              ].join(
                " "
              )}
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
              className={[
                "choice",
                cardStyle ===
                "sharp"
                  ? "active"
                  : "",
              ].join(
                " "
              )}
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
                  Clean technical
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
          (item) => [
            fmt(
              item.measured_at
            ),
            item.temperature ??
              "—",
            item.ph ??
              "—",
            item.ammonia ??
              "—",
            item.nitrite ??
              "—",
            item.nitrate ??
              "—",
            item.gh ??
              "—",
            item.kh ??
              "—",
            item.tds ??
              "—",
            <Actions
              key={
                item.id
              }
              onEdit={() =>
                edit(
                  "parameter",
                  item
                )
              }
              onDelete={() =>
                del(
                  "tank_parameters",
                  item.id
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
          (item) => [
            fmt(
              item.completed_at
            ),
            `${item.amount_changed_liters} L`,
            item.added_water_temperature ??
              "—",
            item.added_water_ph ??
              "—",
            item.added_water_gh ??
              "—",
            item.added_water_kh ??
              "—",
            item.added_water_tds ??
              "—",
            item.added_water_notes ||
              "—",
            <Actions
              key={
                item.id
              }
              onEdit={() =>
                edit(
                  "change",
                  item
                )
              }
              onDelete={() =>
                del(
                  "water_changes",
                  item.id
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
              (
                head,
                index
              ) => (
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
            (
              row,
              rowIndex
            ) => (
              <tr
                key={
                  rowIndex
                }
              >
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
                      {
                        cell
                      }
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
          aria-label="Close"
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
        onChange={(
          event
        ) => {
          const nextValue =
            type ===
            "number"
              ? num(
                  event
                    .target
                    .value
                )
              : event
                  .target
                  .value;

          set(
            nextValue
          );
        }}
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
    event: React.FormEvent
  ) => {
    event.preventDefault();

    if (
      !form.name?.trim()
    ) {
      alert(
        "Please enter a tank name."
      );

      return;
    }

    const query =
      row
        ? supabase
            .from(
              "tanks"
            )
            .update(
              form
            )
            .eq(
              "id",
              row.id
            )
        : supabase
            .from(
              "tanks"
            )
            .insert(
              form
            );

    const { error } =
      await query;

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
          ? "Edit tank"
          : "Add tank"
      }
      close={close}
    >
      <form
        onSubmit={
          save
        }
      >
        <Field
          label="Tank name"
          value={
            form.name
          }
          set={(
            value
          ) =>
            setForm({
              ...form,
              name:
                value,
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
            ([
              label,
              key,
            ]) => (
              <Field
                key={key}
                label={
                  label
                }
                value={
                  form[
                    key
                  ]
                }
                type="number"
                set={(
                  value
                ) =>
                  setForm({
                    ...form,
                    [key]:
                      value,
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
          set={(
            value
          ) =>
            setForm({
              ...form,
              notes:
                value,
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
  row:
    | TankParameter
    | null;
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
    event: React.FormEvent
  ) => {
    event.preventDefault();

    const query =
      row
        ? supabase
            .from(
              "tank_parameters"
            )
            .update(
              form
            )
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

    const { error } =
      await query;

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
          ? "Edit water test"
          : "Add water test"
      }
      close={close}
    >
      <form
        onSubmit={
          save
        }
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
          set={(
            value
          ) =>
            setForm({
              ...form,
              measured_at:
                iso(
                  value
                ),
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
            ([
              label,
              key,
            ]) => (
              <Field
                key={key}
                label={
                  label
                }
                value={
                  form[
                    key
                  ]
                }
                type="number"
                set={(
                  value
                ) =>
                  setForm({
                    ...form,
                    [key]:
                      value,
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
          set={(
            value
          ) =>
            setForm({
              ...form,
              notes:
                value,
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
  row:
    | WaterChange
    | null;
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
    event: React.FormEvent
  ) => {
    event.preventDefault();

    const payload = {
      ...form,
    };

    delete payload.id;
    delete payload.created_at;
    delete payload.tank_id;

    const query =
      row
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
      await query;

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
          ? "Edit water change"
          : "Add water change"
      }
      close={close}
    >
      <form
        onSubmit={
          save
        }
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
            set={(
              value
            ) =>
              setForm({
                ...form,
                completed_at:
                  iso(
                    value
                  ),
              })
            }
          />

          <Field
            label="Amount changed (L)"
            value={
              form.amount_changed_liters
            }
            type="number"
            set={(
              value
            ) =>
              setForm({
                ...form,
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
            ([
              label,
              key,
            ]) => (
              <Field
                key={key}
                label={
                  label
                }
                value={
                  form[
                    key
                  ]
                }
                type="number"
                set={(
                  value
                ) =>
                  setForm({
                    ...form,
                    [key]:
                      value,
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
          set={(
            value
          ) =>
            setForm({
              ...form,
              added_water_notes:
                value,
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
        type="submit"
        className="primary"
      >
        Save
      </button>
    </div>
  );
}

export default App;
