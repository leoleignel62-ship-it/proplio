import type { Metadata } from "next";
import { TarifsClient } from "./tarifs-client";

export const metadata: Metadata = {
  title: "Tarifs — Locavio",
  description: "Des tarifs simples et transparents pour gérer vos locations. Commencez gratuitement.",
};

export default function TarifsPage() {
  return <TarifsClient />;
}
