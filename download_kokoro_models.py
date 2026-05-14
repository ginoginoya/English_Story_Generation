import urllib.request
import os

files_to_download = {
    "kokoro-v1.0.onnx": "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx",
    "voices-v1.0.bin": "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin"
}

for filename, url in files_to_download.items():
    if not os.path.exists(filename):
        print(f"Downloading {filename} from {url}...")
        try:
            urllib.request.urlretrieve(url, filename)
            print(f"Successfully downloaded {filename}.")
        except Exception as e:
            print(f"Error downloading {filename}: {e}")
    else:
        print(f"{filename} already exists. Skipping.")
