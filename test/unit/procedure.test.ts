import { assert } from "chai";
import { Procedure, RunResult } from "../../src/procedure";

class MockProcedure extends Procedure {
  // Implement abstract methods for testing
  _serializeState(): string {
    return "mockSerializedState";
  }

  _deserializeState(procData: string): void {
    // Mock implementation
  }

  _runInternal(): RunResult {
    // Mock implementation
    return RunResult.Succeeded;
  }

  getType(): string {
    return "MockProcedure";
  }
}

describe("procedure", () => {
  it("should initialize correctly with provided SavedProcedure", () => {
    const savedProcedure = {
      priority: 1,
      lastRunTick: 10,
      type: "MockProcedure",
      procData: "mockSerializedState",
    };

    const mockProcedure = new MockProcedure(1, savedProcedure);

    assert.strictEqual(mockProcedure.id, 1);
    assert.strictEqual(mockProcedure.priority, 1);
    assert.strictEqual(mockProcedure.lastRunTick, 10);
  });

  it("should serialize correctly", () => {
    const mockProcedure = new MockProcedure(1, {
      priority: 1,
      lastRunTick: 10,
      type: "MockProcedure",
      procData: "mockSerializedState",
    });

    const serializedProcedure = mockProcedure.serialize();

    assert.strictEqual(serializedProcedure.priority, 1);
    assert.strictEqual(serializedProcedure.lastRunTick, 10);
    assert.strictEqual(serializedProcedure.type, "MockProcedure");
    assert.strictEqual(serializedProcedure.procData, "mockSerializedState");
  });

  it("should run successfully", () => {
    const mockProcedure = new MockProcedure(1, {
      priority: 1,
      lastRunTick: 10,
      type: "MockProcedure",
      procData: "mockSerializedState",
    });

    const result = mockProcedure.run();

    assert.strictEqual(result, RunResult.Succeeded);
  });

  it("should skip when run more than once in the same tick", () => {
    const mockProcedure = new MockProcedure(1, {
      priority: 1,
      lastRunTick: 10,
      type: "MockProcedure",
      procData: "mockSerializedState",
    });

    // First run
    const result1 = mockProcedure.run();
    assert.strictEqual(result1, RunResult.Succeeded);

    // Second run in the same tick
    const result2 = mockProcedure.run();

    assert.strictEqual(result2, RunResult.Skip);
  });
});
