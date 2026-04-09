import { Env } from "@lombard.finance/sdk";
import { Outlet } from "react-router-dom";

import { Header } from "../Header";
import { Sidebar } from "./Sidebar";

interface LayoutProps {
  env: Env;
  onEnvChange: (env: Env) => void;
}

/**
 * Main layout with header and sidebar
 */
export function Layout({ env, onEnvChange }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <div className="flex-1 flex">
        <Sidebar env={env} onEnvChange={onEnvChange} />

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
