import { redirect } from "next/navigation";

/** Search is unified into Explore empty state / ⌘K; preserves query parameters. */
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") {
      search.set(key, value);
    } else if (Array.isArray(value)) {
      value.forEach((v) => search.append(key, v));
    }
  }
  const queryString = search.toString();
  redirect(queryString ? `/explore?${queryString}` : "/explore");
}
