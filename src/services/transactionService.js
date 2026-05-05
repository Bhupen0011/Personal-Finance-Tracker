import api from './api';

const transactionService = {
  async getTransactions(params) {
    const { data } = await api.get('/transactions', { params });
    return data;
  },
  async createTransaction(payload) {
    const { data } = await api.post('/transactions', payload);
    return data;
  },
  async updateTransaction(id, payload) {
    const { data } = await api.put(`/transactions/${id}`, payload);
    return data;
  },
  async deleteTransaction(id) {
    const { data } = await api.delete(`/transactions/${id}`);
    return data;
  },
};

export default transactionService;
