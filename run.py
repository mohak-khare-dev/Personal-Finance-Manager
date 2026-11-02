"""
Local Runner for Sarvam Artha Financial Platform
Run with: python run.py
"""
import os
import uvicorn
from pathlib import Path

if __name__ == "__main__":
    # Ensure current directory is in sys.path
    import sys
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    
    port = int(os.getenv("PORT", 8000))
    print(f"\n========================================================")
    print(f"  * Sarvam Artha - Personal Financial AI Platform *")
    print(f"  Starting local server at: http://127.0.0.1:{port}")
    print(f"========================================================\n")
    uvicorn.run("api.index:app", host="0.0.0.0", port=port, reload=True)
