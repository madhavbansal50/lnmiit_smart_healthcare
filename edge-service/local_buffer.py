"""
LNMIIT Smart Healthcare System - Edge Local Storage & Offline Buffering
Buffers telemetry locally on Raspberry Pi if campus Wi-Fi / backend connection is temporarily unavailable.
"""

import collections
import json
import os

class LocalBuffer:
    def __init__(self, max_size=1000, buffer_file="edge_buffer.json"):
        self.queue = collections.deque(maxlen=max_size)
        self.buffer_file = buffer_file

    def push(self, reading):
        self.queue.append(reading)

    def pop(self):
        if self.queue:
            return self.queue.popleft()
        return None

    def size(self):
        return len(self.queue)

    def persist(self):
        try:
            with open(self.buffer_file, 'w') as f:
                json.dump(list(self.queue), f)
        except Exception as e:
            print(f"[Buffer] Failed to persist buffer to disk: {e}")

    def load(self):
        if os.path.exists(self.buffer_file):
            try:
                with open(self.buffer_file, 'r') as f:
                    items = json.load(f)
                    for it in items:
                        self.queue.append(it)
                print(f"[Buffer] Restored {len(self.queue)} cached sensor frames from local disk.")
            except Exception as e:
                print(f"[Buffer] Failed to load buffer: {e}")
