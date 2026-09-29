import { describe, expect, it } from 'vitest';
import { DomainError, parseFutureKickoff, validateIanaTimezone, validateTeams } from './index.js';

describe('比赛规则', () => {
  it('拒绝相同主客队', () => {
    expect(() => validateTeams('阿森纳', '阿森纳')).toThrow(DomainError);
  });

  it('拒绝过去的开赛时间', () => {
    expect(() =>
      parseFutureKickoff('2025-01-01T00:00:00Z', new Date('2026-01-01T00:00:00Z')),
    ).toThrow(DomainError);
  });

  it('接受有效时区', () => {
    expect(validateIanaTimezone('Asia/Shanghai')).toBe('Asia/Shanghai');
  });
});
