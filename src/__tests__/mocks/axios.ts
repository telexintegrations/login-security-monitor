import { jest } from "@jest/globals";
import type { AxiosResponse } from "axios";

interface MockResponse {
  status: number;
  data: { status: string };
  headers: Record<string, string>;
  config: {
    headers: Record<string, string>;
    method?: string;
    url?: string;
  };
  statusText: string;
}

const mockHeaders = {
  "Content-Type": "application/json",
};

export const mockAxios = {
  post: jest.fn().mockImplementation(
    (): Promise<MockResponse> =>
      Promise.resolve({
        status: 200,
        data: { status: "success" },
        headers: mockHeaders,
        config: {
          headers: mockHeaders,
          method: "POST",
          url: "test-url",
        },
        statusText: "OK",
      })
  ),

  get: jest.fn().mockImplementation(
    (): Promise<MockResponse> =>
      Promise.resolve({
        status: 200,
        data: { status: "ok" },
        headers: mockHeaders,
        config: {
          headers: mockHeaders,
          method: "GET",
          url: "test-url",
        },
        statusText: "OK",
      })
  ),
};

jest.mock("axios", () => ({
  __esModule: true,
  default: mockAxios,
}));
