import type { Metadata } from "next";
import { PourQuiClient } from "./pour-qui-client";

export const metadata: Metadata = {
  title: "Pour qui — Locavio",
  description:
    "Locavio s'adapte à tous les propriétaires bailleurs, qu'ils louent en longue durée ou en saisonnier.",
};

export default function PourQuiPage() {
  return <PourQuiClient />;
}
