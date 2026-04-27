"use client";

import type { CSSProperties, ReactNode } from "react";
import { useState } from "react";
import { IconPencil, IconTrash } from "@/components/locavio-icons";
import { PC } from "@/lib/locavio-colors";

const CARD: CSSProperties = {
  backgroundColor: PC.card,
  border: `1px solid ${PC.border}`,
  borderRadius: 12,
  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.25)",
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
        className="rounded-xl border border-dashed p-10 text-center"
        style={{
          borderColor: PC.border,
          backgroundColor: PC.card,
          color: PC.muted,
        }}
      >
        <p className="text-sm leading-relaxed">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden" style={CARD}>
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead style={{ backgroundColor: PC.sidebar }}>
            <tr style={{ borderBottom: `1px solid ${PC.borderRow}` }}>
              {columns.map((column) => (
                <th
                  key={String(column.key)}
                  scope="col"
                  className="px-4 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider"
                  style={{ color: PC.tertiary }}
                >
                  {column.label}
                </th>
              ))}
              <th
                scope="col"
                className="px-4 py-3.5 text-right text-[11px] font-semibold uppercase tracking-wider"
                style={{ color: PC.tertiary }}
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className="group border-b transition-colors duration-150 ease-out"
                style={{
                  borderColor: PC.borderRow,
                  backgroundColor: PC.card,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = PC.cardHover;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = PC.card;
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
                    <div className="inline-flex flex-wrap items-center justify-end gap-2 opacity-0 transition-opacity duration-150 ease-out group-hover:opacity-100">
                      {actionsRenderer ? actionsRenderer(row) : null}
                      <button
                        type="button"
                        className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition duration-200 ease-out"
                        style={{
                          border: `1px solid ${PC.border}`,
                          backgroundColor: PC.inputBg,
                          color: PC.text,
                          ...(hoverEditId === row.id
                            ? { borderColor: "rgba(124, 58, 237, 0.45)", backgroundColor: PC.primaryBg10 }
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
                        className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition duration-200 ease-out disabled:cursor-not-allowed disabled:opacity-60"
                        style={{
                          border: "1px solid rgba(239, 68, 68, 0.35)",
                          backgroundColor: PC.dangerBg10,
                          color: PC.danger,
                          ...(hoverDelId === row.id ? { backgroundColor: "rgba(239, 68, 68, 0.18)" } : {}),
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
