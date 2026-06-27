/** @type {import('next').NextConfig} */
const config = {
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Tell webpack not to bundle better-sqlite3 — require it at runtime
      config.externals = [...(config.externals ?? []), 'better-sqlite3']
    }
    return config
  },
}

export default config
