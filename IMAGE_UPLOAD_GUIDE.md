# Image Upload Guide for Boomiis Restaurant Admin

## How to Upload Menu Item Images

### Method 1: Using the Admin Panel (Recommended)

1. **Login to Admin**
   - Go to: https://your-domain.com/admin/login
   - Use your admin credentials

2. **Navigate to Menu Items**
   - Click "Menu Items" in the left sidebar

3. **Edit a Menu Item**
   - Click the edit (pencil) icon next to any menu item

4. **Upload Image**
   - In the edit form, you'll see an "Upload Image" button
   - Click the button and select an image file from your computer
   - Supported formats: JPG, PNG, WEBP
   - Recommended size: 800x800px to 2048x2048px
   - The image will be automatically uploaded to S3 storage
   - The Image URL field will be automatically populated

5. **Save Changes**
   - Click "Save Changes" to update the menu item

### Method 2: Using Image URL (Alternative)

If you already have images hosted elsewhere:

1. Edit the menu item
2. Paste the full image URL in the "Image URL" field
3. Example: `https://example.com/images/jollof-rice.jpg`
4. Save changes

### Current Status

✅ **Items with Images:**
- Puff Puff
- Plantain Chips  
- Suya Skewers
- Jollof Rice with Chicken
- Egusi Soup with Fufu

❌ **Items Without Images:**
- All other menu items currently show a placeholder icon (🍽️)

### Image Guidelines

- **Format**: JPG or PNG recommended
- **Size**: 800x800px minimum, 2048x2048px maximum
- **Aspect Ratio**: Square (1:1) works best
- **File Size**: Keep under 2MB for fast loading
- **Quality**: Use high-quality food photography
- **Lighting**: Well-lit, appetizing presentation
- **Background**: Clean, uncluttered backgrounds work best

### Tips for Great Food Photos

1. Natural lighting is best
2. Show the dish from a slight angle (not directly from above)
3. Include garnishes and sides for context
4. Make sure the food looks fresh and appetizing
5. Use a clean plate/bowl
6. Consider adding props (utensils, napkins) for context

### Troubleshooting

**Image not showing after upload?**
- Refresh the menu page
- Check that the image URL was saved correctly
- Verify the image file isn't corrupted
- Try a different image format

**Upload button not working?**
- Check your internet connection
- Ensure the file size is under 5MB
- Try a different browser
- Contact support if the issue persists

### Need Help?

If you encounter any issues with image uploads, please contact technical support.
