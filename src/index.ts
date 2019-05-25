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
  constructor(
    _defaultModel: Model,
    _updater: Updater<Model, Event, Effect>,
    _effectHandlers: EffectHandler<Effect, Event>[],
    _initiator: Initiator<Model, Effect>,
    _eventSources: EventSource<Event>[]
  ) {}

  on = (_listener: Listener<Model>) => {};

  off = (_listener: Listener<Model>) => {};

  dispatch = (_event: Event) => {};
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
