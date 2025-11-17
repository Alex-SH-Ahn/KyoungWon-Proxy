const express = require("express");
const cors = require("cors");
const { createProxyMiddleware } = require("http-proxy-middleware");

const app = express();

app.use(
  cors({
    origin: "https://gyeongwon-environment-web-and-app.github.io",
    credentials: true,
  })
);

app.use(
  "/api",
  createProxyMiddleware({
    target: "http://20.214.33.209:3000",
    changeOrigin: true,
    pathRewrite: { "^/api": "" },
  })
);

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Proxy server running on port ${PORT}`);
});
