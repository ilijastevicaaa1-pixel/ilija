// Mock node-fetch to use global.fetch
jest.mock('node-fetch', () => global.fetch);

// Mock global fetch for API route tests
global.fetch = jest.fn(async (url) => {
  if (url.includes('/api/predikcije')) {
    return {
      json: async () => ({
        trendProfit: 'rast',
        trendExpense: 'pad',
        ciProfit: { min: 0 },
        predProfit: [1, 2, 3, 4, 5, 6],
      }),
    };
  }
  if (url.includes('/api/anomalije')) {
    return {
      json: async () => ({
        zOutliers: [],
        delayed: [],
        abnormal: [],
      }),
    };
  }
  // Default mock
  return {
    json: async () => ({}),
  };
});
