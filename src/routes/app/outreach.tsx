import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  getAllOutreach,
  updateOutreachStatusFn,
  updateOutreachFn,
  deleteOutreachFn,
  type OutreachCampaign,
} from "./-outreach-actions";

export const Route = createFileRoute("/app/outreach")({
  loader: async () => {
    try {
      const result = await getAllOutreach();
      return { campaigns: result.campaigns };
    } catch {
      return { campaigns: [] as OutreachCampaign[] };
    }
  },
  component: OutreachPage,
});

const FILTER_TABS = [
  { value: "", label: "All" },
  { value: "draft", label: "Drafts" },
  { value: "approved", label: "Approved" },
  { value: "sent", label: "Sent" },
] as const;

function statusBadgeClass(status: string): string {
  switch (status) {
    case "draft":
      return "bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300";
    case "approved":
      return "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300";
    case "sent":
      return "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300";
    default:
      return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
  }
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function OutreachPage() {
  const { campaigns: initialCampaigns } = Route.useLoaderData();
  const [campaigns, setCampaigns] = useState<OutreachCampaign[]>(initialCampaigns);
  const [activeFilter, setActiveFilter] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSubject, setEditSubject] = useState("");
  const [editBody, setEditBody] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filteredCampaigns = activeFilter
    ? campaigns.filter((c) => c.status === activeFilter)
    : campaigns;

  const handleStatusChange = async (id: string, newStatus: string) => {
    setUpdating(id);
    setError(null);
    try {
      await updateOutreachStatusFn({ data: { id, status: newStatus } });
      setCampaigns((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status: newStatus } : c)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setUpdating(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this outreach draft?")) return;
    setUpdating(id);
    setError(null);
    try {
      await deleteOutreachFn({ data: { id } });
      setCampaigns((prev) => prev.filter((c) => c.id !== id));
      if (expandedId === id) setExpandedId(null);
      if (editingId === id) setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setUpdating(null);
    }
  };

  const startEditing = (campaign: OutreachCampaign) => {
    setEditingId(campaign.id);
    setEditSubject(campaign.subject || "");
    setEditBody(campaign.body || "");
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditSubject("");
    setEditBody("");
  };

  const saveEditing = async (id: string) => {
    setUpdating(id);
    setError(null);
    try {
      await updateOutreachFn({ data: { id, subject: editSubject, body: editBody } });
      setCampaigns((prev) =>
        prev.map((c) =>
          c.id === id ? { ...c, subject: editSubject, body: editBody } : c,
        ),
      );
      setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setUpdating(null);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  // Re-fetch with filters
  const handleFilterChange = async (status: string) => {
    setActiveFilter(status);
    setError(null);
    try {
      const result = await getAllOutreach({
        data: { status: status || undefined },
      });
      setCampaigns(result.campaigns);
    } catch {
      // Keep current campaigns on error
    }
  };

  return (
    <div>
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
          Outreach
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          AI-generated personalized emails to founders — review, edit, and approve before sending
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-2 font-medium underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {initialCampaigns.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white p-16 text-center dark:border-gray-700 dark:bg-gray-900">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-950">
            <SendIcon />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            No Outreach Yet
          </h2>
          <p className="mt-2 max-w-md text-sm text-gray-500 dark:text-gray-400">
            Generate an email from a high-match company. Go to Matches or Memos and click "Generate Outreach."
          </p>
        </div>
      ) : (
        <>
          {/* Filter Tabs */}
          <div className="mb-6 flex flex-wrap gap-2">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => handleFilterChange(tab.value)}
                className={`inline-flex items-center rounded-lg px-4 py-2 text-sm font-medium transition ${
                  activeFilter === tab.value
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Campaign List */}
          <div className="space-y-4">
            {filteredCampaigns.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center dark:border-gray-700 dark:bg-gray-900">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No campaigns in this category.
                </p>
              </div>
            ) : (
              filteredCampaigns.map((campaign) => (
                <div
                  key={campaign.id}
                  className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
                >
                  {/* Campaign Header Row */}
                  <div
                    className="flex cursor-pointer items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    onClick={() => toggleExpand(campaign.id)}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {campaign.companyName || "Unknown Company"}
                        </span>
                        <span
                          className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${statusBadgeClass(campaign.status)}`}
                        >
                          {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-sm text-gray-500 dark:text-gray-400">
                        {campaign.subject || "No subject"}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-gray-400 dark:text-gray-500">
                      {formatDate(campaign.createdAt)}
                    </span>
                    <svg
                      className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${
                        expandedId === campaign.id ? "rotate-180" : ""
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                      />
                    </svg>
                  </div>

                  {/* Expanded View */}
                  {expandedId === campaign.id && (
                    <div className="border-t border-gray-200 px-4 py-4 dark:border-gray-800">
                      {editingId === campaign.id ? (
                        /* Edit Mode */
                        <div className="space-y-4">
                          <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                              Subject
                            </label>
                            <input
                              type="text"
                              value={editSubject}
                              onChange={(e) => setEditSubject(e.target.value)}
                              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                              maxLength={500}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                              Body
                            </label>
                            <textarea
                              value={editBody}
                              onChange={(e) => setEditBody(e.target.value)}
                              rows={8}
                              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                            />
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => saveEditing(campaign.id)}
                              disabled={updating === campaign.id}
                              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50"
                            >
                              {updating === campaign.id ? "Saving..." : "Save"}
                            </button>
                            <button
                              onClick={cancelEditing}
                              className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* Display Mode */
                        <>
                          <div className="mb-3">
                            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                              Subject
                            </p>
                            <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                              {campaign.subject || "No subject"}
                            </p>
                          </div>
                          <div className="mb-4">
                            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                              Body
                            </p>
                            <div className="mt-1 whitespace-pre-wrap rounded-lg bg-gray-50 p-4 text-sm text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                              {campaign.body || "No body"}
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex flex-wrap items-center gap-2">
                            {campaign.status === "draft" && (
                              <>
                                <button
                                  onClick={() => startEditing(campaign)}
                                  className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleStatusChange(campaign.id, "approved")}
                                  disabled={updating === campaign.id}
                                  className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700 disabled:opacity-50"
                                >
                                  {updating === campaign.id ? "..." : "Approve"}
                                </button>
                              </>
                            )}
                            {campaign.status === "approved" && (
                              <button
                                onClick={() => handleStatusChange(campaign.id, "sent")}
                                disabled={updating === campaign.id}
                                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50"
                              >
                                {updating === campaign.id ? "..." : "Mark as Sent"}
                              </button>
                            )}
                            {campaign.status !== "sent" && (
                              <button
                                onClick={() => handleDelete(campaign.id)}
                                disabled={updating === campaign.id}
                                className="rounded-lg bg-red-50 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-100 dark:bg-red-950 dark:text-red-400 dark:hover:bg-red-900"
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {filteredCampaigns.length > 0 && (
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
              Showing {filteredCampaigns.length} campaign
              {filteredCampaigns.length === 1 ? "" : "s"}
            </p>
          )}
        </>
      )}
    </div>
  );
}

/* ── Icons ──────────────────────────────────────────────────────── */

function SendIcon() {
  return (
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
        d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
      />
    </svg>
  );
}
