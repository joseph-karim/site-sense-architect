# Netlify Deployment Guide

## Quick Setup

1. **Install the Netlify plugin** (if not already in package.json):
   ```bash
   cd frontend && npm install --save-dev @netlify/plugin-nextjs
   ```

2. **Set Environment Variables in Netlify Dashboard:**
   - Go to Site settings → Environment variables
   - Add the following:
     - `DATABASE_URL` - Your PostgreSQL connection string
     - `MAPBOX_TOKEN` - Your Mapbox API token (for geocoding)
     - `NEXT_PUBLIC_APP_URL` - Your Netlify site URL (e.g., `https://your-site.netlify.app`)

3. **Build Settings in Netlify Dashboard:**
   - The `netlify.toml` file is already configured with:
     - Base directory: `frontend`
     - Build command: `npm install && npm run build`
     - Publish directory: `.next`
   - Netlify will auto-detect `netlify.toml` - no manual configuration needed!

4. **Deploy:**
   - Push to your connected Git branch
   - Netlify will auto-deploy

## Troubleshooting

### 404 Errors

If you're getting 404s:
1. Ensure `@netlify/plugin-nextjs` is installed: `cd frontend && npm install --save-dev @netlify/plugin-nextjs`
2. Check that `netlify.toml` is in the repository root
3. Verify build logs show the Next.js plugin is running
4. Check that environment variables are set correctly

### API Routes Not Working

- API routes require the `@netlify/plugin-nextjs` plugin
- Ensure `DATABASE_URL` is set in Netlify environment variables
- Check function logs in Netlify dashboard for errors

### Build Failures

- Ensure Node.js version is 20 (set in `netlify.toml`)
- Check that all dependencies are in `package.json` (not just `package-lock.json`)
- Review build logs for specific errors

## Notes

- The `netlify.toml` file configures the build automatically
- API routes are handled as serverless functions by the plugin
- Dynamic routes (e.g., `/commercial-zoning/[city]`) work automatically with the plugin
