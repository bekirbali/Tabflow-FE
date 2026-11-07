import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Extension Bridge Contract & Security', () => {
  let messageHandlers = [];
  let runtimeMessageListeners = [];

  beforeAll(() => {
    // Mock chrome.runtime
    global.chrome = {
      runtime: {
        id: 'mock-extension-id',
        onMessage: {
          addListener: (fn) => runtimeMessageListeners.push(fn),
        },
        sendMessage: vi.fn(),
      },
    };

    // Capture message listener on window
    const originalAddEventListener = window.addEventListener.bind(window);
    window.addEventListener = (event, handler, ...args) => {
      if (event === 'message') {
        messageHandlers.push(handler);
      }
      return originalAddEventListener(event, handler, ...args);
    };

    // Read and run tabflow_bridge.js in current window context
    const scriptPath = path.resolve(__dirname, '../../extension/tabflow_bridge.js');
    const scriptCode = fs.readFileSync(scriptPath, 'utf-8');
    const runner = new Function(scriptCode);
    runner();
  });

  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(window, 'postMessage');
  });

  it('responds with tabflow_extension_ready when check action is received', () => {
    expect(messageHandlers.length).toBeGreaterThan(0);

    const mockEvent = {
      data: { action: 'tabflow_check_extension' },
    };

    messageHandlers.forEach((handler) => handler(mockEvent));

    expect(window.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'tabflow_extension',
        action: 'tabflow_extension_ready',
        version: '1.1.0',
      }),
      '*'
    );
  });

  it('relays tabflow_link_added from chrome.runtime to window.postMessage and localStorage signal', () => {
    expect(runtimeMessageListeners.length).toBeGreaterThan(0);

    const sendResponse = vi.fn();
    const mockRequest = {
      action: 'tabflow_link_added',
      data: {
        video_id: 'dQw4w9WgXcQ',
        title: 'New Added Tab',
      },
    };

    runtimeMessageListeners.forEach((listener) => listener(mockRequest, {}, sendResponse));

    // Must notify React web app via postMessage
    expect(window.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'tabflow_extension',
        action: 'tabflow_link_added',
        data: expect.objectContaining({ video_id: 'dQw4w9WgXcQ' }),
      }),
      '*'
    );

    // Must write fallback signal to localStorage
    expect(localStorage.getItem('tabflow_new_link_signal')).toBeTruthy();
    expect(sendResponse).toHaveBeenCalledWith({ received: true });
  });
});
