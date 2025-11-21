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

// Add request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", service: "gyeongwon-proxy" });
});

// Proxy middleware with timeout and error handling
app.use(
  "/api",
  cors(corsOptions),
  createProxyMiddleware({
    target: "http://20.214.33.209:3000", // 실제 백엔드
    changeOrigin: true,
    pathRewrite: { "^/api": "" }, // /api/tempTruck/getAll -> /tempTruck/getAll
    timeout: 60000, // 60 second timeout for backend requests
    proxyTimeout: 60000, // 60 second timeout for proxy
    onError: (err, req, res) => {
      console.error(`Proxy error for ${req.method} ${req.path}:`, err.message);
      if (!res.headersSent) {
        res.status(502).json({
          error: "Bad Gateway",
          message: "Unable to connect to backend server",
          details: err.message,
        });
      }
    },
    onProxyReq: (proxyReq, req, res) => {
      console.log(`Proxying ${req.method} ${req.path} to backend`);
    },
    onProxyRes: (proxyRes, req, res) => {
      console.log(
        `Backend responded with status ${proxyRes.statusCode} for ${req.method} ${req.path}`
      );
    },
    onProxyReqError: (err, req, res) => {
      console.error(
        `Proxy request error for ${req.method} ${req.path}:`,
        err.message
      );
      if (!res.headersSent) {
        res.status(503).json({
          error: "Service Unavailable",
          message: "Backend server is not responding",
          details: err.message,
        });
      }
    },
  })
);

// Test backend connectivity on startup
const BACKEND_HOST = "20.214.33.209";
const BACKEND_PORT = 3000;
const BACKEND_URL = `http://${BACKEND_HOST}:${BACKEND_PORT}`;

const testBackendConnection = () => {
  const net = require("net");
  const socket = new net.Socket();

  socket.setTimeout(5000);

  socket.on("connect", () => {
    console.log(
      `✅ Backend server is reachable at ${BACKEND_HOST}:${BACKEND_PORT}`
    );
    socket.destroy();
  });

  socket.on("timeout", () => {
    console.warn(`⚠️  Backend connectivity test timed out`);
    console.warn(
      `   The backend at ${BACKEND_HOST}:${BACKEND_PORT} may be unreachable or slow.`
    );
    socket.destroy();
  });

  socket.on("error", (err) => {
    console.warn(`⚠️  Backend connectivity test failed: ${err.message}`);
    console.warn(
      `   Backend at ${BACKEND_HOST}:${BACKEND_PORT} may be down or unreachable.`
    );
    console.warn(`   Proxy will still start, but requests may fail.`);
  });

  socket.connect(BACKEND_PORT, BACKEND_HOST);
};

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Proxy server running on port ${PORT}`);
  console.log(`Backend target: ${BACKEND_URL}`);
  console.log(`Testing backend connectivity...`);
  testBackendConnection();
});
