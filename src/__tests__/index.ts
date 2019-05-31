import {
  Next,
  Loop,
  next,
  dispatchEffects,
  noChange,
  combineUpdaters,
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

  test("can create simple loop", () => {
    const update = (model: Model, event: Event): Next<Model, never> => {
      switch (event.type) {
        case "incremented":
          return next({ counter: model.counter + 1 });
        case "decremented":
          return next({ counter: model.counter - 1 });
      }
    };
    const loop = Loop.simpleLoop(defaultModel, update);
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
    const callback = (model: Model) => {
      expect(model.counter).toBe(1);
      done();
    };
    loop.on(callback);

    expect(loop.currentModel.counter).toBe(0);
    loop.dispatch({ type: "incremented" });

    loop.off(callback);
  }, 10);

  test("can subscribe to model changes multiple times", () => {
    const loop = new Loop(defaultModel, update, [], initiator, []);
    const cb1 = jest.fn();
    const cb2 = jest.fn();

    loop.on(cb1);
    loop.dispatch({ type: "incremented" });

    expect(cb1).toHaveBeenCalledTimes(1);

    loop.on(cb2);
    loop.dispatch({ type: "incremented" });

    expect(cb1).toHaveBeenCalledTimes(2);
    expect(cb2).toHaveBeenCalledTimes(1);

    loop.off(cb1);
    loop.off(cb2);
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
    loop.off(callback);
  });

  test("can unsubscribe after subscribing multiple times", () => {
    const loop = new Loop(defaultModel, update, [], initiator, []);
    const cb1 = jest.fn();
    const cb2 = jest.fn();

    loop.on(cb1);
    loop.dispatch({ type: "incremented" });

    expect(cb1).toHaveBeenCalledTimes(1);

    loop.off(cb1);
    loop.on(cb2);
    loop.dispatch({ type: "incremented" });

    expect(cb1).toHaveBeenCalledTimes(1);
    expect(cb2).toHaveBeenCalledTimes(1);

    loop.off(cb2);
  }, 10);

  test("can unsubscribe without failing", () => {
    const loop = new Loop(defaultModel, update, [], initiator, []);
    const callback = jest.fn();
    loop.off(callback);
    expect(callback).not.toHaveBeenCalled();
  });
});

describe("combineUpdaters", () => {
  type Model = { updateA: ModelA };
  type ModelA = { counter: number };
  type Event = { type: "incremented" } | { type: "decremented" };
  type Effect = { type: "playSound" };

  const updateA = (model: ModelA, event: Event): Next<ModelA, Effect> => {
    switch (event.type) {
      case "incremented":
        return next({ counter: model.counter + 1 }, [{ type: "playSound" }]);
      case "decremented":
        return next({ counter: model.counter - 1 });
    }
  };

  it("produces new model", () => {
    const updater = combineUpdaters<Model, Event, Effect>({ updateA });
    const model = { updateA: { counter: 0 } };
    const updaterNext = updater(model, { type: "incremented" });
    expect(updaterNext.model).toEqual({ updateA: { counter: 1 } });
  });

  it("produces an effect", () => {
    const updater = combineUpdaters<Model, Event, Effect>({ updateA });
    const model = { updateA: { counter: 0 } };
    const updaterNext = updater(model, { type: "incremented" });
    expect(updaterNext.effects).toEqual([{ type: "playSound" }]);
  });

  it("works when nested", () => {
    const updaterNest = combineUpdaters<Model, Event, Effect>({ updateA });
    const updater = combineUpdaters<{ updaterNest: Model }, Event, Effect>({
      updaterNest
    });
    const model = { updaterNest: { updateA: { counter: 0 } } };
    const updaterNext = updater(model, { type: "incremented" });
    expect(updaterNext.effects).toEqual([{ type: "playSound" }]);
  });
});
