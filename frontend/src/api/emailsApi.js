import { apiClient } from './apiClient.js';

const toQueryString = (params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, String(value));
    }
  });
  const value = query.toString();
  return value ? `?${value}` : '';
};

export const getEmails = (params) =>
  apiClient.get(`/emails${toQueryString(params)}`);

export const getDashboardSummary = () => apiClient.get('/emails/summary');

export const getEmail = (emailId) => apiClient.get(`/emails/${emailId}`);

export const getEmailRaw = (emailId) =>
  apiClient.get(`/emails/${emailId}/raw`);
