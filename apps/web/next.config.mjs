/** @type {import('next').NextConfig} */
const nextConfig = {
  // Monorepo packages are consumed as TS source, so Next needs to transpile them.
  transpilePackages: [
    "@ai-workforce/core",
    "@ai-workforce/shared",
    "@ai-workforce/db",
    "@ai-workforce/ai-provider",
    "@ai-workforce/agent-marketing-content-writer",
    "@ai-workforce/integration-x-twitter",
    "@ai-workforce/integration-threads",
  ],
};

export default nextConfig;
