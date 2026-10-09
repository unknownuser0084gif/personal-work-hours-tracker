import { configureStore } from "@reduxjs/toolkit";
import { reducers } from "./slices.js";
export const createStore = () => configureStore({ reducer: reducers });
export const store = createStore();
export { patchUI } from "./slices.js";
export * from "./thunks.js";
export * from "./selectors.js";
