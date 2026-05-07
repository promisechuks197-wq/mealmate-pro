import { createFileRoute } from "@tanstack/react-router";
import { RecipeForm } from "@/components/RecipeForm";
export const Route = createFileRoute("/_authenticated/admin/recipes/new")({
  component: () => (<><h1 className="font-serif text-3xl px-5 mb-3">New recipe</h1><RecipeForm /></>),
});
