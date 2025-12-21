"""Pytest configuration to help find the app module."""
import sys
from pathlib import Path

# Add the parent directory (project root) to Python path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))