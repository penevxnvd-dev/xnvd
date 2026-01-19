# 🔑 Vercel Access Token Setup

## Token Information
- **Token**: `TIySKI61Vd2yme9Z5BERqjH4`
- **Account**: `penevxnvd-dev`
- **Status**: ✅ Verified and working

## Usage Methods

### 1. Using with --token flag (Recommended for scripts)
```bash
vercel whoami --token "TIySKI61Vd2yme9Z5BERqjH4"
vercel project ls --token "TIySKI61Vd2yme9Z5BERqjH4"
vercel deploy --token "TIySKI61Vd2yme9Z5BERqjH4"
```

### 2. Using as Environment Variable
```bash
export VERCEL_TOKEN="TIySKI61Vd2yme9Z5BERqjH4"
vercel whoami
vercel project ls
```

### 3. For CI/CD (GitHub Actions)
Add as a secret in GitHub repository:
1. Go to: Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Name: `VERCEL_TOKEN`
4. Value: `TIySKI61Vd2yme9Z5BERqjH4`
5. Then use in workflow:

```yaml
env:
  VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
```

### 4. Quick Setup Script
Run the setup script to configure the token:
```bash
./setup-vercel-token.sh
```

## Common Commands

### Verify Token
```bash
vercel whoami --token "TIySKI61Vd2yme9Z5BERqjH4"
```

### List Projects
```bash
vercel project ls --token "TIySKI61Vd2yme9Z5BERqjH4"
```

### Deploy
```bash
vercel deploy --token "TIySKI61Vd2yme9Z5BERqjH4"
```

### Add Environment Variables
```bash
echo "your-value" | vercel env add VITE_SUPABASE_URL production --token "TIySKI61Vd2yme9Z5BERqjH4"
```

## Security Notes

⚠️ **Important Security Considerations:**
- Never commit the token to version control
- The token is already in `.gitignore` (`.vercel` directory)
- If adding to `.env`, ensure `.env` is in `.gitignore`
- For production, use GitHub Secrets or CI/CD environment variables
- Rotate the token if it's ever exposed

## Current Configuration

✅ Token is verified and working
✅ Authenticated as: `penevxnvd-dev`
✅ Setup script created: `setup-vercel-token.sh`
