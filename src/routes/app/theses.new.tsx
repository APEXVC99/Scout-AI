import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";

import {
  createThesis,
  updateThesis,
  getThesisById,
  type ThesisData,
} from "./-thesis-actions";

export const Route = createFileRoute("/app/theses/new")({
  validateSearch: (search: Record<string, unknown>) => {
    return { edit: typeof search.edit === "string" ? search.edit : undefined };
  },
  component: ThesisFormPage,
});

const STAGE_OPTIONS = ["pre-seed", "seed", "series-a", "series-b", "growth"] as const;
const GEO_OPTIONS = ["US", "Europe", "Asia", "LATAM", "Africa", "Global"] as const;

function ThesisFormPage() {
  const navigate = useNavigate();
  const { edit: editId } = Route.useSearch();
  const isEditing = !!editId;

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(!!editId);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sectorsInput, setSectorsInput] = useState("");
  const [stages, setStages] = useState<string[]>([]);
  const [geoFocus, setGeoFocus] = useState<string[]>([]);
  const [checkSize, setCheckSize] = useState("");
  const [isActive, setIsActive] = useState(true);

  // Load existing thesis for editing
  useEffect(() => {
    if (!editId) return;
    setFetching(true);
    getThesisById({ data: { id: editId } })
      .then((thesis) => {
        if (thesis) {
          setName(thesis.name);
          setDescription(thesis.description ?? "");
          setSectorsInput((thesis.sectors ?? []).join(", "));
          setStages(thesis.stages ?? []);
          setGeoFocus(thesis.geo_focus ?? []);
          setCheckSize(thesis.check_size ?? "");
          setIsActive(thesis.is_active);
        } else {
          setError("Thesis not found");
        }
      })
      .catch((err: unknown) => {
        setError((err as { message?: string })?.message ?? "Failed to load thesis");
      })
      .finally(() => setFetching(false));
  }, [editId]);

  const toggleStage = (stage: string) => {
    setStages((prev) =>
      prev.includes(stage) ? prev.filter((s) => s !== stage) : [...prev, stage]
    );
  };

  const toggleGeo = (geo: string) => {
    setGeoFocus((prev) =>
      prev.includes(geo) ? prev.filter((g) => g !== geo) : [...prev, geo]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    setLoading(true);
    setError(null);

    const sectors = sectorsInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const data: ThesisData = {
      name: name.trim(),
      description: description.trim() || undefined,
      sectors,
      stages,
      geo_focus: geoFocus,
      check_size: checkSize.trim() || undefined,
      is_active: isActive,
    };

    try {
      if (isEditing && editId) {
        await updateThesis({ data: { id: editId, ...data } });
      } else {
        await createThesis({ data });
      }
      navigate({ to: "/app/theses" });
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message ?? "Save failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
          {isEditing ? "Edit Thesis" : "New Thesis"}
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {isEditing
            ? "Update your investment thesis criteria"
            : "Define what you're looking to invest in"}
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900"
      >
        {/* Name */}
        <div className="mb-5">
          <label
            htmlFor="name"
            className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Thesis Name <span className="text-red-500">*</span>
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder='e.g. "AI Infrastructure", "Climate Deep Tech"'
            required
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500 dark:focus:border-indigo-400"
          />
        </div>

        {/* Description */}
        <div className="mb-5">
          <label
            htmlFor="description"
            className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Description
          </label>
          <textarea
            id="description"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe your investment thesis in detail — what makes a company interesting to you?"
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500 dark:focus:border-indigo-400"
          />
        </div>

        {/* Sectors */}
        <div className="mb-5">
          <label
            htmlFor="sectors"
            className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Sectors
          </label>
          <input
            id="sectors"
            type="text"
            value={sectorsInput}
            onChange={(e) => setSectorsInput(e.target.value)}
            placeholder="e.g. ai-ml, climate-tech, fintech, infrastructure"
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500 dark:focus:border-indigo-400"
          />
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
            Comma-separated tags
          </p>
        </div>

        {/* Stages — toggle buttons */}
        <div className="mb-5">
          <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Stages
          </span>
          <div className="flex flex-wrap gap-2">
            {STAGE_OPTIONS.map((stage) => (
              <button
                key={stage}
                type="button"
                onClick={() => toggleStage(stage)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  stages.includes(stage)
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
                }`}
              >
                {stage}
              </button>
            ))}
          </div>
        </div>

        {/* Geo Focus — toggle buttons */}
        <div className="mb-5">
          <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Geographic Focus
          </span>
          <div className="flex flex-wrap gap-2">
            {GEO_OPTIONS.map((geo) => (
              <button
                key={geo}
                type="button"
                onClick={() => toggleGeo(geo)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  geoFocus.includes(geo)
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
                }`}
              >
                {geo}
              </button>
            ))}
          </div>
        </div>

        {/* Check Size */}
        <div className="mb-5">
          <label
            htmlFor="checkSize"
            className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Check Size
          </label>
          <input
            id="checkSize"
            type="text"
            value={checkSize}
            onChange={(e) => setCheckSize(e.target.value)}
            placeholder='e.g. "$500K–$2M", "$1M–$5M"'
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500 dark:focus:border-indigo-400"
          />
        </div>

        {/* Active toggle */}
        <div className="mb-6 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsActive(!isActive)}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
              isActive ? "bg-indigo-600" : "bg-gray-300 dark:bg-gray-600"
            }`}
            role="switch"
            aria-checked={isActive}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
                isActive ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
          <span className="text-sm text-gray-700 dark:text-gray-300">
            {isActive ? "Active" : "Inactive"}
          </span>
        </div>

        {/* Submit */}
        <div className="flex items-center gap-3 border-t border-gray-100 pt-5 dark:border-gray-800">
          <button
            type="submit"
            disabled={loading}
            className="btn-gradient inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold disabled:opacity-50"
          >
            {loading ? (
              <>
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                {isEditing ? "Saving…" : "Creating…"}
              </>
            ) : isEditing ? (
              "Save Changes"
            ) : (
              "Create Thesis"
            )}
          </button>
          <button
            type="button"
            onClick={() => navigate({ to: "/app/theses" })}
            className="rounded-xl px-5 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
