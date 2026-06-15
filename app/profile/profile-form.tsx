"use client";

import { useState } from "react";
import type { ProfileRecord } from "@/lib/types";

type SaveState = "idle" | "saving" | "saved" | "error";

const INPUT_CLASS =
  "mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600";

export function ProfileForm({ initial }: { initial: ProfileRecord }) {
  const [profile, setProfile] = useState<ProfileRecord>(initial);
  const [state, setState] = useState<SaveState>("idle");
  const [message, setMessage] = useState("");

  function update(field: keyof ProfileRecord, value: string) {
    setProfile((prev) => ({ ...prev, [field]: value }));
  }

  async function save() {
    setState("saving");
    setMessage("");
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      const data = (await res.json()) as { embeddings?: boolean; error?: string };
      if (res.ok) {
        setState("saved");
        setMessage(
          data.embeddings
            ? "Saved and embedded for semantic recall."
            : "Saved. (Add VOYAGE_API_KEY to enable semantic recall; full-text recall is active.)",
        );
      } else {
        setState("error");
        setMessage(data.error ?? "Could not save.");
      }
    } catch {
      setState("error");
      setMessage("Could not save.");
    }
  }

  return (
    <div className="mt-6 space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name">
          <input
            className={INPUT_CLASS}
            value={profile.full_name}
            onChange={(e) => update("full_name", e.target.value)}
          />
        </Field>
        <Field label="Email">
          <input
            className={INPUT_CLASS}
            value={profile.email}
            onChange={(e) => update("email", e.target.value)}
          />
        </Field>
        <Field label="Phone">
          <input
            className={INPUT_CLASS}
            value={profile.phone}
            onChange={(e) => update("phone", e.target.value)}
          />
        </Field>
        <Field label="Location">
          <input
            className={INPUT_CLASS}
            value={profile.location}
            onChange={(e) => update("location", e.target.value)}
          />
        </Field>
        <Field label="Links (GitHub, portfolio, LinkedIn)" full>
          <input
            className={INPUT_CLASS}
            value={profile.links}
            onChange={(e) => update("links", e.target.value)}
          />
        </Field>
      </div>

      <Field label="Headline">
        <input
          className={INPUT_CLASS}
          value={profile.headline}
          onChange={(e) => update("headline", e.target.value)}
          placeholder="CS student building AI agents and full-stack web apps"
        />
      </Field>

      <Field label="Summary">
        <textarea
          rows={3}
          className={INPUT_CLASS}
          value={profile.summary}
          onChange={(e) => update("summary", e.target.value)}
        />
      </Field>

      <Field label="Work experience">
        <textarea
          rows={5}
          className={INPUT_CLASS}
          value={profile.work_experience}
          onChange={(e) => update("work_experience", e.target.value)}
        />
      </Field>

      <Field label="Education">
        <textarea
          rows={3}
          className={INPUT_CLASS}
          value={profile.education}
          onChange={(e) => update("education", e.target.value)}
        />
      </Field>

      <Field label="Skills">
        <textarea
          rows={3}
          className={INPUT_CLASS}
          value={profile.skills}
          onChange={(e) => update("skills", e.target.value)}
        />
      </Field>

      <Field label="Projects">
        <textarea
          rows={4}
          className={INPUT_CLASS}
          value={profile.projects}
          onChange={(e) => update("projects", e.target.value)}
        />
      </Field>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={state === "saving"}
          className="rounded-md bg-teal-700 px-5 py-2.5 font-medium text-white transition hover:bg-teal-800 disabled:opacity-60"
        >
          {state === "saving" ? "Saving..." : "Save profile"}
        </button>
        {message && (
          <span
            className={`text-sm ${state === "error" ? "text-red-600" : "text-emerald-600"}`}
          >
            {message}
          </span>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  full,
}: {
  label: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <label className={`block ${full ? "sm:col-span-2" : ""}`}>
      <span className="text-sm font-medium text-stone-700">{label}</span>
      {children}
    </label>
  );
}
