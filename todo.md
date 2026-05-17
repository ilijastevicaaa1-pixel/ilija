# TODO - JWT_SECRET fix for Render login

## Step 1: Patch login.js
- [ ] Update `backend/routes/login.js` to use safe secret sourcing (fallback to `dev_secret_key` if missing)
- [ ] Add explicit runtime validation + clear error handling if secret is missing

## Step 2: Push redeploy
- [ ] Commit changes
- [ ] Push to the repo
- [ ] Trigger Render Deploy latest commit or Restart service

## Step 3: Verify
- [ ] Confirm logs no longer show: `secretOrPrivateKey must have a value`
- [ ] Verify frontend login returns token
- [ ] Verify auth-protected routes work
