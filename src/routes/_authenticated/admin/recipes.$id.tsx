import { createFileRoute } from "@tanstack/react-router";
import { RecipeForm } from "@/components/RecipeForm";
export const Route = createFileRoute("/_authenticated/admin/recipes/$id")({
  component: () => { const { id } = Route.useParams(); return (<><h1 className="font-serif text-3xl px-5 mb-3">Edit recipe</h1><RecipeForm recipeId={id} /></>); },
});
