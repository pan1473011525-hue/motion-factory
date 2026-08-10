import type {MotionerApi} from "../../shared/contracts";

declare global {
  interface Window {
    motioner?: MotionerApi;
  }
}

export {};
