"use client";

import { useState } from "react";
import { format, parseISO, addDays, isPast, isToday } from "date-fns";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface DueDatePickerProps {
  value?: string;
  onChange: (next: string | undefined) => void;
}

const REFERENCE_DATE = new Date("2026-04-29");

export function DueDatePicker({ value, onChange }: DueDatePickerProps) {
  const [open, setOpen] = useState(false);
  const date = value ? parseISO(value) : undefined;
  const overdue = date && isPast(date) && !isToday(date);
  const today = date && isToday(date);

  const setDate = (d: Date | undefined) => {
    if (d) onChange(format(d, "yyyy-MM-dd"));
    else onChange(undefined);
    setOpen(false);
  };

  const quickPicks = [
    { label: "Today", date: REFERENCE_DATE },
    { label: "Tomorrow", date: addDays(REFERENCE_DATE, 1) },
    { label: "In 3 days", date: addDays(REFERENCE_DATE, 3) },
    { label: "Next week", date: addDays(REFERENCE_DATE, 7) },
  ];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "flex w-full items-center gap-2 rounded-md border border-transparent px-2 py-1.5 transition-colors hover:border-border hover:bg-accent text-left",
          )}
        >
          <CalendarIcon
            className={cn(
              "size-3.5",
              overdue
                ? "text-status-blocked"
                : today
                  ? "text-status-revisions"
                  : "text-muted-foreground",
            )}
          />
          {date ? (
            <span
              className={cn(
                "text-xs",
                overdue
                  ? "font-semibold text-status-blocked"
                  : today
                    ? "font-semibold text-status-revisions"
                    : "text-foreground",
              )}
            >
              {format(date, "EEE, MMM d, yyyy")}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">Set due date</span>
          )}
          {date ? (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onChange(undefined);
              }}
              className="ml-auto rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
              aria-label="Clear due date"
            >
              <X className="size-3" />
            </span>
          ) : null}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="border-b p-2">
          <div className="grid grid-cols-2 gap-1">
            {quickPicks.map((q) => (
              <button
                key={q.label}
                onClick={() => setDate(q.date)}
                className="rounded-md border bg-card px-2 py-1.5 text-left text-xs transition-colors hover:bg-accent"
              >
                <p className="font-medium">{q.label}</p>
                <p className="text-[10px] text-muted-foreground">
                  {format(q.date, "MMM d")}
                </p>
              </button>
            ))}
          </div>
        </div>
        <div className="p-2">
          <DayPicker
            mode="single"
            selected={date}
            onSelect={setDate}
            defaultMonth={date ?? REFERENCE_DATE}
            weekStartsOn={1}
            classNames={{
              months: "flex flex-col gap-2",
              month: "space-y-2",
              caption: "flex items-center justify-between px-1",
              caption_label: "text-sm font-semibold",
              nav: "flex items-center gap-1",
              nav_button:
                "size-7 rounded-md hover:bg-accent grid place-items-center text-muted-foreground",
              nav_button_previous: "",
              nav_button_next: "",
              table: "w-full border-collapse",
              head_row: "flex",
              head_cell:
                "size-8 text-[10px] font-medium uppercase tracking-wider text-muted-foreground grid place-items-center",
              row: "flex",
              cell: "size-8 grid place-items-center",
              day: "size-7 rounded-md text-xs hover:bg-accent transition-colors",
              day_selected:
                "bg-primary text-primary-foreground hover:bg-primary/90",
              day_today: "ring-1 ring-primary/40 font-semibold",
              day_outside: "text-muted-foreground/40",
              day_disabled: "opacity-30",
            }}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
