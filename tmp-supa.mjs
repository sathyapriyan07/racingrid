import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
const envLines = fs.readFileSync(".env", "utf8").trim().split(/\r?\n/);
const env = {};
for (const line of envLines) {
  const idx = line.indexOf("=");
  if (idx === -1) continue;
  env[line.slice(0, idx)] = line.slice(idx + 1);
}
const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);
const { data: circuits, error: selectError } = await supabase.from("circuits").select("id,name").limit(1);
console.log({ selectError, circuit: circuits?.[0] });
if (circuits?.[0]?.id) {
  const { data, error } = await supabase.from("circuits").update({ turns: 14 }).eq("id", circuits[0].id);
  console.log({ data, error });
}
