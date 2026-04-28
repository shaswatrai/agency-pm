import { redirect } from "next/navigation";
import { ORG } from "@/lib/db/seed";

export default function Home() {
  redirect(`/${ORG.slug}/dashboard`);
}
