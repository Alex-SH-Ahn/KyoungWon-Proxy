const express = require("express");
const cors = require("cors");
const { createProxyMiddleware } = require("http-proxy-middleware");

const app = express();

// 1) 허용할 origin 목록
const allowedOrigins = [
  "http://localhost:5173", // 로컬 개발
  "https://gyeongwon-environment-web-and-app.github.io", // 배포된 프론트
];

const corsOptions = {
  origin: (origin, callback) => {
    // origin이 없을 수도 있음(null) -> 허용
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
};

app.use(cors(corsOptions));

app.use(
  "/api",
  cors(corsOptions),
  createProxyMiddleware({
    target: "http://20.214.33.209:3000", // 실제 백엔드
    changeOrigin: true,
    pathRewrite: { "^/api": "" }, // /api/tempTruck/getAll -> /tempTruck/getAll
  })
);

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Proxy server running on port ${PORT}`);
});
