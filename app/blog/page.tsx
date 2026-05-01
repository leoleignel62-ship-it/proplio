import type { Metadata } from "next";
import { BlogClient } from "./blog-client";

export const metadata: Metadata = {
  title: "Blog — Locavio",
  description:
    "Ressources et conseils pour les propriétaires bailleurs. Gestion locative, juridique, fiscalité et saisonnier.",
};

export default function BlogPage() {
  return <BlogClient />;
}
