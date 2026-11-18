import { redirect } from "next/navigation";

export default function AppHomePage(): never {
  redirect("/conversations");
}
