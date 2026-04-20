"use client";

import type { ReactNode } from "react";
import { IconPencil, IconTrash } from "@/components/proplio-icons";

type EntityColumn<T> = {
  key: keyof T | string;
  label: string;
  render?: (row: T) => ReactNode;
};

type EntityTableProps<T extends { id: string }> = {
  columns: EntityColumn<T>[];
  rows: T[];
  emptyMessage: string;
  onEdit: (row: T) => void;
  onDelete: (id: string) => void;
  isDeleting?: boolean;
  statusRenderer?: (row: T) => ReactNode;
  actionsRenderer?: (row: T) => ReactNode;
};

export function EntityTable<T extends { id: string }>({
  columns,
  rows,
  emptyMessage,
  onEdit,
  onDelete,
  isDeleting = false,
  statusRenderer,
  actionsRenderer,
}: EntityTableProps<T>) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-proplio-border bg-proplio-card/50 p-8 text-center text-sm text-proplio-muted">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="proplio-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-proplio-border">
          <thead className="bg-proplio-card">
            <tr>
              {columns.map((column) => (
                <th
                  key={String(column.key)}
                  scope="col"
                  className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-proplio-secondary"
                >
                  {column.label}
                </th>
              ))}
              <th
                scope="col"
                className="px-4 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-proplio-secondary"
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-proplio-border">
            {rows.map((row, rowIndex) => (
              <tr
                key={row.id}
                className={
                  rowIndex % 2 === 0
                    ? "bg-proplio-bg/40 transition-colors hover:bg-proplio-primary/10"
                    : "bg-proplio-card/60 transition-colors hover:bg-proplio-primary/10"
                }
              >
                {columns.map((column) => {
                  const value = column.render ? column.render(row) : String(row[column.key as keyof T] ?? "");

                  return (
                    <td key={String(column.key)} className="whitespace-nowrap px-4 py-3.5 text-sm text-proplio-text">
                      {value || "—"}
                    </td>
                  );
                })}
                <td className="px-4 py-3.5 text-right">
                  <div className="flex flex-col items-end gap-2">
                    {statusRenderer ? statusRenderer(row) : null}
                    <div className="inline-flex flex-wrap items-center justify-end gap-2">
                      {actionsRenderer ? actionsRenderer(row) : null}
                      <button
                        type="button"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-proplio-border bg-proplio-card px-2.5 py-1.5 text-xs font-medium text-proplio-text transition hover:border-proplio-primary/50 hover:bg-proplio-primary/10"
                        onClick={() => onEdit(row)}
                      >
                        <IconPencil className="h-3.5 w-3.5 text-proplio-secondary" />
                        Modifier
                      </button>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-proplio-danger/40 bg-proplio-danger/10 px-2.5 py-1.5 text-xs font-medium text-proplio-danger transition hover:bg-proplio-danger/20 disabled:cursor-not-allowed disabled:opacity-60"
                        onClick={() => onDelete(row.id)}
                        disabled={isDeleting}
                      >
                        <IconTrash className="h-3.5 w-3.5" />
                        Supprimer
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export type { EntityColumn };
