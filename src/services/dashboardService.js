import api from './api';

const dashboardService = {
  async getSummary(params) {
    const { data } = await api.get('/dashboard/summary', { params });
    return data;
  },
  async getAnalytics(params) {
    const { data } = await api.get('/dashboard/analytics', { params });
    return data;
  },
};

export default dashboardService;
