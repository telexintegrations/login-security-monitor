import axios from "axios";

jest.mock("axios", () => ({
  post: jest.fn().mockResolvedValue({ status: 200, data: { success: true } }),
  get: jest.fn().mockResolvedValue({ status: 200, data: { success: true } }),
}));

describe("Axios Mocks", () => {
  it("should mock axios post requests", async () => {
    const response = await axios.post("/test");
    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
  });
});

export default axios;
