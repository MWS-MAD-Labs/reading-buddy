"use client";

import { useState, useTransition } from "react";
import { createBroadcast, setBroadcastActive } from "@/app/(dashboard)/dashboard/admin/broadcasts/actions";
import type { LoginBroadcast } from "@/lib/broadcasts";
import { cn } from "@/lib/cn";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from "@/components/ui";

type BroadcastRow = LoginBroadcast & { isActive?: boolean };

const toneLabels: Record<LoginBroadcast["tone"], string> = {
  info: "Info",
  success: "Success",
  warning: "Warning",
  alert: "Alert",
};

const toneBadgeStyles: Record<LoginBroadcast["tone"], string> = {
  info: "bg-blue-100 text-blue-800 border-blue-200",
  success: "bg-emerald-100 text-emerald-800 border-emerald-200",
  warning: "bg-amber-100 text-amber-800 border-amber-200",
  alert: "bg-rose-100 text-rose-800 border-rose-200",
};

export function BroadcastManager({ broadcasts }: { broadcasts: BroadcastRow[] }) {
  const [rows, setRows] = useState<BroadcastRow[]>(broadcasts ?? []);
  const [form, setForm] = useState<{
    title: string;
    body: string;
    tone: LoginBroadcast["tone"];
    linkLabel: string;
    linkUrl: string;
    isActive: boolean;
  }>({
    title: "",
    body: "",
    tone: "info",
    linkLabel: "",
    linkUrl: "",
    isActive: true,
  });
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();

  const handleCreate = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);

    startSaving(async () => {
      const result = await createBroadcast({
        title: form.title.trim(),
        body: form.body.trim(),
        tone: form.tone,
        linkLabel: form.linkLabel.trim() || undefined,
        linkUrl: form.linkUrl.trim() || undefined,
        isActive: form.isActive,
      });

      if (!result.success || !result.broadcast) {
        setFeedback({
          type: "error",
          message: result.error ?? "Unable to save broadcast.",
        });
        return;
      }

      setRows((prev) => [result.broadcast, ...prev]);
      setForm({
        title: "",
        body: "",
        tone: "info",
        linkLabel: "",
        linkUrl: "",
        isActive: true,
      });
      setFeedback({ type: "success", message: "Broadcast published." });
    });
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    setPendingId(id);
    setFeedback(null);
    const result = await setBroadcastActive(id, isActive);
    if (!result.success || !result.broadcast) {
      setFeedback({
        type: "error",
        message: result.error ?? "Unable to update broadcast.",
      });
      setPendingId(null);
      return;
    }
    setRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, isActive } : row)),
    );
    setPendingId(null);
  };

  return (
    <div className="space-y-6">
      <Card variant="frosted" padding="cozy" className="border-4 border-white/70">
        <CardHeader>
          <Badge variant="neutral" className="text-[11px]">Compose</Badge>
          <CardTitle className="text-2xl">Publish a login message</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {feedback ? (
            <Alert variant={feedback.type === "success" ? "success" : "error"}>
              {feedback.message}
            </Alert>
          ) : null}
          <form className="grid gap-4 md:grid-cols-2" onSubmit={handleCreate}>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  name="title"
                  required
                  maxLength={80}
                  value={form.title}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, title: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="body">Message</Label>
                <textarea
                  id="body"
                  name="body"
                  required
                  rows={5}
                  maxLength={500}
                  className="w-full rounded-2xl border-4 border-purple-200 bg-white/90 px-4 py-3 text-base font-semibold text-indigo-950 shadow-inner transition focus-visible:border-purple-400 focus-visible:ring-2 focus-visible:ring-purple-200 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                  value={form.body}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, body: event.target.value }))
                  }
                  placeholder="Share a short changelog, outage notice, or reminder."
                />
              </div>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="tone">Tone</Label>
                  <select
                    id="tone"
                    name="tone"
                    className="w-full rounded-2xl border-4 border-purple-200 bg-white/90 px-4 py-3 text-base font-semibold text-indigo-950 shadow-inner transition focus-visible:border-purple-400 focus-visible:ring-2 focus-visible:ring-purple-200 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                    value={form.tone}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        tone: event.target.value as LoginBroadcast["tone"],
                      }))
                    }
                  >
                    {Object.entries(toneLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="isActive">Status</Label>
                  <div className="flex items-center gap-2 rounded-2xl border-4 border-purple-200 bg-white/90 px-4 py-3 text-sm font-semibold text-indigo-900 shadow-inner">
                    <input
                      id="isActive"
                      name="isActive"
                      type="checkbox"
                      className="h-5 w-5 accent-purple-600"
                      checked={form.isActive}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          isActive: event.target.checked,
                        }))
                      }
                    />
                    <span>{form.isActive ? "Active on login" : "Saved as inactive"}</span>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="linkLabel">Optional link label</Label>
                <Input
                  id="linkLabel"
                  name="linkLabel"
                  maxLength={50}
                  value={form.linkLabel}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, linkLabel: event.target.value }))
                  }
                  placeholder="View release notes"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="linkUrl">Optional link URL</Label>
                <Input
                  id="linkUrl"
                  name="linkUrl"
                  type="url"
                  value={form.linkUrl}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, linkUrl: event.target.value }))
                  }
                  placeholder="https://example.com/changelog"
                />
              </div>
              <Button
                type="submit"
                loading={isSaving}
                size="md"
                icon="✦"
                className="w-full"
              >
                Publish message
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card variant="glow" padding="cozy" className="border-4 border-white/70">
        <CardHeader className="flex items-center justify-between">
          <div>
            <Badge variant="neutral" className="text-[11px]">History</Badge>
            <CardTitle className="text-2xl">Recent broadcasts</CardTitle>
          </div>
          <span className="text-sm font-semibold text-indigo-600">
            {rows.length} saved
          </span>
        </CardHeader>
        <CardContent className="space-y-3">
          {rows.length === 0 ? (
            <Alert variant="info">No messages yet. Create your first broadcast above.</Alert>
          ) : (
            rows.map((row) => (
              <div
                key={row.id}
                className="rounded-2xl border-2 border-indigo-100 bg-white/90 p-4 shadow-sm"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-black uppercase tracking-wide",
                          toneBadgeStyles[row.tone] ?? toneBadgeStyles.info,
                        )}
                      >
                        {toneLabels[row.tone] ?? "Info"}
                      </span>
                      <Badge
                        variant={row.isActive ? "lime" : "neutral"}
                        size="sm"
                        className="rounded-full"
                      >
                        {row.isActive ? "Active" : "Inactive"}
                      </Badge>
                      {row.createdAt ? (
                        <span className="text-xs font-semibold text-indigo-500">
                          {new Date(row.createdAt).toLocaleString()}
                        </span>
                      ) : null}
                    </div>
                    <h3 className="text-lg font-black text-indigo-900">{row.title}</h3>
                    <p className="text-sm font-semibold text-indigo-700 whitespace-pre-wrap">
                      {row.body}
                    </p>
                    {row.linkUrl ? (
                      <a
                        href={row.linkUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 text-sm font-bold text-indigo-700 underline-offset-4 hover:underline"
                      >
                        {row.linkLabel || "Open link"}
                      </a>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2 self-start">
                    <Button
                      type="button"
                      variant={row.isActive ? "outline" : "secondary"}
                      size="sm"
                      loading={pendingId === row.id}
                      onClick={() => toggleActive(row.id, !row.isActive)}
                    >
                      {row.isActive ? "Deactivate" : "Activate"}
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
