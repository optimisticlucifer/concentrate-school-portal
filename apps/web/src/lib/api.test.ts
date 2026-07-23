import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, api } from './api';

const res = (status: number, body?: unknown): Response =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }) as unknown as Response;

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('api request wrapper', () => {
  it('get hits /api+path with credentials and returns json', async () => {
    fetchMock.mockResolvedValueOnce(res(200, { id: 1 }));
    const out = await api.get('/students');
    expect(out).toEqual({ id: 1 });
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/students',
      expect.objectContaining({ credentials: 'include' })
    );
  });

  it('post sends method and JSON body', async () => {
    fetchMock.mockResolvedValueOnce(res(200, { ok: true }));
    await api.post('/students', { name: 'Ada' });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/students');
    expect(init.method).toBe('POST');
    expect(init.body).toBe(JSON.stringify({ name: 'Ada' }));
  });

  it('put sends PUT', async () => {
    fetchMock.mockResolvedValueOnce(res(200, {}));
    await api.put('/students/1', { name: 'Bob' });
    expect(fetchMock.mock.calls[0][1].method).toBe('PUT');
  });

  it('patch sends PATCH', async () => {
    fetchMock.mockResolvedValueOnce(res(200, {}));
    await api.patch('/students/1', { name: 'Cy' });
    expect(fetchMock.mock.calls[0][1].method).toBe('PATCH');
  });

  it('del sends DELETE', async () => {
    fetchMock.mockResolvedValueOnce(res(204));
    await api.del('/students/1');
    expect(fetchMock.mock.calls[0][1].method).toBe('DELETE');
  });

  it('omits content-type on bodyless requests (avoids empty-JSON parse errors)', async () => {
    fetchMock.mockResolvedValueOnce(res(200, {}));
    await api.del('/students/1');
    const headers = fetchMock.mock.calls[0][1].headers as Record<string, string>;
    expect(headers['content-type']).toBeUndefined();
  });

  it('sets content-type when a body is present', async () => {
    fetchMock.mockResolvedValueOnce(res(200, {}));
    await api.post('/students', { name: 'Ada' });
    const headers = fetchMock.mock.calls[0][1].headers as Record<string, string>;
    expect(headers['content-type']).toBe('application/json');
  });

  it('204 returns undefined', async () => {
    fetchMock.mockResolvedValueOnce(res(204));
    await expect(api.get('/ping')).resolves.toBeUndefined();
  });

  it('401 on a non-auth path posts to /api/auth/refresh then retries', async () => {
    fetchMock
      .mockResolvedValueOnce(res(401))
      .mockResolvedValueOnce(res(200)) // refresh
      .mockResolvedValueOnce(res(200, { id: 2 })); // retry
    const out = await api.get('/students');
    expect(out).toEqual({ id: 2 });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/auth/refresh',
      expect.objectContaining({ method: 'POST', credentials: 'include' })
    );
  });

  it('401 on an /auth/ path does not refresh and throws', async () => {
    fetchMock.mockResolvedValueOnce(res(401, { error: 'bad login' }));
    await expect(api.get('/auth/login')).rejects.toBeInstanceOf(ApiError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('!ok throws ApiError carrying the status and error message', async () => {
    fetchMock.mockResolvedValueOnce(res(500, { error: 'boom' }));
    await expect(api.get('/students')).rejects.toMatchObject({
      status: 500,
      message: 'boom',
    });
  });
});
