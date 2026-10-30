"use client";
import { createId } from "./id";
import { useCallback, useEffect, useRef, useState } from "react";
import { APIError } from "./api";
import { local, type Draft } from "./local";
import type { SaveState } from "../components/ui";

type Resource = { revision: number; phase?: string };
type Options<T, R extends Resource> = {
  key: string;
  load: () => Promise<R>;
  extract: (r: R) => T;
  save: (value: T, revision: number, completionKey?: string) => Promise<R>;
  mode: "script" | "run";
  normalize?: (value: T) => T;
};
export function useDraft<T, R extends Resource>(options: Options<T, R>) {
  const opts = useRef(options);
  opts.current = options;
  const [view, setView] = useState<{
    resource: R | null;
    value: T | null;
    status: SaveState;
    message: string;
    localWarning: string;
    conflict: R | null;
    pendingCompletion: boolean;
    deleted: boolean;
  }>({
    resource: null,
    value: null,
    status: "saved",
    message: "",
    localWarning: "",
    conflict: null,
    pendingCompletion: false,
    deleted: false,
  });
  const c = useRef({
    value: null as T | null,
    resource: null as R | null,
    rev: 0,
    gen: 0,
    acked: 0,
    busy: null as Promise<void> | null,
    blocked: false,
    blockStatus: undefined as number | undefined,
    allowLeave: false,
    completionKey: undefined as string | undefined,
    persist: Promise.resolve(),
    retry: 0,
    timer: undefined as ReturnType<typeof setTimeout> | undefined,
    alive: true,
  });
  const render = useCallback((patch: Partial<typeof view> = {}) => {
    if (c.current.alive)
      setView((v) => ({
        ...v,
        resource: c.current.resource,
        value: c.current.value,
        pendingCompletion: !!c.current.completionKey,
        ...patch,
      }));
  }, []);
  const persist = useCallback(
    (remove = false) => {
      const state = c.current;
      const draft: Draft<T> = {
        baseRevision: state.rev,
        value: state.value!,
        completionKey: state.completionKey,
      };
      state.persist = state.persist.then(async () => {
        try {
          if (remove) await local.remove(opts.current.key);
          else await local.put(opts.current.key, draft);
          render({ localWarning: "" });
        } catch {
          render({
            localWarning:
              "Local recovery storage is unavailable. Keep this page open until the server acknowledges your changes.",
          });
        }
      });
      return state.persist;
    },
    [render],
  );
  const flush = useCallback(
    async function send(): Promise<void> {
      const state = c.current;
      if (state.busy) {
        await state.busy;
        if (state.gen !== state.acked && !state.blocked) return send();
        return;
      }
      if (state.blocked)
        throw new Error(
          "Resolve the conflict or sign in again before saving or testing.",
        );
      if (state.value === null || state.gen === state.acked) return;
      const task = (async () => {
        await state.persist;
        const generation = state.gen,
          value = state.value!,
          revision = state.rev,
          key = state.completionKey;
        render({ status: "saving", message: "" });
        try {
          const resource = await opts.current.save(value, revision, key);
          state.resource = resource;
          state.rev = resource.revision;
          state.acked = generation;
          state.retry = 0;
          state.completionKey = undefined;
          if (state.gen === generation) {
            state.value = opts.current.extract(resource);
            await persist(true);
            render({ status: "saved", message: "" });
          } else {
            await persist();
            render({ status: "unsaved" });
          }
        } catch (error) {
          const e = error as APIError;
          if ([401, 403, 404, 409, 422].includes(e.status)) {
            state.blocked = true;
            state.blockStatus = e.status;
            if (e.status === 404) {
              state.acked = state.gen;
              state.completionKey = undefined;
              await persist(true);
              render({
                status: "error",
                deleted: true,
                message:
                  "This record was deleted. The pending copy cannot recreate it.",
              });
            } else if (e.status === 409) {
              try {
                const latest = await opts.current.load();
                if (latest.phase === "completed") {
                  state.resource = latest;
                  state.value = opts.current.extract(latest);
                  state.rev = latest.revision;
                  state.acked = state.gen;
                  state.completionKey = undefined;
                  await persist(true);
                  render({
                    status: "saved",
                    message: "This call has already been completed.",
                  });
                } else
                  render({
                    status: "conflict",
                    conflict: latest,
                    message: e.message,
                  });
              } catch {
                render({ status: "error", message: e.message });
              }
            } else
              render({
                status: "error",
                message:
                  e.status === 401
                    ? "Your session expired. Sign in again; your pending work is retained."
                    : e.message,
              });
          } else {
            render({
              status: "error",
              message:
                e.message ||
                "Connection interrupted. Your pending work is retained.",
            });
            const delay = [1000, 2000, 5000, 10000, 30000][
              Math.min(state.retry++, 4)
            ];
            state.timer = setTimeout(() => void send().catch(() => {}), delay);
          }
          throw error;
        }
      })();
      state.busy = task;
      try {
        await task;
      } finally {
        state.busy = null;
      }
    },
    [persist, render],
  );
  useEffect(() => {
    const state = c.current;
    state.alive = true;
    let active = true;
    (async () => {
      try {
        const resource = await opts.current.load();
        if (!active) return;
        state.resource = resource;
        state.rev = resource.revision;
        state.value = opts.current.extract(resource);
        let pending: Draft<T> | undefined;
        try {
          pending = await local.get<T>(opts.current.key);
        } catch {
          render({
            localWarning:
              "Local recovery storage is unavailable. Keep this page open while changes are pending.",
          });
        }
        if (!active) return;
        if (resource.phase === "completed") {
          await persist(true);
        } else if (pending) {
          state.value =
            opts.current.normalize?.(pending.value) ?? pending.value;
          state.completionKey = pending.completionKey;
          state.gen = 1;
          if (pending.baseRevision !== resource.revision) {
            state.blocked = true;
            state.blockStatus = 409;
            render({
              status: "conflict",
              conflict: resource,
              message:
                "A saved version changed while this local draft was pending.",
            });
          } else {
            render({ status: "unsaved" });
            void flush().catch(() => {});
          }
        }
        render();
      } catch (e) {
        if (active) render({ status: "error", message: (e as Error).message });
      }
    })();
    const interval = setInterval(() => {
      if (opts.current.mode === "script") void flush().catch(() => {});
    }, 5000);
    const online = () => {
      if (!state.blocked) void flush().catch(() => {});
    };
    const close = (e: BeforeUnloadEvent) => {
      if (state.gen !== state.acked && !state.allowLeave) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    const confirmLeave = () => {
      state.allowLeave = true;
    };
    window.addEventListener("call-coach-confirm-leave", confirmLeave);
    window.addEventListener("online", online);
    window.addEventListener("beforeunload", close);
    return () => {
      active = false;
      state.alive = false;
      clearInterval(interval);
      clearTimeout(state.timer);
      window.removeEventListener("call-coach-confirm-leave", confirmLeave);
      window.removeEventListener("online", online);
      window.removeEventListener("beforeunload", close);
    };
  }, [flush, persist, render]);
  const change = useCallback(
    (value: T, immediate = false) => {
      const state = c.current;
      if (state.completionKey) return;
      if (state.blockStatus === 422) {
        state.blocked = false;
        state.blockStatus = undefined;
      }
      state.value = value;
      state.gen++;
      void persist();
      render({
        status: state.blocked
          ? state.blockStatus === 409
            ? "conflict"
            : "error"
          : "unsaved",
        ...(state.blocked ? {} : { message: "" }),
      });
      if (!state.blocked) {
        clearTimeout(state.timer);
        if (immediate) void flush().catch(() => {});
        else if (opts.current.mode === "run")
          state.timer = setTimeout(() => void flush().catch(() => {}), 1000);
      }
    },
    [flush, persist, render],
  );
  const resolve = useCallback(
    async (useLocal: boolean) => {
      const state = c.current;
      try {
        const latest = await opts.current.load();
        state.resource = latest;
        state.rev = latest.revision;
        state.blocked = false;
        state.blockStatus = undefined;
        state.completionKey = undefined;
        if (!useLocal || latest.phase === "completed") {
          state.value = opts.current.extract(latest);
          state.acked = state.gen;
          await persist(true);
          render({ status: "saved", conflict: null, message: "" });
        } else {
          state.gen++;
          await persist();
          render({ status: "unsaved", conflict: null, message: "" });
          await flush();
        }
      } catch (e) {
        render({ message: (e as Error).message });
      }
    },
    [flush, persist, render],
  );
  const complete = useCallback(async () => {
    const state = c.current;
    if (state.busy) await state.busy;
    if (!state.completionKey) {
      state.completionKey = createId();
      state.gen++;
      await persist();
      render();
    }
    await flush();
  }, [flush, persist, render]);
  return {
    ...view,
    change,
    flush,
    complete,
    retry: () => {
      if (c.current.value === null) {
        window.location.reload();
        return;
      }
      if (!c.current.blocked) void flush().catch(() => {});
    },
    resolve,
    dirty: () => c.current.gen !== c.current.acked,
  };
}
