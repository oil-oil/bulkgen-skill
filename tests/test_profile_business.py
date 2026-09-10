import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest
class ProfileBusinessTests(unittest.TestCase):
    def test_real_generate_entry_consumes_profile_environment(self):
        script=Path(__file__).parents[1]/'bulkgen/scripts/generate.js'
        with tempfile.TemporaryDirectory() as directory:
            work=Path(directory)
            preload=work/'fake-fetch.cjs'
            preload.write_text('global.fetch = async (url, options) => { if (options.headers.Authorization !== "Bearer TEST_ONLY_BATCH") throw Error("incorrect credential binding"); return {ok:true,json:async()=>({images:[],credits:{charged:0}})}; };')
            env={**os.environ,'BULKGEN_API_KEY':'TEST_ONLY_BATCH'}
            p=subprocess.run(['node','--require',str(preload),str(script),'--prompts','test','--mode','solo','--output',str(work/'out.json')],env=env,capture_output=True,text=True)
            self.assertEqual(p.returncode,0,p.stderr)
            self.assertNotIn('TEST_ONLY_BATCH',p.stdout+p.stderr+(work/'out.json').read_text())
            self.assertEqual(json.loads((work/'out.json').read_text())['images'],[])
