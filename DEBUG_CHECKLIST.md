# 🔍 Debug Checklist

## Quick Debug Commands

### 1. Check if server is running
```bash
ps aux | grep vite
curl http://localhost:5173
```

### 2. Check for build errors
```bash
npm run build
```

### 3. Check for linting errors
```bash
npm run lint
```

### 4. Test database connection
```bash
node test-db-connection.js
```

### 5. Test login
```bash
node test-login.js
```

### 6. Check environment variables
```bash
cat .env | grep VITE_SUPABASE
```

### 7. Check browser console
- Open DevTools (F12)
- Check Console tab for errors
- Check Network tab for failed requests

### 8. Clear cache and restart
```bash
# Kill all processes
lsof -ti:5173 | xargs kill -9
pkill -f vite

# Clear node_modules cache (if needed)
rm -rf node_modules/.vite

# Restart
npm run dev
```

---

## Common Issues & Solutions

### Issue: 403 Forbidden
**Solution:** User not authenticated. Login first.

### Issue: Failed to fetch
**Solution:** Check internet connection or Supabase status.

### Issue: Module not found
**Solution:** 
```bash
rm -rf node_modules
npm install
```

### Issue: Port already in use
**Solution:**
```bash
lsof -ti:5173 | xargs kill -9
```

### Issue: Build fails
**Solution:**
```bash
npm run build 2>&1 | grep -i error
```

---

## Debug Tools

### Browser DevTools
- **Console:** Check for errors
- **Network:** Check API requests
- **Application:** Check localStorage/sessionStorage
- **Sources:** Debug JavaScript

### Supabase Dashboard
- **Logs:** Check API logs
- **Database:** Check data
- **Auth:** Check users
- **RLS:** Check policies

---

## Status Check

Run this to check everything:
```bash
echo "🔍 Debug Status Check"
echo ""
echo "✅ Build:"
npm run build > /dev/null 2>&1 && echo "  Build: OK" || echo "  Build: FAILED"
echo ""
echo "✅ Server:"
curl -s http://localhost:5173 > /dev/null && echo "  Server: Running" || echo "  Server: Not running"
echo ""
echo "✅ Database:"
node test-db-connection.js 2>&1 | grep -q "✅" && echo "  Database: Connected" || echo "  Database: Not connected"
```

