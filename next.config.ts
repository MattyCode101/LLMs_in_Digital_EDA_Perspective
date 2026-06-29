import type { NextConfig } from "next";

const repo = process.env.GITHUB_REPOSITORY?.split('/')[1] ?? '';
const isCI = !!process.env.GITHUB_ACTIONS;

const nextConfig: NextConfig = {
  reactCompiler: true,
  output: 'export',
  trailingSlash: true,
  basePath: isCI ? `/${repo}` : '',
  assetPrefix: isCI ? `/${repo}/` : '',
};

export default nextConfig;
