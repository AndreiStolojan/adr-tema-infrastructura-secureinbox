import { apiClient } from './apiClient.js';

export const getLatestScan = (emailId) =>
  apiClient.get(`/scans/emails/${emailId}/latest`);
