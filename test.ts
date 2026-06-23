import { getExecutiveDashboardStats } from "./app/actions/executive-dashboard";

async function run() {
  const res = await getExecutiveDashboardStats();
  console.log(JSON.stringify(res, null, 2));
}

run();
