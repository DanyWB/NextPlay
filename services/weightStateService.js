const weightState = new Map();

function setWaitingForWeight(userId) {
  weightState.set(userId, true);
}

function clearWaitingForWeight(userId) {
  weightState.delete(userId);
}

function isWaitingForWeight(userId) {
  return weightState.has(userId);
}

module.exports = {
  setWaitingForWeight,
  clearWaitingForWeight,
  isWaitingForWeight,
};
