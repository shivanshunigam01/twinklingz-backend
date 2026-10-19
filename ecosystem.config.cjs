/** PM2: from repo root run `pm2 start ecosystem.config.cjs` */
module.exports = {
  apps: [
    {
      name: "twinklingz-api",
      cwd: __dirname,
      script: "src/index.js",
      interpreter: "node",
      instances: 1,
      autorestart: true,
      max_memory_restart: "400M",
      env: {
        NODE_ENV: "production",
        PORT: 5000,
      },
    },
  ],
};
