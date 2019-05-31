export type Next<Model, Effect> = {
  model: Model | null;
  effects: Effect[];
};

export type Updater<Model, Event, Effect> = (
  model: Model,
  event: Event
) => Next<Model, Effect>;

export type Initiator<Model, Effect> = (model: Model) => Next<Model, Effect>;
export type EffectHandler<Effect, Event> = (
  effect: Effect,
  dispatch: Dispatch<Event>
) => void;
export type EventSource<Event> = (dispatch: Dispatch<Event>) => void;

type Dispatch<Event> = (event: Event) => void;
type Listener<Event> = (event: Event) => void;

export class Loop<Model, Event, Effect> {
  currentModel: Model;
  private updater: Updater<Model, Event, Effect>;
  private effectHandlers: EffectHandler<Effect, Event>[];
  private listeners: Listener<Model>[] = [];

  constructor(
    defaultModel: Model,
    updater: Updater<Model, Event, Effect>,
    effectHandlers: EffectHandler<Effect, Event>[],
    eventSources: EventSource<Event>[],
    initiator?: Initiator<Model, Effect>
  ) {
    this.currentModel = defaultModel;
    this.updater = updater;
    this.effectHandlers = effectHandlers;

    if (initiator) {
      const next = initiator(this.currentModel);
      this.handleNext(next);
    }

    eventSources.forEach(eventSource => eventSource(this.dispatch));
  }

  static simpleLoop<Model, Event>(
    defaultModel: Model,
    updater: Updater<Model, Event, never>
  ): Loop<Model, Event, never> {
    return new Loop(defaultModel, updater, [], []);
  }

  on = (listener: Listener<Model>) => {
    this.listeners.push(listener);
  };

  off = (listener: Listener<Model>) => {
    const index = this.listeners.indexOf(listener);
    if (index > -1) this.listeners.splice(index, 1);
  };

  dispatch = (event: Event) => {
    const next = this.updater(this.currentModel, event);
    this.handleNext(next);

    this.listeners.forEach(listener => listener(this.currentModel));
  };

  handleNext = (next: Next<Model, Effect>) => {
    if (next.model) this.currentModel = next.model;
    next.effects.forEach(effect => {
      this.effectHandlers.forEach(handler => handler(effect, this.dispatch));
    });
  };
}

export function next<Model, Effect>(
  model: Model,
  effects: Effect[] = []
): Next<Model, Effect> {
  return { model, effects };
}

export function dispatchEffects<Model, Effect>(
  effects: Effect[]
): Next<Model, Effect> {
  return { model: null, effects };
}

export function noChange<Model, Effect>(): Next<Model, Effect> {
  return { model: null, effects: [] };
}

type UpdaterMapping<Model, Event, Effect> = {
  [K in keyof Model]: Updater<Model[K], Event, Effect>
};

export function combineUpdaters<Model, Event, Effect>(
  mapping: UpdaterMapping<Model, Event, Effect>
): Updater<Model, Event, Effect> {
  return (model: Model, event: Event): Next<Model, Effect> => {
    const newModel: Model = { ...model };
    const effects: Effect[] = [];

    for (let key in mapping) {
      const updater = mapping[key];
      const subNext = updater(model[key], event);

      if (subNext.model) {
        newModel[key] = subNext.model;
      }

      effects.push.apply(effects, subNext.effects);
    }

    return next(newModel, effects);
  };
}
