import { describe, it, expect, beforeEach, vi } from 'vitest';
import { api } from '../api';

describe('API Utils: Vault & Session Management', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    api.clearVaultToken();
    vi.restoreAllMocks();
  });

  it('should save, retrieve, and clear vault token', () => {
    expect(api.getVaultToken()).toBeNull();

    api.setVaultToken('signed_vault_token_123');
    expect(api.getVaultToken()).toBe('signed_vault_token_123');
    expect(sessionStorage.getItem('tabflow_vault_token')).toBe('signed_vault_token_123');

    api.clearVaultToken();
    expect(api.getVaultToken()).toBeNull();
    expect(sessionStorage.getItem('tabflow_vault_token')).toBeNull();
  });

  it('logout should clear auth token, user info and vault token', () => {
    localStorage.setItem('tabflow_token', 'sample_auth_token');
    localStorage.setItem('tabflow_user', JSON.stringify({ email: 'user@tabflow.dev' }));
    api.setVaultToken('vault_token_xyz');

    api.logout();

    expect(localStorage.getItem('tabflow_token')).toBeNull();
    expect(localStorage.getItem('tabflow_user')).toBeNull();
    expect(api.getVaultToken()).toBeNull();
  });

  it('getCurrentUser should return parsed user object or null', () => {
    expect(api.getCurrentUser()).toBeNull();

    const mockUser = { id: 'uuid-1', email: 'test@tabflow.dev' };
    localStorage.setItem('tabflow_user', JSON.stringify(mockUser));
    expect(api.getCurrentUser()).toEqual(mockUser);
  });
});

describe('API Utils: Network Requests and Headers', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    api.clearVaultToken();
    vi.restoreAllMocks();
  });

  it('should include Authorization and X-Vault-Token headers in fetch calls', async () => {
    localStorage.setItem('tabflow_token', 'jwt_or_drf_token_abc');
    api.setVaultToken('vault_key_123');

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: {
        get: (h) => (h.toLowerCase() === 'content-type' ? 'application/json' : null)
      },
      json: async () => ({ id: 'link-1', title: 'Test Link' })
    });
    global.fetch = fetchMock;

    await api.getLinks('feed', '', true);

    expect(fetchMock).toHaveBeenCalled();
    const calledUrl = fetchMock.mock.calls[0][0];
    const calledConfig = fetchMock.mock.calls[0][1];

    expect(calledUrl).toContain('/links/');
    expect(calledConfig.headers['Authorization']).toBe('Token jwt_or_drf_token_abc');
    expect(calledConfig.headers['X-Vault-Token']).toBe('vault_key_123');
  });

  it('should throw an error with backend detail when request fails', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      headers: {
        get: (h) => (h.toLowerCase() === 'content-type' ? 'application/json' : null)
      },
      json: async () => ({ error: 'Gecersiz URL formati' })
    });
    global.fetch = fetchMock;

    await expect(api.addLink({ url: 'not-valid' })).rejects.toThrow('Gecersiz URL formati');
  });
});
