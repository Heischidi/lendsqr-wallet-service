import dotenv from 'dotenv';
import { KarmaService } from '../src/services/karma.service';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret_key';
process.env.JWT_EXPIRES_IN = '1h';

// Mock console methods during tests to reduce noise
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Global test timeout
jest.setTimeout(30000);

// Global mock for KarmaService to prevent real network calls
jest.spyOn(KarmaService.prototype, 'comprehensiveCheck').mockResolvedValue({
  status: 'success',
  message: 'Mocked - not blacklisted',
  data: {
    blacklisted: false,
  },
});

// Clean up after all tests
afterAll(async () => {
  // Add any cleanup logic here
  jest.restoreAllMocks();
});
