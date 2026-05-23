"use client"

import { useSyncExternalStore } from "react"

// Shared state between SiteSplash and every BookLoader on the page.
//   active      — true while the wordmark splash owns the screen
//   loaderCount — how many BookLoaders are currently mounted (proxy for "data still loading")
//
// The splash dismisses as soon as loaderCount falls to 0 after having been > 0,
// so there's no artificial delay once the page is ready.

type State = {
  active: boolean
  loaderCount: number
}

let state: State = { active: false, loaderCount: 0 }
const listeners = new Set<() => void>()

function emit() {
  for (const fn of listeners) fn()
}

export function setSplashActive(value: boolean) {
  if (state.active === value) return
  state = { ...state, active: value }
  emit()
}

export function incLoaderCount() {
  state = { ...state, loaderCount: state.loaderCount + 1 }
  emit()
}

export function decLoaderCount() {
  state = { ...state, loaderCount: Math.max(0, state.loaderCount - 1) }
  emit()
}

function subscribe(cb: () => void) {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}

function getSnapshot() {
  return state
}

const SERVER_STATE: State = { active: false, loaderCount: 0 }
function getServerSnapshot(): State {
  return SERVER_STATE
}

function useSplashState() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

export function useSplashActive() {
  return useSplashState().active
}

export function useLoaderCount() {
  return useSplashState().loaderCount
}
