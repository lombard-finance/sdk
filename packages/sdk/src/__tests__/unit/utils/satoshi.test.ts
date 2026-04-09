import BigNumber from "bignumber.js";
import { describe, expect, it } from "vitest";

import {
  fromSatoshi,
  toSatoshi,
  toSatoshiBigInt,
} from "../../../utils/satoshi";

describe("Satoshi Conversions", () => {
  it("toSatoshi should convert BTC decimal to satoshis", () => {
    expect(toSatoshi("0.00001992").toString()).toBe("1992");
    expect(toSatoshi("1").toString()).toBe("100000000");
    expect(toSatoshi("0").toString()).toBe("0");
  });

  it("toSatoshiBigInt should return BigInt", () => {
    expect(toSatoshiBigInt("0.00000032")).toBe(32n);
    expect(toSatoshiBigInt("0.00001992")).toBe(1992n);
  });

  it("toSatoshi should handle BigNumber inputs", () => {
    expect(toSatoshi(new BigNumber("0.00001992")).toString()).toBe("1992");
  });

  it("fromSatoshi should convert satoshis to BTC decimal", () => {
    expect(fromSatoshi("1992").toFixed()).toBe("0.00001992");
    expect(fromSatoshi(100000000).toFixed()).toBe("1");
  });
});
