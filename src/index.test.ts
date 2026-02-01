import { describe, expect, it } from "vitest";
import SvgViewport from "./components/SvgViewport";

describe("SvgViewport Component", () => {
  it("should be a function", () => {
    expect(typeof SvgViewport).toBe("function");
  });
});
