import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * The tool is a single page that talks to no server: the Palette lives in the
   * URL fragment and in localStorage, so `next build` can emit it as plain
   * files and any static host can serve it.
   */
  output: "export",
};

export default nextConfig;
