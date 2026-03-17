import { DataCleanupService } from './data-cleanup.service';

describe('DataCleanupService', () => {
  const authRepository = {
    deleteExpiredRefreshTokens: jest.fn().mockResolvedValue(3),
  };
  const apiKeyRepository = {
    revokeExpiredKeys: jest.fn().mockResolvedValue(2),
  };
  const jobRepository = {
    deleteCompletedBefore: jest.fn().mockResolvedValue(5),
  };
  const configService = {
    get: jest.fn((key: string) => {
      if (key === 'REFRESH_TOKEN_RETENTION_DAYS') {
        return 30;
      }

      if (key === 'COMPLETED_JOB_RETENTION_DAYS') {
        return 90;
      }

      return undefined;
    }),
  };

  let service: DataCleanupService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new DataCleanupService(
      authRepository as never,
      apiKeyRepository as never,
      jobRepository as never,
      configService as never,
    );
  });

  it('removes expired refresh tokens, API keys, and completed jobs', async () => {
    const referenceDate = new Date('2025-06-01T00:00:00.000Z');

    const summary = await service.runCleanup(referenceDate);

    expect(summary).toEqual({
      refreshTokensRemoved: 3,
      expiredApiKeysRevoked: 2,
      completedJobsRemoved: 5,
    });
    expect(authRepository.deleteExpiredRefreshTokens).toHaveBeenCalled();
    expect(apiKeyRepository.revokeExpiredKeys).toHaveBeenCalledWith(referenceDate);
    expect(jobRepository.deleteCompletedBefore).toHaveBeenCalled();
  });
});
