import re
import os

# Emoji regex from https://stackoverflow.com/questions/4324790/removing-emojis-from-a-string-in-python
# Covers most common emoji ranges
emoji_pattern = re.compile(
    "["
    "\U0001f600-\U0001f64f"  # emoticons
    "\U0001f300-\U0001f5ff"  # symbols & pictographs
    "\U0001f680-\U0001f6ff"  # transport & map symbols
    "\U0001f1e6-\U0001f1ff"  # flags (iOS)
    "\U000024c2-\U0001f251"
    "\u231a\u231b\u2328\u23cf\u23e9-\u23f3\u23f8-\u23fa\u24c2\u25aa\u25ab\u25b6\u25c0\u25fb-\u25fe\u2600-\u2604\u260e\u2611\u2614\u2615\u2618\u261d\u2620\u2622\u2623\u2626\u262a\u262e\u262f\u2638-\u263a\u2640\u2642\u2648-\u2653\u2660\u2663\u2665\u2666\u2668\u267b\u267f\u2692-\u2694\u2696\u2697\u2699\u269b\u269c\u26a0\u26a1\u26aa\u26ab\u26b0\u26b1\u26bd\u26be\u26c4\u26c5\u26c8\u26ce\u26cf\u26d1\u26d3\u26d4\u26e9\u26ea\u26f0-\u26f5\u26f7-\u26fa\u26fd\u2702\u2705\u2708-\u270d\u270f\u2712\u2714\u2716\u271d\u2721\u2728\u2733\u2734\u2744\u2747\u274c\u274e\u2753-\u2755\u2757\u2763\u2764\u2795-\u2797\u27a1\u27b0\u27bf\u2934\u2935\u2b05-\u2b07\u2b1b\u2b1c\u2b50\u2b55\u3030\u303d\u3297\u3299\ud83c\udc04\ud83c\udccf"
    "]+"
, re.UNICODE)

root_dir = "c:\\Hasthi's Work Folder\\prefect-management-system"
extensions = (".html", ".css", ".js")

for root, dirs, files in os.walk(root_dir):
    if ".git" in dirs:
        dirs.remove(".git")
    for file in files:
        if file.endswith(extensions):
            path = os.path.join(root, file)
            try:
                with open(path, "r", encoding="utf-8") as f:
                    content = f.read()
                    matches = emoji_pattern.findall(content)
                    if matches:
                        print(f"File: {path}")
                        for match in set(matches):
                            print(f"  Emoji: {match}")
            except Exception as e:
                # print(f"Error reading {path}: {e}")
                pass
