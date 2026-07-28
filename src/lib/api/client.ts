import { from, rpc } from "./query";
import { auth } from "./auth";
import { storage } from "./storage";
import { channel, removeChannel } from "./realtime";

/**
 * Single data client for the Express + MongoDB backend.
 *
 * It intentionally keeps the same method surface the components already use
 * (`from().select()`, `rpc()`, `auth`, `storage`, `channel`) so the migration
 * touches only this layer and no UI code.
 */
export const api = {
  from,
  rpc,
  auth,
  storage,
  channel,
  removeChannel,
  functions: {
    async invoke(_name: string, _options?: any) {
      return { data: null, error: { message: "Edge functions are not used by the Node backend." } };
    },
  },
};

export default api;
