import { requireSession } from "@/lib/auth";
import { notFound } from "next/navigation";
import { ComponentLibrary } from "@/components/library";

export const dynamic = "force-dynamic";

export default async function ComponentsPage() {
  // This synthetic-data gallery is an opt-in review tool, never an application route.
  if (process.env.COMPONENT_PREVIEW !== "true") notFound();
  await requireSession();
  return <ComponentLibrary />;
}
