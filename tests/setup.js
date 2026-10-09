import "fake-indexeddb/auto";
// No cross-tab browser channel is needed in isolated IndexedDB unit tests.
globalThis.BroadcastChannel = undefined;
