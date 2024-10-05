import { type Dispatch, useState } from "react";

export function usePolyfillState<T>(
  state: T,
  dispatch?: Dispatch<React.SetStateAction<T>>,
): [T, Dispatch<React.SetStateAction<T>>] {
  const [polyfill, setPolyfill] = useState<T>(state);
  if (dispatch) {
    return [state, dispatch];
  }
  return [polyfill, setPolyfill];
}
