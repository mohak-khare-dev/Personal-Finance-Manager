import sys
from pathlib import Path

# Ensure root project directory is in python path so api modules can be imported
root_dir = Path(__file__).resolve().parent.parent.parent
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

from mangum import Mangum
from api.index import app

# Netlify AWS Lambda serverless handler
handler = Mangum(app)
