import api from './api';

const budgetService = {
  async getBudgets(params) {
    const { data } = await api.get('/budgets', { params });
    return data;
  },
  async createBudget(payload) {
    const { data } = await api.post('/budgets', payload);
    return data;
  },
};

export default budgetService;
