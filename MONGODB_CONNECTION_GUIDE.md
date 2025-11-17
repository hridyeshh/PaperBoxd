# MongoDB Atlas Connection Guide

## Important: MongoDB Atlas vs MongoDB Compass

**MongoDB Atlas** is a **cloud database service** - it runs 24/7 in the cloud and doesn't require any local application to be running. You should **NOT** need to keep any application open for it to work.

**MongoDB Compass** is just a **local GUI tool** to view and manage your database. It's completely optional and doesn't affect your application's connection to Atlas.

## Common Issues and Solutions

### 1. IP Whitelist Issue (Most Common)

MongoDB Atlas requires your IP address to be whitelisted. If your IP changes (e.g., switching networks, VPN), you'll need to update it.

**How to fix:**
1. Go to [MongoDB Atlas Dashboard](https://cloud.mongodb.com/)
2. Click on **"Network Access"** in the left sidebar
3. Click **"Add IP Address"**
4. You have two options:
   - **Add Current IP Address**: Click this button to automatically add your current IP
   - **Allow Access from Anywhere**: Add `0.0.0.0/0` (⚠️ Only for development, not recommended for production)

**For Development:**
- Use `0.0.0.0/0` to allow access from anywhere
- This is safe for development but should be changed in production

### 2. Connection String Issues

Make sure your `.env.local` file has the correct connection string:

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority
```

**Important:**
- Replace `username` with your MongoDB Atlas username
- Replace `password` with your MongoDB Atlas password (URL-encoded if it contains special characters)
- Replace `cluster` with your cluster name
- Replace `database` with your database name

### 3. Connection Timeout

The connection code has been updated with:
- Increased timeout to 30 seconds
- Automatic reconnection handling
- Connection state checking
- Better error handling

### 4. Verify Your Connection

Check your terminal/console when starting the app. You should see:
```
🔌 Creating new MongoDB connection to: cluster.mongodb.net
✅ Connected to MongoDB Atlas successfully
📊 Database: your-database-name
🔗 Connection state: Connected
```

If you see errors, check:
- IP whitelist in MongoDB Atlas
- Connection string in `.env.local`
- Network connectivity

## Testing the Connection

1. **Check if your app can connect:**
   - Start your Next.js app: `npm run dev`
   - Look for connection logs in the terminal
   - Try accessing any API route that uses the database

2. **Test directly with MongoDB Compass (optional):**
   - Open MongoDB Compass
   - Paste your connection string
   - Click "Connect"
   - If it connects, your connection string is correct

## Troubleshooting Steps

1. **Verify IP Whitelist:**
   - Go to MongoDB Atlas → Network Access
   - Make sure your current IP is listed
   - Or use `0.0.0.0/0` for development

2. **Check Connection String:**
   - Verify `.env.local` has `MONGODB_URI`
   - Make sure password is URL-encoded (e.g., `@` becomes `%40`)

3. **Check Network:**
   - Try accessing from a different network
   - Disable VPN if using one
   - Check firewall settings

4. **Check MongoDB Atlas Status:**
   - Go to MongoDB Atlas dashboard
   - Check if your cluster is running (should show "Active")
   - Check for any alerts or warnings

## Still Having Issues?

If you're still experiencing connection issues after checking the above:

1. Check the error message in your terminal/console
2. Look for specific error codes (e.g., `MongoServerError`, `MongoNetworkError`)
3. Check MongoDB Atlas logs in the dashboard
4. Verify your MongoDB Atlas account is active and not suspended

## Notes

- **You don't need MongoDB Compass open** - it's just a tool to view data
- **MongoDB Atlas runs 24/7** - it's always available in the cloud
- **Connection is automatic** - the app connects when it needs to access the database
- **IP whitelist is required** - this is a security feature of MongoDB Atlas

