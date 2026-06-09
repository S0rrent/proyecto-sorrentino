import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, act } from "@testing-library/react";
import { useViewport } from "../hooks.js";

function Probe({ exposeApi }) {
  const vp = useViewport();
  exposeApi(vp);
  return null;
}

function setViewport(width) {
  Object.defineProperty(window, "innerWidth", {
    writable: true,
    configurable: true,
    value: width,
  });
}

describe("useViewport", () => {
  let originalMatchMedia;

  beforeEach(() => {
    originalMatchMedia = window.matchMedia;
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  function mockMatchMedia(matches) {
    window.matchMedia = vi.fn().mockImplementation(() => ({
      matches,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
  }

  it("mobile cuando width < 1024", () => {
    setViewport(375);
    mockMatchMedia(false);
    let vp;
    render(<Probe exposeApi={(v) => { vp = v; }} />);
    expect(vp.isMobile).toBe(true);
    expect(vp.isTablet).toBe(false);
    expect(vp.isDesktop).toBe(false);
    expect(vp.width).toBe(375);
  });

  it("tablet cuando width entre 768 y 1023", () => {
    setViewport(800);
    mockMatchMedia(false);
    let vp;
    render(<Probe exposeApi={(v) => { vp = v; }} />);
    expect(vp.isMobile).toBe(true); // mobile incluye tablet
    expect(vp.isTablet).toBe(true);
    expect(vp.isDesktop).toBe(false);
  });

  it("desktop cuando width >= 1024", () => {
    setViewport(1280);
    mockMatchMedia(true);
    let vp;
    render(<Probe exposeApi={(v) => { vp = v; }} />);
    expect(vp.isMobile).toBe(false);
    expect(vp.isTablet).toBe(false);
    expect(vp.isDesktop).toBe(true);
    expect(vp.width).toBe(1280);
  });

  it("re-render al cambiar el viewport (matchMedia change event)", () => {
    setViewport(375);
    let listener;
    window.matchMedia = vi.fn().mockImplementation(() => ({
      matches: false,
      addEventListener: vi.fn((_event, cb) => { listener = cb; }),
      removeEventListener: vi.fn(),
    }));

    let vp;
    render(<Probe exposeApi={(v) => { vp = v; }} />);
    expect(vp.isMobile).toBe(true);

    // Simular cambio a desktop
    setViewport(1280);
    act(() => { listener({ matches: true }); });
    expect(vp.isDesktop).toBe(true);
  });

  it("limpia el listener al desmontar", () => {
    setViewport(375);
    const removeSpy = vi.fn();
    window.matchMedia = vi.fn().mockImplementation(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: removeSpy,
    }));

    let vp;
    const { unmount } = render(<Probe exposeApi={(v) => { vp = v; }} />);
    unmount();
    expect(removeSpy).toHaveBeenCalled();
  });
});
