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
} from "lucide-react";
import { supabase } from "./lib/supabase";
import type { Tank, TankParameter, WaterChange } from "./types";

type Modal = "tank" | "parameter" | "change" | null;
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

const num = (v: string) => (v === "" ? null : Number(v));

const iso = (v: string) => new Date(v).toISOString();

const fmt = (v: string) =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(v));

function App() {
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [params, setParams] = useState<TankParameter[]>([]);
  const [changes, setChanges] = useState<WaterChange[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [menuOpen, setMenuOpen] = useState(false);
  const [modal, setModal] = useState<Modal>(null);
  const [edit, setEdit] = useState<any>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [draggedTankId, setDraggedTankId] = useState<string | null>(null);

  /* SETTINGS */
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") return "ocean";

    const saved = localStorage.getItem("tank-theme");

    return (
      saved === "ocean" ||
      saved === "coral" ||
      saved === "tropical" ||
      saved === "space" ||
      saved === "sunset" ||
      saved === "planted"
        ? saved
        : "ocean"
    );
  });

  const [cardStyle, setCardStyle] = useState<CardStyle>(() => {
    if (typeof window === "undefined") return "rounded";

    return localStorage.getItem("tank-card-style") === "sharp"
      ? "sharp"
      : "rounded";
  });

  const [density, setDensity] = useState<Density>(() => {
    if (typeof window === "undefined") return "comfortable";

    return localStorage.getItem("tank-density") === "compact"
      ? "compact"
      : "comfortable";
  });

  const [textSize, setTextSize] = useState<TextSize>(() => {
    if (typeof window === "undefined") return "normal";

    return localStorage.getItem("tank-text-size") === "large"
      ? "large"
      : "normal";
  });

  /* SAVE SETTINGS */
  useEffect(() => {
    localStorage.setItem("tank-theme", theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("tank-card-style", cardStyle);
  }, [cardStyle]);

  useEffect(() => {
    localStorage.setItem("tank-density", density);
  }, [density]);

  useEffect(() => {
    localStorage.setItem("tank-text-size", textSize);
  }, [textSize]);

  /* LOAD DATA */
  const load = async () => {
    setLoading(true);

    const [t, p, c] = await Promise.all([
      supabase
        .from("tanks")
        .select("*")
        .order("sort_order", { ascending: true }),

      supabase
        .from("tank_parameters")
        .select("*")
        .order("measured_at", { ascending: false }),

      supabase
        .from("water_changes")
        .select("*")
        .order("completed_at", { ascending: false }),
    ]);

    if (t.error || p.error || c.error) {
      alert((t.error || p.error || c.error)?.message);
    }

    setTanks((t.data || []) as Tank[]);
    setParams((p.data || []) as TankParameter[]);
    setChanges((c.data || []) as WaterChange[]);

    setSelected((s) =>
      (t.data || []).some((x) => x.id === s)
        ? s
        : (t.data || [])[0]?.id || null
    );

    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const tank = tanks.find((x) => x.id === selected) || null;

  const tp = useMemo(
    () =>
      params
        .filter((x) => x.tank_id === selected)
        .sort(
          (a, b) =>
            +new Date(b.measured_at) -
            +new Date(a.measured_at)
        ),
    [params, selected]
  );

  const tc = useMemo(
    () =>
      changes
        .filter((x) => x.tank_id === selected)
        .sort(
          (a, b) =>
            +new Date(b.completed_at) -
            +new Date(a.completed_at)
        ),
    [changes, selected]
  );

  /* REORDER TANKS */
  const reorderTanks = async (
    fromIndex: number,
    toIndex: number
  ) => {
    if (fromIndex === toIndex) return;

    const reordered = [...tanks];

    const [movedTank] = reordered.splice(fromIndex, 1);

    reordered.splice(toIndex, 0, movedTank);

    setTanks(reordered);

    const updates = reordered.map((tank, index) => ({
      id: tank.id,
      sort_order: index,
    }));

    const results = await Promise.all(
      updates.map((tank) =>
        supabase
          .from("tanks")
          .update({
            sort_order: tank.sort_order,
          })
          .eq("id", tank.id)
      )
    );

    const error = results.find(
      (result) => result.error
    )?.error;

    if (error) {
      alert(
        `Could not save tank order: ${error.message}`
      );

      await load();
    }
  };

  /* DELETE */
  const del = async (
    table: string,
    id: string
  ) => {
    if (!confirm("Delete this record?")) return;

    const { error } = await supabase
      .from(table)
      .delete()
      .eq("id", id);

    if (error) {
      alert(error.message);
    } else {
      load();
    }
  };

  /* OPEN MODAL */
  const open = (
    m: Modal,
    x: any = null
  ) => {
    setEdit(x);
    setModal(m);
  };

  return (
    <div
      className={`app theme-${theme} cards-${cardStyle} density-${density} text-${textSize}`}
    >
      {/* HEADER */}

      <header>
        <button
          className="menu-button"
          onClick={() => setMenuOpen(true)}
          aria-label="Open tank menu"
        >
          ☰
        </button>

        <div className="brand">
          <span>🐟</span>

          <div>
            <b>Tank Tracker</b>
            <small>Aquarium control centre</small>
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
            className="icon"
            aria-label="Refresh"
          >
            <RefreshCw size={17} />
          </button>

          <button
            className="primary"
            onClick={() => open("tank")}
          >
            <Plus size={17} />
            Add tank
          </button>
        </div>
      </header>

      {/* MAIN */}

      <main>
        {/* TANK MENU */}

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

          <div className="side-head">
            <div>
              <small>YOUR TANKS</small>
              <strong>{tanks.length}</strong>
            </div>

            <button
              className="icon"
              onClick={() => open("tank")}
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
                setQuery(e.target.value)
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
                    (draggedTankId === x.id
                      ? "dragging"
                      : "")
                  }
                  draggable
                  onClick={() => {
                    setSelected(x.id);
                    setTab("overview");
                    setMenuOpen(false);
                  }}
                  onDragStart={(e) => {
                    setDraggedTankId(x.id);

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
                      fromIndex !== -1 &&
                      toIndex !== -1
                    ) {
                      reorderTanks(
                        fromIndex,
                        toIndex
                      );
                    }

                    setDraggedTankId(null);
                  }}
                  onDragEnd={() =>
                    setDraggedTankId(null)
                  }
                >
                  <span className="tankicon">
                    <Fish size={17} />
                  </span>

                  <span>
                    <b>{x.name}</b>

                    <small>
                      {x.volume
                        ? x.volume + " L"
                        : "No volume"}
                    </small>
                  </span>

                  <ChevronRight size={16} />
                </button>
              ))
          )}
        </aside>

        {/* MOBILE MENU OVERLAY */}

        {menuOpen && (
          <div
            className="menu-overlay"
            onClick={() =>
              setMenuOpen(false)
            }
          />
        )}

        {/* CONTENT */}

        <section className="content">
          {!tank ? (
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
              {/* TANK HEADER */}

              <div className="head">
                <div>
                  <small>AQUARIUM</small>

                  <h1>{tank.name}</h1>

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

              {/* TABS */}

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
                    {x === "overview"
                      ? "◉"
                      : x ===
                        "parameters"
                      ? "🧪"
                      : "💧"}{" "}
                    {x}
                  </button>
                ))}
              </div>

              {/* OVERVIEW */}

              {tab === "overview" && (
                <Overview
                  p={tp[0]}
                  c={tc}
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

              {/* PARAMETERS */}

              {tab === "parameters" && (
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

              {/* WATER CHANGES */}

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

      {/* MODALS */}

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

      {/* SETTINGS */}

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
            setSettingsOpen(false)
          }
        />
      )}
    </div>
  );
}

/* =========================================================
   SETTINGS PANEL
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
  setTheme: (value: Theme) => void;
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

            <h2>Settings</h2>
          </div>

          <button
            className="icon"
            onClick={close}
            aria-label="Close settings"
          >
            <X size={18} />
          </button>
        </div>

        {/* THEME */}

        <div className="settings-section">
          <div className="settings-section-title">
            <Palette size={16} />
            <span>Theme</span>
          </div>

          <div className="theme-grid">
            {themes.map((x) => (
              <button
                key={x.id}
                className={`theme-option ${
                  theme === x.id
                    ? "selected"
                    : ""
                }`}
                onClick={() =>
                  setTheme(x.id)
                }
              >
                <span
                  className={`theme-preview preview-${x.id}`}
                >
                  {x.emoji}
                </span>

                <span className="theme-info">
                  <b>{x.name}</b>

                  <small>
                    {x.description}
                  </small>
                </span>

                {theme === x.id && (
                  <span className="theme-check">
                    <Check size={14} />
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* CARD STYLE */}

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
                <b>Rounded</b>
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
                <b>Sharp</b>
                <small>
                  Clean technical style
                </small>
              </span>
            </button>
          </div>
        </div>

        {/* DENSITY */}

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

        {/* TEXT SIZE */}

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
   OVERVIEW
========================================================= */

function Overview({
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
      p?.ammonia ?? null,
      " ppm",
    ],
    [
      "Nitrite",
      p?.nitrite ?? null,
      " ppm",
    ],
    [
      "Nitrate",
      p?.nitrate ?? null,
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

            <button onClick={goP}>
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

            <button onClick={goC}>
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
   WATER CHANGES
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
            {heads.map((h, i) => (
              <th
                key={`${h}-${i}`}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((x, j) => (
                <td key={j}>
                  {x}
                </td>
              ))}
            </tr>
          ))}
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
            type === "number"
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

    if (!f.name?.trim()) {
      alert(
        "Please enter a tank name."
      );
      return;
    }

    const payload = {
      name: f.name.trim(),
      volume: f.volume,
      height: f.height,
      width: f.width,
      depth: f.depth,
      notes: f.notes,
    };

    const q = row
      ? supabase
          .from("tanks")
          .update(payload)
          .eq(
            "id",
            row.id
          )
      : supabase
          .from("tanks")
          .insert(
            payload
          );

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
            ([l, k]) => (
              <Field
                key={k}
                label={l}
                value={f[k]}
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
    useState<any>(d);

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
            ([l, k]) => (
              <Field
                key={k}
                label={l}
                value={f[k]}
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
            ([l, k]) => (
              <Field
                key={k}
                label={l}
                value={f[k]}
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

        <Save close={close} />
      </form>
    </Modal>
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
