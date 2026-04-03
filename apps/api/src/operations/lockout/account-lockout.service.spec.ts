import { AccountLockoutService } from './account-lockout.service';

describe('AccountLockoutService', () => {
  const userRepository = {
    recordFailedLoginAttempt: jest.fn(),
    resetLoginLockout: jest.fn(),
  };
  const configService = {
    get: jest.fn((key: string) => {
      if (key === 'ACCOUNT_LOCKOUT_MAX_ATTEMPTS') {
        return 5;
      }

      if (key === 'ACCOUNT_LOCKOUT_DURATION_MINUTES') {
        return 15;
      }

      return undefined;
    }),
  };

  let service: AccountLockoutService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AccountLockoutService(userRepository as never, configService as never);
  });

  it('evaluates unlocked users', () => {
    const evaluation = service.evaluate({
      id: 'user-1',
      failedLoginAttempts: 2,
      lockedUntil: null,
    } as never);

    expect(evaluation).toEqual({
      isLocked: false,
      lockedUntil: null,
      failedAttempts: 2,
    });
  });

  it('evaluates locked users until lock expires', () => {
    const lockedUntil = new Date('2030-01-01T00:00:00.000Z');
    const evaluation = service.evaluate(
      {
        id: 'user-1',
        failedLoginAttempts: 5,
        lockedUntil,
      } as never,
      new Date('2029-01-01T00:00:00.000Z'),
    );

    expect(evaluation.isLocked).toBe(true);
    expect(evaluation.lockedUntil).toEqual(lockedUntil);
  });

  it('locks account after reaching max failed attempts', async () => {
    userRepository.recordFailedLoginAttempt.mockResolvedValue({
      id: 'user-1',
      failedLoginAttempts: 5,
      lockedUntil: new Date('2030-01-01T00:00:00.000Z'),
    });

    const evaluation = await service.recordFailedAttempt('user-1');

    expect(userRepository.recordFailedLoginAttempt).toHaveBeenCalledWith('user-1', 5, 15);
    expect(evaluation.isLocked).toBe(true);
  });

  it('resets lockout counters', async () => {
    await service.resetAttempts('user-1');

    expect(userRepository.resetLoginLockout).toHaveBeenCalledWith('user-1');
  });
});
