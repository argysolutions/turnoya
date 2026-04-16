import os
import re

def check_animate_presence():
    src_dir = r'c:\Users\nicov\Documents\TurnosYa\frontend\src'
    files_with_error = []

    for root, dirs, files in os.walk(src_dir):
        for file in files:
            if file.endswith('.jsx'):
                path = os.path.join(root, file)
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    
                    # Search for usage of AnimatePresence
                    usage = re.search(r'<AnimatePresence|AnimatePresence\.', content)
                    
                    if usage:
                        # Search for import of AnimatePresence
                        # Common patterns:
                        # import { ..., AnimatePresence, ... } from 'framer-motion'
                        # import { AnimatePresence } from 'framer-motion'
                        import_match = re.search(r"import\s+{[^}]*AnimatePresence[^}]*}\s+from\s+['\"]framer-motion['\"]", content)
                        
                        if not import_match:
                            files_with_error.append(path)
                            print(f"ERROR: {path} uses AnimatePresence but doesn't import it correctly.")
                        else:
                            print(f"OK: {path} imports AnimatePresence correctly.")

    if not files_with_error:
        print("\nNo errors found regarding AnimatePresence imports in JSX files.")
    else:
        print(f"\nFound {len(files_with_error)} files with missing AnimatePresence imports.")

if __name__ == "__main__":
    check_animate_presence()
