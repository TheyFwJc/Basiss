"use client";

import { useActionState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { saveJournalEntryAction, deleteJournalEntryAction } from "./actions";

export type JournalEntryDefaults = {
  marketOverview: string | null;
  tradingPlan: string | null;
  goals: string | null;
  mentalState: string | null;
  importantLevels: string | null;
  newsEvents: string | null;
  endOfDayReview: string | null;
  lessonsLearned: string | null;
};

const FIELDS: {
  key: keyof JournalEntryDefaults;
  label: string;
  section: "plan" | "review";
}[] = [
  { key: "tradingPlan", label: "Trading plan", section: "plan" },
  { key: "marketOverview", label: "Market overview", section: "plan" },
  { key: "importantLevels", label: "Important levels", section: "plan" },
  { key: "newsEvents", label: "News & events", section: "plan" },
  { key: "goals", label: "Goals for today", section: "plan" },
  { key: "mentalState", label: "Mental state", section: "plan" },
  { key: "endOfDayReview", label: "End-of-day review", section: "review" },
  { key: "lessonsLearned", label: "Lessons learned", section: "review" },
];

export function JournalForm({
  date,
  defaults,
  hasEntry,
}: {
  date: string;
  defaults: JournalEntryDefaults;
  hasEntry: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    saveJournalEntryAction.bind(null, date),
    null
  );
  const [deletePending, startDeleteTransition] = useTransition();

  return (
    <form action={formAction} className="flex flex-col gap-6 pb-16">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Before the session</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {FIELDS.filter((f) => f.section === "plan").map((field) => (
            <div key={field.key} className="flex flex-col gap-2">
              <Label htmlFor={field.key}>{field.label}</Label>
              <Textarea
                id={field.key}
                name={field.key}
                rows={3}
                defaultValue={defaults[field.key] ?? ""}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">After the session</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {FIELDS.filter((f) => f.section === "review").map((field) => (
            <div key={field.key} className="flex flex-col gap-2">
              <Label htmlFor={field.key}>{field.label}</Label>
              <Textarea
                id={field.key}
                name={field.key}
                rows={3}
                defaultValue={defaults[field.key] ?? ""}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {state?.error && <p className="text-sm text-loss">{state.error}</p>}
      {state?.message && <p className="text-sm text-profit">{state.message}</p>}

      <div className="flex items-center justify-between">
        <div>
          {hasEntry && (
            <AlertDialog>
              <AlertDialogTrigger
                nativeButton={true}
                render={
                  <Button type="button" variant="outline" size="sm">
                    <Trash2 className="size-4" />
                    Delete entry
                  </Button>
                }
              />
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this journal entry?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    disabled={deletePending}
                    onClick={() =>
                      startDeleteTransition(() => deleteJournalEntryAction(date))
                    }
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save entry"}
        </Button>
      </div>
    </form>
  );
}
