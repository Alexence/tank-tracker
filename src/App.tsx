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
  BookOpen,
  ArrowLeft,
  SlidersHorizontal,
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
  | "species"
  | null;

type Tab =
  | "overview"
  | "parameters"
  | "changes";

type Page =
  | "dashboard"
  | "species";

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

type SpeciesCategory =
  | "fish"
  | "invertebrate"
  | "plant"
  | "other";

type WaterType =
  | "freshwater"
  | "saltwater"
  | "brackish";

type Difficulty =
  | "beginner"
  | "intermediate"
  | "advanced";

type Species = {
  id: string;

  common_name: string;
  scientific_name: string | null;

  category: SpeciesCategory;
  water_type: WaterType;
  difficulty: Difficulty;

  temperament: string | null;

  minimum_tank_litres: number | null;
  minimum_group_size: number | null;
  recommended_group_size: number | null;

  adult_size_cm: number | null;

  temperature_min: number | null;
  temperature_max: number | null;
  temperature_preferred_min: number | null;
  temperature_preferred_max: number | null;

  ph_min: number | null;
  ph_max: number | null;
  ph_preferred_min: number | null;
  ph_preferred_max: number | null;

  gh_min: number | null;
  gh_max: number | null;
  gh_preferred_min: number | null;
  gh_preferred_max: number | null;

  kh_min: number | null;
  kh_max: number | null;
  kh_preferred_min: number | null;
  kh_preferred_max: number | null;

  tds_min: number | null;
  tds_max: number | null;
  tds_preferred_min: number | null;
  tds_preferred_max: number | null;

  nitrate_max: number | null;

  notes: string | null;

  created_at: string;
  updated_at: string;
};

/* =========================================================
   HELPERS
========================================================= */

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

  const [selected, setSelected] =
    useState<string | null>(null);

  const [selectedSpecies, setSelectedSpecies] =
    useState<Species | null>(null);

  const [tab, setTab] =
    useState<Tab>("overview");

  const [page, setPage] =
    useState<Page>("dashboard");

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

  const [speciesQuery, setSpeciesQuery] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [speciesLoading, setSpeciesLoading] =
    useState(false);

  const [draggedTankId, setDraggedTankId] =
    useState<string | null>(null);

  /* =======================================================
     SETTINGS
  ======================================================= */

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
     LOAD TANK DATA
  ======================================================= */

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

    const error =
      tankResult.error ||
      parameterResult.error ||
      changeResult.error;

    if (error) {
      alert(error.message);
    }

    const tankData =
      (tankResult.data || []) as Tank[];

    setTanks(tankData);

    setParams(
      (parameterResult.data ||
        []) as TankParameter[]
    );

    setChanges(
      (changeResult.data ||
        []) as WaterChange[]
    );

    setSelected((current) =>
      tankData.some(
        (tank) => tank.id === current
      )
        ? current
        : tankData[0]?.id || null
    );

    setLoading(false);
  };

  /* =======================================================
     LOAD SPECIES
  ======================================================= */

  const loadSpecies = async () => {
    setSpeciesLoading(true);

    const { data, error } =
      await supabase
        .from("species")
        .select("*")
        .order("common_name", {
          ascending: true,
        });

    if (error) {
      alert(error.message);
    }

    setSpecies(
      (data || []) as Species[]
    );

    setSpeciesLoading(false);
  };

  useEffect(() => {
    load();
    loadSpecies();
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
        (tank, index) => ({
          id: tank.id,
          sort_order: index,
        })
      );

    const results =
      await Promise.all(
        updates.map(
          (tank) =>
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
      await loadSpecies();
    }
  };

  /* =======================================================
     MODAL
  ======================================================= */

  const open = (
    modalType: Modal,
    row: any = null
  ) => {
    setEdit(row);
    setModal(modalType);
  };

  /* =======================================================
     FILTERED TANKS
  ======================================================= */

  const filteredTanks =
    tanks.filter((tank) =>
      tank.name
        .toLowerCase()
        .includes(
          query.toLowerCase()
        )
    );

  /* =======================================================
     FILTERED SPECIES
  ======================================================= */

  const filteredSpecies =
    species.filter((item) => {
      const search =
        speciesQuery.toLowerCase();

      return (
        item.common_name
          .toLowerCase()
          .includes(search) ||
        (
          item.scientific_name ||
          ""
        )
          .toLowerCase()
          .includes(search)
      );
    });

  /* =======================================================
     RENDER
  ======================================================= */

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

          {/* TANK LIST */}

          {page ===
            "dashboard" && (
            <>
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
                filteredTanks.map(
                  (x) => (
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
                      onClick={() => {
                        setSelected(
                          x.id
                        );
                        setTab(
                          "overview"
                        );
                        setMenuOpen(
                          false
                        );
                      }}
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
                      onDragOver={(
                        e
                      ) => {
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
                            (
                              tank
                            ) =>
                              tank.id ===
                              draggedId
                          );

                        const toIndex =
                          tanks.findIndex(
                            (
                              tank
                            ) =>
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
                        <Fish
                          size={17}
                        />
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
                  )
                )
              )}
            </>
          )}

          {/* SPECIES SIDEBAR */}

          {page ===
            "species" && (
            <div className="species-sidebar-summary">
              <small>
                SPECIES LIBRARY
              </small>

              <strong>
                {species.length}
              </strong>

              <p>
                Manage your aquarium
                species and their
                requirements.
              </p>
            </div>
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
          {page ===
            "species" ? (
            <SpeciesPage
              species={
                filteredSpecies
              }
              allSpecies={
                species
              }
              loading={
                speciesLoading
              }
              query={
                speciesQuery
              }
              setQuery={
                setSpeciesQuery
              }
              selected={
                selectedSpecies
              }
              setSelected={
                setSelectedSpecies
              }
              add={() =>
                open(
                  "species"
                )
              }
              edit={(item) =>
                open(
                  "species",
                  item
                )
              }
              del={(id) =>
                del(
                  "species",
                  id
                )
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
                Add your first
                tank
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
                <Overview
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

              {tab ===
                "changes" && (
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

      {modal ===
        "species" && (
        <SpeciesModal
          row={edit}
          close={() =>
            setModal(null)
          }
          done={async () => {
            await loadSpecies();
          }}
        />
      )}

      {/* ===================================================
          SETTINGS
      =================================================== */}

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
   SPECIES PAGE
========================================================= */

function SpeciesPage({
  species,
  allSpecies,
  loading,
  query,
  setQuery,
  selected,
  setSelected,
  add,
  edit,
  del,
}: {
  species: Species[];
  allSpecies: Species[];
  loading: boolean;
  query: string;
  setQuery: (
    value: string
  ) => void;
  selected: Species | null;
  setSelected: (
    value: Species | null
  ) => void;
  add: () => void;
  edit: (
    species: Species
  ) => void;
  del: (id: string) => void;
}) {
  if (selected) {
    return (
      <SpeciesDetail
        species={selected}
        back={() =>
          setSelected(null)
        }
        edit={() =>
          edit(selected)
        }
        del={() => {
          del(selected.id);
          setSelected(null);
        }}
      />
    );
  }

  return (
    <>
      <div className="head species-page-head">
        <div>
          <small>
            LIBRARY
          </small>

          <h1>
            Species Library
          </h1>

          <p>
            Store your fish and
            aquatic species
            requirements in one
            place.
          </p>
        </div>

        <button
          className="primary"
          onClick={add}
        >
          <Plus size={17} />
          Add species
        </button>
      </div>

      <div className="species-toolbar">
        <div className="search species-search">
          <Search size={16} />

          <input
            value={query}
            onChange={(e) =>
              setQuery(
                e.target.value
              )
            }
            placeholder="Search species..."
          />
        </div>

        <div className="species-count">
          <SlidersHorizontal
            size={15}
          />
          {species.length} of{" "}
          {allSpecies.length}
        </div>
      </div>

      {loading ? (
        <div className="panel">
          <p className="muted">
            Loading species…
          </p>
        </div>
      ) : species.length ===
        0 ? (
        <div className="empty species-empty">
          <div>🐟</div>

          <h1>
            Your species library
            is empty.
          </h1>

          <p>
            Add your first fish,
            shrimp or other
            aquatic species.
          </p>

          <button
            className="primary"
            onClick={add}
          >
            <Plus size={17} />
            Add species
          </button>
        </div>
      ) : (
        <div className="species-grid">
          {species.map(
            (item) => (
              <SpeciesCard
                key={item.id}
                species={item}
                onClick={() =>
                  setSelected(
                    item
                  )
                }
                onEdit={() =>
                  edit(item)
                }
                onDelete={() =>
                  del(item.id)
                }
              />
            )
          )}
        </div>
      )}
    </>
  );
}

/* =========================================================
   SPECIES CARD
========================================================= */

function SpeciesCard({
  species,
  onClick,
  onEdit,
  onDelete,
}: {
  species: Species;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="species-card">
      <button
        className="species-card-main"
        onClick={onClick}
      >
        <div className="species-card-icon">
          {species.category ===
          "fish"
            ? "🐟"
            : species.category ===
              "invertebrate"
            ? "🦐"
            : species.category ===
              "plant"
            ? "🌿"
            : "💧"}
        </div>

        <div className="species-card-info">
          <h3>
            {species.common_name}
          </h3>

          {species.scientific_name && (
            <em>
              {
                species.scientific_name
              }
            </em>
          )}

          <div className="species-tags">
            <span>
              {species.water_type}
            </span>

            <span>
              {species.difficulty}
            </span>
          </div>
        </div>

        <ChevronRight
          size={17}
        />
      </button>

      <div className="species-card-meta">
        {species.temperature_min !=
          null &&
          species.temperature_max !=
            null && (
            <div>
              <small>
                Temperature
              </small>

              <b>
                {
                  species.temperature_min
                }
                –
                {
                  species.temperature_max
                }
                °C
              </b>
            </div>
          )}

        {species.ph_min !=
          null &&
          species.ph_max !=
            null && (
            <div>
              <small>
                pH
              </small>

              <b>
                {species.ph_min}–
                {species.ph_max}
              </b>
            </div>
          )}

        {species.minimum_tank_litres !=
          null && (
          <div>
            <small>
              Min tank
            </small>

            <b>
              {
                species.minimum_tank_litres
              }{" "}
              L
            </b>
          </div>
        )}
      </div>

      <div className="species-card-actions">
        <button
          className="icon"
          onClick={onEdit}
          aria-label="Edit species"
        >
          <Pencil size={14} />
        </button>

        <button
          className="icon"
          onClick={onDelete}
          aria-label="Delete species"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

/* =========================================================
   SPECIES DETAIL
========================================================= */

function SpeciesDetail({
  species,
  back,
  edit,
  del,
}: {
  species: Species;
  back: () => void;
  edit: () => void;
  del: () => void;
}) {
  return (
    <>
      <button
        className="back-button"
        onClick={back}
      >
        <ArrowLeft size={16} />
        Species Library
      </button>

      <div className="species-detail-head">
        <div className="species-detail-icon">
          {species.category ===
          "fish"
            ? "🐟"
            : species.category ===
              "invertebrate"
            ? "🦐"
            : species.category ===
              "plant"
            ? "🌿"
            : "💧"}
        </div>

        <div className="species-detail-title">
          <small>
            {species.category.toUpperCase()}
          </small>

          <h1>
            {species.common_name}
          </h1>

          {species.scientific_name && (
            <em>
              {
                species.scientific_name
              }
            </em>
          )}
        </div>

        <div className="species-detail-actions">
          <button
            className="secondary"
            onClick={edit}
          >
            <Pencil size={15} />
            Edit
          </button>

          <button
            className="danger"
            onClick={del}
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      <div className="species-detail-tags">
        <span>
          💧 {species.water_type}
        </span>

        <span>
          🎯 {species.difficulty}
        </span>

        {species.temperament && (
          <span>
            🧠 {species.temperament}
          </span>
        )}
      </div>

      <div className="species-detail-grid">
        <div className="panel">
          <div className="panelhead">
            <h3>
              Water parameters
            </h3>
          </div>

          <ParameterRange
            label="Temperature"
            min={
              species.temperature_min
            }
            max={
              species.temperature_max
            }
            preferredMin={
              species.temperature_preferred_min
            }
            preferredMax={
              species.temperature_preferred_max
            }
            unit="°C"
          />

          <ParameterRange
            label="pH"
            min={species.ph_min}
            max={species.ph_max}
            preferredMin={
              species.ph_preferred_min
            }
            preferredMax={
              species.ph_preferred_max
            }
          />

          <ParameterRange
            label="GH"
            min={species.gh_min}
            max={species.gh_max}
            preferredMin={
              species.gh_preferred_min
            }
            preferredMax={
              species.gh_preferred_max
            }
            unit=" dGH"
          />

          <ParameterRange
            label="KH"
            min={species.kh_min}
            max={species.kh_max}
            preferredMin={
              species.kh_preferred_min
            }
            preferredMax={
              species.kh_preferred_max
            }
            unit=" dKH"
          />

          <ParameterRange
            label="TDS"
            min={species.tds_min}
            max={species.tds_max}
            preferredMin={
              species.tds_preferred_min
            }
            preferredMax={
              species.tds_preferred_max
            }
            unit=" ppm"
          />

          {species.nitrate_max !=
            null && (
            <div className="species-range-row">
              <span>
                Nitrate maximum
              </span>

              <b>
                ≤{" "}
                {
                  species.nitrate_max
                }{" "}
                ppm
              </b>
            </div>
          )}
        </div>

        <div className="panel">
          <div className="panelhead">
            <h3>
              Care requirements
            </h3>
          </div>

          <InfoRow
            label="Minimum tank"
            value={
              species.minimum_tank_litres !=
              null
                ? `${species.minimum_tank_litres} L`
                : "Not set"
            }
          />

          <InfoRow
            label="Minimum group"
            value={
              species.minimum_group_size !=
              null
                ? `${species.minimum_group_size}`
                : "Not set"
            }
          />

          <InfoRow
            label="Recommended group"
            value={
              species.recommended_group_size !=
              null
                ? `${species.recommended_group_size}`
                : "Not set"
            }
          />

          <InfoRow
            label="Adult size"
            value={
              species.adult_size_cm !=
              null
                ? `${species.adult_size_cm} cm`
                : "Not set"
            }
          />

          <InfoRow
            label="Temperament"
            value={
              species.temperament ||
              "Not set"
            }
          />
        </div>
      </div>

      {species.notes && (
        <div className="panel species-notes">
          <div className="panelhead">
            <h3>Notes</h3>
          </div>

          <p>
            {species.notes}
          </p>
        </div>
      )}
    </>
  );
}

/* =========================================================
   PARAMETER RANGE
========================================================= */

function ParameterRange({
  label,
  min,
  max,
  preferredMin,
  preferredMax,
  unit = "",
}: {
  label: string;
  min: number | null;
  max: number | null;
  preferredMin: number | null;
  preferredMax: number | null;
  unit?: string;
}) {
  const hasRange =
    min != null &&
    max != null;

  const hasPreferred =
    preferredMin != null &&
    preferredMax != null;

  return (
    <div className="parameter-range">
      <div className="parameter-range-head">
        <span>{label}</span>

        <b>
          {hasRange
            ? `${min}–${max}${unit}`
            : "Not set"}
        </b>
      </div>

      {hasPreferred && (
        <small>
          Preferred:{" "}
          {preferredMin}–
          {preferredMax}
          {unit}
        </small>
      )}
    </div>
  );
}

/* =========================================================
   INFO ROW
========================================================= */

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="species-range-row">
      <span>{label}</span>
      <b>{value}</b>
    </div>
  );
}

/* =========================================================
   SPECIES MODAL
========================================================= */

function SpeciesModal({
  row,
  close,
  done,
}: {
  row: Species | null;
  close: () => void;
  done: () => Promise<void>;
}) {
  const createForm =
    (): any =>
      row
        ? {
            common_name:
              row.common_name,
            scientific_name:
              row.scientific_name ||
              "",
            category:
              row.category,
            water_type:
              row.water_type,
            difficulty:
              row.difficulty,
            temperament:
              row.temperament ||
              "",
            minimum_tank_litres:
              row.minimum_tank_litres,
            minimum_group_size:
              row.minimum_group_size,
            recommended_group_size:
              row.recommended_group_size,
            adult_size_cm:
              row.adult_size_cm,

            temperature_min:
              row.temperature_min,
            temperature_max:
              row.temperature_max,
            temperature_preferred_min:
              row.temperature_preferred_min,
            temperature_preferred_max:
              row.temperature_preferred_max,

            ph_min: row.ph_min,
            ph_max: row.ph_max,
            ph_preferred_min:
              row.ph_preferred_min,
            ph_preferred_max:
              row.ph_preferred_max,

            gh_min: row.gh_min,
            gh_max: row.gh_max,
            gh_preferred_min:
              row.gh_preferred_min,
            gh_preferred_max:
              row.gh_preferred_max,

            kh_min: row.kh_min,
            kh_max: row.kh_max,
            kh_preferred_min:
              row.kh_preferred_min,
            kh_preferred_max:
              row.kh_preferred_max,

            tds_min: row.tds_min,
            tds_max: row.tds_max,
            tds_preferred_min:
              row.tds_preferred_min,
            tds_preferred_max:
              row.tds_preferred_max,

            nitrate_max:
              row.nitrate_max,

            notes:
              row.notes || "",
          }
        : {
            common_name: "",
            scientific_name: "",
            category: "fish",
            water_type:
              "freshwater",
            difficulty:
              "beginner",
            temperament: "",

            minimum_tank_litres:
              null,
            minimum_group_size:
              null,
            recommended_group_size:
              null,
            adult_size_cm:
              null,

            temperature_min:
              null,
            temperature_max:
              null,
            temperature_preferred_min:
              null,
            temperature_preferred_max:
              null,

            ph_min: null,
            ph_max: null,
            ph_preferred_min:
              null,
            ph_preferred_max:
              null,

            gh_min: null,
            gh_max: null,
            gh_preferred_min:
              null,
            gh_preferred_max:
              null,

            kh_min: null,
            kh_max: null,
            kh_preferred_min:
              null,
            kh_preferred_max:
              null,

            tds_min: null,
            tds_max: null,
            tds_preferred_min:
              null,
            tds_preferred_max:
              null,

            nitrate_max:
              null,

            notes: "",
          };

  const [f, setF] =
    useState<any>(
      createForm()
    );

  const update = (
    key: string,
    value: any
  ) => {
    setF({
      ...f,
      [key]: value,
    });
  };

  const save = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (
      !f.common_name.trim()
    ) {
      alert(
        "Please enter a common name."
      );

      return;
    }

    const payload = {
      ...f,

      scientific_name:
        f.scientific_name ||
        null,

      temperament:
        f.temperament ||
        null,

      notes:
        f.notes || null,
    };

    const query = row
      ? supabase
          .from("species")
          .update(payload)
          .eq("id", row.id)
      : supabase
          .from("species")
          .insert(payload);

    const { error } =
      await query;

    if (error) {
      alert(error.message);
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
          : "Add species"
      }
      close={close}
    >
      <form
        onSubmit={save}
        className="species-form"
      >
        <small className="section">
          BASIC INFORMATION
        </small>

        <Field
          label="Common name"
          value={
            f.common_name
          }
          set={(v) =>
            update(
              "common_name",
              v
            )
          }
        />

        <Field
          label="Scientific name"
          value={
            f.scientific_name
          }
          set={(v) =>
            update(
              "scientific_name",
              v
            )
          }
        />

        <div className="formgrid">
          <SelectField
            label="Category"
            value={f.category}
            set={(v) =>
              update(
                "category",
                v
              )
            }
            options={[
              [
                "fish",
                "Fish",
              ],
              [
                "invertebrate",
                "Invertebrate",
              ],
              [
                "plant",
                "Plant",
              ],
              [
                "other",
                "Other",
              ],
            ]}
          />

          <SelectField
            label="Water type"
            value={
              f.water_type
            }
            set={(v) =>
              update(
                "water_type",
                v
              )
            }
            options={[
              [
                "freshwater",
                "Freshwater",
              ],
              [
                "saltwater",
                "Saltwater",
              ],
              [
                "brackish",
                "Brackish",
              ],
            ]}
          />
        </div>

        <div className="formgrid">
          <SelectField
            label="Difficulty"
            value={
              f.difficulty
            }
            set={(v) =>
              update(
                "difficulty",
                v
              )
            }
            options={[
              [
                "beginner",
                "Beginner",
              ],
              [
                "intermediate",
                "Intermediate",
              ],
              [
                "advanced",
                "Advanced",
              ],
            ]}
          />

          <Field
            label="Temperament"
            value={
              f.temperament
            }
            set={(v) =>
              update(
                "temperament",
                v
              )
            }
          />
        </div>

        <small className="section">
          CARE REQUIREMENTS
        </small>

        <div className="formgrid">
          <NumberField
            label="Minimum tank (L)"
            value={
              f.minimum_tank_litres
            }
            set={(v) =>
              update(
                "minimum_tank_litres",
                v
              )
            }
          />

          <NumberField
            label="Adult size (cm)"
            value={
              f.adult_size_cm
            }
            set={(v) =>
              update(
                "adult_size_cm",
                v
              )
            }
          />

          <NumberField
            label="Minimum group size"
            value={
              f.minimum_group_size
            }
            set={(v) =>
              update(
                "minimum_group_size",
                v
              )
            }
          />

          <NumberField
            label="Recommended group size"
            value={
              f.recommended_group_size
            }
            set={(v) =>
              update(
                "recommended_group_size",
                v
              )
            }
          />
        </div>

        <small className="section">
          WATER PARAMETERS
        </small>

        <RangeEditor
          label="Temperature °C"
          minKey="temperature_min"
          maxKey="temperature_max"
          preferredMinKey="temperature_preferred_min"
          preferredMaxKey="temperature_preferred_max"
          values={f}
          update={update}
        />

        <RangeEditor
          label="pH"
          minKey="ph_min"
          maxKey="ph_max"
          preferredMinKey="ph_preferred_min"
          preferredMaxKey="ph_preferred_max"
          values={f}
          update={update}
        />

        <RangeEditor
          label="GH"
          minKey="gh_min"
          maxKey="gh_max"
          preferredMinKey="gh_preferred_min"
          preferredMaxKey="gh_preferred_max"
          values={f}
          update={update}
        />

        <RangeEditor
          label="KH"
          minKey="kh_min"
          maxKey="kh_max"
          preferredMinKey="kh_preferred_min"
          preferredMaxKey="kh_preferred_max"
          values={f}
          update={update}
        />

        <RangeEditor
          label="TDS"
          minKey="tds_min"
          maxKey="tds_max"
          preferredMinKey="tds_preferred_min"
          preferredMaxKey="tds_preferred_max"
          values={f}
          update={update}
        />

        <NumberField
          label="Nitrate maximum (ppm)"
          value={
            f.nitrate_max
          }
          set={(v) =>
            update(
              "nitrate_max",
              v
            )
          }
        />

        <small className="section">
          NOTES
        </small>

        <label>
          Notes

          <textarea
            value={
              f.notes || ""
            }
            onChange={(e) =>
              update(
                "notes",
                e.target.value
              )
            }
          />
        </label>

        <Save close={close} />
      </form>
    </Modal>
  );
}

/* =========================================================
   RANGE EDITOR
========================================================= */

function RangeEditor({
  label,
  minKey,
  maxKey,
  preferredMinKey,
  preferredMaxKey,
  values,
  update,
}: {
  label: string;
  minKey: string;
  maxKey: string;
  preferredMinKey: string;
  preferredMaxKey: string;
  values: any;
  update: (
    key: string,
    value: any
  ) => void;
}) {
  return (
    <div className="range-editor">
      <strong>{label}</strong>

      <div className="formgrid four">
        <NumberField
          label="Minimum"
          value={
            values[minKey]
          }
          set={(v) =>
            update(
              minKey,
              v
            )
          }
        />

        <NumberField
          label="Maximum"
          value={
            values[maxKey]
          }
          set={(v) =>
            update(
              maxKey,
              v
            )
          }
        />

        <NumberField
          label="Preferred min"
          value={
            values[
              preferredMinKey
            ]
          }
          set={(v) =>
            update(
              preferredMinKey,
              v
            )
          }
        />

        <NumberField
          label="Preferred max"
          value={
            values[
              preferredMaxKey
            ]
          }
          set={(v) =>
            update(
              preferredMaxKey,
              v
            )
          }
        />
      </div>
    </div>
  );
}

/* =========================================================
   SELECT FIELD
========================================================= */

function SelectField({
  label,
  value,
  set,
  options,
}: {
  label: string;
  value: string;
  set: (
    value: string
  ) => void;
  options: [
    string,
    string
  ][];
}) {
  return (
    <label>
      {label}

      <select
        value={value}
        onChange={(e) =>
          set(
            e.target.value
          )
        }
      >
        {options.map(
          ([value, label]) => (
            <option
              key={value}
              value={value}
            >
              {label}
            </option>
          )
        )}
      </select>
    </label>
  );
}

/* =========================================================
   NUMBER FIELD
========================================================= */

function NumberField({
  label,
  value,
  set,
}: {
  label: string;
  value: number | null;
  set: (
    value: number | null
  ) => void;
}) {
  return (
    <Field
      label={label}
      value={value}
      type="number"
      set={set}
    />
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

            <h2>Settings</h2>
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
            <span>Theme</span>
          </div>

          <div className="theme-grid">
            {themes.map(
              (item) => (
                <button
                  key={item.id}
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
                <b>Sharp</b>

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
              key={metric[0]}
            >
              <small>
                {metric[0]}
              </small>

              <b>
                {metric[1] ==
                null
                  ? "—"
                  : metric[1] +
                    metric[2]}
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
              (item) => (
                <div
                  className="activity"
                  key={item.id}
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
            item.ph ?? "—",
            item.ammonia ??
              "—",
            item.nitrite ??
              "—",
            item.nitrate ??
              "—",
            item.gh ?? "—",
            item.kh ?? "—",
            item.tds ?? "—",
            <Actions
              key={item.id}
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
            item.amount_changed_liters +
              " L",
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
              key={item.id}
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
                    value,
                    cellIndex
                  ) => (
                    <td
                      key={
                        cellIndex
                      }
                    >
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
    e: React.FormEvent
  ) => {
    e.preventDefault();

    const query = row
      ? supabase
          .from("tanks")
          .update(f)
          .eq("id", row.id)
      : supabase
          .from("tanks")
          .insert(f);

    const { error } =
      await query;

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
      <form
        onSubmit={save}
      >
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
                value={
                  f[key]
                }
                type="number"
                set={(value) =>
                  setF({
                    ...f,
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
          value={f.notes}
          set={(value) =>
            setF({
              ...f,
              notes: value,
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
  const initial = row
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
    useState<any>(
      initial
    );

  const save = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    const query = row
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
      await query;

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
      <form
        onSubmit={save}
      >
        <Field
          label="Measured at"
          value={new Date(
            f.measured_at
          )
            .toISOString()
            .slice(0, 16)}
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
                value={
                  f[key]
                }
                type="number"
                set={(value) =>
                  setF({
                    ...f,
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
          value={f.notes}
          set={(value) =>
            setF({
              ...f,
              notes: value,
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

    const query = row
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
      await query;

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
              .slice(0, 16)}
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
                value={
                  f[key]
                }
                type="number"
                set={(value) =>
                  setF({
                    ...f,
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

/* =========================================================
   EXPORT
========================================================= */

export default App;
