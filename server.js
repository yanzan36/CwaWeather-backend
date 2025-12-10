require("dotenv").config();
const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 3000;

// CWA API 設定
const CWA_API_URL =
  "https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-C0032-001";
const CWA_API_KEY = process.env.CWA_API_KEY;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 確認有沒有 API Key
function ensureApiKey(res) {
  if (!CWA_API_KEY) {
    res.status(500).json({
      error: "伺服器設定錯誤",
      message: "請在 .env 檔案中設定 CWA_API_KEY",
    });
    return false;
  }
  return true;
}

/**
 * 取得「全部縣市」36 小時天氣
 * GET /api/weather
 */
app.get("/api/weather", async (req, res) => {
  try {
    if (!ensureApiKey(res)) return;

    const response = await axios.get(CWA_API_URL, {
      params: {
        Authorization: CWA_API_KEY,
        // 不加 locationName => 回傳全部縣市
      },
    });

    // 保留 CWA 原始結構，外面多包一層 success
    res.json({
      success: true,
      ...response.data,
    });
  } catch (error) {
    console.error("取得全部天氣資料失敗:", error.message);

    if (error.response) {
      return res.status(error.response.status).json({
        error: "CWA API 錯誤",
        message: error.response.data.message || "無法取得天氣資料",
        details: error.response.data,
      });
    }

    res.status(500).json({
      error: "伺服器錯誤",
      message: "無法取得天氣資料，請稍後再試",
    });
  }
});

/**
 * 取得「單一縣市」36 小時天氣（可選用）
 * GET /api/weather/city/:locationName
 * 例如：/api/weather/city/臺中市
 */
app.get("/api/weather/city/:locationName", async (req, res) => {
  try {
    if (!ensureApiKey(res)) return;

    const { locationName } = req.params;

    const response = await axios.get(CWA_API_URL, {
      params: {
        Authorization: CWA_API_KEY,
        locationName,
      },
    });

    res.json({
      success: true,
      ...response.data,
    });
  } catch (error) {
    console.error("取得單一縣市天氣失敗:", error.message);

    if (error.response) {
      return res.status(error.response.status).json({
        error: "CWA API 錯誤",
        message: error.response.data.message || "無法取得天氣資料",
        details: error.response.data,
      });
    }

    res.status(500).json({
      error: "伺服器錯誤",
      message: "無法取得天氣資料，請稍後再試",
    });
  }
});

// 根路徑 & 健康檢查
app.get("/", (req, res) => {
  res.json({
    message: "歡迎使用 CWA 天氣代理 API",
    endpoints: {
      allCities: "/api/weather",
      cityByName: "/api/weather/city/:locationName",
      health: "/api/health",
    },
  });
});

app.get("/api/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: "伺服器錯誤",
    message: err.message,
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: "找不到此路徑",
  });
});

app.listen(PORT, () => {
  console.log(`🚀 伺服器運行已運作，PORT = ${PORT}`);
  console.log(`📍 環境: ${process.env.NODE_ENV || "development"}`);
});
