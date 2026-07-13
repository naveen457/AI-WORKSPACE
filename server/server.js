const app = require("./src/app");

const normalizePort = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 && parsed < 65536
    ? parsed
    : 5000;
};

const PORT = normalizePort(process.env.PORT);
const HOST = process.env.HOST || "0.0.0.0";

app.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
});
