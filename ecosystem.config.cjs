/** PM2: from repo root run `pm2 start ecosystem.config.cjs` */
require("dotenv").config();

const port = Number(process.env.PORT) || 5010;

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
        PORT: port,
      },
    },
  ],
};
