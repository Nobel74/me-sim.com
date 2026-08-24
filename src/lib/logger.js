let logsBuffer = [];

export function addDiagnosticLog(category, action, data = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    category,
    action,
    data,
  };
  logsBuffer.unshift(entry);
  if (logsBuffer.length > 100) {
    logsBuffer = logsBuffer.slice(0, 100);
  }
}

export function getDiagnosticLogs() {
  return logsBuffer;
}
