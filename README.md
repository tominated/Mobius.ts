# Mobius.ts

A small implementation of Mobius by Spotify
([iOS](https://github.com/spotify/Mobius.swift/) &
[Android](https://github.com/spotify/Mobius/)) in Typescript.

Similar to the Elm Architecture & Redux, Mobius is a way to manage state in a
JS/TS application using one-way data flow. I wrote this because I was
dissatisfied by needing to use middleware to handle side-effects in redux code.

Here's a simple example of how you could use Mobius.ts. Adapter libraries still
need to be written in order to simplify this.

```ts
import {
  Loop,
  Next,
  Dispatch,
  next,
  dispatchEffects,
  noChange
} from "mobius-ts";

// Your application's data model
type Model = {
  count: number;
}

// Synchronous Events in past-tense (e.g. user actions, responses to async)
type Event =
  | { type: "incremented" }
  | { type: "decremented" }
  | { type: "requestedCount" };
  | { type: "gotCount", count: number };

// Side-effects to perform with an impure handler function
type Effect =
  | { type: "playSound" }
  | { type: "requestCount" };

// Your updater is like a redux reducer, but can also return effects to run.
// The return value must be a Next object that describes an optional updated
// model, and a list of effects to run.
// next, dispatchEffects and noChange are the return value helper methods.
function updater(model: Model, event: Event): Next<Model, Effect> {
  switch (event.type) {
    case "incremented":
      return next({ count: model.counter + 1 }, [{ type: "playSound" }]);

    case "decremented":
      return next({ count: model.counter - 1 });

    case "requestedCount":
      return dispatchEffects([{ type: "requestCount" }])

    case "gotCount":
      return next({ count: event.count });
  }
}

// Handle side-effects produced by the updater. An event dispatch function will
// be passed in so new events can be produced in response to side-effects, like
// HTTP responses.
function effectHandler(effect: Effect, dispatch: Dispatch<Event>) {
  switch (effect.type) {
    case "playSound": {
      // playSound defined elsewhere
      playSound();
      break;
    }
    case "requestCount": {
      // getRemoteCount defined elsewhere
      getRemoteCount().then(count => {
        dispatch({ type: "gotCount", count})
      });
      break;
    }
  }
}

const defaultModel: Model = { counter: 0 };
const loop = new Loop(defaultModel, updater, [effectHandler], []);

function updateUI(model: Model) {
  // Assume countDiv is a DOM element.
  countDiv.innerText = model.count.toString();
}

// First set the default UI state
updateUI(loop.currentModel);

// Then subscribe to model changes
loop.on(updateUI);

// Then set up handlers to dispatch events from synchronous user interactions.
// Assume that incrementButton, decrementButton & refreshButton are button DOM
// elements.
incrementButton.addEventListener("click", () => {
  loop.dispatch({ type: "incremented" });
}, false);

decrementButton.addEventListener("click", () => {
  loop.dispatch({ type: "decremented" });
}, false);

refreshButton.addEventListener("click", () => {
  loop.dispatch({ type: "requestedCount" });
}, false);

// You now have an app working with Mobius.ts
```
