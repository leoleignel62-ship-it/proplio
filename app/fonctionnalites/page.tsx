import type { Metadata } from "next";
import { FonctionnalitesClient } from "./fonctionnalites-client";

export const metadata: Metadata = {
  title: "Fonctionnalités — Locavio",
  description:
    "Découvrez toutes les fonctionnalités de Locavio pour gérer vos locations classiques et saisonnières.",
};

export default function FonctionnalitesPage() {
  return <FonctionnalitesClient />;
}
