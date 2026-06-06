// Prevents duplicate simultaneous GitHub API calls
// for the same username
const inProgress = new Map();

export const queueRequest = async (key, asyncFn) => {
  // If already in progress, wait for the same promise
  if (inProgress.has(key)) {
    return inProgress.get(key);
  }

  // Create new promise and store it
  const promise = asyncFn().finally(() => {
    inProgress.delete(key);
  });

  inProgress.set(key, promise);
  return promise;
};

export const isInProgress = (key) => inProgress.has(key);