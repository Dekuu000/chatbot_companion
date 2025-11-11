# Logo Setup Instructions

## Adding Your Logo

To use your custom logo in the application:

1. **Prepare your logo image:**
   - Remove the white background from your logo image
   - Save it as a PNG file with transparent background
   - Recommended size: 256x256 pixels or larger (will be scaled as needed)

2. **Place the logo file:**
   - Save your logo as `logo.png` in the `public/` folder
   - The full path should be: `public/logo.png`

3. **Supported formats:**
   - PNG (recommended for transparency)
   - SVG (also supports transparency)
   - If using SVG, update the import to `/logo.svg`

## Where the Logo Appears

The logo is currently used in:
- **Navbar** - Navigation bar at the top of every page (32x32px)
- **Login Page** - Centered above the login form (48x48px)

## Troubleshooting

If the logo doesn't appear:
1. Make sure the file is named exactly `logo.png` (lowercase)
2. Verify it's in the `public/` folder (not `app/public/` or elsewhere)
3. Check that the file has a transparent background
4. Restart the development server after adding the logo

## Removing White Background

To remove the white background from your logo image:
- Use online tools like:
  - [remove.bg](https://www.remove.bg/)
  - [Photopea](https://www.photopea.com/) (online Photoshop)
  - [GIMP](https://www.gimp.org/) (free image editor)
- Or use design tools like:
  - Adobe Photoshop
  - Figma
  - Canva (with transparent background option)











