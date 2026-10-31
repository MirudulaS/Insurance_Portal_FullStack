import { useState, useEffect, useCallback, useRef } from 'react';
import socketService from '../services/socketService';

/**
 * Runs an async function (typically a service call) and exposes
 * { data, loading, error, refetch } so pages render consistent
 * Loading / Error / Empty / Success states without repeating boilerplate.
 *
 * `deps` re-runs the fetch when they change (e.g. filters, id params).
 */
export function useAsync(asyncFn, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const mounted = useRef(true);

  const run = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await asyncFn();
      if (mounted.current) setData(result);
      return result;
    } catch (err) {
      if (mounted.current) setError(err);
      throw err;
    } finally {
      if (mounted.current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    mounted.current = true;
    run().catch(() => {});
    return () => {
      mounted.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error, refetch: run, setData };
}

/**
 * Subscribes to one or more real-time (Socket.IO) events for the lifetime of a
 * component and re-runs `onEvent` when they fire. Swapping socketService's
 * internals for real socket.io-client later requires no change here.
 */
export function useLiveRefresh(events, onEvent) {
  const eventList = Array.isArray(events) ? events : [events];
  useEffect(() => {
    const unsubscribers = eventList.map((event) => socketService.on(event, onEvent));
    return () => unsubscribers.forEach((unsub) => unsub());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventList.join(','), onEvent]);
}
