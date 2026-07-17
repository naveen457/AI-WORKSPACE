function getTimestamp() {
  return new Date().toISOString();
}

function logInfo(message, details = {}) {
  console.info(message, {
    timestamp: getTimestamp(),
    ...details,
  });
}

function logWarn(message, details = {}) {
  console.warn(message, {
    timestamp: getTimestamp(),
    ...details,
  });
}

function logError(message, details = {}) {
  console.error(message, {
    timestamp: getTimestamp(),
    ...details,
  });
}

module.exports = {
  logInfo,
  logWarn,
  logError,
};
