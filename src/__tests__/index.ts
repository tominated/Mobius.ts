import {
  Next,
  Loop,
  next,
  dispatchEffects,
  noChange,
  EventSource
} from "../index";

describe("Next", () => {
  describe("when given model and no effects", () => {
    const n = next("hello");

    it("has a model", () => {
      expect(n.model).toBe("hello");
    });

    it("has no effects", () => {
      expect(n.effects).toHaveLength(0);
    });
  });

  describe("when given model and effects", () => {
    const n = next("hello", ["one", "two"]);

    it("has a model", () => {
      expect(n.model).toBe("hello");
    });

    it("has effects", () => {
      expect(n.effects).toEqual(["one", "two"]);
    });
  });

  describe("when given no model and some effects", () => {
    const n = dispatchEffects(["one", "two"]);

    it("has a model", () => {
      expect(n.model).toBeNull;
    });

    it("has effects", () => {
      expect(n.effects).toEqual(["one", "two"]);
    });
  });

  describe("when given no model and no effects", () => {
    const n = noChange();

    it("has a model", () => {
      expect(n.model).toBeNull;
    });

    it("has no effects", () => {
      expect(n.effects).toHaveLength(0);
    });
  });
});

describe("Loop", () => {
  type Model = { counter: number };
  type Event = { type: "incremented" } | { type: "decremented" };
  type Effect = { type: "playSound" };

  const defaultModel: Model = { counter: 0 };
  const update = (model: Model, event: Event): Next<Model, Effect> => {
    switch (event.type) {
      case "incremented":
        return next({ counter: model.counter + 1 }, [{ type: "playSound" }]);
      case "decremented":
        return next({ counter: model.counter - 1 });
    }
  };
  const initiator = (_model: Model) => noChange<Model, Effect>();

  test("can create loop", () => {
    const loop = new Loop(defaultModel, update, [], initiator, []);
    expect(loop).toBeDefined();
  });

  test("updates the model", () => {
    const loop = new Loop(defaultModel, update, [], initiator, []);
    expect(loop.currentModel.counter).toBe(0);
    loop.dispatch({ type: "incremented" });
    expect(loop.currentModel.counter).toBe(1);
  });

  test("dispatches effects", () => {
    const handleEffect = jest.fn();
    const loop = new Loop(defaultModel, update, [handleEffect], initiator, []);
    expect(handleEffect).not.toBeCalled();
    loop.dispatch({ type: "incremented" });
    expect(handleEffect).toHaveBeenCalledWith(
      { type: "playSound" },
      loop.dispatch
    );
  });

  test("dispatches effects from initiator", () => {
    const handleEffect = jest.fn();
    const initiator = (_model: Model) =>
      dispatchEffects<Model, Effect>([{ type: "playSound" }]);
    const loop = new Loop(defaultModel, update, [handleEffect], initiator, []);

    expect(loop.currentModel.counter).toBe(0);
    expect(handleEffect).toHaveBeenCalledWith(
      { type: "playSound" },
      loop.dispatch
    );
  });

  test("handles events from an event source", done => {
    const eventSource: EventSource<Event> = dispatch => {
      // Testing async
      setTimeout(() => {
        dispatch({ type: "incremented" });
      }, 0);
    };

    const initiator = (_model: Model) =>
      dispatchEffects<Model, Effect>([{ type: "playSound" }]);
    const loop = new Loop(defaultModel, update, [], initiator, [eventSource]);

    expect(loop.currentModel.counter).toBe(0);
    setTimeout(() => {
      expect(loop.currentModel.counter).toBe(1);
      done();
    }, 0);
  }, 10);

  test("can subscribe to model changes", done => {
    const loop = new Loop(defaultModel, update, [], initiator, []);
    loop.on(model => {
      expect(model.counter).toBe(1);
      done();
    });

    expect(loop.currentModel.counter).toBe(0);
    loop.dispatch({ type: "incremented" });
  }, 10);

  test("can unsubscribe to model changes", () => {
    const loop = new Loop(defaultModel, update, [], initiator, []);
    const callback = jest.fn();
    loop.on(callback);

    expect(callback).not.toHaveBeenCalled();
    loop.dispatch({ type: "incremented" });
    expect(callback).toHaveBeenCalledTimes(1);

    loop.off(callback);
    loop.dispatch({ type: "incremented" });
    expect(callback).toHaveBeenCalledTimes(1);
  });

  test("can unsubscribe without failing", () => {
    const loop = new Loop(defaultModel, update, [], initiator, []);
    const callback = jest.fn();
    loop.off(callback);
    expect(callback).not.toHaveBeenCalled();
  });
});
