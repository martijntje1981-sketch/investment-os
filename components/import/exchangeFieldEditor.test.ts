import { describe, expect, it } from "vitest";

import {
  findExchangeOption,
  formatExchangeInputValue,
} from "@/lib/services/instruments/exchangeSearch";

describe("ExchangeFieldEditor input behaviour", () => {
  it("preserves typed text independently from selected exchange labels", () => {
    let exchangeInputValue = "";
    let selectedExchange = findExchangeOption("XETRA");

    const type = (nextValue: string) => {
      exchangeInputValue = nextValue;
      if (
        selectedExchange &&
        nextValue !== selectedExchange.label &&
        nextValue !== selectedExchange.code
      ) {
        selectedExchange = null;
      }
    };

    type("X");
    expect(exchangeInputValue).toBe("X");
    expect(selectedExchange).toBeNull();

    type("XE");
    expect(exchangeInputValue).toBe("XE");

    type("XETRA");
    expect(exchangeInputValue).toBe("XETRA");
  });

  it("fills the input with the user-friendly label after selection", () => {
    const selected = findExchangeOption("XETRA");
    expect(selected).not.toBeNull();

    const exchangeInputValue = selected!.label;
    expect(exchangeInputValue).toBe("Xetra");
    expect(formatExchangeInputValue(selected!.code)).toBe("Xetra");
  });

  it("keeps manual text when no search result matches", () => {
    const typed = "Unknown venue";
    expect(findExchangeOption(typed)?.code).toBe("UNKNOWNVENUE");
    expect(typed).toBe("Unknown venue");
  });
});
