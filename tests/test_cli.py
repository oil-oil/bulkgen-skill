from pathlib import Path
import subprocess
import unittest
class CliTests(unittest.TestCase):
    def test_secret_argument_is_rejected_without_echo(self):
        script=Path(__file__).parents[1]/'bulkgen/scripts/generate.js'
        result=subprocess.run(['node',str(script),'--api-key','fake-test-secret'],capture_output=True,text=True)
        self.assertNotEqual(result.returncode,0)
        self.assertNotIn('fake-test-secret',result.stdout+result.stderr)
        self.assertIn('--api-key 已停用',result.stderr)
if __name__ == '__main__':unittest.main()
