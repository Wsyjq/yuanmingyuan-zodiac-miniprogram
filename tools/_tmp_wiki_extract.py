# -*- coding: utf-8 -*-
import json, os, glob

src = r"d:\kc\ymy\tools\_tmp_wiki"
for path in sorted(glob.glob(src + r"\*.json")):
    d = json.loads(open(path, encoding="utf-8").read())
    name = os.path.basename(path)
    if not d.get("ok"):
        print("FAIL", name, d)
        continue
    content = d["data"]["document"]["content"]
    out = path.replace(".json", ".md")
    open(out, "w", encoding="utf-8").write(content)
    print(name, "rev", d["data"]["document"].get("revision_id"), "chars", len(content))
