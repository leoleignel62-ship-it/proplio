import type { Metadata } from "next";
import { SecuriteClient } from "./securite-client";

export const metadata: Metadata = {
  title: "Sécurité — Locavio",
  description: "La sécurité et la confidentialité de vos données sont au cœur de Locavio.",
};

export default function SecuritePage() {
  return <SecuriteClient />;
}
