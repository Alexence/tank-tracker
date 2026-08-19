import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  Search,
  Droplets,
  Beaker,
  Fish,
  X,
  ChevronRight,
} from "lucide-react";
import { supabase } from "./lib/supabase";
import type { Tank, TankParameter, WaterChange } from "./types";
type Modal = "tank" | "parameter" | "change" | null;
type Tab = "overview" | "parameters" | "changes";
const num = (v: string) => (v === "" ? null : Number(v));
const iso = (v: string) => new Date(v).toISOString();
const fmt = (v: string) =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(v));
function App() {
  const [tanks, setTanks] = useState<Tank[]>([]),
  [params, setParams] = useState<TankParameter[]>([]),
  [changes, setChanges] = useState<WaterChange[]>([]),
  [selected, setSelected] = useState<string | null>(null),
  [tab, setTab] = useState<Tab>("overview"),
  [modal, setModal] = useState<Modal>(null),
  [edit, setEdit] = useState<any>(null),
  [query, setQuery] = useState(""),
  [loading, setLoading] = useState(true),
  [draggedTankId, setDraggedTankId] = useState<string | null>(null);
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
    if (t.error || p.error || c.error)
      alert((t.error || p.error || c.error)?.message);
    setTanks((t.data || []) as Tank[]);
    setParams((p.data || []) as TankParameter[]);
    setChanges((c.data || []) as WaterChange[]);
    setSelected((s) =>
      (t.data || []).some((x) => x.id === s) ? s : (t.data || [])[0]?.id || null
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
        .sort((a, b) => +new Date(b.measured_at) - +new Date(a.measured_at)),
    [params, selected]
  );
  const tc = useMemo(
    () =>
      changes
        .filter((x) => x.tank_id === selected)
        .sort((a, b) => +new Date(b.completed_at) - +new Date(a.completed_at)),
    [changes, selected]
  );
 const reorderTanks = async (fromIndex: number, toIndex: number) => {
  if (fromIndex === toIndex) return;

  const reordered = [...tanks];
  const [movedTank] = reordered.splice(fromIndex, 1);

  reordered.splice(toIndex, 0, movedTank);

  // Update the screen immediately
  setTanks(reordered);

  // Save the new order to Supabase
  const updates = reordered.map((tank, index) => ({
    id: tank.id,
    sort_order: index,
  }));

  const { error } = await supabase
    .from("tanks")
    .upsert(updates, { onConflict: "id" });

  if (error) {
    alert(`Could not save tank order: ${error.message}`);
    await load();
  }
};
  const del = async (table: string, id: string) => {
    if (!confirm("Delete this record?")) return;
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) alert(error.message);
    else load();
  };
  const open = (m: Modal, x: any = null) => {
    setEdit(x);
    setModal(m);
  };
  return (
    <div className="app">
      <header>
        <div className="brand">
          <span>🐟</span>
          <div>
            <b>Tank Tracker</b>
            <small>Aquarium control centre</small>
          </div>
        </div>
        <div className="actions">
          <button onClick={load} className="icon">
            <RefreshCw size={17} />
          </button>
          <button className="primary" onClick={() => open("tank")}>
            <Plus size={17} /> Add tank
          </button>
        </div>
      </header>
      <main>
        <aside>
          <div className="side-head">
            <div>
              <small>YOUR TANKS</small>
              <strong>{tanks.length}</strong>
            </div>
            <button className="icon" onClick={() => open("tank")}>
              <Plus size={16} />
            </button>
          </div>
          <div className="search">
            <Search size={15} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Find a tank..."
            />
          </div>
          {loading ? (
            <p className="muted">Loading…</p>
          ) : (
            tanks
              .filter((x) => x.name.toLowerCase().includes(query.toLowerCase()))
              .map((x) => (
                <button
  className={
    "tank " +
    (x.id === selected ? "sel " : "") +
    (draggedTankId === x.id ? "dragging" : "")
  }
  draggable
  onClick={() => {
    setSelected(x.id);
    setTab("overview");
  }}
  onDragStart={(e) => {
    setDraggedTankId(x.id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", x.id);
  }}
  onDragOver={(e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }}
  onDrop={(e) => {
    e.preventDefault();

    const draggedId = e.dataTransfer.getData("text/plain");

    const fromIndex = tanks.findIndex((tank) => tank.id === draggedId);
    const toIndex = tanks.findIndex((tank) => tank.id === x.id);

    if (fromIndex !== -1 && toIndex !== -1) {
      reorderTanks(fromIndex, toIndex);
    }

    setDraggedTankId(null);
  }}
  onDragEnd={() => setDraggedTankId(null)}
  key={x.id}
>
                  <span className="tankicon">
                    <Fish size={17} />
                  </span>
                  <span>
                    <b>{x.name}</b>
                    <small>{x.volume ? x.volume + " L" : "No volume"}</small>
                  </span>
                  <ChevronRight size={16} />
                </button>
              ))
          )}
        </aside>
        <section className="content">
          {!tank ? (
            <div className="empty">
              <div>🐠</div>
              <h1>Your aquarium dashboard starts here.</h1>
              <p>
                Create your first tank, then record water tests and water
                changes.
              </p>
              <button className="primary" onClick={() => open("tank")}>
                <Plus size={17} /> Add your first tank
              </button>
            </div>
          ) : (
            <>
              <div className="head">
                <div>
                  <small>AQUARIUM</small>
                  <h1>{tank.name}</h1>
                  <p>
                    {tank.volume ? `${tank.volume} L` : "Volume not set"}
                    {tank.notes ? " · " + tank.notes : ""}
                  </p>
                </div>
                <div>
                  <button
                    className="secondary"
                    onClick={() => open("tank", tank)}
                  >
                    <Pencil size={15} /> Edit
                  </button>
                  <button
                    className="danger"
                    onClick={() => del("tanks", tank.id)}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
              <div className="tabs">
                {(["overview", "parameters", "changes"] as Tab[]).map((x) => (
                  <button
                    className={tab === x ? "active" : ""}
                    onClick={() => setTab(x)}
                    key={x}
                  >
                    {x === "overview" ? "◉" : x === "parameters" ? "🧪" : "💧"}{" "}
                    {x}
                  </button>
                ))}
              </div>
              {tab === "overview" && (
                <Overview
                  p={tp[0]}
                  c={tc}
                  goP={() => setTab("parameters")}
                  goC={() => setTab("changes")}
                />
              )}{" "}
              {tab === "parameters" && (
                <Parameters
                  rows={tp}
                  add={() => open("parameter")}
                  edit={open}
                  del={del}
                />
              )}{" "}
              {tab === "changes" && (
                <Changes
                  rows={tc}
                  add={() => open("change")}
                  edit={open}
                  del={del}
                />
              )}
            </>
          )}
        </section>
      </main>
      {modal === "tank" && (
        <TankModal row={edit} close={() => setModal(null)} done={load} />
      )}{" "}
      {modal === "parameter" && tank && (
        <ParameterModal
          tank={tank.id}
          row={edit}
          close={() => setModal(null)}
          done={load}
        />
      )}{" "}
      {modal === "change" && tank && (
        <ChangeModal
          tank={tank.id}
          row={edit}
          close={() => setModal(null)}
          done={load}
        />
      )}
    </div>
  );
}
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
  const a: [string, any, string][] = [
    ["pH", p?.ph ?? null, ""],
    ["Temperature", p?.temperature ?? null, "°C"],
    ["Ammonia", p?.ammonia ?? null, " ppm"],
    ["Nitrite", p?.nitrite ?? null, " ppm"],
    ["Nitrate", p?.nitrate ?? null, " ppm"],
    ["GH", p?.gh ?? null, " dGH"],
    ["KH", p?.kh ?? null, " dKH"],
    ["TDS", p?.tds ?? null, " ppm"],
    ["Salinity", p?.salinity ?? null, ""],
  ];
  return (
    <>
      <div className="metrics">
        {a.map((x) => (
          <div className="metric" key={x[0]}>
            <small>{x[0]}</small>
            <b>{x[1] == null ? "—" : x[1] + x[2]}</b>
          </div>
        ))}
      </div>
      <div className="twocol">
        <div className="panel">
          <div className="panelhead">
            <div>
              <small>LATEST</small>
              <h3>Water parameters</h3>
            </div>
            <button onClick={goP}>View all</button>
          </div>
          <p className="muted">
            {p ? "Last tested " + fmt(p.measured_at) : "No parameter logs yet."}
          </p>
        </div>
        <div className="panel">
          <div className="panelhead">
            <div>
              <small>RECENT</small>
              <h3>Water changes</h3>
            </div>
            <button onClick={goC}>View all</button>
          </div>
          {c.slice(0, 3).map((x) => (
            <div className="activity" key={x.id}>
              <Droplets size={16} />
              <span>
                <b>{x.amount_changed_liters} L</b>
                <small>{fmt(x.completed_at)}</small>
              </span>
            </div>
          ))}
          {!c.length && <p className="muted">No water changes yet.</p>}
        </div>
      </div>
    </>
  );
}
function Parameters({
  rows,
  add,
  edit,
  del,
}: {
  rows: TankParameter[];
  add: () => void;
  edit: (m: Modal, x: any) => void;
  del: (t: string, id: string) => void;
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
        rows={rows.map((x) => [
          fmt(x.measured_at),
          x.temperature ?? "—",
          x.ph ?? "—",
          x.ammonia ?? "—",
          x.nitrite ?? "—",
          x.nitrate ?? "—",
          x.gh ?? "—",
          x.kh ?? "—",
          x.tds ?? "—",
          <Actions
            onEdit={() => edit("parameter", x)}
            onDelete={() => del("tank_parameters", x.id)}
          />,
        ])}
      />
    </div>
  );
}
function Changes({
  rows,
  add,
  edit,
  del,
}: {
  rows: WaterChange[];
  add: () => void;
  edit: (m: Modal, x: any) => void;
  del: (t: string, id: string) => void;
}) {
  return (
    <div className="panel full">
      <PanelTitle
        title={`${rows.length} water changes`}
        button="Add water change"
        onClick={add}
      />
      <Table
        heads={["Date", "Amount", "Temp", "pH", "GH", "KH", "TDS", "Notes", ""]}
        rows={rows.map((x) => [
          fmt(x.completed_at),
          x.amount_changed_liters + " L",
          x.added_water_temperature ?? "—",
          x.added_water_ph ?? "—",
          x.added_water_gh ?? "—",
          x.added_water_kh ?? "—",
          x.added_water_tds ?? "—",
          x.added_water_notes || "—",
          <Actions
            onEdit={() => edit("change", x)}
            onDelete={() => del("water_changes", x.id)}
          />,
        ])}
      />
    </div>
  );
}
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
      <button className="primary" onClick={onClick}>
        <Plus size={15} />
        {button}
      </button>
    </div>
  );
}
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
function Table({ heads, rows }: { heads: string[]; rows: any[][] }) {
  return (
    <div className="tablewrap">
      <table>
        <thead>
          <tr>
            {heads.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((x, j) => (
                <td key={j}>{x}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && <div className="muted center">No records yet.</div>}
    </div>
  );
}
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
        <button className="x" onClick={close}>
          <X size={18} />
        </button>
        <small>TANK TRACKER</small>
        <h2>{title}</h2>
        {children}
      </div>
    </div>
  );
}
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
          set(type === "number" ? num(e.target.value) : e.target.value)
        }
      />
    </label>
  );
}
function TankModal({
  row,
  close,
  done,
}: {
  row: Tank | null;
  close: () => void;
  done: () => Promise<void>;
}) {
  const [f, setF] = useState<any>(
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
  const save = async (e: any) => {
    e.preventDefault();
    const q = row
      ? supabase.from("tanks").update(f).eq("id", row.id)
      : supabase.from("tanks").insert(f);
    const { error } = await q;
    if (error) alert(error.message);
    else {
      close();
      done();
    }
  };
  return (
    <Modal title={row ? "Edit tank" : "Add tank"} close={close}>
      <form onSubmit={save}>
        <Field
          label="Tank name"
          value={f.name}
          set={(v) => setF({ ...f, name: v })}
        />
        <div className="formgrid">
          {[
            ["Volume (L)", "volume"],
            ["Height", "height"],
            ["Width", "width"],
            ["Depth", "depth"],
          ].map(([l, k]) => (
            <Field
              key={k}
              label={l}
              value={f[k]}
              type="number"
              set={(v) => setF({ ...f, [k]: v })}
            />
          ))}
        </div>
        <Field
          label="Notes"
          value={f.notes}
          set={(v) => setF({ ...f, notes: v })}
        />
        <Save close={close} />
      </form>
    </Modal>
  );
}
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
        measured_at: row.measured_at,
        temperature: row.temperature,
        ph: row.ph,
        ammonia: row.ammonia,
        nitrite: row.nitrite,
        nitrate: row.nitrate,
        gh: row.gh,
        kh: row.kh,
        tds: row.tds,
        salinity: row.salinity,
        notes: row.notes,
      }
    : {
        measured_at: new Date().toISOString(),
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
  const [f, setF] = useState<any>(d);
  const save = async (e: any) => {
    e.preventDefault();
    const q = row
      ? supabase.from("tank_parameters").update(f).eq("id", row.id)
      : supabase.from("tank_parameters").insert({ ...f, tank_id: tank });
    const { error } = await q;
    if (error) alert(error.message);
    else {
      close();
      done();
    }
  };
  return (
    <Modal title={row ? "Edit water test" : "Add water test"} close={close}>
      <form onSubmit={save}>
        <Field
          label="Measured at"
          value={new Date(f.measured_at).toISOString().slice(0, 16)}
          type="datetime-local"
          set={(v) => setF({ ...f, measured_at: iso(v) })}
        />
        <div className="formgrid three">
          {[
            ["Temperature °C", "temperature"],
            ["pH", "ph"],
            ["Ammonia", "ammonia"],
            ["Nitrite", "nitrite"],
            ["Nitrate", "nitrate"],
            ["GH", "gh"],
            ["KH", "kh"],
            ["TDS", "tds"],
            ["Salinity", "salinity"],
          ].map(([l, k]) => (
            <Field
              key={k}
              label={l}
              value={f[k]}
              type="number"
              set={(v) => setF({ ...f, [k]: v })}
            />
          ))}
        </div>
        <Field
          label="Notes"
          value={f.notes}
          set={(v) => setF({ ...f, notes: v })}
        />
        <Save close={close} />
      </form>
    </Modal>
  );
}
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
    completed_at: new Date().toISOString(),
    amount_changed_liters: 0,
    added_water_temperature: null,
    added_water_ph: null,
    added_water_ammonia: null,
    added_water_nitrite: null,
    added_water_nitrate: null,
    added_water_gh: null,
    added_water_kh: null,
    added_water_tds: null,
    added_water_salinity: null,
    added_water_notes: "",
  };
  const [f, setF] = useState<any>(row ? { ...row } : base);
  const save = async (e: any) => {
    e.preventDefault();
    const payload = { ...f };
    delete payload.id;
    delete payload.created_at;
    delete payload.tank_id;
    const q = row
      ? supabase.from("water_changes").update(payload).eq("id", row.id)
      : supabase.from("water_changes").insert({ ...payload, tank_id: tank });
    const { error } = await q;
    if (error) alert(error.message);
    else {
      close();
      done();
    }
  };
  return (
    <Modal title={row ? "Edit water change" : "Add water change"} close={close}>
      <form onSubmit={save}>
        <div className="formgrid">
          <Field
            label="Completed at"
            value={new Date(f.completed_at).toISOString().slice(0, 16)}
            type="datetime-local"
            set={(v) => setF({ ...f, completed_at: iso(v) })}
          />
          <Field
            label="Amount changed (L)"
            value={f.amount_changed_liters}
            type="number"
            set={(v) => setF({ ...f, amount_changed_liters: v })}
          />
        </div>
        <small className="section">ADDED WATER PARAMETERS</small>
        <div className="formgrid three">
          {[
            ["Temperature °C", "added_water_temperature"],
            ["pH", "added_water_ph"],
            ["Ammonia", "added_water_ammonia"],
            ["Nitrite", "added_water_nitrite"],
            ["Nitrate", "added_water_nitrate"],
            ["GH", "added_water_gh"],
            ["KH", "added_water_kh"],
            ["TDS", "added_water_tds"],
            ["Salinity", "added_water_salinity"],
          ].map(([l, k]) => (
            <Field
              key={k}
              label={l}
              value={f[k]}
              type="number"
              set={(v) => setF({ ...f, [k]: v })}
            />
          ))}
        </div>
        <Field
          label="Notes"
          value={f.added_water_notes}
          set={(v) => setF({ ...f, added_water_notes: v })}
        />
        <Save close={close} />
      </form>
    </Modal>
  );
}
function Save({ close }: { close: () => void }) {
  return (
    <div className="modalbuttons">
      <button type="button" className="secondary" onClick={close}>
        Cancel
      </button>
      <button className="primary">Save</button>
    </div>
  );
}
export default App;
