import os

def setup_directories():
    """Create the exact project folder structure required"""
    # List of folders from the project guide
    folders = [
        "data/raw",
        "data/processed",
        "scripts",
        "docs"
    ]
    
    for folder in folders:
        os.makedirs(folder, exist_ok=True)
        print(f"Directory verified: {folder}")

if __name__ == "__main__":
    print("--- STARTING PROJECT SETUP ---")
    setup_directories()
    print("--- SETUP COMPLETE ---")