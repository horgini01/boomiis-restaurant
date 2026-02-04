#!/bin/bash
declare -A url_map

# Upload client/public/menu-images
for file in client/public/menu-images/*.png; do
  if [ -f "$file" ]; then
    echo "Uploading $file..."
    url=$(manus-upload-file "$file" 2>&1 | grep -oP 'https://[^\s]+')
    if [ -n "$url" ]; then
      url_map["$file"]="$url"
      echo "$file -> $url"
    fi
  fi
done

# Upload food-images
for file in food-images/*.png; do
  if [ -f "$file" ]; then
    echo "Uploading $file..."
    url=$(manus-upload-file "$file" 2>&1 | grep -oP 'https://[^\s]+')
    if [ -n "$url" ]; then
      url_map["$file"]="$url"
      echo "$file -> $url"
    fi
  fi
done

# Save mapping to file
echo "# Image URL Mapping" > image-urls.txt
for file in "${!url_map[@]}"; do
  echo "$file|${url_map[$file]}" >> image-urls.txt
done

echo "Done! URLs saved to image-urls.txt"
