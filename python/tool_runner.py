"""Fixed read-only wrapper for versioned Spanish public-data adapters."""
import json
import sys
from spain_suite import core

def main():
    name = sys.argv[1] if len(sys.argv) == 2 else ""
    if name not in core.TOOLS:
        print(json.dumps({"ok": False, "error": {"code": "unknown_tool", "message": "Unsupported operation"}}))
        return
    try:
        raw = sys.stdin.read(16384 + 1)
        if len(raw) > 16384:
            raise ValueError("Input too large")
        args = json.loads(raw)
        result = core.call_tool(name, args)
    except (ValueError, TypeError):
        result = {"ok": False, "error": {"code": "invalid_input", "message": "Invalid tool arguments"}}
    print(json.dumps(result, ensure_ascii=False, default=str))
if __name__ == "__main__":
    main()
