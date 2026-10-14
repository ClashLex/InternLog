"""Guard the public deployment against stale/missing assets and private files."""
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("build_pages", ROOT / "scripts/build_pages.py")
pages = importlib.util.module_from_spec(spec)
spec.loader.exec_module(pages)


class PagesBuildTest(unittest.TestCase):
    def test_publishes_current_frontend_only(self):
        with tempfile.TemporaryDirectory() as temporary:
            destination = Path(temporary) / "site"
            pages.build(destination, "test-revision")
            expected = set(pages.PUBLIC_FILES) | set(pages.PUBLIC_DIRECTORIES) | {".nojekyll", "deployment.json", "fonts"}
            self.assertEqual({item.name for item in destination.iterdir()}, expected)
            for name in pages.PUBLIC_FILES + pages.PUBLIC_DIRECTORIES + pages.PUBLIC_FONTS:
                source = ROOT / name
                files = [source] if source.is_file() else source.rglob("*")
                for file in files:
                    if file.is_file():
                        self.assertEqual(file.read_bytes(), (destination / file.relative_to(ROOT)).read_bytes())
            self.assertTrue((destination / "js/accessibility.js").is_file())
            published_fonts = {file.relative_to(destination).as_posix() for file in (destination / "fonts").rglob("*") if file.is_file()}
            self.assertEqual(published_fonts, set(pages.PUBLIC_FONTS))
            self.assertEqual(json.loads((destination / "deployment.json").read_text())["revision"], "test-revision")

    def test_refuses_to_overwrite_existing_output(self):
        with tempfile.TemporaryDirectory() as temporary:
            with self.assertRaises(FileExistsError):
                pages.build(Path(temporary), "test-revision")


if __name__ == "__main__":
    unittest.main()
