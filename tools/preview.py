import json,glob,os
r=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D={}
for f in glob.glob(r+'/data/*.json'):D['data/'+os.path.basename(f)]=json.load(open(f))
h=open(r+'/index.html').read()
h=h.replace('<link rel="stylesheet" href="styles.css">','<style>'+open(r+'/styles.css').read()+'</style>')
h=h.replace('<script src="app.js"></script>','<script>window.__DATA__='+json.dumps(D)+';</script><script>'+open(r+'/app.js').read()+'</script>')
open(os.environ.get('OUT',r+'/preview.html'),'w').write(h)
