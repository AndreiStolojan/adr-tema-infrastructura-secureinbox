import { apiClient } from './apiClient.js';

export const getMe = () => apiClient.get('/users/me');
