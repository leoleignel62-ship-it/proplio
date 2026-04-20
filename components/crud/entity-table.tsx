"use client";

import type { CSSProperties, ReactNode } from "react";
import { useState } from "react";
import { IconPencil, IconTrash } from "@/components/proplio-icons";
import { PC } from "@/lib/proplio-colors";

const CARD: CSSProperties = {
  backgroundColor: PC.card,
  border: `1px solid ${PC.border}`,
  borderRadius: 12,
  boxShadow: PC.cardShadow,
};

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
  const [hoverEditId, setHoverEditId] = useState<string | null>(null);
  const [hoverDelId, setHoverDelId] = useState<string | null>(null);

  if (rows.length === 0) {
    return (
      <div
        className="rounded-xl border border-dashed p-8 text-center text-sm"
        style={{
          borderColor: PC.border,
          backgroundColor: "rgba(26, 26, 36, 0.5)",
          color: PC.muted,
        }}
      >
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-hidden" style={CARD}>
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead style={{ backgroundColor: PC.card }}>
            <tr style={{ borderBottom: `1px solid ${PC.border}` }}>
              {columns.map((column) => (
                <th
                  key={String(column.key)}
                  scope="col"
                  className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider"
                  style={{ color: PC.secondary }}
                >
                  {column.label}
                </th>
              ))}
              <th
                scope="col"
                className="px-4 py-3.5 text-right text-xs font-semibold uppercase tracking-wider"
                style={{ color: PC.secondary }}
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr
                key={row.id}
                style={{
                  borderBottom: `1px solid ${PC.border}`,
                  backgroundColor:
                    rowIndex % 2 === 0 ? "rgba(15, 15, 19, 0.4)" : "rgba(26, 26, 36, 0.6)",
                }}
              >
                {columns.map((column) => {
                  const value = column.render ? column.render(row) : String(row[column.key as keyof T] ?? "");

                  return (
                    <td
                      key={String(column.key)}
                      className="whitespace-nowrap px-4 py-3.5 text-sm"
                      style={{ color: PC.text }}
                    >
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
                        className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition"
                        style={{
                          border: `1px solid ${PC.border}`,
                          backgroundColor: PC.card,
                          color: PC.text,
                          ...(hoverEditId === row.id
                            ? { borderColor: "rgba(124, 58, 237, 0.5)", backgroundColor: PC.primaryBg10 }
                            : {}),
                        }}
                        onMouseEnter={() => setHoverEditId(row.id)}
                        onMouseLeave={() => setHoverEditId(null)}
                        onClick={() => onEdit(row)}
                      >
                        <IconPencil className="h-3.5 w-3.5 shrink-0" style={{ color: PC.secondary }} />
                        Modifier
                      </button>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-60"
                        style={{
                          border: "1px solid rgba(239, 68, 68, 0.4)",
                          backgroundColor: PC.dangerBg10,
                          color: PC.danger,
                          ...(hoverDelId === row.id ? { backgroundColor: "rgba(239, 68, 68, 0.2)" } : {}),
                        }}
                        onMouseEnter={() => setHoverDelId(row.id)}
                        onMouseLeave={() => setHoverDelId(null)}
                        onClick={() => onDelete(row.id)}
                        disabled={isDeleting}
                      >
                        <IconTrash className="h-3.5 w-3.5 shrink-0" style={{ color: PC.danger }} />
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
