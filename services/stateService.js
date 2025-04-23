const verifyContext = new Map();

function setVerifyContext(adminId, state) {
  verifyContext.set(adminId, state);
}

function getVerifyContext(adminId) {
  return verifyContext.get(adminId);
}

function clearVerifyContext(adminId) {
  verifyContext.delete(adminId);
}
function updateVerifyContext(adminId, updates) {
  const current = verifyContext.get(adminId) || {};
  verifyContext.set(adminId, {...current, ...updates});
}

module.exports = {
  setVerifyContext,
  getVerifyContext,
  clearVerifyContext,
  updateVerifyContext,
};
