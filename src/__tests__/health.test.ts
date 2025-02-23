import request from "supertest";
import { app } from "./helpers/setup";

describe("Health Check", () => {
  it("should return 200 OK and service info", async () => {
    const response = await request(app).get("/health");
    
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: "ok",
      uptime: expect.any(Number),
      timestamp: expect.any(String)
    });
  });
});