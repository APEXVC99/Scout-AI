import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { getTheses, deleteThesis, type Thesis } from "./-thesis-actions";

export const Route = createFileRoute("/app/theses")({
  loader: async () => {
    try {
      const theses = await getTheses();
      return { theses, error: null };
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message ?? "Failed to load theses";
      return { theses: [] as Thesis[], error: msg };
    }
  },
  component: ThesesPage,
});

const STAGE_COLORS: Record<string, string> = {
  "pre-seed": "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  "seed": "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  "series-a": "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  "series-b": "bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
  "growth": "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
};

const SECTOR_PALETTE = [
  "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300",
  "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
  "bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
  "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-950 dark:text-fuchsia-300",
  "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
];

function sectorColor(sector: string): string {
  let hash = 0;
  for (let i = 0; i < sector.length; i++) {
    hash = (hash * 31 + sector.charCodeAt(i)) >>> 0;
  }
  return SECTOR_PALETTE[hash % SECTOR_PALETTE.length];
}

function ThesesPage() {
  const { theses: initialTheses, error } = Route.useLoaderData();
  const [theses, setTheses] = useState<Thesis[]>(initialTheses);
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this thesis? This cannot be undone.")) return;
    setDeleting(id);
    try {
      await deleteThesis({ data: { id } });
      setTheses((prev) => prev.filter((t) => t.id !== id));
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message ?? "Delete failed";
      alert(msg);
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div>
      {/* Page Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            Investment Theses
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Define what you're looking to invest in
          </p>
        </div>
        <Link
          to="/app/theses/new"
          className="btn-gradient inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold"
        >
          <PlusIcon />
          Create Thesis
        </Link>
      </div>

      {/* Error State */}
      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Empty State */}
      {!error && theses.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white p-16 text-center dark:border-gray-700 dark:bg-gray-900">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-950">
            <svg
              className="h-8 w-8 text-indigo-500"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
              />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            No theses yet
          </h2>
          <p className="mt-2 max-w-md text-sm text-gray-500 dark:text-gray-400">
            Create your first investment thesis to start sourcing deals.
          </p>
        </div>
      )}

      {/* Thesis Cards */}
      {theses.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {theses.map((thesis) => (
            <div
              key={thesis.id}
              className="card-lift group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900"
            >
              {/* gradient top accent */}
              <div
                className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${
                  thesis.is_active
                    ? "from-indigo-500 via-violet-500 to-fuchsia-500"
                    : "from-gray-300 to-gray-400 dark:from-gray-700 dark:to-gray-600"
                }`}
              />
              {/* Status dot */}
              <div className="mb-3 flex items-center gap-2">
                <span
                  className={`inline-block h-2 w-2 rounded-full ${
                    thesis.is_active
                      ? "bg-emerald-500"
                      : "bg-gray-400 dark:bg-gray-600"
                  }`}
                />
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {thesis.is_active ? "Active" : "Inactive"}
                </span>
              </div>

              {/* Name */}
              <h3 className="mb-1 text-base font-semibold text-gray-900 dark:text-white">
                {thesis.name}
              </h3>

              {/* Description snippet */}
              {thesis.description && (
                <p className="mb-3 line-clamp-2 text-sm text-gray-500 dark:text-gray-400">
                  {thesis.description}
                </p>
              )}

              {/* Sector Tags */}
              {thesis.sectors && thesis.sectors.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {thesis.sectors.map((s) => (
                    <span
                      key={s}
                      className={`inline-block rounded-md px-2 py-0.5 text-xs font-semibold ${sectorColor(s)}`}
                    >
                      {s}
                    </span>
                  ))}
                </div>
              )}

              {/* Stage Tags */}
              {thesis.stages && thesis.stages.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {thesis.stages.map((s) => (
                    <span
                      key={s}
                      className={`inline-block rounded-md px-2 py-0.5 text-xs font-semibold ${
                        STAGE_COLORS[s.toLowerCase()] ??
                        "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                      }`}
                    >
                      {s}
                    </span>
                  ))}
                </div>
              )}

              {/* Geo focus */}
              {thesis.geo_focus && thesis.geo_focus.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {thesis.geo_focus.map((g) => (
                    <span
                      key={g}
                      className="inline-block rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
                    >
                      {g}
                    </span>
                  ))}
                </div>
              )}

              {/* Check size */}
              {thesis.check_size && (
                <p className="mb-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Check: {thesis.check_size}
                </p>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 border-t border-gray-100 pt-3 dark:border-gray-800">
                <Link
                  to="/app/theses/new"
                  search={{ edit: thesis.id }}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
                >
                  Edit
                </Link>
                <button
                  type="button"
                  onClick={() => handleDelete(thesis.id)}
                  disabled={deleting === thesis.id}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950 dark:hover:text-red-300 disabled:opacity-50"
                >
                  {deleting === thesis.id ? "Deleting…" : "Delete"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PlusIcon() {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}
