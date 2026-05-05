import api from './api';

const groupService = {
  async getGroups(params) {
    const { data } = await api.get('/groups', { params });
    return data;
  },
  async createGroup(payload) {
    const { data } = await api.post('/groups', payload);
    return data;
  },
  async getGroupDetails(groupId) {
    const { data } = await api.get(`/groups/${groupId}`);
    return data;
  },
  async addMembers(groupId, members) {
    const { data } = await api.post(`/groups/${groupId}/members`, { members });
    return data;
  },
  async getGroupExpenses(groupId, params) {
    const { data } = await api.get(`/groups/${groupId}/expenses`, { params });
    return data;
  },
  async createSharedExpense(groupId, payload) {
    const { data } = await api.post(`/groups/${groupId}/expenses`, payload);
    return data;
  },
  async commentOnExpense(groupId, expenseId, payload) {
    const { data } = await api.post(`/groups/${groupId}/expenses/${expenseId}/comments`, payload);
    return data;
  },
  async getGroupBalances(groupId) {
    const { data } = await api.get(`/groups/${groupId}/balances`);
    return data;
  },
  async getGroupSettlements(groupId, params) {
    const { data } = await api.get(`/groups/${groupId}/settlements`, { params });
    return data;
  },
  async createSettlement(groupId, payload) {
    const { data } = await api.post(`/groups/${groupId}/settlements`, payload);
    return data;
  },
  async recordSettlementPayment(groupId, settlementId, payload) {
    const { data } = await api.post(`/groups/${groupId}/settlements/${settlementId}/payments`, payload);
    return data;
  },
  async getGroupActivity(groupId, params) {
    const { data } = await api.get(`/groups/${groupId}/activity`, { params });
    return data;
  },
  async getSharedHistory(params) {
    const { data } = await api.get('/groups/history', { params });
    return data;
  },
  async getSettleSuggestions(params) {
    const { data } = await api.get('/groups/suggestions/settle-up', { params });
    return data;
  },
  async exportSharedHistoryCsv() {
    const { data } = await api.get('/groups/export/csv');
    return data;
  },
  async createTemplate(payload) {
    const { data } = await api.post('/groups/templates', payload);
    return data;
  },
  async getTemplates(params) {
    const { data } = await api.get('/groups/templates', { params });
    return data;
  },
  async createRecurringRule(payload) {
    const { data } = await api.post('/groups/recurring', payload);
    return data;
  },
  async getRecurringRules(params) {
    const { data } = await api.get('/groups/recurring', { params });
    return data;
  },
  async runRecurringRules() {
    const { data } = await api.post('/groups/recurring/run');
    return data;
  },
  async saveDraft(payload) {
    const { data } = await api.post('/groups/drafts', payload);
    return data;
  },
  async getDrafts(params) {
    const { data } = await api.get('/groups/drafts', { params });
    return data;
  },
  async syncDraft(draftId) {
    const { data } = await api.post(`/groups/drafts/${draftId}/sync`);
    return data;
  },
  async getNotifications(params) {
    const { data } = await api.get('/groups/notifications', { params });
    return data;
  },
  async markNotificationRead(notificationId) {
    const { data } = await api.patch(`/groups/notifications/${notificationId}/read`);
    return data;
  },
};

export default groupService;
